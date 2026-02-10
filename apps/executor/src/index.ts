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
    // Create base work directory structure: .vibe/work/<task-id>/
    const baseWorkDir = path.join(os.tmpdir(), '.vibe', 'work', task.task_id);
    let git: SimpleGit | null = null;

    try {
      // Ensure base directory exists
      if (!fs.existsSync(baseWorkDir)) {
        fs.mkdirSync(baseWorkDir, { recursive: true });
      }

      // State: cloning
      storage.updateTaskState(task.task_id, 'cloning');
      
      // Clone repository to base directory
      const repoDir = path.join(baseWorkDir, 'repo');
      storage.logEvent(task.task_id, `Base work directory: ${baseWorkDir}`, 'info');
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
      
      // Directory diagnostics after clone
      storage.logEvent(task.task_id, 'Clone completed. Running diagnostics...', 'info');
      
      try {
        const files = fs.readdirSync(repoDir);
        const fileCount = files.length;
        const preview = files.slice(0, 10).join(', ');
        const logMsg = fileCount <= 10 
          ? `Directory listing (${fileCount} items): ${preview}`
          : `Directory listing (${fileCount} items, showing first 10): ${preview}...`;
        storage.logEvent(task.task_id, logMsg, 'info');
        
        const readmePath = path.join(repoDir, 'README.md');
        const readmeExists = fs.existsSync(readmePath);
        storage.logEvent(task.task_id, `README.md exists: ${readmeExists}`, 'info');
      } catch (error: any) {
        storage.logEvent(task.task_id, `Directory listing failed: ${error.message}`, 'warning');
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

      // Run iteration loop with base directory and repo directory
      await this.iterationLoop(task, baseWorkDir, repoDir, git);

    } catch (error: any) {
      storage.updateTaskState(task.task_id, 'failed');
      storage.logEvent(task.task_id, `Fatal error: ${error.message}`, 'error');
    } finally {
      // Cleanup entire base work directory
      if (fs.existsSync(baseWorkDir)) {
        fs.rmSync(baseWorkDir, { recursive: true, force: true });
      }
    }
  }

  private async iterationLoop(task: VibeTask, baseWorkDir: string, repoDir: string, git: SimpleGit): Promise<void> {
    let consecutiveApplyFailures = 0;
    let consecutiveDiffFailures = 0;
    let fallbackFiles: Set<string> = new Set();
    let globalFallback = false;
    let failureFeedback: string | null = null;

    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
      storage.incrementIteration(task.task_id);
      storage.logEvent(task.task_id, `Starting iteration ${iteration}/${MAX_ITERATIONS}`, 'info');

      // Create clean working directory for this attempt
      const attemptWorkDir = path.join(baseWorkDir, `attempt-${iteration}`);
      if (fs.existsSync(attemptWorkDir)) {
        fs.rmSync(attemptWorkDir, { recursive: true, force: true });
      }
      fs.mkdirSync(attemptWorkDir, { recursive: true });
      storage.logEvent(task.task_id, `Clean work directory created: ${attemptWorkDir}`, 'info');

      // Reset repository to clean state before this iteration
      // This ensures each attempt starts from a known good state
      try {
        await git.reset(['--hard', 'HEAD']);
        // Clean untracked files and directories
        await git.raw(['clean', '-fd']);
        storage.logEvent(task.task_id, 'Repository reset to clean state', 'info');
      } catch (error: any) {
        storage.logEvent(task.task_id, `Warning: Failed to reset repo: ${error.message}`, 'warning');
      }

      // State: building_context
      storage.updateTaskState(task.task_id, 'building_context');
      storage.logEvent(task.task_id, 'Building context from repository...', 'info');

      const contextResult = await buildContext(repoDir, task.user_prompt);
      storage.logEvent(
        task.task_id,
        `Context built: ${contextResult.files.size} files, ${contextResult.totalSize} chars${contextResult.truncated ? ' (truncated)' : ''}`,
        'info'
      );

      const context = formatContext(contextResult.files);

      // State: calling_llm
      storage.updateTaskState(task.task_id, 'calling_llm');
      storage.logEvent(task.task_id, `Calling LLM (iteration ${iteration})...`, 'info');

      const result = await this.generateDiff(task.user_prompt, context, task.task_id, repoDir, globalFallback, fallbackFiles, failureFeedback);
      
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

        const preflightResult = await runPreflightChecks(repoDir, (stage, output) => {
          storage.logEvent(task.task_id, `[${stage}] ${output}`, 'info');
        });

        if (preflightResult.success) {
          storage.logEvent(task.task_id, '✓ All preflight checks passed!', 'success');
          
          // Check if there are any commits on the branch
          const status = await git.status();
          const log = await git.log({ from: task.source_branch, to: task.destination_branch });
          
          if (log.total === 0 && status.isClean()) {
            // No commits and working directory is clean - skip PR creation
            storage.updateTaskState(task.task_id, 'completed');
            storage.logEvent(task.task_id, 'No changes; no PR created.', 'success');
            return;
          }
          
          // There are commits, create PR
          await this.createPullRequest(task, git);
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
      storage.logEvent(task.task_id, 'Applying diff to repository...', 'info');

      const applyResult = await this.applyDiff(repoDir, attemptWorkDir, diff, task.task_id, iteration);
      
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

      // Commit the changes
      await git.add('.');
      await git.commit(`VIBE iteration ${iteration}: ${task.user_prompt.slice(0, 50)}`);
      storage.logEvent(task.task_id, `Changes committed (iteration ${iteration})`, 'success');

      // State: running_preflight
      storage.updateTaskState(task.task_id, 'running_preflight');
      storage.logEvent(task.task_id, 'Running preflight checks...', 'info');

      const preflightResult = await runPreflightChecks(repoDir, (stage, output) => {
        storage.logEvent(task.task_id, `[${stage}] ${output}`, 'info');
      });

      if (preflightResult.success) {
        // All checks passed! Create PR
        storage.logEvent(task.task_id, '✓ All preflight checks passed!', 'success');
        await this.createPullRequest(task, git);
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

  /**
   * Builds additional context for README file edits.
   * Returns null if prompt doesn't mention README or no README exists.
   */
  private buildReadmeContext(prompt: string, repoDir: string): string | null {
    // Check if prompt mentions README
    const promptLower = prompt.toLowerCase();
    if (!promptLower.includes('readme')) {
      return null;
    }

    // Find existing README file (check common locations)
    const readmePaths = [
      'README.md',
      'readme.md', 
      'README',
      'apps/web/README.md'
    ];

    let existingReadmePath: string | null = null;
    let existingReadmeContent: string | null = null;

    for (const readmePath of readmePaths) {
      const fullPath = path.join(repoDir, readmePath);
      if (fs.existsSync(fullPath)) {
        existingReadmePath = readmePath;
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          // Include first ~60 lines as specified in the requirements
          const lines = content.split('\n');
          const preview = lines.slice(0, 60).join('\n');
          existingReadmeContent = preview;
          break;
        } catch (error) {
          continue;
        }
      }
    }

    if (!existingReadmePath || !existingReadmeContent) {
      return null;
    }

    // Build the README-specific context
    return `
---
README FILE CONTEXT:
- Existing file: ${existingReadmePath}
- This file ALREADY EXISTS in the repository
- DO NOT create ${existingReadmePath}. It already exists.
- You must generate a MODIFY diff, not a new file diff.
- The diff MUST NOT include "new file mode" or "--- /dev/null"
- The diff MUST start with "--- a/${existingReadmePath}" (not "--- /dev/null")

Current content (first 60 lines):
${existingReadmeContent}
---`;
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

    // Build README-specific context if applicable
    const readmeContext = this.buildReadmeContext(prompt, repoDir);

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
`;

        // Add README-specific context if available
        if (readmeContext) {
          userPrompt += readmeContext;
          storage.logEvent(taskId, 'Added README-specific context to LLM prompt', 'info');
        }

        userPrompt += `
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

        // Add example skeleton diff if retrying with validation error
        if (attempt > 0 && lastValidationError) {
          const exampleSkeleton = `

Example of a correct modify diff:

diff --git a/example.js b/example.js
--- a/example.js
+++ b/example.js
@@ -1,3 +1,4 @@
 function example() {
+  console.log('added line');
   return true;
 }
`;
          userPrompt += exampleSkeleton;
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
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

  private async applyDiff(repoDir: string, attemptWorkDir: string, diff: string, taskId: string, iteration: number): Promise<{ success: boolean; error?: string }> {
    // Normalize line endings before any processing (CRLF and CR to LF)
    let patch = diff.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Ensure exactly one trailing newline
    patch = patch.trimEnd() + '\n';
    
    // Use attemptWorkDir for worktree to ensure clean isolation per attempt
    const tempWorktreePath = path.join(attemptWorkDir, 'worktree');
    const mainGit = simpleGit(repoDir);
    let worktreeCreated = false;
    
    try {
      storage.logEvent(taskId, `Creating temporary worktree at ${tempWorktreePath}...`, 'info');

      // Get current branch name from the working directory
      const currentBranch = await mainGit.revparse(['--abbrev-ref', 'HEAD']);
      
      // Check applicability first with validateDiffApplicability
      const checkResult = validateDiffApplicability(patch, repoDir);
      if (!checkResult.valid) {
        storage.logEvent(taskId, `git apply --check failed: ${checkResult.error}`, 'error');
        // Persist failed patch for debugging
        await this.persistFailedPatch(patch, taskId, iteration);
        return { success: false, error: checkResult.error };
      }
      
      // Add worktree pointing to current branch
      await mainGit.raw(['worktree', 'add', '--detach', tempWorktreePath, 'HEAD']);
      worktreeCreated = true;
      storage.logEvent(taskId, `Temporary worktree created at ${tempWorktreePath}`, 'success');

      // Write diff to patch file in temp worktree
      const patchFilePath = path.join(tempWorktreePath, 'patch.diff');
      fs.writeFileSync(patchFilePath, patch, { encoding: 'utf-8' });
      
      // Run git apply --check in temp worktree
      storage.logEvent(taskId, 'Running git apply --check in temporary worktree...', 'info');
      const worktreeGit = simpleGit(tempWorktreePath);
      
      try {
        await worktreeGit.raw(['apply', '--check', 'patch.diff']);
        storage.logEvent(taskId, '✓ Preflight check passed in temporary worktree', 'success');
      } catch (checkError: any) {
        storage.logEvent(taskId, `✗ Preflight check failed: ${checkError.message}`, 'error');
        const errorOutput = [checkError.message, checkError.stderr, checkError.stdout].filter(Boolean).join('\n');
        if (checkError.stderr) {
          storage.logEvent(taskId, `git apply stderr: ${checkError.stderr}`, 'error');
        }
        if (checkError.stdout) {
          storage.logEvent(taskId, `git apply stdout: ${checkError.stdout}`, 'error');
        }
        // Persist failed patch for debugging
        await this.persistFailedPatch(patch, taskId, iteration);
        return { success: false, error: errorOutput };
      }

      // Preflight passed, now apply to real working directory
      storage.logEvent(taskId, 'Applying diff to real working directory...', 'info');
      const realPatchPath = path.join(repoDir, '.vibe-diff.patch');
      fs.writeFileSync(realPatchPath, patch, { encoding: 'utf-8' });
      
      await mainGit.raw(['apply', '--verbose', '.vibe-diff.patch']);
      
      // Clean up patch file from real working directory
      fs.unlinkSync(realPatchPath);

      storage.logEvent(taskId, 'Diff applied successfully', 'success');
      return { success: true };

    } catch (error: any) {
      const errorMessage = error.message || String(error);
      storage.logEvent(taskId, `Git apply failed: ${errorMessage}`, 'error');
      
      // Persist failed patch for debugging
      await this.persistFailedPatch(patch, taskId, iteration);
      return { success: false, error: errorMessage };
    } finally {
      // Always clean up worktree if it was created
      if (worktreeCreated) {
        try {
          if (fs.existsSync(tempWorktreePath)) {
            await mainGit.raw(['worktree', 'remove', '--force', tempWorktreePath]);
            storage.logEvent(taskId, 'Temporary worktree cleaned up', 'info');
          }
        } catch (cleanupError: any) {
          storage.logEvent(taskId, `Warning: Failed to clean up worktree: ${cleanupError.message}`, 'warning');
        }
      }
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

  private async createPullRequest(task: VibeTask, git: SimpleGit): Promise<void> {
    try {
      storage.updateTaskState(task.task_id, 'creating_pr');
      storage.logEvent(task.task_id, 'Pushing branch to remote...', 'info');

      // Push branch
      await git.push('origin', task.destination_branch, ['--force']);
      storage.logEvent(task.task_id, `Branch pushed: ${task.destination_branch}`, 'success');

      // Create PR
      const prResult = await createGitHubPr({
        repoUrl: task.repository_url,
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
