import { Request, Response, NextFunction } from 'express';
import express from 'express';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { storage, VibeStorage } from './storage';
import path from 'path';
import fs from 'fs';
import { exec, execSync, execFileSync } from 'child_process';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { resolveDepartment, resolveGoldenTemplateMatch } from './kernel/context-injector';
import type { GoldenMatch } from './orchestrator/orchestrator.types';
import { runDebugAgent } from './lib/debug-agent';
import { promisify } from 'util';
import { resolveMode } from './edge-function';
import teamsDomainRouter from './routes/teams-domain.route';
import { extractTenantFromJwt } from './middleware/tenant';
import { startExecutionRunner } from './kernel/execution-runner';
import { handleDashboardJob } from './handlers/dashboard.handler';
import { handlePlannerPipeline } from './handlers/planner.handler';
import { handleDeterministicTemplate, handleAppFastPath } from './handlers/fast-paths.handler';
import { enrichPrompt } from './handlers/enrich-prompt.handler';

const execAsync = promisify(exec);
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import supabaseRouter from './routes/supabase';
import previewRouter, { previewPublicRouter } from './routes/preview';
import billingRouter from './routes/billing';
import stripeBillingRouter from './billing/billing.controller';
import financeRouter from './routes/finance';
import feedsRouter from './routes/feeds';
import webhooksRouter from './routes/webhooks';
import approvalsRouter from './routes/approvals';
import notificationsRouter from './routes/notifications';
import { getPlatformSupabaseClient } from './supabase/client';
import {
  INITIAL_BUILD_BUDGETS,
  DASHBOARD_BUILD_BUDGETS,
  MAX_INITIAL_PAGES,
} from './starter-site';

// Load .env from the repository root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT || process.env.API_PORT || 3001;
const REPOS_BASE_DIR = process.env.REPOS_PATH || '/tmp/repos';
const PREVIEWS_DIR = process.env.PREVIEWS_DIR || '/tmp/previews';
const PUBLISHED_DIR = process.env.PUBLISHED_DIR || '/tmp/published';
const PREVIEW_TOKEN_SECRET = process.env.PREVIEW_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const PREVIEW_TOKEN_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours
const FRONTEND_BASE_URL = process.env.FRONTEND_URL || 'https://vibe-web-tau.vercel.app';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

/**
 * Extract user_id from a Supabase JWT in the Authorization header.
 *
 * Resolution order:
 *   1. Verify JWT with SUPABASE_JWT_SECRET (if secret is configured)
 *   2. Decode JWT without verification (extracts sub from a Supabase-issued token)
 *   3. body.user_id (frontend fallback)
 */
function extractUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Try verified decode first
    if (JWT_SECRET) {
      try {
        const payload = jwt.verify(token, JWT_SECRET, {
          algorithms: ['HS256'],
        }) as Record<string, unknown>;
        return (payload.sub as string) ?? null;
      } catch {
        // Verification failed — try unverified decode below
      }
    }
    // Decode without verification — safe for extracting sub from Supabase JWTs
    try {
      const payload = jwt.decode(token) as Record<string, unknown> | null;
      if (payload?.sub) return payload.sub as string;
    } catch {
      // Malformed token — fall through to body fallback
    }
  }
  // Final fallback: accept body.user_id from frontend
  return (req.body?.user_id as string) ?? null;
}

function signPreviewToken(jobId: string): string {
  const payload = JSON.stringify({ jobId, exp: Date.now() + PREVIEW_TOKEN_EXPIRY_MS });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', PREVIEW_TOKEN_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifyPreviewToken(token: string, requestedJobId: string): boolean {
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  const expectedSig = crypto.createHmac('sha256', PREVIEW_TOKEN_SECRET).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;
  try {
    const { jobId, exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (jobId !== requestedJobId) return false;
    if (Date.now() > exp) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Post-generation audit hook — writes one row to compliance_audit_log.
 * Non-blocking, fire-and-forget. A failed write never breaks the build.
 */
function writeAuditLog(params: {
  org_id: string;
  user_id: string;
  team_id: string | null;
  job_id: string;
  artifact_type: string;
  generated_output: string;
  skill_ids?: string[];
  skill_versions?: number[];
  department?: string;
  governance_version_id?: string;
}): void {
  // Fire-and-forget — runs async, never awaited
  (async () => {
    try {
      const artifact_hash = crypto.createHash('sha256').update(params.generated_output).digest('hex');
      await getPlatformSupabaseClient()
        .from('compliance_audit_log')
        .insert({
          org_id: params.org_id,
          user_id: params.user_id,
          team_id: params.team_id ?? null,
          job_id: params.job_id,
          artifact_type: params.artifact_type,
          artifact_hash,
          skill_ids: params.skill_ids ?? [],
          skill_versions: params.skill_versions ?? [],
          department: params.department ?? null,
          governance_version_id: params.governance_version_id ?? null,
        });
    } catch (err: any) {
      console.warn(`[AUDIT] Failed to write audit log for job ${params.job_id}: ${err.message}`);
    }
  })();
}

const DEPT_NUDGE_TEXT: Record<string, string> = {
  sales: 'Connect HubSpot to pull your live deals and contacts',
  marketing: 'Connect GA4 to show real traffic and conversion data',
  engineering: 'Connect GitHub to sync your repos and PRs',
  product: 'Connect Jira to pull your sprints and roadmap',
  hr: 'Connect BambooHR to sync employee and candidate data',
  finance: 'Connect QuickBooks to pull transactions and reports',
  legal: 'Connect DocuSign to track contracts and signatures',
  operations: 'Connect Airtable to sync your operational data',
  support: 'Connect HubSpot to pull your support tickets',
  data: 'Connect Airtable to pull your datasets',
};

function getGuidedNextSteps(prompt: string, department?: string): string[] {
  const lower = prompt.toLowerCase();
  const dataKeywords = /\b(revenue|pipeline|sales|dashboard|analytics|data|metrics|performance|report|forecast|crm|contacts|deals)\b/;
  const alreadyConnected = /\b(uploaded|csv|connected|hubspot|salesforce|airtable)\b/;
  if (dataKeywords.test(lower) && !alreadyConnected.test(lower)) {
    const nudge = (department && DEPT_NUDGE_TEXT[department]) ?? 'Connect your CRM (HubSpot or Salesforce) to populate this dashboard with live data';
    return [
      nudge,
      'Upload a CSV file with your data to see real numbers instead of placeholders',
      'Go to Marketplace → Connectors to set up your data sources',
    ];
  }
  return [];
}

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

  // Ensure body parsing for NestJS controllers (connectors, etc.)
  nestApp.use(require('express').json());
  nestApp.use(require('express').urlencoded({ extended: true }));

  // Get the underlying Express instance
  const app = nestApp.getHttpAdapter().getInstance();

  // Body parser for custom Express routes (NestJS handles its own controllers)
  app.use('/api/supabase', express.json(), supabaseRouter);
  app.use('/api/preview', previewPublicRouter);
  app.use('/api/preview', express.json(), previewRouter);
  // Stripe billing controller (handles its own body parsing per-route;
  // must be mounted BEFORE the legacy billingRouter so /webhook gets raw body)
  app.use('/api/billing', stripeBillingRouter);
  app.use('/api/billing', express.json(), billingRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/feeds', express.json(), feedsRouter);
  app.use('/api/approvals', express.json(), approvalsRouter);
  app.use('/api/notifications', express.json(), notificationsRouter);
  app.use('/api/webhooks', express.json(), webhooksRouter);
  app.use('/api/connectors/webhook', express.json(), webhooksRouter);

  // ── Skill trigger management ──
  { const skillTriggersRouter = (await import('./routes/skill-triggers')).default; app.use('/api/skills', express.json(), skillTriggersRouter); }

  // Serve static preview files (require signed preview token)
  app.use('/previews', (req: Request, res: Response, next: NextFunction) => {
    const token = (req.query.token as string | undefined)
      || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required to view previews' });
    }
    // Extract job ID from the URL path: /previews/:jobId/...
    const jobId = req.path.split('/')[1];
    if (!jobId || !verifyPreviewToken(token, jobId)) {
      return res.status(403).json({ error: 'Invalid or expired preview token' });
    }
    return next();
  }, express.static(PREVIEWS_DIR));

  // Serve static published files
  app.use('/published', express.static(PUBLISHED_DIR));

  // ── Kernel diagnostic (extracted to routes/kernel.ts) ──
  { const kernelRouter = (await import('./routes/kernel')).default; app.use(kernelRouter); }

  // ── Organization routes ──

  // ── Org & team routes (extracted to routes/orgs-teams.ts) ──
  { const orgsTeamsRouter = (await import('./routes/orgs-teams')).default; app.use(orgsTeamsRouter); }

  // ── Team domain routes ──
  app.use('/teams', express.json(), extractTenantFromJwt(), teamsDomainRouter);

  // ── Project routes ──

  // POST /projects - Create a new project (team_id optional — falls back to default team)
  app.post('/projects', express.json(), async (req: Request, res: Response) => {
    try {
      const { name, team_id: rawTeamId, repository_url, template = 'empty', upload_id: projUploadId } = req.body;

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

      // ── Tier-based project limit enforcement ──
      if (team.org_id) {
        const { tier_slug } = await storage.getOrgTier(team.org_id);
        const limits = VibeStorage.TIER_LIMITS[tier_slug] || VibeStorage.TIER_LIMITS.starter;
        const projectCount = await storage.getProjectCountForOrg(team.org_id);
        if (projectCount >= limits.projects) {
          const nextTier = tier_slug === 'starter' ? 'pro' : tier_slug === 'pro' ? 'growth' : 'team';
          return res.status(402).json({
            error: 'limit_exceeded',
            limitType: 'projects',
            current: projectCount,
            max: limits.projects,
            currentTier: tier_slug,
            nextTier,
          });
        }
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
          execSync('git config user.email "bot@vibe.ubigrowth.ai"', { cwd: repoDir });
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
        upload_id: projUploadId || null,
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
  app.post('/projects/import/github', express.json(), async (req: Request, res: Response) => {
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

      // ── Tier-based project limit enforcement ──
      if (team.org_id) {
        const { tier_slug } = await storage.getOrgTier(team.org_id);
        const limits = VibeStorage.TIER_LIMITS[tier_slug] || VibeStorage.TIER_LIMITS.starter;
        const projectCount = await storage.getProjectCountForOrg(team.org_id);
        if (projectCount >= limits.projects) {
          const nextTier = tier_slug === 'starter' ? 'pro' : tier_slug === 'pro' ? 'growth' : 'team';
          return res.status(402).json({
            error: 'limit_exceeded',
            limitType: 'projects',
            current: projectCount,
            max: limits.projects,
            currentTier: tier_slug,
            nextTier,
          });
        }
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

  // ── Conversation endpoints (extracted to routes/conversations.ts) ──
  { const convRouter = (await import('./routes/conversations')).default; app.use(convRouter); }

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

  // POST /jobs/:id/publish - Upload job HTML to Supabase Storage (permanent public URL)
  app.post('/jobs/:id/publish', express.json(), async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const user_id = extractUserId(req);

      if (!user_id) {
        return res.status(401).json({ error: 'Authentication required: provide a valid Authorization header' });
      }

      const job = await storage.getTask(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      if (!job.last_diff) {
        return res.status(400).json({ error: 'Job has no generated HTML to publish' });
      }

      // Extract HTML from last_diff (may be JSON array of pages or raw HTML)
      let html: string;
      const trimmed = job.last_diff.trim();
      if (trimmed.startsWith('[')) {
        try {
          const pages = JSON.parse(trimmed) as { html: string }[];
          html = pages[0]?.html || trimmed;
        } catch {
          html = trimmed;
        }
      } else {
        html = trimmed;
      }

      // Strip markdown fences if present
      html = html.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

      const sb = getPlatformSupabaseClient();
      const BUCKET = 'published-sites';

      // Ensure bucket exists (idempotent)
      const { error: bucketErr } = await sb.storage.createBucket(BUCKET, { public: true });
      if (bucketErr && !bucketErr.message.includes('already exists')) {
        return res.status(500).json({ error: `Storage bucket error: ${bucketErr.message}` });
      }

      const storagePath = `${user_id}/${jobId}/index.html`;
      const { error: uploadErr } = await sb.storage.from(BUCKET).upload(storagePath, html, {
        contentType: 'text/html',
        upsert: true,
      });
      if (uploadErr) {
        return res.status(500).json({ error: `Upload failed: ${uploadErr.message}` });
      }

      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
      const publishedUrl = urlData.publicUrl;

      // Save published URL to jobs.preview_url
      const { error: updateErr } = await sb.from('jobs').update({ preview_url: publishedUrl }).eq('id', jobId);
      if (updateErr) {
        console.error('Failed to save published URL to job:', updateErr.message);
      }

      // Also persist to the projects table so the short URL (/s/:projectId) works
      if (job.project_id) {
        try {
          await storage.publishProject(job.project_id, jobId, publishedUrl);
        } catch (projErr: any) {
          console.error('Failed to save published URL to project:', projErr.message);
        }
      }

      res.json({ published_url: publishedUrl, job_id: jobId });
    } catch (error: any) {
      console.error('Error publishing job:', error);
      res.status(500).json({ error: `Publish failed: ${error.message}` });
    }
  });

  // ── File upload (extracted to routes/upload.ts) ──
  { const uploadRouter = (await import('./routes/upload')).default; app.use(uploadRouter); }

  // ── Job routes ──

  // POST /jobs - Create a new VIBE task
  app.post('/jobs', express.json(), async (req: Request, res: Response) => {
    try {
      const { prompt, project_id, base_branch = 'main', target_branch, model, mode = 'starter', type = 'standard', debug_job_id, upload_id: bodyUploadId, conversation_id } = req.body;
      const user_id = extractUserId(req);
      const budgets = (mode === 'dashboard') ? DASHBOARD_BUILD_BUDGETS : INITIAL_BUILD_BUDGETS;
      // Model resolved after org lookup below
      let resolvedModel: string = ['claude', 'gpt', 'deepseek', 'gemini', 'fireworks'].includes(model) ? model : '';

      if (!user_id) {
        return res.status(401).json({ error: 'Authentication required: provide a valid Authorization header' });
      }
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

      // Resolve upload_id: request body takes precedence, fall back to project record
      const upload_id = bodyUploadId || (project as any).upload_id || undefined;

      // Resolve team name for mode inference
      const team = await storage.getTeam(project.team_id);
      const teamName = team?.name ?? '';
      const resolvedMode = resolveMode(prompt, teamName);
      const auditDepartment = resolveDepartment(teamName);

      // Budget enforcement via org
      const org = await storage.getOrgForProject(project_id);

      // Resolve LLM: explicit request param > org preference > deepseek default
      if (!resolvedModel && org?.id) {
        const { data: orgRow } = await getPlatformSupabaseClient()
          .from('organizations').select('preferred_llm').eq('id', org.id).single();
        resolvedModel = orgRow?.preferred_llm || 'deepseek';
      }
      if (!resolvedModel) resolvedModel = 'deepseek';

      // ── Tier-based project limit enforcement ──
      if (org) {
        const { tier_slug, credits_used_this_period } = await storage.getOrgTier(org.id);
        const limits = VibeStorage.TIER_LIMITS[tier_slug] || VibeStorage.TIER_LIMITS.starter;
        const projectCount = await storage.getProjectCountForOrg(org.id);
        if (projectCount >= limits.projects) {
          const nextTier = tier_slug === 'starter' ? 'pro' : tier_slug === 'pro' ? 'growth' : 'team';
          return res.status(402).json({
            error: 'limit_exceeded',
            limitType: 'projects',
            current: projectCount,
            max: limits.projects,
            currentTier: tier_slug,
            nextTier,
          });
        }
        if (credits_used_this_period >= limits.credits) {
          const nextTier = tier_slug === 'starter' ? 'pro' : tier_slug === 'pro' ? 'growth' : 'team';
          return res.status(402).json({
            error: 'limit_exceeded',
            limitType: 'credits',
            current: credits_used_this_period,
            max: limits.credits,
            currentTier: tier_slug,
            nextTier,
          });
        }
      }

      // Golden template matching: if prompt matches a template, inject its content directly
      let goldenMatch: GoldenMatch = { matched: false, skillName: '', content: '', htmlSkeleton: null, sampleData: null };
      try {
        goldenMatch = await resolveGoldenTemplateMatch(prompt);
      } catch (gtmErr: any) {
        console.warn(`[GOLDEN] resolveGoldenTemplateMatch failed (non-blocking): ${gtmErr.message}`);
      }

      // Prompt enrichment: kernel context, golden template, conversation, upload, prior-job
      // Extracted to handlers/enrich-prompt.handler.ts
      const enrichResult = await enrichPrompt({
        prompt, user_id, org, project_id, project, mode,
        goldenMatch, upload_id, conversation_id,
      });
      let enrichedPrompt = enrichResult.enrichedPrompt;
      const injectSupabaseHelpers = enrichResult.injectSupabaseHelpers;
      let resolvedConversationId = enrichResult.resolvedConversationId;

      if (org) {
        try {
          const budgetLimit = await storage.getTenantBudget(org.id);
          if (budgetLimit !== null) {
            const currentSpend = await storage.getTenantSpend(org.id);
            if (currentSpend >= budgetLimit) {
              return res.status(402).json({
                error: `Budget exceeded: $${currentSpend.toFixed(4)} spent of $${budgetLimit.toFixed(2)} limit.`,
              });
            }
          }
        } catch (budgetErr: any) {
          console.warn(`[BILLING] Budget check failed (non-blocking): ${budgetErr.message}`);
        }
      }

      const taskId = uuidv4();
      const now = new Date().toISOString();
      const finalBaseBranch = base_branch || 'main';
      const finalTargetBranch = target_branch || `vibe/${taskId.slice(0, 8)}`;

      // Auto-create conversation if none provided — best-effort, never blocks job creation
      if (!resolvedConversationId) {
        try {
          const conv = await storage.createConversation({
            project_id,
            title: prompt.slice(0, 100),
            created_by: user_id,
          });
          resolvedConversationId = conv.id;
        } catch (convErr: any) {
          console.warn(`[CONVERSATION] Auto-create failed (non-blocking): ${convErr.message}`);
        }
      }

      // Store the user message in the conversation (best-effort)
      if (resolvedConversationId) {
        try {
          await storage.addMessage({
            conversation_id: resolvedConversationId,
            role: 'user',
            content: prompt,
          });
        } catch (msgErr: any) {
          console.warn(`[CONVERSATION] Failed to store user message: ${msgErr.message}`);
        }
      }

      await storage.createTask({
        task_id: taskId,
        user_prompt: prompt,
        project_id,
        conversation_id: resolvedConversationId,
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
        conversation_id: resolvedConversationId,
        status: 'queued',
        message: 'Task created successfully',
      });

      // Fire-and-forget: process the job asynchronously
      (async () => {
        try {
          // ── Debug job routing ──
          if (type === 'debug' && debug_job_id) {
            await storage.updateTaskState(taskId, 'building');
            await storage.logEvent(taskId, `[DEBUG] Debug job for failed task ${debug_job_id}`, 'info');

            // Fetch error logs from the failed job
            const failedEvents = await storage.getTaskEvents(debug_job_id);
            const errorLogs = failedEvents
              .filter((e) => e.severity === 'error' || e.severity === 'warning')
              .map((e) => `[${e.severity}] ${e.event_message}`)
              .join('\n');

            await storage.logEvent(taskId, `[DEBUG] Collected ${failedEvents.length} events, ${errorLogs.length} chars of error context`, 'info');

            // Resolve repo path from project
            const repoPath = project.local_path;
            if (!repoPath || !fs.existsSync(repoPath)) {
              throw new Error(`Debug agent requires a local repo but project ${project_id} has no valid local_path: ${repoPath}`);
            }

            // Run the iterative debug agent (retries up to MAX_DEBUG_ITERATIONS)
            const debugResult = await runDebugAgent(taskId, repoPath, errorLogs);

            if (debugResult.success) {
              // Read the built index.html from the repo for preview
              const builtIndex = path.join(repoPath, 'out', 'index.html');
              const previewDir = path.join(PREVIEWS_DIR, taskId);
              fs.mkdirSync(previewDir, { recursive: true });

              if (fs.existsSync(builtIndex)) {
                fs.copyFileSync(builtIndex, path.join(previewDir, 'index.html'));
              }
              fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(['index']));

              const html = fs.existsSync(builtIndex) ? fs.readFileSync(builtIndex, 'utf-8') : '';
              await storage.setTaskDiff(taskId, JSON.stringify([{ name: 'Home', filename: 'index.html', route: '/', html }]));
              const previewToken = signPreviewToken(taskId);
              await storage.setPreviewUrl(taskId, `${FRONTEND_BASE_URL}/previews/${taskId}/index.html?token=${previewToken}`);
              await storage.logEvent(taskId, `[DEBUG] Fix applied after ${debugResult.iterations} iteration(s). ${debugResult.healedIssues ?? 0} component issue(s) healed.`, 'success');
              await storage.updateTaskState(taskId, 'completed');
              if (org) await storage.incrementCreditsUsed(org.id).catch(() => {});
              if (org) writeAuditLog({ org_id: org.id, user_id: user_id!, team_id: project.team_id, job_id: taskId, artifact_type: 'debug_fix', generated_output: html, department: auditDepartment });
            } else {
              await storage.logEvent(taskId, `[DEBUG] Agent failed: ${debugResult.summary}`, 'error');
              await storage.updateTaskState(taskId, 'failed');
            }
            return;
          }

          await storage.updateTaskState(taskId, 'calling_llm');
          const supabaseUrl = (process.env.SUPABASE_URL || 'https://ptaqytvztkhjpuawdxng.supabase.co').trim();
          const supabaseKey = process.env.SUPABASE_ANON_KEY?.trim();
          if (!supabaseKey) throw new Error('SUPABASE_ANON_KEY not configured');

          // Replace Supabase placeholders and ensure vibeLoadData is defined in <head>
          const VIBE_LOAD_DATA_SCRIPT = `<script>
if(typeof vibeLoadData==='undefined'){
async function vibeLoadData(table,filters){filters=filters||{};var url=window.__VIBE_SUPABASE_URL__;var key=window.__VIBE_SUPABASE_ANON_KEY__;if(!url||!key){console.error('[vibeLoadData] missing URL or key');return[];}var token=key;try{var ref=url.split('//')[1].split('.')[0];var s=JSON.parse(localStorage.getItem('sb-'+ref+'-auth-token')||'{}');if(s.access_token)token=s.access_token;}catch(e){}var ep=url+'/rest/v1/'+table+'?select=*';Object.entries(filters).forEach(function(p){if(p[1])ep+='&'+p[0]+'=eq.'+p[1];});console.log('[vibeLoadData] fetching from:',ep);try{var r=await fetch(ep,{headers:{'apikey':key,'Authorization':'Bearer '+token}});if(!r.ok){console.error('[vibeLoadData] error:',r.status);return[];}var rows=await r.json();console.log('[vibeLoadData] result:',rows.length,'rows');return rows;}catch(e){console.error('[vibeLoadData] fetch failed:',e);return[];}
}}</script>`;
          const injectSupabaseCredentials = (html: string): string => {
            let result = html.replace(/__SUPABASE_URL__/g, supabaseUrl).replace(/__SUPABASE_ANON_KEY__/g, supabaseKey).replace(/__TEAM_ID__/g, project.team_id || '').replace(/__VIBE_TEAM_ID__/g, project.team_id || '').replace(/\bfade-up\b/g, 'animate-in');
            // Inject vibeLoadData — try <head>, fallback to <html>, fallback to prepend
            if (result.toLowerCase().includes('<head>')) {
              result = result.replace(/(<head[^>]*>)/i, `$1\n${VIBE_LOAD_DATA_SCRIPT}`);
            } else if (result.toLowerCase().includes('<html>')) {
              result = result.replace(/(<html[^>]*>)/i, `$1\n<head>${VIBE_LOAD_DATA_SCRIPT}</head>`);
            } else if (result.toLowerCase().includes('<!doctype')) {
              result = result.replace(/(<!doctype[^>]*>)/i, `$1\n<head>${VIBE_LOAD_DATA_SCRIPT}</head>`);
            } else {
              result = `${VIBE_LOAD_DATA_SCRIPT}\n${result}`;
            }
            return result;
          };

          const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-diff`;
          const headers = {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          };
          let fallbacks = 0;
          let retries = 0;

          /** Classify error type: 'timeout' retries Claude only, 'rate-limit' allows GPT fallback. */
          const classifyError = (status: number, text: string, err?: any): { type: 'timeout' | 'rate-limit' | 'none'; reason: string } => {
            // Timeout errors — retry Claude, NEVER fall back to GPT-4
            if (status === 504) return { type: 'timeout', reason: `HTTP 504 gateway timeout` };
            if (err?.code === 'ETIMEDOUT') return { type: 'timeout', reason: `ETIMEDOUT` };
            if (err?.type === 'request-timeout') return { type: 'timeout', reason: `request-timeout` };
            if (err?.name === 'AbortError') return { type: 'timeout', reason: `fetch aborted (timeout)` };
            // Rate-limit / overload — eligible for GPT-4 fallback
            if (status === 402) return { type: 'rate-limit', reason: `HTTP 402 payment required` };
            if (status === 429) return { type: 'rate-limit', reason: `HTTP 429 rate limit` };
            if (status === 529) return { type: 'rate-limit', reason: `HTTP 529 overloaded` };
            return { type: 'none', reason: `HTTP ${status}: ${text.slice(0, 120)}` };
          };

          // Pass team/org identity to edge function for thin wrapper interpolation
          const orgName = org?.name ?? '';
          const edgeCall = async (payload: any): Promise<{ text: string; ok: boolean; status: number }> => {
            const model = payload.model || resolvedModel;
            const attempt = async (m: string): Promise<{ text: string; ok: boolean; status: number }> => {
              const controller = new AbortController();
              // Dashboard mode uses single LLM call — 180s client timeout (Supabase 150s wall-time applies server-side)
              const fetchTimeoutMs = payload.mode === 'dashboard' ? 180_000 : 120_000;
              const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
              try {
                const res = await fetch(edgeFunctionUrl, {
                  method: 'POST',
                  headers: { ...headers },
                  body: JSON.stringify({ ...payload, model: m, team_name: teamName, org_name: orgName, inject_supabase_helpers: injectSupabaseHelpers }),
                  signal: controller.signal,
                });
                const text = await res.text();
                return { text, ok: res.ok, status: res.status };
              } finally {
                clearTimeout(timeout);
              }
            };

            let result: { text: string; ok: boolean; status: number };
            try {
              result = await attempt(model);
            } catch (fetchErr: any) {
              // Network-level error (timeout, DNS, etc.)
              const classification = classifyError(0, '', fetchErr);
              if (classification.type === 'timeout') {
                // Timeout — retry Claude once with backoff, then fail. Never GPT-4.
                console.log(`[LLM-TIMEOUT] retrying Claude: ${classification.reason}`);
                retries += 1;
                await new Promise(r => setTimeout(r, 2000 + Math.floor(Math.random() * 1000)));
                try {
                  return await attempt(model);
                } catch (retryErr: any) {
                  console.error(`[LLM-TIMEOUT] Claude retry failed: ${retryErr?.message || retryErr}`);
                  return { text: JSON.stringify({ error: 'Build timed out. Please try again.' }), ok: false, status: 504 };
                }
              }
              if (classification.type === 'rate-limit') {
                console.log(`[LLM-FALLBACK] triggered on fetch error: ${classification.reason}`);
                fallbacks += 1;
                const fallbackModel = model === 'deepseek' ? 'gpt' : 'deepseek';
                return attempt(fallbackModel);
              }
              throw fetchErr;
            }

            if (result.ok) return result;

            const classification = classifyError(result.status, result.text);
            if (classification.type === 'none') {
              // Non-retriable error — fail fast, no fallback
              return result;
            }

            if (classification.type === 'timeout') {
              // HTTP 504 — retry Claude once, then return error. Never GPT-4.
              console.log(`[LLM-TIMEOUT] retrying Claude: ${classification.reason}`);
              retries += 1;
              await new Promise(r => setTimeout(r, 2000 + Math.floor(Math.random() * 1000)));
              result = await attempt(model);
              if (result.ok) return result;
              console.error(`[LLM-TIMEOUT] Claude retry failed, returning error`);
              return { text: JSON.stringify({ error: 'Build timed out. Please try again.' }), ok: false, status: 504 };
            }

            // Rate-limit (429/529/402) — one retry with same model, then GPT fallback
            console.log(`[LLM-FALLBACK] retry triggered: ${classification.reason}`);
            retries += 1;
            await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 250)));
            result = await attempt(model);
            if (result.ok) return result;

            console.log(`[LLM-FALLBACK] fallback triggered after retry: ${classification.reason}`);
            fallbacks += 1;
            const fallbackModel = model === 'deepseek' ? 'gpt' : 'deepseek';
            return attempt(fallbackModel);
          };

          let totalTokens = 0;
          let modelCalls = 0;
          let pageNames: string[] = [];
          const startedAtMs = Date.now();
          const timeline: any[] = [];

          // Steps that represent real forward progress in the tracker UI
          const forwardSteps = new Set(['planning', 'building', 'validating', 'ux']);
          const runStep = async <T>(name: 'planning' | 'building' | 'validating' | 'security' | 'ux' | 'self-healing', fn: () => Promise<T>): Promise<T> => {
            const start = Date.now();
            if (forwardSteps.has(name)) {
              await storage.updateTaskState(taskId, name);
            }
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

          const team = await storage.getTeam(project.team_id);
          const teamName = team?.name ?? '';
          const resolvedMode = resolveMode(prompt, teamName);
          await storage.logEvent(taskId, `[DIAG] resolvedMode=${resolvedMode} teamName=${teamName} upload_id=${upload_id}`, "info");

          // ── Single-page navigation rule ──
          // All output must live in one HTML file; nav links show/hide sections via JS.
          enrichedPrompt += `\n\nNAVIGATION RULE (MANDATORY): Navigation links must use JavaScript onclick handlers to show/hide sections within the same page — never use href links to separate .html files. All content must exist in a single HTML file with sections toggled by JS.`;

          // ── Recommendation mode ── v7.1 Track 1
          // Autonomous executions (and any caller passing mode: 'recommendation') get a
          // structured JSON card, NOT a dashboard. This path is short-circuited before
          // every fast path so it bypasses the dashboard handler entirely. The card
          // lands in job_events (severity = 'recommendation') for the Build tab UI in
          // Track 2 to render. Dashboard fast path is untouched — see CLAUDE.md §2.1.
          if (mode === 'recommendation') {
            const recCall = await edgeCall({ prompt: enrichedPrompt, mode: 'recommendation', model: resolvedModel });
            modelCalls += 1;
            if (!recCall.ok) {
              await storage.logEvent(taskId, `[recommendation] edge function error ${recCall.status}: ${recCall.text.slice(0, 500)}`, 'error');
              await storage.updateTaskState(taskId, 'failed');
              return;
            }
            let recPayload: any;
            try {
              recPayload = JSON.parse(recCall.text);
            } catch (e: any) {
              await storage.logEvent(taskId, `[recommendation] invalid JSON from edge function: ${e.message}`, 'error');
              await storage.updateTaskState(taskId, 'failed');
              return;
            }
            if (recPayload?.error || !recPayload?.recommendation) {
              await storage.logEvent(taskId, `[recommendation] edge function returned error: ${JSON.stringify(recPayload).slice(0, 500)}`, 'error');
              await storage.updateTaskState(taskId, 'failed');
              return;
            }
            const rec = recPayload.recommendation;
            totalTokens += recPayload.usage?.total_tokens ?? 0;
            // Persist the recommendation card to job_events — severity 'recommendation'.
            // Frontend subscribes via Supabase realtime and renders the card in Build tab.
            await storage.logEvent(taskId, JSON.stringify(rec), 'recommendation');
            await storage.logEvent(taskId, `[recommendation] card produced (${totalTokens} tokens, model=${recPayload.model})`, 'success');
            await storage.updateTaskState(taskId, 'completed');
            if (org) await storage.incrementCreditsUsed(org.id).catch(() => {});
            if (org) writeAuditLog({ org_id: org.id, user_id: user_id!, team_id: project.team_id, job_id: taskId, artifact_type: 'recommendation', generated_output: JSON.stringify(rec), department: auditDepartment });
            return;
          }

          // ── Deterministic template path ── extracted to handlers/fast-paths.handler.ts
          if (await handleDeterministicTemplate({
            taskId, goldenMatch, org, orgName, teamName, prompt, project,
            user_id: user_id!, auditDepartment, startedAtMs, timeline,
            injectSupabaseCredentials, signPreviewToken, writeAuditLog,
            PREVIEWS_DIR, FRONTEND_BASE_URL,
          })) return;

          // ── App fast path ── extracted to handlers/fast-paths.handler.ts
          {
            const appParams = {
              taskId, upload_id, resolvedMode, teamName, enrichedPrompt, resolvedModel,
              org, project, user_id: user_id!, auditDepartment,
              modelCalls, totalTokens, pageNames, timeline,
              edgeCall, injectSupabaseCredentials, signPreviewToken, writeAuditLog,
              PREVIEWS_DIR, FRONTEND_BASE_URL,
            };
            if (await handleAppFastPath(appParams)) {
              modelCalls = appParams.modelCalls;
              totalTokens = appParams.totalTokens;
              pageNames = appParams.pageNames;
              return;
            }
          }

          // ── Dashboard fast path ── bypass planner, single Edge call ──
          // Extracted to handlers/dashboard.handler.ts
          {
            const dashParams = {
              taskId, resolvedMode, upload_id, org, prompt, enrichedPrompt,
              project, user_id: user_id!, resolvedModel, budgets, goldenMatch,
              startedAtMs, modelCalls, totalTokens, timeline, pageNames,
              auditDepartment, edgeCall, injectSupabaseCredentials,
              signPreviewToken, writeAuditLog, PREVIEWS_DIR, FRONTEND_BASE_URL,
              MAX_INITIAL_PAGES,
            };
            const handled = await handleDashboardJob(dashParams);
            if (handled) {
              // Sync back mutable counters
              modelCalls = dashParams.modelCalls;
              totalTokens = dashParams.totalTokens;
              pageNames = dashParams.pageNames;
              return;
            }
          }

          // ── Planner pipeline — plan → build → validate → finalize ──
          // Extracted to handlers/planner.handler.ts
          {
            const plannerParams = {
              taskId, prompt, enrichedPrompt, resolvedMode, resolvedModel, mode,
              budgets, goldenMatch, org, project, user_id: user_id!,
              startedAtMs, modelCalls, totalTokens, retries, fallbacks,
              timeline, pageNames, auditDepartment, resolvedConversationId,
              edgeCall, injectSupabaseCredentials, signPreviewToken, writeAuditLog,
              runStep, PREVIEWS_DIR, FRONTEND_BASE_URL, MAX_INITIAL_PAGES,
            };
            await handlePlannerPipeline(plannerParams);
            modelCalls = plannerParams.modelCalls;
            totalTokens = plannerParams.totalTokens;
            pageNames = plannerParams.pageNames;
          }
        } catch (err: any) {
          console.error(`Job ${taskId} failed:`, err.message);
          await storage.updateTaskState(taskId, 'failed');
          await storage.logEvent(taskId, `Job failed: ${err.message}`, 'error');
          // Store failure in conversation
          if (resolvedConversationId) {
            await storage.addMessage({
              conversation_id: resolvedConversationId,
              role: 'assistant',
              content: `Build failed: ${err.message}`,
              job_id: taskId,
              metadata: { execution_state: 'failed' },
            }).catch(() => {}); // Don't let message storage failure mask the real error
          }
        }
      })();
    } catch (error: any) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error('Error creating task:', detail);
      res.status(500).json({ error: `Failed to create task: ${detail}` });
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
      let department: string | undefined;
      if (task.project_id) {
        const project = await storage.getProject(task.project_id);
        if (project) {
          const team = await storage.getTeam(project.team_id);
          if (team) department = resolveDepartment(team.name);
        }
      }
      // Skip guided_next_steps if the prompt matched a golden template
      const templateMatch = await resolveGoldenTemplateMatch(task.user_prompt ?? '');
      const guided_next_steps = templateMatch.matched ? [] : getGuidedNextSteps(task.user_prompt ?? '', department);
      res.json({ ...task, job_timeline, guided_next_steps, department, golden_template: templateMatch.matched ? templateMatch.skillName : undefined });
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

  app.post('/jobs/:id/diff/apply', express.json(), async (req: Request, res: Response) => {
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

  app.post('/jobs/:id/preview', express.json(), async (req: Request, res: Response) => {
    try {
      const { preview_url } = req.body;
      if (!preview_url) return res.status(400).json({ error: 'preview_url is required' });
      const task = await storage.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      const token = signPreviewToken(req.params.id);
      const absoluteUrl = preview_url.startsWith('http') ? preview_url : `${FRONTEND_BASE_URL}${preview_url}`;
      const separator = absoluteUrl.includes('?') ? '&' : '?';
      const signedUrl = `${absoluteUrl}${separator}token=${token}`;
      await storage.setPreviewUrl(req.params.id, signedUrl);
      res.json({ message: 'Preview URL updated successfully', preview_token: token });
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
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      let closed = false;

      const send = (data: unknown) => {
        if (closed) return;
        try {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch { /* client already disconnected */ }
      };

      // Heartbeat — keeps the connection alive through Railway/Vercel proxies
      // that would otherwise kill idle SSE connections after 30-60s
      const heartbeat = setInterval(() => {
        if (!closed) res.write(': ping\n\n');
      }, 15000);

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

      req.on('close', () => { closed = true; clearInterval(interval); clearInterval(heartbeat); res.end(); });
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

  // Start the autonomous execution runner (polls for pending executions)
  startExecutionRunner();
}

bootstrap().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

// cache-bust: 20260404
