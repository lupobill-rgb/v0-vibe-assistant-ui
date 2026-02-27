import dotenv from 'dotenv';
import { storage, VibeTask } from './storage';
import simpleGit, { SimpleGit } from 'simple-git';
import { buildContext, formatContext } from './context-builder';
import { createGitHubPr } from './github-client';
import { buildCredentialedUrl } from './git-url';
import { generateHtmlPage } from './llm';
import { runUxAgent } from './agents/ux-agent';
import { runPipeline } from './agent-pipeline';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config();

const MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS || '6', 10);
const POLL_INTERVAL = parseInt(process.env.EXECUTOR_POLL_INTERVAL || '5000', 10);
const GIT_TERMINAL_PROMPT_DISABLED = "0";
const REPOS_BASE_DIR = process.env.REPOS_BASE_DIR || '/data/repos';
const WORKTREES_BASE_DIR = process.env.WORKTREES_BASE_DIR || '/data/worktrees';
const PATCHES_DIR = process.env.PATCHES_DIR || '/data/patches';
const JOBS_DIR = process.env.JOBS_DIR || '/data/jobs';
const PREVIEWS_DIR = process.env.PREVIEWS_DIR || '/data/previews';
const BUILD_COMMAND = process.env.BUILD_COMMAND || 'npm run build';

class VibeExecutor {
  private processing = false;

  constructor() {
    this.initializeDirectories();
  }

  private initializeDirectories(): void {
    // Ensure required directories exist
    for (const dir of [REPOS_BASE_DIR, WORKTREES_BASE_DIR, PATCHES_DIR, JOBS_DIR, PREVIEWS_DIR]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async start(): Promise<void> {
    console.log('VIBE Executor started');
    console.log(`Max iterations: ${MAX_ITERATIONS}`);
    console.log(`Poll interval: ${POLL_INTERVAL}ms`);

    setInterval(async () => {
      if (!this.processing) {
        await this.processNextTask();
      }
    }, POLL_INTERVAL);

    await this.processNextTask();
  }

  private async processNextTask(): Promise<void> {
    try {
      const task = await storage.getNextQueuedTask();
      if (!task) return;

      this.processing = true;
      await storage.logEvent(task.task_id, `Starting execution for task ${task.task_id}`, 'info');
      await this.executeTask(task);
    } catch (error: any) {
      console.error('Error processing task:', error);
    } finally {
      this.processing = false;
    }
  }

  private async executeTask(task: VibeTask): Promise<void> {
    const jobStartTime = Date.now();
    let repoDir: string = '';
    let repoUrl: string | null = null;
    let isProjectMode = false;
    let baseWorkDir: string = path.join(os.tmpdir(), '.vibe', 'work', task.task_id);
    let worktreeDir: string = '';
    let mainGit: SimpleGit | null = null;

    try {
      // ── Mode detection ──────────────────────────────────────────────────────
      // Re-fetch the task from DB to ensure we have the latest project_id and tenant_id
      const freshTask = (await storage.getTask(task.task_id)) ?? task;
      const projectId = freshTask.project_id ?? task.project_id;

      // ── Website generation shortcut ─────────────────────────────────────────
      // If the project has no git URL, generate a self-contained HTML page directly.
      if (projectId) {
        const tenantIdForCheck = freshTask.tenant_id ?? task.tenant_id;
        const projectForCheck = await storage.getProject(projectId, tenantIdForCheck);
        if (projectForCheck && !projectForCheck.repository_url) {
          await this.generateWebsiteForTask(task);
          return;
        }
      }
      const tenantId = freshTask.tenant_id ?? task.tenant_id;

      if (projectId) {
        // OPTION A: Project-centric mode — use cached repo
        isProjectMode = true;
        // Use project_id from DB and scope by tenant_id when available
        const project = await storage.getProject(projectId, tenantId);

        if (!project) {
          throw new Error(`Project not found: ${projectId}`);
        }

        repoDir = project.local_path;
        repoUrl = project.repository_url ?? null;

        await storage.logEvent(task.task_id, `Using project: ${project.name} (${projectId})`, 'info');
        await storage.logEvent(task.task_id, `Project cache location: ${repoDir}`, 'info');

        // Clone if project cache doesn't exist yet
        if (!fs.existsSync(repoDir)) {
          if (!repoUrl) {
            // No remote URL — initialize empty local repo
            await storage.logEvent(task.task_id, 'No repo_source set — initializing local repo', 'info');
            fs.mkdirSync(repoDir, { recursive: true });
            await simpleGit(repoDir).init();
            await simpleGit(repoDir).addConfig('user.name', process.env.GIT_AUTHOR_NAME || 'VIBE Bot');
            await simpleGit(repoDir).addConfig('user.email', process.env.GIT_AUTHOR_EMAIL || 'vibe@example.com');
            await simpleGit(repoDir).commit('Initial empty commit', { '--allow-empty': null });
          } else {
            await storage.logEvent(task.task_id, `Project cache not initialized. Cloning ${repoUrl}...`, 'info');
            await storage.updateTaskState(task.task_id, 'cloning');

            const reposDir = path.dirname(repoDir);
            if (!fs.existsSync(reposDir)) {
              fs.mkdirSync(reposDir, { recursive: true });
            }

            const cloneUrl = buildCredentialedUrl(repoUrl);
            if (!cloneUrl) throw new Error(`Could not build clone URL from: ${repoUrl}`);

            const originalGitPrompt = process.env.GIT_TERMINAL_PROMPT;
            process.env.GIT_TERMINAL_PROMPT = GIT_TERMINAL_PROMPT_DISABLED;
            try {
              await simpleGit().clone(cloneUrl, repoDir);
            } finally {
              if (originalGitPrompt !== undefined) {
                process.env.GIT_TERMINAL_PROMPT = originalGitPrompt;
              } else {
                delete process.env.GIT_TERMINAL_PROMPT;
              }
            }
            await storage.logEvent(task.task_id, 'Repository cloned to project cache', 'success');
          }
        } else {
          // Cache exists — sync with remote if we have one
          if (repoUrl) {
            await storage.logEvent(task.task_id, 'Syncing project cache with remote...', 'info');
            const syncGit = simpleGit(repoDir);
            try {
              await syncGit.fetch(['--all', '--prune']);
              await storage.logEvent(task.task_id, 'Project cache synced', 'success');
            } catch (error: any) {
              await storage.logEvent(task.task_id, `Warning: Failed to sync: ${error.message}`, 'warning');
            }
          } else {
            await storage.logEvent(task.task_id, 'Using existing local project (no remote sync)', 'info');
          }
        }

      } else if (task.repository_url) {
        // MODE B: Legacy mode — clone to temp directory
        isProjectMode = false;
        repoUrl = task.repository_url;
        await storage.logEvent(task.task_id, '[DEPRECATED] Using legacy Mode B with repo_url', 'warning');

        repoDir = path.join(baseWorkDir, 'repo');

        if (!fs.existsSync(baseWorkDir)) {
          fs.mkdirSync(baseWorkDir, { recursive: true });
        }

        await storage.updateTaskState(task.task_id, 'cloning');
        await storage.logEvent(task.task_id, `Cloning repository: ${repoUrl}`, 'info');

        const cloneUrl = buildCredentialedUrl(repoUrl);
        if (!cloneUrl) throw new Error(`Could not build clone URL from: ${repoUrl}`);

        const originalGitPrompt = process.env.GIT_TERMINAL_PROMPT;
        process.env.GIT_TERMINAL_PROMPT = GIT_TERMINAL_PROMPT_DISABLED;
        try {
          await simpleGit().clone(cloneUrl, repoDir);
        } finally {
          if (originalGitPrompt !== undefined) {
            process.env.GIT_TERMINAL_PROMPT = originalGitPrompt;
          } else {
            delete process.env.GIT_TERMINAL_PROMPT;
          }
        }
        await storage.logEvent(task.task_id, 'Clone completed', 'success');

      } else {
        throw new Error('Task has neither project_id nor repository_url');
      }

      // ── Directory diagnostics ────────────────────────────────────────────
      try {
        const files = fs.readdirSync(repoDir);
        const fileCount = files.length;
        const preview = files.slice(0, 10).join(', ');
        const logMsg = fileCount <= 10
          ? `Directory listing (${fileCount} items): ${preview}`
          : `Directory listing (${fileCount} items, showing first 10): ${preview}...`;
        await storage.logEvent(task.task_id, logMsg, 'info');
      } catch (e: any) {
        await storage.logEvent(task.task_id, `Could not list repoDir: ${e.message}`, 'warning');
      }

      // ── Git setup ────────────────────────────────────────────────────────
      mainGit = simpleGit(repoDir);
      await mainGit.addConfig('user.name', process.env.GIT_AUTHOR_NAME || 'VIBE Bot');
      await mainGit.addConfig('user.email', process.env.GIT_AUTHOR_EMAIL || 'vibe@example.com');

      await mainGit.checkout(task.source_branch);
      await storage.logEvent(task.task_id, `Checked out base branch: ${task.source_branch}`, 'info');

      try {
        await mainGit.checkoutBranch(task.destination_branch, task.source_branch);
        await storage.logEvent(task.task_id, `Created target branch: ${task.destination_branch}`, 'info');
      } catch {
        await mainGit.checkout(task.destination_branch);
        await storage.logEvent(task.task_id, `Using existing branch: ${task.destination_branch}`, 'info');
      }

      // worktreeDir = repoDir for now (worktree isolation can be added later)
      worktreeDir = repoDir;

      // ── Agent Pipeline ─────────────────────────────────────────────────────
      // Build initial context for the planner
      storage.updateTaskState(task.task_id, 'building_context');
      storage.logEvent(task.task_id, 'Building context from repository...', 'info');
      const contextResult = await buildContext(worktreeDir, task.user_prompt);
      const context = formatContext(contextResult.files);
      storage.logEvent(
        task.task_id,
        `Context built: ${contextResult.files.size} files, ${contextResult.totalSize} chars${contextResult.truncated ? ' (truncated)' : ''}`,
        'info'
      );

      // Run the full agent pipeline: Planner → Builder → QA → Debug → Security
      const pipelineResult = await runPipeline(
        task.task_id,
        task.user_prompt,
        context,
        { model: (task.llm_model as 'claude' | 'gpt') || 'claude' },
        worktreeDir,
      );

      if (!pipelineResult.success) {
        // Pipeline already set state to 'failed' and logged errors
        const totalJobSeconds = (Date.now() - jobStartTime) / 1000;
        storage.updateTaskUsageMetrics(task.task_id, { total_job_seconds: totalJobSeconds });
      } else {
        // Pipeline passed — commit changes, run UX review, then create PR
        const worktreeGit = simpleGit(worktreeDir);
        const status = await worktreeGit.status();

        if (!status.isClean()) {
          await worktreeGit.add('.');
          await worktreeGit.commit(`VIBE pipeline: ${task.user_prompt.slice(0, 50)}`);
          storage.logEvent(task.task_id, 'Pipeline changes committed', 'success');
        }

        // Run UX agent (not covered by pipeline)
        await runUxAgent(task.task_id, worktreeDir);

        // Generate preview after successful build
        await this.generatePreview(task, worktreeDir);

        // Create PR or complete locally
        await this.createPullRequest(task, mainGit, repoUrl);

        // Calculate final job metrics
        const totalJobSeconds = (Date.now() - jobStartTime) / 1000;
        let filesChangedCount = 0;
        try {
          const diffSummary = await mainGit.diffSummary([task.source_branch, task.destination_branch]);
          filesChangedCount = diffSummary.files.length;
        } catch (error: any) {
          storage.logEvent(task.task_id, `Could not count changed files: ${error.message}`, 'warning');
        }

        storage.updateTaskUsageMetrics(task.task_id, {
          total_job_seconds: totalJobSeconds,
          files_changed_count: filesChangedCount,
        });

        storage.logEvent(task.task_id, `Pipeline complete: ${totalJobSeconds.toFixed(1)}s total, ${filesChangedCount} files changed`, 'info');
      }

    } catch (error: any) {
      storage.updateTaskState(task.task_id, 'failed');
      storage.logEvent(task.task_id, `Fatal error: ${error.message}`, 'error');

      // Still try to record usage metrics even on failure
      const totalJobSeconds = (Date.now() - jobStartTime) / 1000;
      storage.updateTaskUsageMetrics(task.task_id, {
        total_job_seconds: totalJobSeconds,
      });
    } finally {
      if (!isProjectMode) {
        if (fs.existsSync(baseWorkDir)) {
          fs.rmSync(baseWorkDir, { recursive: true, force: true });
        }
      } else {
        if (fs.existsSync(baseWorkDir)) {
          try {
            const entries = fs.readdirSync(baseWorkDir).filter(n => n.startsWith('attempt-'));
            for (const dir of entries) {
              fs.rmSync(path.join(baseWorkDir, dir), { recursive: true, force: true });
            }
            fs.rmSync(baseWorkDir, { recursive: true, force: true });
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }
  }

  private async createCheckpointTag(mainGit: SimpleGit, taskId: string, branch: string): Promise<void> {
    try {
      const tagName = `vibe/job-${taskId}`;
      await mainGit.tag([tagName, branch]);
      await storage.logEvent(taskId, `✓ Created checkpoint tag: ${tagName}`, 'success');
    } catch (error: any) {
      await storage.logEvent(taskId, `Warning: Failed to create checkpoint tag: ${error.message}`, 'warning');
    }
  }

  private async createPullRequest(task: VibeTask, mainGit: SimpleGit, repoUrl: string | null): Promise<void> {
    try {
      await storage.updateTaskState(task.task_id, 'creating_pr');
      
      // For local-only projects (no remote), skip push and PR creation
      if (!repoUrl) {
        await storage.logEvent(task.task_id, 'Local-only project - no remote push or PR creation', 'info');
        await this.createCheckpointTag(mainGit, task.task_id, task.destination_branch);
        await storage.updateTaskState(task.task_id, 'completed');
        await storage.logEvent(task.task_id, '✓ Task completed successfully (local changes only)', 'success');
        return;
      }
      
      await storage.logEvent(task.task_id, 'Pushing branch to remote...', 'info');

      await mainGit.push('origin', task.destination_branch, ['--force']);
      await storage.logEvent(task.task_id, `Branch pushed: ${task.destination_branch}`, 'success');

      // Resolve repoUrl if not passed in
      let effectiveRepoUrl = repoUrl;
      if (!effectiveRepoUrl) {
        try {
          const remotes = await mainGit.getRemotes(true);
          const origin = remotes.find(r => r.name === 'origin');
          if (origin?.refs?.fetch) {
            effectiveRepoUrl = origin.refs.fetch;
          } else {
            await storage.logEvent(task.task_id, 'No remote repository configured (local-only project). Changes committed locally, PR creation skipped.', 'info');
            await this.createCheckpointTag(mainGit, task.task_id, task.destination_branch);
            await storage.updateTaskState(task.task_id, 'completed');
            return;
          }
        } catch (error: any) {
          await storage.logEvent(task.task_id, `Could not get remote URL: ${error.message}. Changes committed locally, PR creation skipped.`, 'warning');
          await this.createCheckpointTag(mainGit, task.task_id, task.destination_branch);
          await storage.updateTaskState(task.task_id, 'completed');
          return;
        }
      }

      const prResult = await createGitHubPr({
        repoUrl: effectiveRepoUrl,
        sourceBranch: task.source_branch,
        targetBranch: task.destination_branch,
        prompt: task.user_prompt,
        taskId: task.task_id,
        iterationCount: task.iteration_count
      });

      if (prResult.success && prResult.prUrl) {
        await storage.setPrUrl(task.task_id, prResult.prUrl);
        await this.createCheckpointTag(mainGit, task.task_id, task.destination_branch);
        await storage.updateTaskState(task.task_id, 'completed');
        await storage.logEvent(task.task_id, `✓ Pull request created: ${prResult.prUrl}`, 'success');
      } else {
        await storage.updateTaskState(task.task_id, 'failed');
        await storage.logEvent(task.task_id, `Failed to create PR: ${prResult.error}`, 'error');
      }

    } catch (error: any) {
      await storage.updateTaskState(task.task_id, 'failed');
      await storage.logEvent(task.task_id, `Error creating PR: ${error.message}`, 'error');
    }
  }

  private async generateWebsiteForTask(task: VibeTask): Promise<void> {
    try {
      await storage.updateTaskState(task.task_id, 'calling_llm');
      await storage.logEvent(task.task_id, 'Generating website HTML via Claude...', 'info');

      const html = await generateHtmlPage(task.user_prompt);

      const previewDir = path.join(PREVIEWS_DIR, task.task_id);
      if (!fs.existsSync(PREVIEWS_DIR)) {
        fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
      }
      fs.mkdirSync(previewDir, { recursive: true });
      fs.writeFileSync(path.join(previewDir, 'index.html'), html, 'utf8');

      const previewUrl = `/previews/${task.task_id}/index.html`;
      await storage.setPreviewUrl(task.task_id, previewUrl);
      await storage.updateTaskState(task.task_id, 'completed');
      await storage.logEvent(task.task_id, `✅ Website generated! Preview at: ${previewUrl}`, 'success');
    } catch (error: any) {
      await storage.updateTaskState(task.task_id, 'failed');
      await storage.logEvent(task.task_id, `❌ Failed to generate website: ${error.message}`, 'error');
    }
  }

  private async generatePreview(task: VibeTask, worktreeDir: string): Promise<void> {
    try {
      await storage.logEvent(task.task_id, 'Generating static preview...', 'info');

      // Run build command in worktree
      await storage.logEvent(task.task_id, `Running build command: ${BUILD_COMMAND}`, 'info');
      
      try {
        const { stdout, stderr } = await execAsync(BUILD_COMMAND, {
          cwd: worktreeDir,
          timeout: 300000, // 5 minutes timeout
          maxBuffer: 10 * 1024 * 1024 // 10MB
        });

        if (stdout) storage.logEvent(task.task_id, `Build stdout: ${stdout.slice(0, 500)}`, 'info');
        if (stderr) storage.logEvent(task.task_id, `Build stderr: ${stderr.slice(0, 500)}`, 'info');
        
        await storage.logEvent(task.task_id, '✓ Build completed successfully', 'success');
      } catch (buildError: any) {
        const errorOutput = (buildError.stdout || '') + (buildError.stderr || '');
        await storage.logEvent(task.task_id, `Build failed: ${errorOutput.slice(0, 1000)}`, 'error');
        await storage.logEvent(task.task_id, 'Preview generation skipped due to build failure', 'warning');
        return;
      }

      // Determine build output directory (common patterns)
      const buildDirs = ['dist', 'build', 'out', '.next', 'public'];
      let buildOutputDir: string | null = null;

      for (const dir of buildDirs) {
        const candidatePath = path.join(worktreeDir, dir);
        if (fs.existsSync(candidatePath)) {
          const stat = fs.statSync(candidatePath);
          if (stat.isDirectory()) {
            buildOutputDir = candidatePath;
            await storage.logEvent(task.task_id, `Found build output directory: ${dir}`, 'info');
            break;
          }
        }
      }

      if (!buildOutputDir) {
        await storage.logEvent(task.task_id, 'No build output directory found (checked: dist, build, out, .next, public)', 'warning');
        await storage.logEvent(task.task_id, 'Preview generation skipped', 'warning');
        return;
      }

      // Create preview directory
      const previewDir = path.join(PREVIEWS_DIR, task.task_id);
      if (!fs.existsSync(PREVIEWS_DIR)) {
        fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
      }

      // Copy build output to preview directory
      await storage.logEvent(task.task_id, `Copying build output to: ${previewDir}`, 'info');
      
      if (fs.existsSync(previewDir)) {
        fs.rmSync(previewDir, { recursive: true, force: true });
      }

      // Recursive copy
      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };

      copyRecursive(buildOutputDir, previewDir);

      // Store preview URL
      const previewUrl = `/previews/${task.task_id}/index.html`;
      await storage.setPreviewUrl(task.task_id, previewUrl);
      await storage.logEvent(task.task_id, `✓ Preview available at: ${previewUrl}`, 'success');

    } catch (error: any) {
      await storage.logEvent(task.task_id, `Preview generation error: ${error.message}`, 'warning');
    }
  }
}

// Start the executor
const executor = new VibeExecutor();
executor.start().catch(console.error);