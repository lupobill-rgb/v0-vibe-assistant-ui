import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Basic smoke tests for executor storage types and exports.
 * Full integration tests require a running Supabase instance.
 */

describe('Storage - Module exports', () => {
  it('should export storage instance and types', async () => {
    // Dynamic import to avoid needing SUPABASE_URL at module load time
    const mod = await import('./storage');
    assert.ok(mod.storage, 'storage should be exported');
    assert.strictEqual(typeof mod.storage.getTask, 'function', 'getTask should be a function');
    assert.strictEqual(typeof mod.storage.logEvent, 'function', 'logEvent should be a function');
    assert.strictEqual(typeof mod.storage.getNextQueuedTask, 'function', 'getNextQueuedTask should be a function');
    assert.strictEqual(typeof mod.storage.updateTaskState, 'function', 'updateTaskState should be a function');
    assert.strictEqual(typeof mod.storage.getProject, 'function', 'getProject should be a function');
  });
});
