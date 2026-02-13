import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { storage, VibeEvent } from './storage';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';

// Load .env from the repository root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.API_PORT || 3001;
const REPOS_BASE_DIR = process.env.REPOS_BASE_DIR || '/data/repos';

// Ensure repos directory exists
if (!fs.existsSync(REPOS_BASE_DIR)) {
  fs.mkdirSync(REPOS_BASE_DIR, { recursive: true });
}

// Startup sanity check: verify git is available
try {
  const gitVersion = execSync('git --version', { encoding: 'utf-8' }).trim();
  console.log(`✓ Git is available: ${gitVersion}`);
} catch (error) {
  console.error('✗ ERROR: git command not found. The API service requires git to be installed.');
  console.error('  Please ensure git is installed in the container. See README.md for troubleshooting.');
}

// Bootstrap NestJS and add Express routes
async function bootstrap() {
  // Create NestJS application
  const nestApp = await NestFactory.create(AppModule);
  
  // Enable CORS
  nestApp.enableCors();
  
  // Get the underlying Express instance
  const app = nestApp.getHttpAdapter().getInstance();

  // POST /projects - Create a new project from template
  app.post('/projects', (req: Request, res: Response) => {
    try {
      const { name, template = 'empty' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const projectId = uuidv4();
    const repoDir = path.join(REPOS_BASE_DIR, projectId);
    
    // Create project directory
    fs.mkdirSync(repoDir, { recursive: true });
    
    // Initialize git repository
    execSync('git init', { cwd: repoDir });
    execSync(`git checkout -b main`, { cwd: repoDir });
    
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
      repository_url: `file://${repoDir}`,
      local_path: repoDir,
      created_at: Date.now()
    });

    res.status(201).json({
      id: projectId,
      name,
      repository_url: `file://${repoDir}`,
      local_path: repoDir,
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
    const { repo_url } = req.body;

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
      repository_url: repo_url,
      local_path: repoDir,
      created_at: Date.now()
    });

    res.status(201).json({
      id: projectId,
      name: repoName,
      repository_url: repo_url,
      local_path: repoDir,
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
    const finalBaseBranch = base_branch || 'main';
    
    // Generate target branch name if not provided
    const finalTargetBranch = target_branch || `vibe/${taskId.slice(0, 8)}`;

    storage.createTask({
      task_id: taskId,
      user_prompt: prompt,
      project_id: project_id || undefined,
      repository_url: repo_url || undefined,
      source_branch: finalBaseBranch,
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

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Start the NestJS server
  await nestApp.listen(PORT);
  console.log(`VIBE API server running on port ${PORT}`);
}

bootstrap().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
