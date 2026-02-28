import { describe, it } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the repository root (same as storage.ts does)
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

/**
 * Integration tests for the Supabase-backed ExecutorStorage.
 *
 * Skipped automatically when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 * are not set.  Each run uses timestamp-based IDs to avoid collisions.
 */

const TEST_PREFIX = `test-${Date.now()}`;
const TEST_PROJECT_ID = `${TEST_PREFIX}-project`;
const TEST_TASK_ID = `${TEST_PREFIX}-task`;

describe('ExecutorStorage — Supabase integration', { skip: !canRun && 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping' }, () => {
  // Lazy-import so the module isn't loaded at all when skipping
  let storage: typeof import('./storage').storage;
  let VibeTask: typeof import('./storage').VibeTask;

  // Resolve the real module only once the suite actually runs
  const getStorage = async () => {
    if (!storage) {
      const mod = await import('./storage');
      storage = mod.storage;
    }
    return storage;
  };

  // ── Cleanup ──
  after(async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await sb.from('job_events').delete().eq('job_id', TEST_TASK_ID);
      await sb.from('jobs').delete().eq('id', TEST_TASK_ID);
    } catch {
      // best-effort
    }
  });

  // ── Task CRUD ──

  it('should create and retrieve a task', async () => {
    const s = await getStorage();
    await s.createTask({
      task_id: TEST_TASK_ID,
      user_prompt: 'Test prompt for storage integration test',
      project_id: TEST_PROJECT_ID,
      source_branch: 'main',
      destination_branch: `test-branch-${TEST_PREFIX}`,
      execution_state: 'queued',
      initiated_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
    });

    const fetched = await s.getTask(TEST_TASK_ID);
    assert.ok(fetched, 'Task should be retrievable after creation');
    assert.strictEqual(fetched.task_id, TEST_TASK_ID);
    assert.strictEqual(fetched.user_prompt, 'Test prompt for storage integration test');
    assert.strictEqual(fetched.execution_state, 'queued');
    assert.strictEqual(fetched.iteration_count, 0);
  });

  it('should update task state', async () => {
    const s = await getStorage();
    await s.updateTaskState(TEST_TASK_ID, 'cloning');

    const fetched = await s.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.execution_state, 'cloning');
  });

  it('should increment iteration count', async () => {
    const s = await getStorage();
    await s.incrementIteration(TEST_TASK_ID);
    await s.incrementIteration(TEST_TASK_ID);

    const fetched = await s.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.iteration_count, 2);
  });

  it('should set PR URL', async () => {
    const s = await getStorage();
    const prUrl = 'https://github.com/test/repo/pull/42';
    await s.setPrUrl(TEST_TASK_ID, prUrl);

    const fetched = await s.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.pull_request_link, prUrl);
  });

  it('should set preview URL', async () => {
    const s = await getStorage();
    const previewUrl = 'https://preview.example.com/42';
    await s.setPreviewUrl(TEST_TASK_ID, previewUrl);

    const fetched = await s.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.preview_url, previewUrl);
  });

  it('should update usage metrics', async () => {
    const s = await getStorage();
    await s.updateTaskUsageMetrics(TEST_TASK_ID, {
      llm_prompt_tokens: 100,
      llm_completion_tokens: 200,
      llm_total_tokens: 300,
      preflight_seconds: 5,
      total_job_seconds: 30,
      files_changed_count: 3,
    });

    const fetched = await s.getTask(TEST_TASK_ID);
    assert.ok(fetched);
    assert.strictEqual(fetched.llm_prompt_tokens, 100);
    assert.strictEqual(fetched.llm_completion_tokens, 200);
    assert.strictEqual(fetched.llm_total_tokens, 300);
    assert.strictEqual(fetched.preflight_seconds, 5);
    assert.strictEqual(fetched.total_job_seconds, 30);
    assert.strictEqual(fetched.files_changed_count, 3);
  });

  it('should include the task in recent tasks list', async () => {
    const s = await getStorage();
    const recent = await s.getRecentTasks();
    const found = recent.find((t) => t.task_id === TEST_TASK_ID);
    assert.ok(found, 'Test task should appear in recent tasks');
  });

  // ── Events ──

  it('should log and retrieve events for a task', async () => {
    const s = await getStorage();
    await s.logEvent(TEST_TASK_ID, 'First event', 'info');
    await s.logEvent(TEST_TASK_ID, 'Second event', 'success');
    await s.logEvent(TEST_TASK_ID, 'Error event', 'error');

    const events = await s.getEventsForTask(TEST_TASK_ID);
    assert.ok(events.length >= 3, `Expected at least 3 events, got ${events.length}`);

    const messages = events.map((e) => e.event_message);
    assert.ok(messages.includes('First event'));
    assert.ok(messages.includes('Second event'));
    assert.ok(messages.includes('Error event'));
  });

  it('should retrieve events after a given time', async () => {
    const s = await getStorage();
    const events = await s.getEventsAfterTime(TEST_TASK_ID, '1970-01-01T00:00:00.000Z');
    assert.ok(events.length >= 3, 'Should return events after epoch');

    const futureEvents = await s.getEventsAfterTime(TEST_TASK_ID, '2099-01-01T00:00:00.000Z');
    assert.strictEqual(futureEvents.length, 0, 'No events should exist in the far future');
  });

  // ── Project lookup ──

  it('should return undefined for a nonexistent project', async () => {
    const s = await getStorage();
    const project = await s.getProject('nonexistent-project-id-9999');
    assert.strictEqual(project, undefined);
  });
});
