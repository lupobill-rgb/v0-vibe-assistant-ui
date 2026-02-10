import dotenv from 'dotenv';
import { storage, VibeTask } from './storage';
import simpleGit, { SimpleGit } from 'simple-git';
import { buildContext, formatContext } from './context-builder';
import { validateUnifiedDiff, extractDiff, sanitizeUnifiedDiff, validateUnifiedDiffEnhanced, validateDiffApplicability, normalizeLLMOutput, performPreApplySanityChecks } from './diff-validator';
import { runPreflightChecks } from './preflight';
import { createGitHubPr } from './github-client';
import { buildCredentialedUrl } from './git-url';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config();

const MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS || '6', 10);
const POLL_INTERVAL = parseInt(process.env.EXECUTOR_POLL_INTERVAL || '5000', 10);
const GIT_TERMINAL_PROMPT_DISABLED = "0";
// Directories for project repos and worktrees
const REPOS_BASE_DIR = process.env.REPOS_BASE_DIR || '/data/repos';
const WORKTREES_BASE_DIR = process.env.WORKTREES_BASE_DIR || '/data/worktrees';
// Directory for persisting failed patches for debugging
// Defaults to /data/patches which is mounted as a volume in docker-compose.yml
const PATCHES_DIR = process.env.PATCHES_DIR || '/data/patches';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface GenerateDiffResult {
  diff: string | null;
  error: string | null;
}

// Main executor class
class VibeExecutor {
  private processing = false;

  async start(): Promise<void> {
    console.log('VIBE Executor started');
    console.log(`Max iterations: ${MAX_ITERATIONS}`);
    console.log(`Poll interval: ${POLL_INTERVAL}ms`);

    // Poll for queued tasks
    setInterval(async () => {
      if (!this.processing) {
        await this.processNextTask();
      }
    }, POLL_INTERVAL);

    // Process immediately on start
    await this.processNextTask();
  }

  private async processNextTask(): Promise<void> {
    try {
      const task = storage.getNextQueuedTask();
      if (!task) {
        return; // No tasks to process
      }

      this.processing = true;
      storage.logEvent(task.task_id, `Starting execution for task ${task.task_id}`, 'info');

      await this.executeTask(task);

    } catch (error: any) {
      console.error('Error processing task:', error);
    } finally {
      this.processing = false;
    }
  }

  private async executeTask(task: VibeTask): Promise<void> {
    let repoDir: string = '';
    let worktreeDir: string | null = null;
    let git: SimpleGit | null = null;
    let isLegacyMode = false;

    try {
      // Determine if this is project-centric (Option A) or legacy (Mode B)
      if (task.project_id) {
        // OPTION A: Project-centric mode
        const project = storage.getProject(task.project_id);
        if (!project) {
          throw new Error(`Project not found: ${task.project_id}`);
        }
        
        repoDir = project.repo_dir;
        storage.logEvent(task.task_id, `Using project repo: ${repoDir}`, 'info');
        
        // Ensure repo directory exists
        if (!fs.existsSync(repoDir)) {
          throw new Error(`Project repo directory not found: ${repoDir}`);
        }
        
      } else if (task.repository_url) {
        // MODE B: Legacy mode (clone to temp directory)
        isLegacyMode = true;
        storage.logEvent(task.task_id, 'Running in legacy Mode B (repo_url)', 'warning');
        
        const baseWorkDir = path.join(os.tmpdir(), '.vibe', 'work', task.task_id);
        repoDir = path.join(baseWorkDir, 'repo');
        
        // Ensure base directory exists
        if (!fs.existsSync(baseWorkDir)) {
          fs.mkdirSync(baseWorkDir, { recursive: true });
        }

        // State: cloning
        storage.updateTaskState(task.task_id, 'cloning');
        storage.logEvent(task.task_id, `Cloning repository: ${task.repository_url}`, 'info');

        // Clone repository with credentialed URL
        const cloneUrl = buildCredentialedUrl(task.repository_url);
        
        // Set environment variable to prevent git from prompting for credentials
        const originalGitPrompt = process.env.GIT_TERMINAL_PROMPT;
        process.env.GIT_TERMINAL_PROMPT = GIT_TERMINAL_PROMPT_DISABLED;
        
        try {
          await simpleGit().clone(cloneUrl, repoDir);
        } finally {
          // Restore original environment variable
          if (originalGitPrompt !== undefined) {
            process.env.GIT_TERMINAL_PROMPT = originalGitPrompt;
          } else {
            delete process.env.GIT_TERMINAL_PROMPT;
          }
        }
        
        storage.logEvent(task.task_id, 'Clone completed', 'info');
      } else {
        throw new Error('Task must have either project_id or repository_url');
      }

      git = simpleGit(repoDir);

      // Configure git
      await git.addConfig('user.name', process.env.GIT_AUTHOR_NAME || 'VIBE Bot');
      await git.addConfig('user.email', process.env.GIT_AUTHOR_EMAIL || 'vibe@example.com');

      // Checkout base branch
      await git.checkout(task.source_branch);
      storage.logEvent(task.task_id, `Checked out base branch: ${task.source_branch}`, 'info');

      // Create/reset target branch
      try {
        await git.checkoutBranch(task.destination_branch, task.source_branch);
        storage.logEvent(task.task_id, `Created target branch: ${task.destination_branch}`, 'info');
      } catch (error) {
        // Branch might already exist
        await git.checkout(task.destination_branch);
        storage.logEvent(task.task_id, `Using existing branch: ${task.destination_branch}`, 'info');
      }

      // Create worktree for this job
      worktreeDir = path.join(WORKTREES_BASE_DIR, task.task_id);
      
      // Ensure worktrees base directory exists
      if (!fs.existsSync(WORKTREES_BASE_DIR)) {
        fs.mkdirSync(WORKTREES_BASE_DIR, { recursive: true });
      }
      
      // Remove worktree if it exists (from previous failed run)
      if (fs.existsSync(worktreeDir)) {
        try {
          await git.raw(['worktree', 'remove', '--force', worktreeDir]);
        } catch (e) {
          // Ignore errors
        }
        if (fs.existsSync(worktreeDir)) {
          fs.rmSync(worktreeDir, { recursive: true, force: true });
        }
      }
      
      // Create worktree
      await git.raw(['worktree', 'add', worktreeDir, task.destination_branch]);
      storage.logEvent(task.task_id, `Created worktree: ${worktreeDir}`, 'info');

      // Run iteration loop with worktree directory
      await this.iterationLoop(task, worktreeDir, git, repoDir);

    } catch (error: any) {
      storage.updateTaskState(task.task_id, 'failed');
      storage.logEvent(task.task_id, `Fatal error: ${error.message}`, 'error');
    } finally {
      // Cleanup worktree
      if (worktreeDir && fs.existsSync(worktreeDir)) {
        try {
          if (git) {
            await git.raw(['worktree', 'remove', '--force', worktreeDir]);
            storage.logEvent(task.task_id, 'Worktree cleaned up', 'info');
          }
        } catch (error: any) {
          storage.logEvent(task.task_id, `Warning: Failed to remove worktree: ${error.message}`, 'warning');
        }
        
        // Force remove directory if still exists
        if (fs.existsSync(worktreeDir)) {
          fs.rmSync(worktreeDir, { recursive: true, force: true });
        }
      }
      
      // Cleanup temp directory for legacy mode
      if (isLegacyMode && repoDir) {
        const baseWorkDir = path.dirname(repoDir);
        if (fs.existsSync(baseWorkDir)) {
          fs.rmSync(baseWorkDir, { recursive: true, force: true });
        }
      }
    }
  }

  private async iterationLoop(task: VibeTask, worktreeDir: string, git: SimpleGit, mainRepoDir: string): Promise<void> {
    let consecutiveApplyFailures = 0;
    let consecutiveDiffFailures = 0;
    let fallbackFiles: Set<string> = new Set();
    let globalFallback = false;
    let failureFeedback: string | null = null;

    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
      storage.incrementIteration(task.task_id);
      storage.logEvent(task.task_id, `Starting iteration ${iteration}/${MAX_ITERATIONS}`, 'info');

      // Reset worktree to clean state before this iteration
      // This ensures each attempt starts from a known good state
      const worktreeGit = simpleGit(worktreeDir);
      try {
        await worktreeGit.reset(['--hard', 'HEAD']);
        // Clean untracked files and directories
        await worktreeGit.raw(['clean', '-fd']);
        storage.logEvent(task.task_id, 'Worktree reset to clean state', 'info');
      } catch (error: any) {
        storage.logEvent(task.task_id, `Warning: Failed to reset worktree: ${error.message}`, 'warning');
      }

      // State: building_context
      storage.updateTaskState(task.task_id, 'building_context');
      storage.logEvent(task.task_id, 'Building context from repository...', 'info');

      const contextResult = await buildContext(worktreeDir, task.user_prompt);
      storage.logEvent(
        task.task_id,
        `Context built: ${contextResult.files.size} files, ${contextResult.totalSize} chars${contextResult.truncated ? ' (truncated)' : ''}`,
        'info'
      );

      const context = formatContext(contextResult.files);

      // State: calling_llm
      storage.updateTaskState(task.task_id, 'calling_llm');
      storage.logEvent(task.task_id, `Calling LLM (iteration ${iteration})...`, 'info');

      const result = await this.generateDiff(task.user_prompt, context, task.task_id, worktreeDir, globalFallback, fallbackFiles, failureFeedback);
      
      if (!result.diff) {
        consecutiveDiffFailures++;
        storage.logEvent(task.task_id, 'LLM failed to generate valid diff', 'error');

        // Update failure feedback for next retry to include validator error
        if (result.error) {
          failureFeedback = `You returned an invalid diff. Validator error: ${result.error}`;
        }

        if (consecutiveDiffFailures >= 3) {
          storage.updateTaskState(task.task_id, 'failed');
          storage.logEvent(task.task_id, 'Failed: 3 consecutive invalid diffs from LLM', 'error');
          return;
        }
        continue;
      }

      // Reset diff failure counter and clear diff-related feedback on success
      consecutiveDiffFailures = 0;
      // Clear failureFeedback from previous diff validation failures
      // Note: Git apply failures will set this again if needed
      if (failureFeedback && failureFeedback.includes('Validator error')) {
        failureFeedback = null;
      }
      const diff = result.diff;

      // Check for NO_CHANGES response
      if (diff === 'NO_CHANGES') {
        storage.logEvent(task.task_id, 'No changes needed - skipping git apply', 'info');
        
        // State: running_preflight
        storage.updateTaskState(task.task_id, 'running_preflight');
        storage.logEvent(task.task_id, 'Running preflight checks...', 'info');

        const preflightResult = await runPreflightChecks(worktreeDir, (stage, output) => {
          storage.logEvent(task.task_id, `[${stage}] ${output}`, 'info');
        });

        if (preflightResult.success) {
          storage.logEvent(task.task_id, '✓ All preflight checks passed!', 'success');
          
          // Check if there are any commits on the branch
          const status = await worktreeGit.status();
          const log = await worktreeGit.log({ from: task.source_branch, to: task.destination_branch });
          
          if (log.total === 0 && status.isClean()) {
            // No commits and working directory is clean - skip PR creation
            storage.updateTaskState(task.task_id, 'completed');
            storage.logEvent(task.task_id, 'No changes; no PR created.', 'success');
            return;
          }
          
          // There are commits, create PR
          await this.createPullRequest(task, git, worktreeGit);
          return;
        } else {
          storage.logEvent(
            task.task_id,
            `Preflight failed at stage: ${preflightResult.stage}`,
            'error'
          );
          storage.updateTaskState(task.task_id, 'failed');
          storage.logEvent(task.task_id, 'Failed: Preflight checks failed with no changes', 'error');
          return;
        }
      }

      // State: applying_diff
      storage.updateTaskState(task.task_id, 'applying_diff');
      storage.logEvent(task.task_id, 'Applying diff to worktree...', 'info');

      const applyResult = await this.applyDiff(worktreeDir, diff, task.task_id, iteration);
      
      if (!applyResult.success) {
        consecutiveApplyFailures++;
        storage.logEvent(task.task_id, 'Failed to apply diff', 'error');
        
        // Capture failure feedback for next iteration
        failureFeedback = `Git apply failed: ${applyResult.error || 'Unknown error'}`;

        // Activate fallback mode after 2 consecutive failures
        if (consecutiveApplyFailures >= 2) {
          const failedFiles = this.extractFailedFiles(applyResult.error || '');
          
          if (failedFiles.length > 0) {
            // File-specific fallback
            failedFiles.forEach(file => fallbackFiles.add(file));
            storage.logEvent(
              task.task_id, 
              `Fallback mode activated: requesting full file replacement for ${failedFiles.join(', ')}`,
              'warning'
            );
          } else {
            // Global fallback if we can't identify specific files
            globalFallback = true;
            storage.logEvent(
              task.task_id,
              'Fallback mode activated: requesting global full file replacement',
              'warning'
            );
          }
        }

        if (consecutiveApplyFailures >= 3) {
          storage.updateTaskState(task.task_id, 'failed');
          storage.logEvent(task.task_id, 'Failed: 3 consecutive git apply failures', 'error');
          return;
        }
        continue;
      }

      consecutiveApplyFailures = 0;
      // Clear fallback state on successful apply
      fallbackFiles.clear();
      globalFallback = false;
      failureFeedback = null;

      // Commit the changes in worktree
      await worktreeGit.add('.');
      await worktreeGit.commit(`VIBE iteration ${iteration}: ${task.user_prompt.slice(0, 50)}`);
      storage.logEvent(task.task_id, `Changes committed (iteration ${iteration})`, 'success');

      // State: running_preflight
      storage.updateTaskState(task.task_id, 'running_preflight');
      storage.logEvent(task.task_id, 'Running preflight checks from worktree...', 'info');

      const preflightResult = await runPreflightChecks(worktreeDir, (stage, output) => {
        storage.logEvent(task.task_id, `[${stage}] ${output}`, 'info');
      });

      if (preflightResult.success) {
        // All checks passed! Create PR
        storage.logEvent(task.task_id, '✓ All preflight checks passed!', 'success');
        await this.createPullRequest(task, git, worktreeGit);
        return;
      } else {
        storage.logEvent(
          task.task_id,
          `Preflight failed at stage: ${preflightResult.stage}`,
          'error'
        );

        if (iteration === MAX_ITERATIONS) {
          storage.updateTaskState(task.task_id, 'failed');
          storage.logEvent(task.task_id, 'Failed: Max iterations reached without passing preflight', 'error');
          return;
        }

        // Continue to next iteration
        storage.logEvent(task.task_id, `Will retry (${iteration}/${MAX_ITERATIONS})`, 'warning');
      }
    }

    // If we get here, max iterations reached
    storage.updateTaskState(task.task_id, 'failed');
    storage.logEvent(task.task_id, 'Failed: Max iterations reached', 'error');
  }

  private async generateDiff(
    prompt: string, 
    context: string, 
    taskId: string, 
    repoDir: string,
    globalFallback: boolean = false,
    fallbackFiles: Set<string> = new Set(),
    failureFeedback: string | null = null
  ): Promise<GenerateDiffResult> {
    const maxRetries = 2;
    let lastValidationError: string | null = null;

    // Retry loop: initial attempt + up to 2 retries
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        storage.logEvent(taskId, `Retrying LLM call (attempt ${attempt + 1}/${maxRetries + 1})...`, 'warning');
      }

      try {
        const baseSystemPrompt = `You are a code modification assistant. You MUST output ONLY a unified diff or the token NO_CHANGES.

STRICT OUTPUT REQUIREMENTS:
- NO prose, explanations, markdown formatting, or code blocks are allowed
- Output must start with "diff --git" (for diffs) OR be exactly "NO_CHANGES" (if no changes needed)
- Every diff block MUST have "---" and "+++" headers
- Every diff block MUST have "@@ ... @@" hunk markers
- The diff must be directly applicable with 'git apply'

ALLOWED OUTPUTS:
1. A valid unified diff starting with "diff --git a/... b/..."
2. The single token "NO_CHANGES" (only if the requested change is already satisfied)

ANY OTHER OUTPUT WILL BE REJECTED.

Context files are provided below.`;

        const fallbackInstructions = `
- Use the format: delete all lines of the old file and add all lines of the new file
- This ensures the diff will apply regardless of the current file state`;

        // Build system prompt with fallback mode instructions if needed
        let systemPrompt = baseSystemPrompt;
        if (globalFallback || fallbackFiles.size > 0) {
          if (fallbackFiles.size > 0) {
            const fileList = Array.from(fallbackFiles).join(', ');
            systemPrompt += `\n\nFALLBACK MODE: Previous diffs failed to apply for files: ${fileList}
For these specific files, generate a diff that REPLACES THE ENTIRE FILE CONTENT:${fallbackInstructions}`;
          } else {
            systemPrompt += `\n\nFALLBACK MODE: Previous diffs failed to apply.
Generate diffs that REPLACE THE ENTIRE FILE CONTENT for all modified files:${fallbackInstructions}`;
          }
        }

        let userPrompt = `${context}

---

USER REQUEST: ${prompt}

Generate a unified diff to implement this request. Output ONLY the diff, nothing else.`;

        // Add failure feedback if available
        if (failureFeedback) {
          userPrompt += `\n\n---\n\nPATCH FAILURE FEEDBACK:\n${failureFeedback}`;
        }

        // Add validation error feedback for retries
        if (attempt > 0 && lastValidationError) {
          const validationFeedback = [
            '\n\n---\n\n',
            'VALIDATION ERROR: You returned an invalid diff. ',
            `Here is the validator error: ${lastValidationError}\n\n`,
            'Please output a valid unified diff that starts with "diff --git", ',
            'includes --- and +++ headers, and has @@ hunk markers. ',
            'Or output exactly "NO_CHANGES" if no changes are needed.'
          ].join('');
          userPrompt += validationFeedback;
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          // Temperature 0 ensures deterministic outputs for diff generation.
          // This is critical to prevent non-deterministic formatting variations
          // and ensure reproducible results across retries.
          temperature: 0,
          max_tokens: 4000
        });

        const rawOutput = response.choices[0]?.message?.content || '';
        storage.logEvent(taskId, `LLM generated ${rawOutput.length} characters`, 'info');

        // Check for NO_CHANGES response
        const normalizedOutput = rawOutput.trim();
        if (normalizedOutput === 'NO_CHANGES') {
          storage.logEvent(taskId, 'LLM indicated no changes needed', 'info');
          return { diff: 'NO_CHANGES', error: null };
        }

        // Sanitize the raw output first
        const sanitized = sanitizeUnifiedDiff(rawOutput);
        if (sanitized === null) {
          lastValidationError = 'LLM output missing diff --git header or contains commentary/markdown';
          storage.logEvent(taskId, lastValidationError, 'error');
          continue; // Retry
        }

        // Extract and validate diff
        const diff = extractDiff(sanitized);
        const enhancedValidation = validateUnifiedDiffEnhanced(diff);

        if (!enhancedValidation.ok) {
          lastValidationError = enhancedValidation.errors.join('; ');
          storage.logEvent(taskId, `Invalid diff: ${lastValidationError}`, 'error');
          continue; // Retry
        }

        // Perform pre-apply sanity checks
        const sanityCheckResult = performPreApplySanityChecks(diff, repoDir, prompt);
        if (!sanityCheckResult.ok) {
          lastValidationError = sanityCheckResult.errors.join('; ');
          storage.logEvent(taskId, `Pre-apply sanity check failed: ${lastValidationError}`, 'error');
          continue; // Retry
        }

        const lineCount = diff.split('\n').length;
        storage.logEvent(taskId, `Valid diff generated (${lineCount} lines)`, 'success');
        return { diff, error: null };

      } catch (error: any) {
        storage.logEvent(taskId, `LLM error: ${error.message}`, 'error');
        lastValidationError = `LLM API error: ${error.message}`;
        continue; // Retry
      }
    }

    // All retries exhausted
    storage.logEvent(taskId, `Failed to generate valid diff after ${maxRetries + 1} attempts`, 'error');
    return { diff: null, error: lastValidationError };
  }

  private extractFailedFiles(errorMessage: string): string[] {
    const files: string[] = [];
    
    // Parse git apply error messages to extract failing file names
    // Formats: 
    // - "error: patch failed: <filename>:line"
    // - "error: <filename>: patch does not apply"
    const patterns = [
      /error: patch failed: ([^:]+):/g,
      /error: ([^:]+): patch does not apply/g
    ];

    for (const pattern of patterns) {
      const matches = errorMessage.matchAll(pattern);
      for (const match of matches) {
        const file = match[1].trim();
        if (file && !files.includes(file)) {
          files.push(file);
        }
      }
    }

    return files;
  }

  private async applyDiff(worktreeDir: string, diff: string, taskId: string, iteration: number): Promise<{ success: boolean; error?: string }> {
    // Normalize line endings before any processing (CRLF and CR to LF)
    let patch = diff.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Ensure exactly one trailing newline
    patch = patch.trimEnd() + '\n';
    
    try {
      // Check applicability first with validateDiffApplicability
      const checkResult = validateDiffApplicability(patch, worktreeDir);
      if (!checkResult.valid) {
        storage.logEvent(taskId, `git apply --check failed: ${checkResult.error}`, 'error');
        // Persist failed patch for debugging
        await this.persistFailedPatch(patch, taskId, iteration);
        return { success: false, error: checkResult.error };
      }

      // Apply diff directly to worktree
      storage.logEvent(taskId, 'Applying diff to worktree...', 'info');
      const worktreeGit = simpleGit(worktreeDir);
      
      // Write diff to patch file in worktree
      const patchFilePath = path.join(worktreeDir, '.vibe-diff.patch');
      fs.writeFileSync(patchFilePath, patch, { encoding: 'utf-8' });
      
      try {
        await worktreeGit.raw(['apply', '--verbose', '.vibe-diff.patch']);
        storage.logEvent(taskId, 'Diff applied successfully', 'success');
      } catch (applyError: any) {
        const errorOutput = [applyError.message, applyError.stderr, applyError.stdout].filter(Boolean).join('\n');
        if (applyError.stderr) {
          storage.logEvent(taskId, `git apply stderr: ${applyError.stderr}`, 'error');
        }
        if (applyError.stdout) {
          storage.logEvent(taskId, `git apply stdout: ${applyError.stdout}`, 'error');
        }
        // Persist failed patch for debugging
        await this.persistFailedPatch(patch, taskId, iteration);
        return { success: false, error: errorOutput };
      } finally {
        // Clean up patch file
        if (fs.existsSync(patchFilePath)) {
          fs.unlinkSync(patchFilePath);
        }
      }

      return { success: true };

    } catch (error: any) {
      const errorMessage = error.message || String(error);
      storage.logEvent(taskId, `Git apply failed: ${errorMessage}`, 'error');
      
      // Persist failed patch for debugging
      await this.persistFailedPatch(patch, taskId, iteration);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Persists a failed patch to disk for debugging purposes
   * Saves to PATCHES_DIR/<task_id>-iter<k>.diff
   * Logs patch statistics (line count, character count, first 60 lines)
   */
  private async persistFailedPatch(diff: string, taskId: string, iteration: number): Promise<void> {
    try {
      // Ensure patches directory exists
      if (!fs.existsSync(PATCHES_DIR)) {
        fs.mkdirSync(PATCHES_DIR, { recursive: true });
      }

      // Create patch file path
      const patchFileName = `${taskId}-iter${iteration}.diff`;
      const patchFilePath = path.join(PATCHES_DIR, patchFileName);

      // Write patch to file
      fs.writeFileSync(patchFilePath, diff, { encoding: 'utf-8' });

      // Calculate statistics
      const lines = diff.split('\n');
      const lineCount = lines.length;
      const charCount = diff.length;

      // Log statistics
      storage.logEvent(taskId, `[Patch Persistence] Saved failed patch to: ${patchFilePath}`, 'info');
      storage.logEvent(taskId, `[Patch Persistence] Line count: ${lineCount}, Character count: ${charCount}`, 'info');

      // Log first 80 lines with line numbers
      const previewLines = lines.slice(0, 80);
      const numberedPreview = previewLines
        .map((line, idx) => `${String(idx + 1).padStart(4, ' ')}. ${line}`)
        .join('\n');
      
      storage.logEvent(taskId, `[Patch Persistence] First 80 lines:\n${numberedPreview}`, 'info');
      
      if (lineCount > 80) {
        storage.logEvent(taskId, `[Patch Persistence] ... (${lineCount - 80} more lines)`, 'info');
      }

    } catch (error: any) {
      // User-facing error message
      storage.logEvent(
        taskId, 
        `[Patch Persistence] WARNING: Could not save failed patch for debugging. Error: ${error.message}`, 
        'warning'
      );
      storage.logEvent(
        taskId,
        `[Patch Persistence] This means debugging artifacts will not be available for this iteration.`,
        'warning'
      );
    }
  }

  private async createPullRequest(task: VibeTask, mainGit: SimpleGit, worktreeGit: SimpleGit): Promise<void> {
    try {
      storage.updateTaskState(task.task_id, 'creating_pr');
      storage.logEvent(task.task_id, 'Pushing branch to remote...', 'info');

      // Push branch from main repo (not worktree)
      await mainGit.push('origin', task.destination_branch, ['--force']);
      storage.logEvent(task.task_id, `Branch pushed: ${task.destination_branch}`, 'success');

      // Determine repository URL
      let repoUrl: string;
      if (task.project_id) {
        const project = storage.getProject(task.project_id);
        if (!project) {
          throw new Error(`Project not found: ${task.project_id}`);
        }
        
        // Try to get remote URL from the repository
        try {
          const remotes = await mainGit.getRemotes(true);
          const origin = remotes.find(r => r.name === 'origin');
          if (origin && origin.refs.fetch) {
            repoUrl = origin.refs.fetch;
          } else {
            storage.logEvent(task.task_id, 'No GitHub remote found, PR creation skipped', 'warning');
            storage.updateTaskState(task.task_id, 'completed');
            return;
          }
        } catch (error: any) {
          storage.logEvent(task.task_id, `Could not get remote URL: ${error.message}`, 'warning');
          storage.updateTaskState(task.task_id, 'completed');
          return;
        }
      } else if (task.repository_url) {
        repoUrl = task.repository_url;
      } else {
        throw new Error('Task has neither project_id nor repository_url');
      }

      // Create PR
      const prResult = await createGitHubPr({
        repoUrl,
        sourceBranch: task.source_branch,
        targetBranch: task.destination_branch,
        prompt: task.user_prompt,
        taskId: task.task_id,
        iterationCount: task.iteration_count
      });

      if (prResult.success && prResult.prUrl) {
        storage.setPrUrl(task.task_id, prResult.prUrl);
        storage.updateTaskState(task.task_id, 'completed');
        storage.logEvent(task.task_id, `✓ Pull request created: ${prResult.prUrl}`, 'success');
      } else {
        storage.updateTaskState(task.task_id, 'failed');
        storage.logEvent(task.task_id, `Failed to create PR: ${prResult.error}`, 'error');
      }

    } catch (error: any) {
      storage.updateTaskState(task.task_id, 'failed');
      storage.logEvent(task.task_id, `Error creating PR: ${error.message}`, 'error');
    }
  }
}

// Start the executor
const executor = new VibeExecutor();
executor.start().catch(console.error);
