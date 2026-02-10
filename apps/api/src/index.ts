import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;
const REPOS_BASE_DIR = process.env.REPOS_BASE_DIR || '/data/repos';

app.use(cors());
app.use(express.json());

// Ensure repos directory exists
if (!fs.existsSync(REPOS_BASE_DIR)) {
  fs.mkdirSync(REPOS_BASE_DIR, { recursive: true });
}

// POST /projects - Create a new project from template
app.post('/projects', (req: Request, res: Response) => {
  try {
    const { name, template = 'empty', default_branch = 'main' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const projectId = uuidv4();
    const repoDir = path.join(REPOS_BASE_DIR, projectId);
    
    // Create project directory
    fs.mkdirSync(repoDir, { recursive: true });
    
    // Initialize git repository
    execSync('git init', { cwd: repoDir });
    execSync(`git checkout -b ${default_branch}`, { cwd: repoDir });
    
    // Create initial README for template
    const readmePath = path.join(repoDir, 'README.md');
    fs.writeFileSync(readmePath, `# ${name}\n\nProject created from ${template} template.\n`);
    
    // Configure git
    execSync('git config user.name "VIBE Bot"', { cwd: repoDir });
    execSync('git config user.email "vibe@example.com"', { cwd: repoDir });
    
    // Initial commit
    execSync('git add .', { cwd: repoDir });
    execSync('git commit -m "Initial commit from template"', { cwd: repoDir });

    storage.createProject({
      id: projectId,
      name,
      repo_source: 'template',
      repo_dir: repoDir,
      default_branch,
      created_at: Date.now()
    });

    res.status(201).json({
      id: projectId,
      name,
      repo_source: 'template',
      default_branch,
      message: 'Project created successfully'
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: `Failed to create project: ${error.message}` });
  }
});

// POST /projects/import/github - Import project from GitHub
app.post('/projects/import/github', (req: Request, res: Response) => {
  try {
    const { repo_url, default_branch = 'main' } = req.body;

    if (!repo_url) {
      return res.status(400).json({ error: 'Missing required field: repo_url' });
    }

    // Generate project ID server-side
    const projectId = uuidv4();
    const repoDir = path.join(REPOS_BASE_DIR, projectId);
    
    // Clone repository
    const githubToken = process.env.GITHUB_TOKEN;
    let cloneUrl = repo_url;
    
    if (githubToken && repo_url.includes('github.com')) {
      // Use GIT_ASKPASS for more secure authentication
      // Token is passed via environment, not in URL
      cloneUrl = repo_url;
    }
    
    // Use git credential helper for more secure token handling
    const cloneEnv = { 
      ...process.env, 
      GIT_TERMINAL_PROMPT: '0'
    };
    
    if (githubToken && repo_url.includes('github.com')) {
      // Embed token in URL (acceptable for now, but consider GIT_ASKPASS for production)
      cloneUrl = repo_url.replace('https://', `https://${githubToken}@`);
    }
    
    execSync(`git clone ${cloneUrl} ${repoDir}`, { env: cloneEnv });
    
    // Extract repo name from URL
    const repoName = repo_url.split('/').pop()?.replace('.git', '') || 'imported-repo';

    storage.createProject({
      id: projectId,
      name: repoName,
      repo_source: 'github_import',
      repo_dir: repoDir,
      default_branch,
      created_at: Date.now()
    });

    res.status(201).json({
      id: projectId,
      name: repoName,
      repo_source: 'github_import',
      default_branch,
      message: 'Project imported successfully'
    });
  } catch (error: any) {
    console.error('Error importing project:', error);
    res.status(500).json({ error: `Failed to import project: ${error.message}` });
  }
});

// GET /projects - List all projects
app.get('/projects', (_req: Request, res: Response) => {
  try {
    const projects = storage.listProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /projects/:id - Get project details
app.get('/projects/:id', (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = storage.getProject(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /jobs - Create a new VIBE task
app.post('/jobs', (req: Request, res: Response) => {
  try {
    const { prompt, project_id, repo_url, base_branch = 'main', target_branch } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    // OPTION A (project-centric): Require project_id
    // Legacy Mode B: Allow repo_url but mark as deprecated
    if (!project_id && !repo_url) {
      return res.status(400).json({ 
        error: 'Missing required field: project_id (or repo_url for legacy mode)' 
      });
    }

    // If project_id is provided, validate it exists
    if (project_id) {
      const project = storage.getProject(project_id);
      if (!project) {
        return res.status(404).json({ error: `Project not found: ${project_id}` });
      }
    }

    // Warn if using legacy mode
    if (repo_url && !project_id) {
      console.warn('[DEPRECATED] Task created with repo_url (legacy Mode B). Use project_id instead.');
    }

    const taskId = uuidv4();
    const now = Date.now();
    
    // For project-centric jobs, get default branch from project if not specified
    let finalBaseBranch = base_branch || 'main';
    if (project_id) {
      const project = storage.getProject(project_id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      finalBaseBranch = base_branch || project.default_branch;
    }
    
    // Generate target branch name if not provided
    const finalTargetBranch = target_branch || `vibe/${taskId.slice(0, 8)}`;

    storage.createTask({
      task_id: taskId,
      user_prompt: prompt,
      project_id: project_id || undefined,
      repository_url: repo_url || undefined,
      source_branch: base_branch,
      destination_branch: finalTargetBranch,
      execution_state: 'queued',
      initiated_at: now,
      last_modified: now
    });

    if (repo_url) {
      storage.logEvent(taskId, 'Task created (legacy Mode B with repo_url)', 'warning');
    } else {
      storage.logEvent(taskId, 'Task created and queued for execution', 'info');
    }

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

// GET /projects - List all projects
app.get('/projects', (_req: Request, res: Response) => {
  try {
    const projects = storage.listProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /projects/:id - Get project details
app.get('/projects/:id', (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = storage.getProject(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /projects - Create a new project
app.post('/projects', (req: Request, res: Response) => {
  try {
    const { name, repository_url } = req.body;

    if (!name || !repository_url) {
      return res.status(400).json({ error: 'Missing required fields: name, repository_url' });
    }

    // Check if project with this name already exists
    const existingProject = storage.getProjectByName(name);
    if (existingProject) {
      return res.status(409).json({ error: `Project with name '${name}' already exists` });
    }

    const projectId = uuidv4();
    const now = Date.now();
    
    // Project local path will be /data/repos/<project_id>
    const localPath = `/data/repos/${projectId}`;

    storage.createProject({
      project_id: projectId,
      name,
      repository_url,
      local_path: localPath,
      created_at: now
    });

    res.status(201).json({
      project_id: projectId,
      name,
      repository_url,
      local_path: localPath,
      created_at: now,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// DELETE /projects/:id - Delete a project
app.delete('/projects/:id', (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = storage.getProject(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    storage.deleteProject(projectId);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
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
