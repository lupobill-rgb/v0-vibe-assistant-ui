import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { storage, VibeTask, ExecutionState } from './storage';

/**
 * Integration tests for the Supabase-backed ExecutorStorage.
 *
 * These tests hit the live Supabase instance using the configured
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.
 * Each test run uses unique IDs (timestamp-based) to avoid collisions.
 */

const TEST_PREFIX = `test-${Date.now()}`;
const TEST_PROJECT_ID = `${TEST_PREFIX}-project`;
const TEST_TASK_ID = `${TEST_PREFIX}-task`;

// Helper to build a minimal task object
function makeTask(overrides: Partial<VibeTask> = {}): Omit<VibeTask, 'iteration_count'> {
  return {
    task_id: TEST_TASK_ID,
    user_prompt: 'Test prompt for storage integration test',
    project_id: TEST_PROJECT_ID,
    source_branch: 'main',
    destination_branch: `test-branch-${TEST_PREFIX}`,
    execution_state: 'queued' as ExecutionState,
    initiated_at: new Date().toISOString(),
    last_modified: new Date().toISOString(),
    ...overrides,
  };
}

describe('ExecutorStorage — Supabase integration', () => {
  // ── Cleanup helper ──
  // We delete test rows in `after` so a failed run doesn't leave junk.
  // Deletion is best-effort; we swallow errors so cleanup never masks test failures.

  after(async () => {
    try {
      // The storage class doesn't expose raw delete, so we use the client directly.
      // Import createClient just for cleanup.
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return;
      const sb = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Delete in dependency order: events first, then jobs
      await sb.from('job_events').delete().eq('job_id', TEST_TASK_ID);
      await sb.from('jobs').delete().eq('id', TEST_TASK_ID);
    } catch {
      // best-effort cleanup
    }
  });

  // ── Task CRUD ──

  it('should create and retrieve a task', async () => {
    const task = makeTask();
    await storage.createTask(task);

    const fetched = await storage.getTask(TEST_TASK_ID);
    assert.ok(fetched, 'Task should be retrievable after creation');
    assert.strictEqual(fetched.task_id, TEST_TASK_ID);
    assert.strictEqual(fetched.user_prompt, task.user_prompt);
    assert.strictEqual(fetched.execution_state, 'queued');
    assert.strictEqual(fetched.iteration_count, 0);
  });

  it('should update task state', async () => {
    await storage.updateTaskState(TEST_TASK_ID, 'cloning');

    const fetched = await storage.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.execution_state, 'cloning');
  });

  it('should increment iteration count', async () => {
    await storage.incrementIteration(TEST_TASK_ID);
    await storage.incrementIteration(TEST_TASK_ID);

    const fetched = await storage.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.iteration_count, 2);
  });

  it('should set PR URL', async () => {
    const prUrl = 'https://github.com/test/repo/pull/42';
    await storage.setPrUrl(TEST_TASK_ID, prUrl);

    const fetched = await storage.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.pull_request_link, prUrl);
  });

  it('should set preview URL', async () => {
    const previewUrl = 'https://preview.example.com/42';
    await storage.setPreviewUrl(TEST_TASK_ID, previewUrl);

    const fetched = await storage.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.preview_url, previewUrl);
  });

  it('should update usage metrics', async () => {
    await storage.updateTaskUsageMetrics(TEST_TASK_ID, {
      llm_prompt_tokens: 100,
      llm_completion_tokens: 200,
      llm_total_tokens: 300,
      preflight_seconds: 5,
      total_job_seconds: 30,
      files_changed_count: 3,
    });

    const fetched = await storage.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.llm_prompt_tokens, 100);
    assert.strictEqual(fetched.llm_completion_tokens, 200);
    assert.strictEqual(fetched.llm_total_tokens, 300);
    assert.strictEqual(fetched.preflight_seconds, 5);
    assert.strictEqual(fetched.total_job_seconds, 30);
    assert.strictEqual(fetched.files_changed_count, 3);
  });

  it('should include the task in recent tasks list', async () => {
    const recent = await storage.getRecentTasks();
    const found = recent.find((t) => t.task_id === TEST_TASK_ID);
    assert.ok(found, 'Test task should appear in recent tasks');
  });

  // ── Events ──

  it('should log and retrieve events for a task', async () => {
    await storage.logEvent(TEST_TASK_ID, 'First event', 'info');
    await storage.logEvent(TEST_TASK_ID, 'Second event', 'success');
    await storage.logEvent(TEST_TASK_ID, 'Error event', 'error');

    const events = await storage.getEventsForTask(TEST_TASK_ID);
    assert.ok(events.length >= 3, `Expected at least 3 events, got ${events.length}`);

    const messages = events.map((e) => e.event_message);
    assert.ok(messages.includes('First event'));
    assert.ok(messages.includes('Second event'));
    assert.ok(messages.includes('Error event'));
  });

  it('should retrieve events after a given time', async () => {
    // All events created above should have event_time after epoch
    const events = await storage.getEventsAfterTime(TEST_TASK_ID, '1970-01-01T00:00:00.000Z');
    assert.ok(events.length >= 3, 'Should return events after epoch');

    // Events after far-future should be empty
    const futureEvents = await storage.getEventsAfterTime(TEST_TASK_ID, '2099-01-01T00:00:00.000Z');
    assert.strictEqual(futureEvents.length, 0, 'No events should exist in the far future');
  });

  // ── Project lookup ──

  it('should return undefined for a nonexistent project', async () => {
    const project = await storage.getProject('nonexistent-project-id-9999');
    assert.strictEqual(project, undefined);
  });
});
