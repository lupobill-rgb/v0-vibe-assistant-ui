import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// POST /jobs - Create a new VIBE task
app.post('/jobs', (req: Request, res: Response) => {
  try {
    const { prompt, repo_url, base_branch = 'main', target_branch } = req.body;

    if (!prompt || !repo_url) {
      return res.status(400).json({ error: 'Missing required fields: prompt, repo_url' });
    }

    const taskId = uuidv4();
    const now = Date.now();
    
    // Generate target branch name if not provided
    const finalTargetBranch = target_branch || `vibe/${taskId.slice(0, 8)}`;

    storage.createTask({
      task_id: taskId,
      user_prompt: prompt,
      repository_url: repo_url,
      source_branch: base_branch,
      destination_branch: finalTargetBranch,
      execution_state: 'queued',
      initiated_at: now,
      last_modified: now
    });

    storage.logEvent(taskId, 'Task created and queued for execution', 'info');

    res.status(201).json({
      task_id: taskId,
      status: 'queued',
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /jobs/:id - Get task details
app.get('/jobs/:id', (req: Request, res: Response) => {
  try {
    const taskId = req.params.id;
    const task = storage.getTask(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// GET /jobs - List recent tasks
app.get('/jobs', (_req: Request, res: Response) => {
  try {
    const tasks = storage.listRecentTasks();
    res.json(tasks);
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// GET /jobs/:id/logs - Stream logs via SSE
app.get('/jobs/:id/logs', (req: Request, res: Response) => {
  const taskId = req.params.id;
  
  // Check if task exists
  const task = storage.getTask(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send existing logs
  const existingEvents = storage.getTaskEvents(taskId);
  existingEvents.forEach(event => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  let lastEventTime = existingEvents.length > 0 
    ? existingEvents[existingEvents.length - 1].event_time 
    : 0;

  // Poll for new logs
  const pollInterval = setInterval(() => {
    try {
      const newEvents = storage.getEventsAfter(taskId, lastEventTime);
      
      newEvents.forEach(event => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        lastEventTime = event.event_time;
      });

      // Check if task is in terminal state
      const currentTask = storage.getTask(taskId);
      if (currentTask && (currentTask.execution_state === 'completed' || currentTask.execution_state === 'failed')) {
        // Send completion event
        res.write(`data: ${JSON.stringify({ type: 'complete', state: currentTask.execution_state })}\n\n`);
        clearInterval(pollInterval);
        res.end();
      }
    } catch (error) {
      console.error('Error polling logs:', error);
      clearInterval(pollInterval);
      res.end();
    }
  }, 1000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(pollInterval);
    res.end();
  });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`VIBE API server running on port ${PORT}`);
});
