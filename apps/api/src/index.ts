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
import { resolveKernelContext } from './kernel/context-injector';
import { runDebugAgent, runSelfHealingScan } from './lib/debug-agent';
import { promisify } from 'util';
import { resolveMode } from './edge-function';
import { isBudgetRelated } from './lib/ingest-budget-csv';
import { ingestTeamAsset, detectAssetType, hasPublishIntent } from './lib/ingest-team-asset';

const execAsync = promisify(exec);
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import supabaseRouter from './routes/supabase';
import previewRouter from './routes/preview';
import billingRouter from './routes/billing';
import stripeBillingRouter from './billing/billing.controller';
import financeRouter from './routes/finance';
import { getPlatformSupabaseClient } from './supabase/client';
import {
  INITIAL_BUILD_BUDGETS,
  DASHBOARD_BUILD_BUDGETS,
  MAX_INITIAL_PAGES,
  StarterSitePlan,
  buildStarterSitePlan,
  resolveColorScheme,
  buildColorBlock,
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
const PREVIEW_TOKEN_SECRET = process.env.PREVIEW_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const PREVIEW_TOKEN_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours
const FRONTEND_BASE_URL = process.env.FRONTEND_URL || 'https://vibe-web-tau.vercel.app';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

/**
 * Extract user_id from a verified Supabase JWT in the Authorization header.
 * Falls back to body.user_id for backwards compatibility during migration.
 */
function extractUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ') && JWT_SECRET) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET, {
        algorithms: ['HS256'],
      }) as Record<string, unknown>;
      return (payload.sub as string) ?? null;
    } catch {
      // Token invalid — fall through to body fallback
    }
  }
  // Backwards compat: accept body.user_id if no valid JWT
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

function getGuidedNextSteps(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const dataKeywords = /\b(revenue|pipeline|sales|dashboard|analytics|data|metrics|performance|report|forecast|crm|contacts|deals)\b/;
  const alreadyConnected = /\b(uploaded|csv|connected|hubspot|salesforce|airtable)\b/;
  if (dataKeywords.test(lower) && !alreadyConnected.test(lower)) {
    return [
      'Connect your CRM (HubSpot or Salesforce) to populate this dashboard with live data',
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
  app.use('/api/preview', express.json(), previewRouter);
  // Stripe billing controller (handles its own body parsing per-route;
  // must be mounted BEFORE the legacy billingRouter so /webhook gets raw body)
  app.use('/api/billing', stripeBillingRouter);
  app.use('/api/billing', express.json(), billingRouter);
  app.use('/api/finance', financeRouter);

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
      const resolvedModel: 'claude' | 'gpt' = model === 'gpt' ? 'gpt' : 'claude';

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

      // Budget enforcement via org
      const org = await storage.getOrgForProject(project_id);

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

      // Kernel context injection: prepend team/role/brand identity to prompt
      let enrichedPrompt = prompt;
      let injectSupabaseHelpers = false;
      if (user_id && org) {
        const kernel = await resolveKernelContext(user_id, org.id, project.team_id);
        if (kernel.context) {
          enrichedPrompt = `${kernel.context}\n\nUSER REQUEST:\n${prompt}`;
          injectSupabaseHelpers = kernel.injectSupabaseHelpers;
        }
      }

      // Conversation context injection: if continuing a conversation, inject prior messages
      let resolvedConversationId = conversation_id;
      if (resolvedConversationId) {
        try {
          const conversationContext = await storage.getConversationContext(resolvedConversationId, 10);
          if (conversationContext) {
            enrichedPrompt = `CONVERSATION HISTORY (prior messages in this session):\n${conversationContext}\n\nNEW REQUEST:\n${enrichedPrompt}`;
          }
        } catch (ctxErr: any) {
          console.warn(`[CONVERSATION] Failed to load context (non-blocking): ${ctxErr.message}`);
        }
      }

      // Upload context injection: if user attached a file, inject table_name + schema + sample rows
      if (upload_id) {
        const { data: uploadRow, error: uploadErr } = await getPlatformSupabaseClient()
          .from('user_uploads')
          .select('original_filename, table_name, columns, column_schema, sample_data, row_count, aggregated_stats')
          .eq('id', upload_id)
          .single();

        if (uploadErr) {
          console.warn(`[UPLOAD] Failed to fetch upload ${upload_id}: ${uploadErr.message}`);
        } else if (uploadRow) {
          // Link the upload to this project if it wasn't set at upload time
          if (project_id) {
            await getPlatformSupabaseClient()
              .from('user_uploads')
              .update({ project_id })
              .eq('id', upload_id);
          }
          const schema = uploadRow.column_schema as Record<string, string>;
          const schemaStr = Object.entries(schema).map(([k, v]) => `${k} (${v})`).join(', ');
          const stats = uploadRow.aggregated_stats as Record<string, unknown> | null;

          let dataContext: string;
          if (stats && Object.keys(stats).length > 0) {
            // Use real aggregated stats — correct totals, distributions, min/max/mean
            const statsJson = JSON.stringify(stats, null, 2);
            const sampleRows = uploadRow.sample_data as Record<string, unknown>[];
            const sampleJson = JSON.stringify(sampleRows.slice(0, 5), null, 2);
            dataContext = `The user has uploaded data. Table: ${uploadRow.table_name}. Columns: ${schemaStr}. Total rows: ${uploadRow.row_count}.

AGGREGATED STATS (computed from ALL ${uploadRow.row_count} rows — use these for totals, charts, and summaries):
${statsJson}

SAMPLE ROWS (first 5, for format reference only — do NOT use these for totals or counts):
${sampleJson}

Build the dashboard using the AGGREGATED STATS above for all numbers, totals, charts, and breakdowns. Embed the aggregated data directly in the HTML as JavaScript variables. Do not use placeholder or mock data. Do not compute totals from sample rows.\n\n`;
          } else {
            // Fallback for uploads created before aggregated_stats existed
            const sampleRows = uploadRow.sample_data as Record<string, unknown>[];
            const sampleJson = JSON.stringify(sampleRows, null, 2);
            dataContext = `The user has uploaded data. Table: ${uploadRow.table_name}. Columns: ${schemaStr}. Total rows: ${uploadRow.row_count}. Here are sample rows (first ${sampleRows.length} rows):\n${sampleJson}\nBuild the dashboard using this real data. Embed the data directly in the HTML as a JavaScript variable. Do not use placeholder or mock data.\n\n`;
          }
          enrichedPrompt = dataContext + enrichedPrompt;
          console.log(`[UPLOAD] Injected context — table=${uploadRow.table_name}, ${uploadRow.row_count} rows, schema=${schemaStr}, hasAggregates=${!!stats}`);
        }
      }

      // Prior-job context: inject existing pages so the LLM patches instead of rebuilding.
      // Single injection point — the duplicate getPriorDiffForProject() call was removed
      // to prevent the known double-injection bug (prior context appearing twice in prompt).
      const promptLenBefore = enrichedPrompt.length;
      const { data: priorJob } = await getPlatformSupabaseClient()
        .from('jobs')
        .select('last_diff')
        .eq('project_id', project_id)
        .eq('execution_state', 'completed')
        .not('last_diff', 'is', null)
        .order('initiated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (priorJob?.last_diff) {
        try {
          const pages = JSON.parse(priorJob.last_diff) as Array<{ name?: string; html?: string }>;
          if (Array.isArray(pages) && pages.length > 0) {
            const existingPages = pages
              .filter((p) => {
                if (typeof p?.name !== 'string' || typeof p?.html !== 'string') return false;
                const h = p.html.trimStart();
                // Skip truncated/broken pages (< 2KB is likely incomplete for a dashboard)
                if (p.html.length < 2000) return false;
                return h.startsWith('<!DOCTYPE') || h.startsWith('<html');
              })
              .map((p) => `PAGE: ${p.name}\n${p.html}`)
              .join('\n---\n');
            // Deduplication guard: only inject if not already present in prompt
            if (existingPages && !enrichedPrompt.includes('EXISTING PAGES (patch these')) {
              enrichedPrompt =
                `CRITICAL OUTPUT RULE: Your response must start with <!DOCTYPE html> — no explanation, no commentary, no markdown fences before or after the HTML.\n\nEXISTING PAGES (patch these, do not rebuild from scratch):\n${existingPages}\n\nThe user wants to make this change to the existing output above. Modify it to incorporate the change. Do NOT regenerate from scratch. Return the COMPLETE updated file with the change applied. Preserve everything that was not mentioned in the change request.\n\n${enrichedPrompt}`;
              console.log(`[ITERATE] Prior context injected for project ${project_id} — prompt grew from ${promptLenBefore} to ${enrichedPrompt.length} chars (+${enrichedPrompt.length - promptLenBefore})`);
            }
          }
        } catch {
          // Ignore malformed historical last_diff payloads and continue as first build.
        }
      } else {
        console.log(`[ITERATE] No prior output found for project ${project_id} — treating as new build`);
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
            } else {
              await storage.logEvent(taskId, `[DEBUG] Agent failed: ${debugResult.summary}`, 'error');
              await storage.updateTaskState(taskId, 'failed');
            }
            return;
          }

          await storage.updateTaskState(taskId, 'calling_llm');
          const supabaseUrl = process.env.SUPABASE_URL || 'https://ptaqytvztkhjpuawdxng.supabase.co';
          const supabaseKey = process.env.SUPABASE_ANON_KEY;
          if (!supabaseKey) throw new Error('SUPABASE_ANON_KEY not configured');

          // Replace Supabase placeholders in generated HTML so forms work
          const injectSupabaseCredentials = (html: string): string =>
            html.replace(/__SUPABASE_URL__/g, supabaseUrl).replace(/__SUPABASE_ANON_KEY__/g, supabaseKey);

          const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-diff`;
          const headers = {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          };
          let fallbacks = 0;
          let retries = 0;

          /** Classify whether an error is eligible for LLM fallback (429/529/timeout only). */
          const isFallbackEligible = (status: number, text: string, err?: any): { eligible: boolean; reason: string } => {
            if (status === 402) return { eligible: true, reason: `HTTP 402 payment required` };
            if (status === 429) return { eligible: true, reason: `HTTP 429 rate limit` };
            if (status === 504) return { eligible: true, reason: `HTTP 504 gateway timeout` };
            if (status === 529) return { eligible: true, reason: `HTTP 529 overloaded` };
            if (err?.code === 'ETIMEDOUT') return { eligible: true, reason: `ETIMEDOUT` };
            if (err?.type === 'request-timeout') return { eligible: true, reason: `request-timeout` };
            if (err?.name === 'AbortError') return { eligible: true, reason: `fetch aborted (timeout)` };
            return { eligible: false, reason: `HTTP ${status}: ${text.slice(0, 120)}` };
          };

          // Pass team/org identity to edge function for thin wrapper interpolation
          const orgName = org?.name ?? '';
          const edgeCall = async (payload: any): Promise<{ text: string; ok: boolean; status: number }> => {
            const model = payload.model || resolvedModel;
            const attempt = async (m: string): Promise<{ text: string; ok: boolean; status: number }> => {
              const controller = new AbortController();
              // Dashboard mode now uses single LLM call — 140s keeps us under Supabase 150s wall-time limit
              const fetchTimeoutMs = payload.mode === 'dashboard' ? 140_000 : 120_000;
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
              const classification = isFallbackEligible(0, '', fetchErr);
              if (classification.eligible) {
                console.log(`[LLM-FALLBACK] triggered on fetch error: ${classification.reason}`);
                fallbacks += 1;
                const fallbackModel = model === 'claude' ? 'gpt' : 'claude';
                return attempt(fallbackModel);
              }
              throw fetchErr;
            }

            if (result.ok) return result;

            const classification = isFallbackEligible(result.status, result.text);
            if (!classification.eligible) {
              // Non-retriable error — fail fast, no fallback
              return result;
            }

            // Retriable error — one retry with same model, then fallback
            console.log(`[LLM-FALLBACK] retry triggered: ${classification.reason}`);
            retries += 1;
            await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 250)));
            result = await attempt(model);
            if (result.ok) return result;

            console.log(`[LLM-FALLBACK] fallback triggered after retry: ${classification.reason}`);
            fallbacks += 1;
            const fallbackModel = model === 'claude' ? 'gpt' : 'claude';
            return attempt(fallbackModel);
          };

          // ── Step 1: Plan call — ask the LLM for a page plan ──
          let plan: StarterSitePlan | null = null;
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

          // ── App fast path ── full-stack CRUD via APP_SYSTEM ──
          if (!upload_id && resolvedMode === 'app') {
            try {
              await storage.updateTaskState(taskId, 'building');
              await storage.logEvent(taskId, `App fast path activated (team: ${teamName}) — routing to APP_SYSTEM`, 'info');
              const appResult = await edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: 'app' });
              modelCalls += 1;
              if (!appResult.ok) throw new Error(appResult.text || `App edge call returned ${appResult.status}`);
              let appData: { diff: string; model?: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens: number } };
              try {
                appData = JSON.parse(appResult.text);
              } catch {
                throw new Error(`App edge returned invalid JSON (${appResult.text.length} chars)`);
              }
              if (appData.usage?.total_tokens) totalTokens += appData.usage.total_tokens;
              const previewDir = path.join(PREVIEWS_DIR, taskId);
              fs.mkdirSync(previewDir, { recursive: true });
              fs.writeFileSync(path.join(previewDir, 'index.html'), injectSupabaseCredentials(appData.diff));
              pageNames = ['index'];
              await storage.setTaskDiff(taskId, JSON.stringify([{ name: 'App', filename: 'index.html', route: '/', html: appData.diff }]));
              fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(pageNames));
              fs.writeFileSync(path.join(previewDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
              const previewToken = signPreviewToken(taskId);
              await storage.setPreviewUrl(taskId, `${FRONTEND_BASE_URL}/previews/${taskId}/index.html?token=${previewToken}`);
              await storage.logEvent(taskId, 'Preview generated', 'info');
              await storage.logEvent(taskId, `LLM responded: ${totalTokens} tokens used`, 'info');
              await storage.updateTaskUsageMetrics(taskId, {
                llm_model: appData.model ?? resolvedModel,
                llm_prompt_tokens: appData.usage?.input_tokens ?? 0,
                llm_completion_tokens: appData.usage?.output_tokens ?? 0,
                llm_total_tokens: appData.usage?.total_tokens ?? 0,
              });
              await storage.updateTaskState(taskId, 'completed');
              if (org) await storage.incrementCreditsUsed(org.id).catch(() => {});
              await storage.logEvent(taskId, 'App job completed successfully (fast path)', 'info');
              return;
            } catch (appErr: any) {
              await storage.logEvent(taskId, `App fast path failed (${appErr.message}), falling back to planner pipeline`, 'warning');
            }
          }

          // ── Dashboard fast path ── bypass planner, single Edge call ──
          // Fast path removed — LLM + department skills determine output format
          // File uploads still route here: uploaded data needs the single-call dashboard path
          if (upload_id) {
            try {
              await storage.updateTaskState(taskId, 'building');
              await storage.logEvent(taskId, `Dashboard fast path activated (${upload_id ? 'file upload' : 'keyword match'}) — skipping planner`, 'info');

              // ── Auto-publish team asset before LLM call ──
              // If user attached a file, detect asset type from prompt + filename and publish.
              // CSV uploads always ingest (fallback to 'general' type).
              let preIngestPublishTeamId: string | undefined;
              let preIngestAssetType: string | undefined;
              if (upload_id && org) {
                try {
                  const { data: uploadForIngest } = await getPlatformSupabaseClient()
                    .from('user_uploads')
                    .select('raw_content, original_filename')
                    .eq('id', upload_id)
                    .single();
                  const uploadFilename = uploadForIngest?.original_filename || '';
                  const assetType = detectAssetType(prompt, uploadFilename);
                  const isCSV = uploadFilename.endsWith('.csv') || uploadFilename.endsWith('.CSV');
                  if (assetType || hasPublishIntent(prompt) || isBudgetRelated(prompt) || isCSV) {
                    if (uploadForIngest?.raw_content) {
                      // Resolve publishing team — use project's team or first org team
                      const publishTeamId = project.team_id || (org as any).default_team_id;
                      if (publishTeamId) {
                        const resolvedType = assetType || (isBudgetRelated(prompt) ? 'budget_plan' : 'general');
                        preIngestPublishTeamId = publishTeamId;
                        preIngestAssetType = resolvedType;
                        console.log(`[AUTO-INGEST] Calling ingestTeamAsset: upload_id=${upload_id} type=${resolvedType} team=${publishTeamId} file=${uploadFilename}`);
                        const publishResult = await ingestTeamAsset({
                          teamId: publishTeamId,
                          assetType: resolvedType,
                          rawContent: uploadForIngest.raw_content,
                          originalFilename: uploadForIngest.original_filename || 'upload.csv',
                          orgId: org.id,
                          publishedBy: user_id,
                          metadata: { source: 'auto_ingest', job_id: taskId },
                        });
                        await storage.logEvent(taskId, `Published team asset: type=${resolvedType}, ${publishResult.row_count} rows${publishResult.replaced ? ' (replaced previous)' : ''}`, 'info');
                        if (publishResult.budget_ingest) {
                          await storage.logEvent(taskId, `Budget allocations synced (raw): ${publishResult.budget_ingest.rows_processed} rows written`, 'info');
                        }
                        if (publishResult.errors.length > 0) {
                          await storage.logEvent(taskId, `Asset publish warnings: ${publishResult.errors.slice(0, 3).join('; ')}`, 'warning');
                        }
                      }
                    } else {
                      console.warn(`[AUTO-INGEST] No raw_content for upload ${upload_id} — skipping asset publish`);
                    }
                  } else {
                    console.log(`[AUTO-INGEST] Skipped: no matching asset type, publish intent, or CSV for upload ${upload_id} (file=${uploadFilename})`);
                  }
                } catch (ingestErr: any) {
                  console.error(`[AUTO-INGEST] Team asset publish failed (non-blocking): ${ingestErr.message}`);
                  await storage.logEvent(taskId, `Team asset auto-publish failed: ${ingestErr.message}`, 'warning');
                }
              }

              // ── Inject budget-data extraction instruction for LLM ──
              // When the user uploads budget data with modification instructions,
              // tell the LLM to embed the ADJUSTED/CALCULATED numbers as structured JSON
              // so we can re-ingest them into budget_allocations after the LLM call.
              if (preIngestAssetType === 'budget_plan') {
                enrichedPrompt += `\n\nCRITICAL — BUDGET DATA OUTPUT REQUIREMENT:
After applying any requested changes (reductions, increases, reallocations, etc.) to the uploaded budget data, you MUST include a hidden script tag in your HTML output containing the FINAL ADJUSTED budget numbers as a JSON array.
Format — place this EXACTLY before </body>:
<script id="vibe-budget-data" type="application/json">
[{"team":"TeamName","category":"CategoryName","q1":1234,"q2":1234,"q3":1234,"q4":1234}, ...]
</script>
Each object must have: team (string), category (string), q1/q2/q3/q4 (numbers — the ADJUSTED values after applying the user's requested changes).
Include ALL rows from the original data with their final calculated values. This is how the adjusted numbers get saved to the database.`;
              }

              const dashColorBlock = buildColorBlock(resolveColorScheme(prompt));
              const dashResult = await Promise.race([
                edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: 'dashboard', color_block: dashColorBlock }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Dashboard edge call timed out after ${budgets.stepDeadlinesMs.building / 1000}s`)), budgets.stepDeadlinesMs.building)),
              ]);
              modelCalls += 1;
              if (!dashResult.ok) throw new Error(dashResult.text || `Dashboard edge call returned ${dashResult.status}`);
              let dashData: { diff: string; model?: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens: number } };
              try {
                dashData = JSON.parse(dashResult.text);
              } catch {
                throw new Error(`Dashboard edge returned invalid JSON (${dashResult.text.length} chars)`);
              }
              if (dashData.usage?.total_tokens) totalTokens += dashData.usage.total_tokens;

              // ── Post-LLM budget re-ingest: extract calculated numbers from HTML ──
              // The LLM embeds adjusted budget data as JSON in a <script id="vibe-budget-data"> tag.
              // Extract it and re-ingest into budget_allocations so dashboards see the calculated values.
              if (preIngestAssetType === 'budget_plan' && preIngestPublishTeamId && org) {
                try {
                  const budgetDataMatch = dashData.diff.match(
                    /<script\s+id="vibe-budget-data"\s+type="application\/json">\s*([\s\S]*?)\s*<\/script>/i,
                  );
                  if (budgetDataMatch?.[1]) {
                    const adjustedRows: { team: string; category: string; q1: number; q2: number; q3: number; q4: number }[] = JSON.parse(budgetDataMatch[1]);
                    if (Array.isArray(adjustedRows) && adjustedRows.length > 0) {
                      // Convert the adjusted JSON rows back to CSV format for ingestBudgetCSV
                      const csvHeader = 'team,category,q1,q2,q3,q4';
                      const csvLines = adjustedRows.map(r =>
                        `${r.team},${r.category},${r.q1},${r.q2},${r.q3},${r.q4}`,
                      );
                      const adjustedCSV = [csvHeader, ...csvLines].join('\n');

                      console.log(`[POST-LLM-INGEST] Extracted ${adjustedRows.length} adjusted budget rows from LLM output`);

                      const { ingestBudgetCSV: reIngestBudgetCSV } = await import('./lib/ingest-budget-csv');
                      const reIngestResult = await reIngestBudgetCSV(adjustedCSV, org.id);

                      console.log(`[POST-LLM-INGEST] budget_allocations re-ingested: wrote ${reIngestResult.rows_processed} rows, failed ${reIngestResult.rows_failed} rows`);
                      await storage.logEvent(
                        taskId,
                        `Budget allocations updated with LLM-calculated values: ${reIngestResult.rows_processed} rows written to budget_allocations`,
                        'info',
                      );
                      if (reIngestResult.errors.length > 0) {
                        await storage.logEvent(taskId, `Budget re-ingest warnings: ${reIngestResult.errors.slice(0, 3).join('; ')}`, 'warning');
                      }
                    } else {
                      console.warn('[POST-LLM-INGEST] vibe-budget-data tag found but contained no valid rows');
                    }
                  } else {
                    console.log('[POST-LLM-INGEST] No vibe-budget-data tag found in LLM output — budget_allocations retains raw upload values');
                  }
                } catch (reIngestErr: any) {
                  console.error(`[POST-LLM-INGEST] Failed to extract/re-ingest budget data: ${reIngestErr.message}`);
                  await storage.logEvent(taskId, `Budget re-ingest from LLM output failed (non-blocking): ${reIngestErr.message}`, 'warning');
                }
              }

              const previewDir = path.join(PREVIEWS_DIR, taskId);
              fs.mkdirSync(previewDir, { recursive: true });
              fs.writeFileSync(path.join(previewDir, 'index.html'), injectSupabaseCredentials(dashData.diff));
              pageNames = ['index'];
              timeline.push({ step: 'dashboard-fast-path', startedAt: new Date(startedAtMs).toISOString(), endedAt: new Date().toISOString(), durationMs: Date.now() - startedAtMs, status: 'completed' });
              await storage.setTaskDiff(taskId, JSON.stringify([{ name: 'Dashboard', filename: 'index.html', route: '/', html: dashData.diff }]));
              fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(pageNames));
              fs.writeFileSync(path.join(previewDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
              const previewToken = signPreviewToken(taskId);
              await storage.setPreviewUrl(taskId, `${FRONTEND_BASE_URL}/previews/${taskId}/index.html?token=${previewToken}`);
              await storage.logEvent(taskId, 'Preview generated', 'info');
              await storage.logEvent(taskId, `LLM responded: ${totalTokens} tokens used`, 'info');
              await storage.logEvent(taskId, `Job Timeline: ${JSON.stringify({ timeline, modelStats: { selected: resolvedModel, modelCalls, retries, fallbacks }, totalTokens, maxPages: MAX_INITIAL_PAGES, wallTimeMs: Date.now() - startedAtMs })}`, 'info');
              await storage.updateTaskUsageMetrics(taskId, {
                llm_model: dashData.model ?? resolvedModel,
                llm_prompt_tokens: dashData.usage?.input_tokens ?? 0,
                llm_completion_tokens: dashData.usage?.output_tokens ?? 0,
                llm_total_tokens: dashData.usage?.total_tokens ?? 0,
              });
              await storage.updateTaskState(taskId, 'completed');
              if (org) await storage.incrementCreditsUsed(org.id).catch(() => {});
              await storage.logEvent(taskId, 'Dashboard job completed successfully (fast path)', 'info');
              return;
            } catch (dashErr: any) {
              await storage.logEvent(taskId, `Dashboard fast path failed (${dashErr.message}), falling back to planner pipeline`, 'warning');
              // Fall through to normal planner pipeline
            }
          }

          try {
            plan = await runStep('planning', async () => {
            await storage.logEvent(taskId, 'Generating plan...', 'info');
            console.log('[KERNEL] enrichedPrompt prefix:', enrichedPrompt.slice(0, 300));
            const planResult = await edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: 'plan' });
            modelCalls += 1;
            if (!planResult.ok) throw new Error(planResult.text || `Plan call returned ${planResult.status}`);
            const planData = JSON.parse(planResult.text);
            if (planData.usage?.total_tokens) totalTokens += planData.usage.total_tokens;
            // Edge Function returns { diff: "<JSON string with pages + color_scheme>", mode: "plan", usage }
            let planPages = typeof planData.diff === 'string'
              ? JSON.parse(planData.diff)
              : planData.diff;
            // planPages may be { pages: [...], color_scheme: {...} } or a raw array
            const pagesArray = Array.isArray(planPages) ? planPages : planPages?.pages ?? null;
            const llmColorScheme = Array.isArray(planPages) ? null : planPages?.color_scheme ?? null;
            const result = buildStarterSitePlan(Array.isArray(pagesArray) ? pagesArray : null, prompt, llmColorScheme);
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


          // Resolve color scheme: from the plan if available, otherwise from the prompt
          const colorScheme = plan?.colorScheme ?? resolveColorScheme(prompt);
          const colorBlock = buildColorBlock(colorScheme);
          console.log('[KERNEL] resolved color scheme:', JSON.stringify(colorScheme));

          if (plan) {
            const currentPlan = plan;
            await runStep('building', async () => {
              const builtPages = await mapWithConcurrency(currentPlan.pages, 1, async (page, i) => {
                const safeName = page.route === '/' ? 'index' : page.route.slice(1);
                await storage.logEvent(taskId, 'Building page ' + (i + 1) + ' of ' + currentPlan.pages.length + ': ' + page.name + '...', 'info');
                console.log('[KERNEL] page prompt prefix:', page.description.slice(0, 300));
                // Fast path removed — LLM + department skills determine output format
                const pageBuildMode = resolvedMode === 'site' ? 'site' : 'page';
                const pageContext = `PagePlan JSON: ${JSON.stringify(currentPlan)}. File: app${page.route === '/' ? '' : page.route}/page.tsx. Include navbar, metadata title/description, 2+ sections, and CTA button.`;
                const pageResult = await edgeCall({
                  prompt: enrichedPrompt + '\n\nPage to build: ' + page.description,
                  model: resolvedModel,
                  mode: pageBuildMode,
                  context: pageContext,
                  color_block: colorBlock,
                });
                modelCalls += 1;
                if (!pageResult.ok) throw new Error('Page ' + page.name + ' returned ' + pageResult.status);
                const pageData = JSON.parse(pageResult.text);
                if (pageData.usage?.total_tokens) totalTokens += pageData.usage.total_tokens;
                fs.writeFileSync(path.join(previewDir, safeName + '.html'), injectSupabaseCredentials(pageData.diff));
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
                  // Fast path removed — LLM + department skills determine output format
                  const repairMode = 'page';
                  const repairPrompt = `Return ONLY valid HTML starting with <!DOCTYPE html>. No explanation. No markdown. No preamble.\nRepair this HTML page so it includes: <nav>, <h1>, at least 2 <section> elements, <title>, <meta name="description">, a CTA button containing Start/Get/Contact/Book/Learn, and zero lorem ipsum.\nKeep all existing Tailwind classes, fonts, and design tokens intact.\n${existing}`;
                  const repairResult = await edgeCall({ prompt: repairPrompt, model: resolvedModel, mode: repairMode, color_block: colorBlock });
                  modelCalls += 1;
                  if (repairResult.ok) {
                    const repairData = JSON.parse(repairResult.text);
                    fs.writeFileSync(path.join(previewDir, `${fileName}.html`), injectSupabaseCredentials(repairData.diff));
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
              return await runSelfHealingScan(taskId, previewDir);
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
            const fallbackResult = await edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: 'html', color_block: colorBlock });
            modelCalls += 1;
            if (!fallbackResult.ok) throw new Error(fallbackResult.text || `Edge Function returned ${fallbackResult.status}`);

            let data: { diff: string; model?: string; usage: { input_tokens?: number; output_tokens?: number; total_tokens: number } };
            try {
              data = JSON.parse(fallbackResult.text);
            } catch {
              console.error(`Job ${taskId} — raw response (${fallbackResult.text.length} chars):`, fallbackResult.text.slice(0, 500));
              throw new Error(`Edge Function returned invalid JSON (${fallbackResult.text.length} chars)`);
            }

            if (data.usage?.total_tokens) totalTokens += data.usage.total_tokens;
            fs.writeFileSync(path.join(previewDir, 'index.html'), injectSupabaseCredentials(data.diff));
            pageNames = ['index'];

            // Save single-page HTML to jobs table so the frontend can read last_diff
            await storage.setTaskDiff(taskId, JSON.stringify([{ name: 'Home', filename: 'index.html', route: '/', html: data.diff }]));
          }

          // ── Step 3: Write manifest and finalize ──
          fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(pageNames));
          fs.writeFileSync(path.join(previewDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
          const firstPage = pageNames[0].replace(/[^a-zA-Z0-9_-]/g, '_');
          const previewToken = signPreviewToken(taskId);
          await storage.setPreviewUrl(taskId, `${FRONTEND_BASE_URL}/previews/${taskId}/${firstPage}.html?token=${previewToken}`);
          await storage.logEvent(taskId, 'Preview generated', 'info');
          await storage.logEvent(taskId, `LLM responded: ${totalTokens} tokens used`, 'info');
          await storage.logEvent(taskId, `Job Timeline: ${JSON.stringify({ timeline, modelStats: { selected: resolvedModel, modelCalls, retries, fallbacks }, totalTokens, maxPages: MAX_INITIAL_PAGES, wallTimeMs: Date.now() - startedAtMs })}`, 'info');
          if (modelCalls > budgets.maxModelCalls || totalTokens > budgets.maxTokensOut || (Date.now() - startedAtMs) > budgets.maxWallTimeMs) {
            await storage.logEvent(taskId, 'Starter build budget exceeded', 'warning');
          }
          await storage.updateTaskUsageMetrics(taskId, {
            llm_model: resolvedModel,
            llm_prompt_tokens: 0,
            llm_completion_tokens: 0,
            llm_total_tokens: totalTokens,
          });
          await storage.updateTaskState(taskId, 'completed');
          if (org) await storage.incrementCreditsUsed(org.id).catch(() => {});
          await storage.logEvent(taskId, 'Job completed successfully', 'info');
          // Store assistant response in conversation after successful build (best-effort)
          if (resolvedConversationId) {
            try {
              const task = await storage.getTask(taskId);
              const summary = task?.preview_url
                ? `Built successfully. Preview: ${task.preview_url}`
                : 'Build completed.';
              await storage.addMessage({
                conversation_id: resolvedConversationId,
                role: 'assistant',
                content: summary,
                job_id: taskId,
                metadata: { execution_state: task?.execution_state, total_tokens: totalTokens },
              });
            } catch (msgErr: any) {
              console.warn(`[CONVERSATION] Failed to store assistant message: ${msgErr.message}`);
            }
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
      const guided_next_steps = getGuidedNextSteps(task.user_prompt ?? '');
      res.json({ ...task, job_timeline, guided_next_steps });
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

// connector-routes-v1


// connector-routes-v1


// cache-bust: 2026-03-25

