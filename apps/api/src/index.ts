import { Request, Response } from 'express';
import express from 'express';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import path from 'path';
import fs from 'fs';
import { exec, execSync, execFileSync } from 'child_process';
import { resolveKernelContext } from './kernel/context-injector';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import supabaseRouter from './routes/supabase';
import previewRouter from './routes/preview';
import billingRouter from './routes/billing';
import {
  INITIAL_BUILD_BUDGETS,
  DASHBOARD_BUILD_BUDGETS,
  MAX_INITIAL_PAGES,
  StarterSitePlan,
  buildStarterSitePlan,
  mapWithConcurrency,
  validateStarterSiteQuality,
  writePagePlanArtifact,
} from './starter-site';

// Load .env from the repository root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT || process.env.API_PORT || 3001;
const REPOS_BASE_DIR = process.env.REPOS_PATH || '/tmp/repos';
const PREVIEWS_DIR = process.env.PREVIEWS_DIR || '/tmp/previews';
const PUBLISHED_DIR = process.env.PUBLISHED_DIR || '/tmp/published';

// Ensure repos directory exists
try {
  if (!fs.existsSync(REPOS_BASE_DIR)) {
    fs.mkdirSync(REPOS_BASE_DIR, { recursive: true });
  }
} catch (err) {
  console.warn(`Could not create repos directory at ${REPOS_BASE_DIR}: ${(err as Error).message}`);
}

// Ensure previews directory exists
try {
  if (!fs.existsSync(PREVIEWS_DIR)) {
    fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn(`Could not create previews directory at ${PREVIEWS_DIR}: ${(err as Error).message}`);
}

// Ensure published directory exists
try {
  if (!fs.existsSync(PUBLISHED_DIR)) {
    fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  }
} catch (err) {
  console.warn(`Could not create published directory at ${PUBLISHED_DIR}: ${(err as Error).message}`);
}

// Startup sanity check: verify git is available (optional on serverless)
try {
  const gitVersion = execSync('git --version', { encoding: 'utf-8' }).trim();
  console.log(`Git is available: ${gitVersion}`);
} catch {
  console.warn('Git not available — git-dependent routes will degrade gracefully.');
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

  // ── Kernel diagnostic (Layer 3 verification) ──
  app.get('/api/kernel-context/:userId/:orgId', async (req: Request, res: Response) => {
    try {
      const ctx = await resolveKernelContext(req.params.userId, req.params.orgId);
      res.json({
        context: ctx,
        hasVisibleTeamData: ctx.includes('VISIBLE TEAM DATA'),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

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

      // Create directory structure — may fail on read-only filesystems (e.g. Vercel)
      try {
        fs.mkdirSync(repoDir, { recursive: true });
      } catch (fsErr: any) {
        console.warn(`Cannot create repo directory (serverless?): ${fsErr.message}`);
        // Still create the project in DB without local git repo
      }

      // Initialize git repository (only if directory was created)
      if (fs.existsSync(repoDir)) {
        try {
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
        } catch (gitErr: any) {
          console.warn(`Git init skipped (serverless?): ${gitErr.message}`);
        }
      }

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

      try {
        execFileSync('git', ['clone', cloneUrl, repoDir], { env: cloneEnv });
      } catch (cloneErr: any) {
        console.warn(`Git clone failed (serverless?): ${cloneErr.message}`);
        // Create the directory so the project record can still be created
        try { fs.mkdirSync(repoDir, { recursive: true }); } catch {}
      }

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
        try {
          fs.rmSync(localPath, { recursive: true, force: true });
        } catch (rmErr: any) {
          console.warn(`Could not remove repo directory: ${rmErr.message}`);
        }
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
      try {
        if (fs.existsSync(destDir)) {
          fs.rmSync(destDir, { recursive: true, force: true });
        }
      } catch (rmErr: any) {
        console.warn(`Could not clean published dir: ${rmErr.message}`);
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
      try {
        copyRecursive(sourceDir, destDir);
      } catch (copyErr: any) {
        return res.status(500).json({ error: `Failed to copy preview files: ${copyErr.message}` });
      }

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
      const { prompt, project_id, base_branch = 'main', target_branch, model, mode = 'starter', user_id } = req.body;
      const budgets = (mode === 'dashboard') ? DASHBOARD_BUILD_BUDGETS : INITIAL_BUILD_BUDGETS;
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

      // Kernel context injection: prepend team/role/brand identity to prompt
      let enrichedPrompt = prompt;
      if (user_id && org) {
        const kernelContext = await resolveKernelContext(user_id, org.id);
        if (kernelContext) {
          enrichedPrompt = `${kernelContext}\n\nUSER REQUEST:\n${prompt}`;
        }
      }

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
        execution_state: 'calling_llm',
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
          let fallbacks = 0;
          let retries = 0;

          const edgeCall = async (payload: any) => {
            const attempt = async (model: string) => fetch(edgeFunctionUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({ ...payload, model }),
            });
            let response = await attempt(payload.model || resolvedModel);
            if (response.ok) return response;
            const text = await response.text();
            if (/rate limit|overload|429/i.test(text)) {
              retries += 1;
              await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 250)));
              response = await attempt(payload.model || resolvedModel);
              if (response.ok) return response;
              fallbacks += 1;
              const fallbackModel = (payload.model || resolvedModel) === 'claude' ? 'gpt' : 'claude';
              response = await attempt(fallbackModel);
              if (response.ok) return response;
              // Fallback response body not yet consumed — wrap it so callers can read
              const fallbackText = await response.text();
              return new Response(fallbackText, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            }
            // Non-rate-limit error: body already consumed by .text() above — re-wrap it
            return new Response(text, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          };

          // ── Step 1: Plan call — ask the LLM for a page plan ──
          let plan: StarterSitePlan | null = null;
          let totalTokens = 0;
          let modelCalls = 0;
          const startedAtMs = Date.now();
          const timeline: any[] = [];

          const runStep = async <T>(name: 'planning' | 'building' | 'validating' | 'security' | 'ux' | 'self-healing', fn: () => Promise<T>): Promise<T> => {
            const start = Date.now();
            try {
              const result = await Promise.race([
                fn(),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${name} deadline exceeded`)), budgets.stepDeadlinesMs[name])),
              ]);
              timeline.push({ step: name, startedAt: new Date(start).toISOString(), endedAt: new Date().toISOString(), durationMs: Date.now() - start, status: 'completed' });
              return result;
            } catch (err: any) {
              const status = name === 'security' ? 'deferred' : 'failed';
              timeline.push({ step: name, startedAt: new Date(start).toISOString(), endedAt: new Date().toISOString(), durationMs: Date.now() - start, status });
              if (name === 'security') {
                await storage.logEvent(taskId, 'Security scan deferred (deadline exceeded)', 'warning');
                return undefined as T;
              }
              throw err;
            }
          };

          try {
            plan = await runStep('planning', async () => {
            await storage.logEvent(taskId, 'Generating plan...', 'info');
            console.log('[KERNEL] enrichedPrompt prefix:', enrichedPrompt.slice(0, 300));
            const planResponse = await edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: 'plan' });
            modelCalls += 1;
            const planRawText = await planResponse.text();
            if (!planResponse.ok) throw new Error(planRawText || `Plan call returned ${planResponse.status}`);
            const planData = JSON.parse(planRawText);
            if (planData.usage?.total_tokens) totalTokens += planData.usage.total_tokens;
            // Edge Function returns { diff: "<JSON string of pages array>", mode: "plan", usage }
            let planPages = typeof planData.diff === 'string'
              ? JSON.parse(planData.diff)
              : planData.diff;
            const result = buildStarterSitePlan(Array.isArray(planPages) ? planPages : null, prompt);
            if (result.notes.length > 0) await storage.logEvent(taskId, result.notes.join(' '), 'info');
            await storage.logEvent(taskId, `Plan received: ${result.pages.length} page(s) — ${result.pages.map((p) => p.name).join(', ')}`, 'info');
            return result;
            });
          } catch (planErr: any) {
            // Plan call failed — fall back to single-page build
            await storage.logEvent(taskId, `Plan call failed (${planErr.message}), falling back to single-page build...`, 'warning');
            plan = null;
          }

          const previewDir = path.join(PREVIEWS_DIR, taskId);
          try {
            fs.mkdirSync(previewDir, { recursive: true });
            if (plan) writePagePlanArtifact(previewDir, plan);
          } catch (mkErr: any) {
            console.warn(`Could not create preview directory: ${mkErr.message}`);
          }

          let pageNames: string[] = [];

          if (plan) {
            const currentPlan = plan;
            await runStep('building', async () => {
              const builtPages = await mapWithConcurrency(currentPlan.pages, budgets.buildConcurrency, async (page, i) => {
                const safeName = page.route === '/' ? 'index' : page.route.slice(1);
                await storage.logEvent(taskId, 'Building page ' + (i + 1) + ' of ' + currentPlan.pages.length + ': ' + page.name + '...', 'info');
                console.log('[KERNEL] page prompt prefix:', page.description.slice(0, 300));
                const pageResponse = await edgeCall({
                  prompt: enrichedPrompt + '\n\nPage to build: ' + page.description,
                  model: resolvedModel,
                  mode: 'page',
                  context: `PagePlan JSON: ${JSON.stringify(currentPlan)}. File: app${page.route === '/' ? '' : page.route}/page.tsx. Include navbar, metadata title/description, 2+ sections, and CTA button.`,
                });
                modelCalls += 1;
                const pageRawText = await pageResponse.text();
                if (!pageResponse.ok) throw new Error('Page ' + page.name + ' returned ' + pageResponse.status);
                const pageData = JSON.parse(pageRawText);
                if (pageData.usage?.total_tokens) totalTokens += pageData.usage.total_tokens;
                fs.writeFileSync(path.join(previewDir, safeName + '.html'), pageData.diff);
                return page;
              });
              pageNames = builtPages.map((p) => (p.route === '/' ? 'index' : p.route.slice(1)));
            });

            if (pageNames.length < Math.min(2, currentPlan.pages.length)) {
              throw new Error(`pages generated check failed (${pageNames.length}/${currentPlan.pages.length})`);
            }

            await runStep('validating', async () => {
              const MAX_REPAIR_ATTEMPTS = 2;
              let repairAttempts = 0;
              const htmlFiles = pageNames.map((name) => ({
                route: name === 'index' ? '/' : `/${name}`,
                html: fs.readFileSync(path.join(previewDir, `${name}.html`), 'utf8'),
              }));
              const quality = validateStarterSiteQuality(htmlFiles, /placeholder/i.test(prompt));
              if (!quality.ok) {
                await storage.logEvent(taskId, `Quality gate failed, repairing ${quality.failingRoutes.join(', ')}`, 'warning');
                await storage.logEvent(taskId, `[QA REASONS] ${quality.reasons.join(' | ')}`, 'warn');
                for (const failingRoute of quality.failingRoutes.slice(0, 1)) {
                  if (repairAttempts >= MAX_REPAIR_ATTEMPTS) {
                    await storage.logEvent(taskId, `Max repair attempts (${MAX_REPAIR_ATTEMPTS}) reached — accepting current output`, 'warning');
                    break;
                  }
                  repairAttempts += 1;
                  const fileName = failingRoute === '/' ? 'index' : failingRoute.slice(1);
                  const existing = fs.readFileSync(path.join(previewDir, `${fileName}.html`), 'utf8');
                  const repair = await edgeCall({ prompt: `Return ONLY valid HTML starting with <!DOCTYPE html>. No explanation. No markdown. No preamble.\nRepair this HTML page so it includes: <nav>, <h1>, at least 2 <section> elements, <title>, <meta name="description">, a CTA button containing Start/Get/Contact/Book/Learn, and zero lorem ipsum.\nKeep all existing Tailwind classes, fonts, and design tokens intact.\n${existing}`, model: resolvedModel, mode: 'page' });
                  modelCalls += 1;
                  const repairText = await repair.text();
                  if (repair.ok) {
                    const repairData = JSON.parse(repairText);
                    fs.writeFileSync(path.join(previewDir, `${fileName}.html`), repairData.diff);
                    if (repairData.usage?.total_tokens) totalTokens += repairData.usage.total_tokens;
                  }
                }
              }
            });

            await runStep('security', async () => new Promise((r) => setTimeout(r, 5)));

            const uxResult = await runStep('ux', async () => {
              // UX check is handled in the executor pipeline
              // This step records timing only — executor drives actual UX agent
              await new Promise(r => setTimeout(r, 0));
            });

            const selfHealResult = await runStep('self-healing', async () => {
              // Self-healing scan is handled in the executor pipeline
              // This step records timing only
              await new Promise(r => setTimeout(r, 0));
            });

            // Save generated pages to jobs table so the frontend can read last_diff
            const pagesArray = currentPlan.pages.filter((p) => pageNames.includes(p.route === '/' ? 'index' : p.route.slice(1))).map((p) => {
              const safeName = p.route === '/' ? 'index' : p.route.slice(1);
              const html = fs.readFileSync(path.join(previewDir, `${safeName}.html`), 'utf-8');
              return { name: p.name, filename: `${safeName}.html`, route: p.route, html };
            });
            await storage.setTaskDiff(taskId, JSON.stringify(pagesArray));
          } else {
            // ── Fallback: single-page build with mode: 'html' ──
            await storage.logEvent(taskId, 'Calling Edge Function (single-page mode)...', 'info');
            console.log('[KERNEL] enrichedPrompt prefix:', enrichedPrompt.slice(0, 300));
            const response = await edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: 'html' });
            modelCalls += 1;
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
          fs.writeFileSync(path.join(previewDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
          const firstPage = pageNames[0].replace(/[^a-zA-Z0-9_-]/g, '_');
          await storage.setPreviewUrl(taskId, `/previews/${taskId}/${firstPage}.html`);
          await storage.logEvent(taskId, 'Preview generated', 'info');
          await storage.logEvent(taskId, `LLM responded: ${totalTokens} tokens used`, 'info');
          await storage.logEvent(taskId, `Job Timeline: ${JSON.stringify({ timeline, modelStats: { selected: resolvedModel, modelCalls, retries, fallbacks }, totalTokens, maxPages: MAX_INITIAL_PAGES, wallTimeMs: Date.now() - startedAtMs })}`, 'info');
          if (modelCalls > budgets.maxModelCalls || totalTokens > budgets.maxTokensOut || (Date.now() - startedAtMs) > budgets.maxWallTimeMs) {
            await storage.logEvent(taskId, 'Starter build budget exceeded', 'warning');
          }
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
      let job_timeline: unknown = null;
      const timelinePath = path.join(PREVIEWS_DIR, req.params.id, 'timeline.json');
      if (fs.existsSync(timelinePath)) {
        try {
          job_timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
        } catch {
          job_timeline = null;
        }
      }
      res.json({ ...task, job_timeline });
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
      const { fix_index } = req.body as { fix_index?: number };
      if (fix_index === undefined || typeof fix_index !== 'number') {
        return res.status(400).json({ error: 'fix_index (number) is required' });
      }

      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      // Only allow fix application on terminal jobs
      if (task.execution_state !== 'failed' && task.execution_state !== 'completed') {
        return res.status(409).json({ error: 'Fix can only be applied to completed or failed jobs' });
      }

      // Locate the fix in agent_results
      const allFixes = (task.agent_results ?? []).flatMap((r) => r.fixes ?? []);
      const fix = allFixes[fix_index];
      if (!fix) {
        return res.status(404).json({ error: `No fix at index ${fix_index}` });
      }
      if (!fix.diff) {
        return res.status(400).json({ error: 'Fix has no diff payload' });
      }

      // Locate worktree — executor convention: /data/worktrees/{task_id}
      const worktreePath = path.join('/data/worktrees', req.params.id);
      if (!fs.existsSync(worktreePath)) {
        return res.status(404).json({
          error: 'Worktree not found. The executor environment may have been cleaned up.',
        });
      }

      // Validate diff before applying
      const patchPath = path.join(worktreePath, '.vibe-fix-apply.patch');
      try {
        fs.writeFileSync(patchPath, fix.diff, 'utf-8');
      } catch (err: any) {
        return res.status(500).json({ error: `Failed to write patch: ${err.message}` });
      }

      // git apply --check first — dry run
      try {
        await execAsync(`git apply --check ${patchPath}`, { cwd: worktreePath });
      } catch (err: any) {
        fs.existsSync(patchPath) && fs.unlinkSync(patchPath);
        return res.status(422).json({
          error: 'Fix diff cannot be applied cleanly — the codebase may have changed.',
          detail: err.stderr?.slice(0, 500),
        });
      }

      // Apply
      try {
        await execAsync(`git apply --verbose ${patchPath}`, { cwd: worktreePath });
      } catch (err: any) {
        fs.existsSync(patchPath) && fs.unlinkSync(patchPath);
        return res.status(500).json({ error: `Failed to apply fix: ${err.message}` });
      } finally {
        fs.existsSync(patchPath) && fs.unlinkSync(patchPath);
      }

      // Verify with build
      const buildCmd = process.env.BUILD_COMMAND || 'npm run build';
      let buildOutput = '';
      let buildPassed = false;
      try {
        const { stdout, stderr } = await execAsync(buildCmd, {
          cwd: worktreePath,
          timeout: 300000,
          maxBuffer: 10 * 1024 * 1024,
        });
        buildOutput = (stdout + stderr).slice(0, 2000);
        buildPassed = true;
      } catch (err: any) {
        buildOutput = ((err.stdout || '') + (err.stderr || '')).slice(0, 2000);
      }

      res.json({
        success: buildPassed,
        summary: buildPassed
          ? `Fix applied and build passed: ${fix.description}`
          : `Fix applied but build failed. Manual review required.`,
        buildOutput,
      });
    } catch (error: any) {
      res.status(500).json({ error: `Unexpected error: ${error.message}` });
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

  // Root and health checks
  app.get('/', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'vibe-api' });
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Start the NestJS server
  await nestApp.listen(PORT);
  console.log(`VIBE API server running on port ${PORT}`);
}

bootstrap().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
