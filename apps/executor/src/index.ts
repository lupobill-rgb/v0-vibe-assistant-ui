import dotenv from 'dotenv';
import { storage, VibeTask } from './storage';
import simpleGit, { SimpleGit } from 'simple-git';
import { buildContext, formatContext } from './context-builder';
import { validateUnifiedDiff, extractDiff } from './diff-validator';
import { runPreflightChecks } from './preflight';
import { createGitHubPr } from './github-client';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config();

const MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS || '6', 10);
const POLL_INTERVAL = parseInt(process.env.EXECUTOR_POLL_INTERVAL || '5000', 10);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const workDir = path.join(os.tmpdir(), `vibe-${task.task_id}`);
    let git: SimpleGit | null = null;

    try {
      // State: cloning
      storage.updateTaskState(task.task_id, 'cloning');
      storage.logEvent(task.task_id, `Cloning repository: ${task.repository_url}`, 'info');

      // Clone repository
      await simpleGit().clone(task.repository_url, workDir);
      git = simpleGit(workDir);

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

      // Run iteration loop
      await this.iterationLoop(task, workDir, git);

    } catch (error: any) {
      storage.updateTaskState(task.task_id, 'failed');
      storage.logEvent(task.task_id, `Fatal error: ${error.message}`, 'error');
    } finally {
      // Cleanup
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    }
  }

  private async iterationLoop(task: VibeTask, workDir: string, git: SimpleGit): Promise<void> {
    let consecutiveApplyFailures = 0;
    let consecutiveDiffFailures = 0;

    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
      storage.incrementIteration(task.task_id);
      storage.logEvent(task.task_id, `Starting iteration ${iteration}/${MAX_ITERATIONS}`, 'info');

      // State: building_context
      storage.updateTaskState(task.task_id, 'building_context');
      storage.logEvent(task.task_id, 'Building context from repository...', 'info');

      const contextResult = await buildContext(workDir, task.user_prompt);
      storage.logEvent(
        task.task_id,
        `Context built: ${contextResult.files.size} files, ${contextResult.totalSize} chars${contextResult.truncated ? ' (truncated)' : ''}`,
        'info'
      );

      const context = formatContext(contextResult.files);

      // State: calling_llm
      storage.updateTaskState(task.task_id, 'calling_llm');
      storage.logEvent(task.task_id, `Calling LLM (iteration ${iteration})...`, 'info');

      const diff = await this.generateDiff(task.user_prompt, context, task.task_id);
      
      if (!diff) {
        consecutiveDiffFailures++;
        storage.logEvent(task.task_id, 'LLM failed to generate valid diff', 'error');

        if (consecutiveDiffFailures >= 3) {
          storage.updateTaskState(task.task_id, 'failed');
          storage.logEvent(task.task_id, 'Failed: 3 consecutive invalid diffs from LLM', 'error');
          return;
        }
        continue;
      }

      consecutiveDiffFailures = 0;

      // State: applying_diff
      storage.updateTaskState(task.task_id, 'applying_diff');
      storage.logEvent(task.task_id, 'Applying diff to repository...', 'info');

      const applied = await this.applyDiff(workDir, diff, task.task_id);
      
      if (!applied) {
        consecutiveApplyFailures++;
        storage.logEvent(task.task_id, 'Failed to apply diff', 'error');

        if (consecutiveApplyFailures >= 3) {
          storage.updateTaskState(task.task_id, 'failed');
          storage.logEvent(task.task_id, 'Failed: 3 consecutive git apply failures', 'error');
          return;
        }
        continue;
      }

      consecutiveApplyFailures = 0;

      // Commit the changes
      await git.add('.');
      await git.commit(`VIBE iteration ${iteration}: ${task.user_prompt.slice(0, 50)}`);
      storage.logEvent(task.task_id, `Changes committed (iteration ${iteration})`, 'success');

      // State: running_preflight
      storage.updateTaskState(task.task_id, 'running_preflight');
      storage.logEvent(task.task_id, 'Running preflight checks...', 'info');

      const preflightResult = await runPreflightChecks(workDir, (stage, output) => {
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

  private async generateDiff(prompt: string, context: string, taskId: string): Promise<string | null> {
    try {
      const systemPrompt = `You are a code modification assistant. Generate ONLY a unified diff (git diff format) to implement the requested changes.

IMPORTANT RULES:
1. Output MUST be a valid unified diff format with diff --git, +++, ---, and @@ markers
2. Do NOT include any explanations, markdown, or code blocks
3. Do NOT output anything except the diff itself
4. The diff must be applicable with 'git apply'
5. Keep changes minimal and focused on the request

Context files are provided below.`;

      const userPrompt = `${context}

---

USER REQUEST: ${prompt}

Generate a unified diff to implement this request. Output ONLY the diff, nothing else.`;

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

      // Extract and validate diff
      const diff = extractDiff(rawOutput);
      const validation = validateUnifiedDiff(diff);

      if (!validation.valid) {
        storage.logEvent(taskId, `Invalid diff: ${validation.error}`, 'error');
        return null;
      }

      storage.logEvent(taskId, `Valid diff generated (${validation.lineCount} lines)`, 'success');
      return diff;

    } catch (error: any) {
      storage.logEvent(taskId, `LLM error: ${error.message}`, 'error');
      return null;
    }
  }

  private async applyDiff(workDir: string, diff: string, taskId: string): Promise<boolean> {
    try {
      // Write diff to temporary file
      const diffPath = path.join(workDir, '.vibe-diff.patch');
      fs.writeFileSync(diffPath, diff);

      // Apply with git
      const git = simpleGit(workDir);
      await git.raw(['apply', '--verbose', diffPath]);

      // Clean up
      fs.unlinkSync(diffPath);

      storage.logEvent(taskId, 'Diff applied successfully', 'success');
      return true;

    } catch (error: any) {
      storage.logEvent(taskId, `Git apply failed: ${error.message}`, 'error');
      return false;
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
