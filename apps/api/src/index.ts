import { Request, Response } from 'express';
import express from 'express';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import path from 'path';
import fs from 'fs';
import { execSync, execFileSync } from 'child_process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import supabaseRouter from './routes/supabase';
import previewRouter from './routes/preview';
import billingRouter from './routes/billing';

// Load .env from the repository root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.API_PORT || 3001;
const REPOS_BASE_DIR = process.env.REPOS_PATH || '/tmp/repos';
const PREVIEWS_DIR = process.env.PREVIEWS_DIR || '/data/previews';
const PUBLISHED_DIR = process.env.PUBLISHED_DIR || '/data/published';

// Ensure repos directory exists
try {
  if (!fs.existsSync(REPOS_BASE_DIR)) {
    fs.mkdirSync(REPOS_BASE_DIR, { recursive: true });
  }
} catch (err) {
  console.warn(`Could not create repos directory at ${REPOS_BASE_DIR}: ${(err as Error).message}`);
}

// Ensure previews directory exists
if (!fs.existsSync(PREVIEWS_DIR)) {
  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
}

// Ensure published directory exists
if (!fs.existsSync(PUBLISHED_DIR)) {
  fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
}

// Startup sanity check: verify git is available
try {
  const gitVersion = execSync('git --version', { encoding: 'utf-8' }).trim();
  console.log(`Git is available: ${gitVersion}`);
} catch (error) {
  console.error('ERROR: git command not found. The API service requires git to be installed.');
  console.error('  Please ensure git is installed in the container. See README.md for troubleshooting.');
}

// ── Default team for local development ──
// When team_id is not provided, auto-provision a default org + team so the
// frontend works without explicit multi-tenant setup.
const DEFAULT_ORG_SLUG = 'default-org';
const DEFAULT_TEAM_SLUG = 'default-team';

async function getOrCreateDefaultTeam(): Promise<{ org_id: string; team_id: string }> {
  // Try to find existing default org
  let org = await storage.getOrganizationBySlug(DEFAULT_ORG_SLUG);
  if (!org) {
    org = await storage.createOrganization({ name: 'Default Organization', slug: DEFAULT_ORG_SLUG });
  }

  // Try to find existing default team under this org
  const teams = await storage.listTeams(org.id);
  let team = teams.find(t => t.slug === DEFAULT_TEAM_SLUG);
  if (!team) {
    team = await storage.createTeam({ org_id: org.id, name: 'Default Team', slug: DEFAULT_TEAM_SLUG });
  }

  return { org_id: org.id, team_id: team.id };
}

// Bootstrap NestJS and add Express routes
async function bootstrap() {
  // Create NestJS application with body parser
  const nestApp = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // Enable CORS
  nestApp.enableCors();

  // Get the underlying Express instance
  const app = nestApp.getHttpAdapter().getInstance();

  // Add JSON body parser middleware for custom Express routes
  // Note: NestJS has its own body parser for its controllers,
  // but our custom routes added directly to the Express instance need this
  app.use(express.json());

  // Supabase integration routes
  app.use('/api/supabase', supabaseRouter);

  // Preview deployment routes
  app.use('/api/preview', previewRouter);

  // Billing routes
  app.use('/api/billing', billingRouter);

  // Serve static preview files
  app.use('/previews', express.static(PREVIEWS_DIR));

  // Serve static published files
  app.use('/published', express.static(PUBLISHED_DIR));

  // ── Organization routes ──

  // POST /orgs - Create a new organization
  app.post('/orgs', async (req: Request, res: Response) => {
    try {
      const { name, slug } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: 'Missing required fields: name, slug' });
      }
      const org = await storage.createOrganization({ name, slug });
      res.status(201).json(org);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      res.status(500).json({ error: `Failed to create organization: ${error.message}` });
    }
  });

  // GET /orgs - List all organizations
  app.get('/orgs', async (_req: Request, res: Response) => {
    try {
      const orgs = await storage.listOrganizations();
      res.json(orgs);
    } catch (error: any) {
      console.error('Error listing organizations:', error);
      res.status(500).json({ error: 'Failed to list organizations' });
    }
  });

  // GET /orgs/:id - Get organization details
  app.get('/orgs/:id', async (req: Request, res: Response) => {
    try {
      const org = await storage.getOrganization(req.params.id);
      if (!org) return res.status(404).json({ error: 'Organization not found' });
      res.json(org);
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  });

  // ── Team routes ──

  // POST /orgs/:orgId/teams - Create a team within an organization
  app.post('/orgs/:orgId/teams', async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      const { name, slug } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: 'Missing required fields: name, slug' });
      }
      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      const team = await storage.createTeam({ org_id: orgId, name, slug });
      res.status(201).json(team);
    } catch (error: any) {
      console.error('Error creating team:', error);
      res.status(500).json({ error: `Failed to create team: ${error.message}` });
    }
  });

  // GET /orgs/:orgId/teams - List teams in an organization
  app.get('/orgs/:orgId/teams', async (req: Request, res: Response) => {
    try {
      const teams = await storage.listTeams(req.params.orgId);
      res.json(teams);
    } catch (error: any) {
      console.error('Error listing teams:', error);
      res.status(500).json({ error: 'Failed to list teams' });
    }
  });

  // POST /teams/:teamId/members - Add a team member
  app.post('/teams/:teamId/members', async (req: Request, res: Response) => {
    try {
      const { user_id, role } = req.body;
      if (!user_id) return res.status(400).json({ error: 'user_id is required' });
      await storage.addTeamMember(req.params.teamId, user_id, role || 'member');
      res.json({ message: 'Member added' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to add member' });
    }
  });

  // ── Project routes ──

  // POST /projects - Create a new project (team_id optional — falls back to default team)
  app.post('/projects', async (req: Request, res: Response) => {
    try {
      const { name, team_id: rawTeamId, repository_url, template = 'empty' } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing required field: name' });
      }

      // Resolve team_id: use provided value or fall back to auto-provisioned default
      let team_id = rawTeamId;
      if (!team_id) {
        const defaults = await getOrCreateDefaultTeam();
        team_id = defaults.team_id;
      }

      // Validate team exists
      const team = await storage.getTeam(team_id);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const projectId = uuidv4();
      const repoDir = path.join(REPOS_BASE_DIR, team.org_id, team_id, projectId);

      // Create directory structure
      fs.mkdirSync(repoDir, { recursive: true });

      // Initialize git repository
      execSync('git init', { cwd: repoDir });
      execSync('git config user.name "VIBE Bot"', { cwd: repoDir });
      execSync('git config user.email "vibe@example.com"', { cwd: repoDir });
      execSync('git config commit.gpgsign false', { cwd: repoDir });

      // Create initial README for template
      const readmePath = path.join(repoDir, 'README.md');
      fs.writeFileSync(readmePath, `# ${name}\n\nProject created from ${template} template.\n`);

      // Initial commit
      execSync('git add .', { cwd: repoDir });
      execSync('git commit -m "Initial commit from template"', { cwd: repoDir });
      execSync('git branch -M main', { cwd: repoDir });

      const project = await storage.createProject({
        id: projectId,
        name,
        team_id,
        repository_url: repository_url || null,
        local_path: repoDir,
      });

      res.status(201).json({
        ...project,
        message: 'Project created successfully',
      });
    } catch (error: any) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: `Failed to create project: ${error.message}` });
    }
  });

  // POST /projects/import/github - Import project from GitHub
  app.post('/projects/import/github', async (req: Request, res: Response) => {
    try {
      const { repo_url, team_id: rawTeamId } = req.body;

      if (!repo_url) {
        return res.status(400).json({ error: 'Missing required field: repo_url' });
      }

      // Resolve team_id: use provided value or fall back to auto-provisioned default
      let team_id = rawTeamId;
      if (!team_id) {
        const defaults = await getOrCreateDefaultTeam();
        team_id = defaults.team_id;
      }

      const team = await storage.getTeam(team_id);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const projectId = uuidv4();
      const repoDir = path.join(REPOS_BASE_DIR, team.org_id, team_id, projectId);

      // Clone repository
      const githubToken = process.env.GITHUB_TOKEN;
      let cloneUrl = repo_url;

      const cloneEnv = {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
      };

      if (githubToken && repo_url.includes('github.com')) {
        cloneUrl = repo_url.replace('https://', `https://${githubToken}@`);
      }

      execFileSync('git', ['clone', cloneUrl, repoDir], { env: cloneEnv });

      const repoName = repo_url.split('/').pop()?.replace('.git', '') || 'imported-repo';

      const project = await storage.createProject({
        id: projectId,
        name: repoName,
        team_id,
        repository_url: repo_url,
        local_path: repoDir,
      });

      res.status(201).json({
        ...project,
        message: 'Project imported successfully',
      });
    } catch (error: any) {
      console.error('Error importing project:', error);
      res.status(500).json({ error: `Failed to import project: ${error.message}` });
    }
  });

  // GET /projects - List projects (by team, org, or default team)
  app.get('/projects', async (req: Request, res: Response) => {
    try {
      const teamId = req.query.team_id as string;
      const orgId = req.query.org_id as string;

      if (orgId) {
        const projects = await storage.listProjectsByOrg(orgId);
        return res.json(projects);
      }
      if (teamId) {
        const projects = await storage.listProjects(teamId);
        return res.json(projects);
      }

      // No filter provided — fall back to default team for local dev
      const defaults = await getOrCreateDefaultTeam();
      const projects = await storage.listProjects(defaults.team_id);
      return res.json(projects);
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).json({ error: 'Failed to list projects' });
    }
  });

  // GET /projects/:id - Get project details
  app.get('/projects/:id', async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  // GET /projects/:id/jobs - List jobs for a specific project
  app.get('/projects/:id/jobs', async (req: Request, res: Response) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const tasks = await storage.listTasksByProject(projectId, limit);
      res.json(tasks);
    } catch (error) {
      console.error('Error listing project tasks:', error);
      res.status(500).json({ error: 'Failed to list project tasks' });
    }
  });

  // DELETE /projects/:id - Delete a project
  app.delete('/projects/:id', async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const localPath = project.local_path;
      await storage.deleteProject(req.params.id);
      // Best-effort cleanup of the on-disk repo directory
      if (localPath && fs.existsSync(localPath)) {
        fs.rmSync(localPath, { recursive: true, force: true });
      }
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // POST /projects/:id/publish - Publish a job's preview to the project
  app.post('/projects/:id/publish', async (req: Request, res: Response) => {
    try {
      const projectId = req.params.id;
      const { job_id } = req.body;

      if (!job_id) {
        return res.status(400).json({ error: 'Missing required field: job_id' });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const job = await storage.getTask(job_id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      if (job.project_id !== projectId) {
        return res.status(400).json({ error: 'Job does not belong to this project' });
      }
      if (!job.preview_url) {
        return res.status(400).json({ error: 'Job does not have a preview to publish' });
      }

      const sourceDir = path.join(PREVIEWS_DIR, job_id);
      if (!fs.existsSync(sourceDir)) {
        return res.status(404).json({ error: 'Preview files not found' });
      }

      const destDir = path.join(PUBLISHED_DIR, projectId);
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
      }

      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) copyRecursive(srcPath, destPath);
          else fs.copyFileSync(srcPath, destPath);
        }
      };
      copyRecursive(sourceDir, destDir);

      const publishedUrl = `/published/${projectId}/index.html`;
      await storage.publishProject(projectId, job_id, publishedUrl);

      res.json({
        message: 'Project published successfully',
        published_url: publishedUrl,
        job_id,
      });
    } catch (error: any) {
      console.error('Error publishing project:', error);
      res.status(500).json({ error: `Failed to publish project: ${error.message}` });
    }
  });

  // ── Job routes ──

  // POST /jobs - Create a new VIBE task
  app.post('/jobs', async (req: Request, res: Response) => {
    try {
      const { prompt, project_id, base_branch = 'main', target_branch, model } = req.body;
      const resolvedModel: 'claude' | 'gpt' = model === 'gpt' ? 'gpt' : 'claude';

      if (!prompt) {
        return res.status(400).json({ error: 'Missing required field: prompt' });
      }
      if (!project_id) {
        return res.status(400).json({ error: 'Missing required field: project_id' });
      }

      // Validate project exists
      const project = await storage.getProject(project_id);
      if (!project) {
        return res.status(404).json({ error: `Project not found: ${project_id}` });
      }

      // Budget enforcement via org
      const org = await storage.getOrgForProject(project_id);
      if (org) {
        const budgetLimit = await storage.getTenantBudget(org.id);
        if (budgetLimit !== null) {
          const currentSpend = await storage.getTenantSpend(org.id);
          if (currentSpend >= budgetLimit) {
            return res.status(402).json({
              error: `Budget exceeded: $${currentSpend.toFixed(4)} spent of $${budgetLimit.toFixed(2)} limit.`,
            });
          }
        }
      }

      const taskId = uuidv4();
      const now = new Date().toISOString();
      const finalBaseBranch = base_branch || 'main';
      const finalTargetBranch = target_branch || `vibe/${taskId.slice(0, 8)}`;

      await storage.createTask({
        task_id: taskId,
        user_prompt: prompt,
        project_id,
        source_branch: finalBaseBranch,
        destination_branch: finalTargetBranch,
        execution_state: 'queued',
        initiated_at: now,
        last_modified: now,
        llm_model: resolvedModel,
      });

      await storage.logEvent(taskId, 'Task created — calling Edge Function for diff generation', 'info');

      res.status(201).json({
        task_id: taskId,
        status: 'queued',
        message: 'Task created successfully',
      });

      // Fire-and-forget: process the job asynchronously
      (async () => {
        try {
          await storage.updateTaskState(taskId, 'calling_llm');
          const supabaseUrl = process.env.SUPABASE_URL || 'https://ptaqytvztkhjpuawdxng.supabase.co';
          const supabaseKey = process.env.SUPABASE_ANON_KEY;
          if (!supabaseKey) throw new Error('SUPABASE_ANON_KEY not configured');

          const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-diff`;
          const headers = {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          };

          // ── Step 1: Plan call — ask the LLM for a page plan ──
          let plan: { name: string; title: string; description: string }[] | null = null;
          let totalTokens = 0;

          try {
            await storage.logEvent(taskId, 'Generating plan...', 'info');
            const planResponse = await fetch(edgeFunctionUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({ prompt, model: resolvedModel, mode: 'plan' }),
            });
            const planRawText = await planResponse.text();
            if (!planResponse.ok) throw new Error(planRawText || `Plan call returned ${planResponse.status}`);
            const planData = JSON.parse(planRawText);
            if (planData.usage?.total_tokens) totalTokens += planData.usage.total_tokens;
            // Edge Function returns { diff: "<JSON string of pages array>", mode: "plan", usage }
            let planPages = typeof planData.diff === 'string'
              ? JSON.parse(planData.diff)
              : planData.diff;
            if (Array.isArray(planPages) && planPages.length > 0) {
              if (planPages.length > 4) {
                planPages = planPages.slice(0, 4);
                await storage.logEvent(taskId, 'Capped to 4 pages for fast initial build — add more pages later', 'info');
              }
              plan = planPages;
              await storage.logEvent(taskId, `Plan received: ${plan!.length} page(s) — ${plan!.map((p: { name: string }) => p.name).join(', ')}`, 'info');
            } else {
              throw new Error('Plan response missing valid pages array');
            }
          } catch (planErr: any) {
            // Plan call failed — fall back to single-page build
            await storage.logEvent(taskId, `Plan call failed (${planErr.message}), falling back to single-page build...`, 'warning');
            plan = null;
          }

          const previewDir = path.join('/data/previews', taskId);
          fs.mkdirSync(previewDir, { recursive: true });

          let pageNames: string[] = [];

          if (plan) {
            // ── Step 2: Page loop — build pages sequentially ──
            for (let i = 0; i < plan.length; i++) {
              const page = plan[i];
              const safeName = page.name.replace(/[^a-zA-Z0-9_-]/g, '_');
              await storage.logEvent(taskId, 'Building page ' + (i + 1) + ' of ' + plan.length + ': ' + page.name + '...', 'info');

              try {
                const pageResponse = await fetch(edgeFunctionUrl, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ prompt: page.description, model: resolvedModel, mode: 'page', context: 'Site pages: ' + plan.map((p: any) => p.name).join(', ') + '. Keep consistent nav, colors, and fonts.' }),
                });
                const pageRawText = await pageResponse.text();
                if (!pageResponse.ok) throw new Error('Page ' + page.name + ' returned ' + pageResponse.status);
                const pageData = JSON.parse(pageRawText);
                if (pageData.usage?.total_tokens) totalTokens += pageData.usage.total_tokens;
                fs.writeFileSync(path.join(previewDir, safeName + '.html'), pageData.diff);
                pageNames.push(page.name);
              } catch (pageErr: any) {
                await storage.logEvent(taskId, 'Page ' + page.name + ' failed: ' + pageErr.message + ' — skipping', 'info');
              }

              if (i < plan.length - 1) await new Promise(r => setTimeout(r, 60000));
            }

            // Save generated pages to jobs table so the frontend can read last_diff
            const pagesArray = plan.filter(p => pageNames.includes(p.name)).map((p) => {
              const safeName = p.name.replace(/[^a-zA-Z0-9_-]/g, '_');
              const html = fs.readFileSync(path.join(previewDir, `${safeName}.html`), 'utf-8');
              return { name: p.name, filename: `${safeName}.html`, html };
            });
            await storage.setTaskDiff(taskId, JSON.stringify(pagesArray));
          } else {
            // ── Fallback: single-page build with mode: 'html' ──
            await storage.logEvent(taskId, 'Calling Edge Function (single-page mode)...', 'info');
            const response = await fetch(edgeFunctionUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({ prompt, model: resolvedModel, mode: 'html' }),
            });
            const rawText = await response.text();
            if (!response.ok) throw new Error(rawText || `Edge Function returned ${response.status}`);

            let data: { diff: string; usage: { total_tokens: number } };
            try {
              data = JSON.parse(rawText);
            } catch {
              console.error(`Job ${taskId} — raw response (${rawText.length} chars):`, rawText.slice(0, 500));
              throw new Error(`Edge Function returned invalid JSON (${rawText.length} chars)`);
            }

            if (data.usage?.total_tokens) totalTokens += data.usage.total_tokens;
            fs.writeFileSync(path.join(previewDir, 'index.html'), data.diff);
            pageNames = ['index'];

            // Save single-page HTML to jobs table so the frontend can read last_diff
            await storage.setTaskDiff(taskId, data.diff);
          }

          // ── Step 3: Write manifest and finalize ──
          fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(pageNames));
          const firstPage = pageNames[0].replace(/[^a-zA-Z0-9_-]/g, '_');
          await storage.setPreviewUrl(taskId, `/previews/${taskId}/${firstPage}.html`);
          await storage.logEvent(taskId, 'Preview generated', 'info');
          await storage.logEvent(taskId, `LLM responded: ${totalTokens} tokens used`, 'info');
          await storage.updateTaskState(taskId, 'completed');
          await storage.logEvent(taskId, 'Job completed successfully', 'info');
        } catch (err: any) {
          console.error(`Job ${taskId} failed:`, err.message);
          await storage.updateTaskState(taskId, 'failed');
          await storage.logEvent(taskId, `Job failed: ${err.message}`, 'error');
        }
      })();
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // GET /jobs/:id - Get task details
  app.get('/jobs/:id', async (req: Request, res: Response) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // GET /jobs - List recent tasks for a project
  app.get('/jobs', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.project_id as string;
      if (!projectId) {
        return res.status(400).json({ error: 'project_id query parameter is required' });
      }
      const tasks = await storage.listRecentTasks(projectId);
      res.json(tasks);
    } catch (error) {
      console.error('Error listing tasks:', error);
      res.status(500).json({ error: 'Failed to list tasks' });
    }
  });

  // ── Diff endpoints ──

  app.get('/jobs/:id/diff', async (req: Request, res: Response) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      const diff = await storage.getTaskDiff(req.params.id);
      if (!diff) return res.status(404).json({ error: 'No diff available' });
      res.json({ diff });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get diff' });
    }
  });

  app.post('/jobs/:id/diff/apply', async (req: Request, res: Response) => {
    try {
      const { diff } = req.body;
      if (!diff) return res.status(400).json({ error: 'diff is required' });
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      await storage.setTaskDiff(req.params.id, diff);
      res.json({ message: 'Diff updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to apply diff' });
    }
  });

  // ── Preview URL endpoint ──

  app.post('/jobs/:id/preview', async (req: Request, res: Response) => {
    try {
      const { preview_url } = req.body;
      if (!preview_url) return res.status(400).json({ error: 'preview_url is required' });
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      await storage.setPreviewUrl(req.params.id, preview_url);
      res.json({ message: 'Preview URL updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to set preview URL' });
    }
  });

  // ── Analytics endpoint ──

  app.get('/analytics/overview', async (req: Request, res: Response) => {
    try {
      const orgId = req.query.org_id as string;
      if (!orgId) {
        return res.status(400).json({ error: 'org_id query parameter is required' });
      }
      const overview = await storage.getAnalyticsOverview(orgId);
      res.json(overview);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

  // GET /jobs/:id/logs — SSE stream of log events
  app.get('/jobs/:id/logs', async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;

      const task = await storage.getTask(jobId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      let closed = false;

      const send = (data: unknown) => {
        if (closed) return;
        try {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch { /* client already disconnected */ }
      };

      // Replay existing events
      const existing = await storage.getTaskEvents(jobId);
      let lastEventTime = new Date().toISOString();
      if (existing.length > 0) {
        existing.forEach(send);
        lastEventTime = existing[existing.length - 1].event_time;
      }

      // Poll for new events until terminal state
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        try {
          const newEvents = await storage.getEventsAfter(jobId, lastEventTime);
          newEvents.forEach((e) => {
            send(e);
            lastEventTime = e.event_time;
          });

          const current = await storage.getTask(jobId);
          if (current && (current.execution_state === 'completed' || current.execution_state === 'failed')) {
            send({ type: 'complete', state: current.execution_state });
            clearInterval(interval);
            if (!closed) { closed = true; res.end(); }
          }
        } catch {
          clearInterval(interval);
          if (!closed) { closed = true; res.end(); }
        }
      }, 1000);

      req.on('close', () => { closed = true; clearInterval(interval); });
    } catch (error) {
      console.error('Error setting up log stream:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream logs' });
      }
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
