/**
 * llm-router test suite
 *
 * Stubs the global fetch and ./storage before requiring the module under test.
 * Validates that generateDiff calls the Supabase Edge Function correctly and
 * returns the expected diff + usage metrics.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Module from 'module';

// ── Spy containers ────────────────────────────────────────────────────────────
const fetchCalls: Array<{ url: string; init: any }> = [];
const logEventCalls: Array<[string, string, string]> = [];

// ── Mock fetch response factory ───────────────────────────────────────────────
function makeFetchResponse(body: object, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const CLAUDE_RESPONSE = {
  diff: 'diff --git a/f b/f\n--- a/f\n+++ b/f\n@@ -1 +1 @@\n-old\n+new',
  usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
};

const OPENAI_RESPONSE = {
  diff: 'diff --git a/f b/f\n--- a/f\n+++ b/f\n@@ -1 +1 @@\n-old\n+new',
  usage: { input_tokens: 20, output_tokens: 8, total_tokens: 28 },
};

// ── Stub global fetch ─────────────────────────────────────────────────────────
const originalFetch = globalThis.fetch;

(globalThis as any).fetch = async (url: string, init: any) => {
  fetchCalls.push({ url, init });
  const body = JSON.parse(init.body);
  if (body.model === 'gpt') {
    return makeFetchResponse(OPENAI_RESPONSE);
  }
  return makeFetchResponse(CLAUDE_RESPONSE);
};

// ── Mock storage ──────────────────────────────────────────────────────────────
const mockStorage = {
  logEvent: (taskId: string, message: string, severity: string) => {
    logEventCalls.push([taskId, message, severity]);
  },
};

// ── Intercept require() before the module is first loaded ─────────────────────
const originalLoad = (Module as any)._load.bind(Module);
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === './storage' || request === './storage.js')
    return { storage: mockStorage };
  return originalLoad(request, parent, isMain);
};

// Clear the cached module (in case it was already loaded) so our stubs apply
delete (require as any).cache[(require as any).resolve('./llm-router')];

// Now import the module under test
const { generateDiff } = require('./llm-router');

// ── Restore after the suite ───────────────────────────────────────────────────
after(() => {
  (Module as any)._load = originalLoad;
  globalThis.fetch = originalFetch;
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function reset() {
  fetchCalls.length = 0;
  logEventCalls.length = 0;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('llm-router: module shape', () => {
  it('exports generateDiff as a function', () => {
    assert.strictEqual(typeof generateDiff, 'function');
  });
});

describe('llm-router: edge function call (claude)', () => {
  before(reset);

  it('calls fetch with POST to the edge function URL', async () => {
    reset();
    await generateDiff('add a log line', 'repo context', { model: 'claude', taskId: 't1' });
    assert.strictEqual(fetchCalls.length, 1, 'fetch called once');
    assert.ok(fetchCalls[0].url.includes('generate-diff'), 'URL targets generate-diff');
    assert.strictEqual(fetchCalls[0].init.method, 'POST');
  });

  it('sends model as "claude" in the request body', async () => {
    reset();
    await generateDiff('task', 'ctx', { model: 'claude', taskId: 't2' });
    const body = JSON.parse(fetchCalls[0].init.body);
    assert.strictEqual(body.model, 'claude');
  });

  it('returns diff text and correct usage tokens', async () => {
    reset();
    const result = await generateDiff('fix', 'ctx', { model: 'claude', taskId: 't3' });
    assert.ok(result.diff.length > 0, 'diff non-empty');
    assert.strictEqual(result.usage.input_tokens, 10);
    assert.strictEqual(result.usage.output_tokens, 5);
    assert.strictEqual(result.usage.total_tokens, 15);
  });
});

describe('llm-router: edge function call (gpt)', () => {
  it('sends model "gpt" in the request body', async () => {
    reset();
    await generateDiff('add types', 'ctx', { model: 'gpt', taskId: 't4' });
    const body = JSON.parse(fetchCalls[0].init.body);
    assert.strictEqual(body.model, 'gpt');
  });

  it('returns diff text and correct usage tokens', async () => {
    reset();
    const result = await generateDiff('fix', 'ctx', { model: 'gpt', taskId: 't6' });
    assert.ok(result.diff.length > 0, 'diff non-empty');
    assert.strictEqual(result.usage.input_tokens, 20);
    assert.strictEqual(result.usage.output_tokens, 8);
    assert.strictEqual(result.usage.total_tokens, 28);
  });
});

describe('llm-router: storage.logEvent', () => {
  it('logs model, input_tokens, output_tokens, latency for claude', async () => {
    reset();
    await generateDiff('fix', 'ctx', { model: 'claude', taskId: 'log-c' });
    const entry = logEventCalls.find(([tid]) => tid === 'log-c');
    assert.ok(entry, 'logEvent called for task log-c');
    assert.match(entry![1], /claude/);
    assert.match(entry![1], /input_tokens=10/);
    assert.match(entry![1], /output_tokens=5/);
    assert.match(entry![1], /latency=\d+ms/);
    assert.strictEqual(entry![2], 'info');
  });

  it('logs model, input_tokens, output_tokens, latency for gpt', async () => {
    reset();
    await generateDiff('fix', 'ctx', { model: 'gpt', taskId: 'log-g' });
    const entry = logEventCalls.find(([tid]) => tid === 'log-g');
    assert.ok(entry, 'logEvent called for task log-g');
    assert.match(entry![1], /gpt/);
    assert.match(entry![1], /input_tokens=20/);
    assert.match(entry![1], /output_tokens=8/);
    assert.match(entry![1], /latency=\d+ms/);
    assert.strictEqual(entry![2], 'info');
  });
});

describe('llm-router: request body construction', () => {
  it('includes prompt and context in the request body', async () => {
    reset();
    await generateDiff('add a button', 'MY REPO CONTEXT', { model: 'claude', taskId: 'msg-1' });
    const body = JSON.parse(fetchCalls[0].init.body);
    assert.ok(body.prompt.includes('add a button'), 'prompt in request body');
    assert.strictEqual(body.context, 'MY REPO CONTEXT', 'context in request body');
  });

  it('appends previousError to prompt when provided', async () => {
    reset();
    await generateDiff('fix', 'ctx', { model: 'claude', taskId: 'msg-2' }, 'HUNK MISMATCH ERROR');
    const body = JSON.parse(fetchCalls[0].init.body);
    assert.ok(body.prompt.includes('HUNK MISMATCH ERROR'), 'previousError in prompt');
    assert.ok(body.prompt.includes('fix'), 'original prompt still present');
  });

  it('does not add error section when previousError is absent', async () => {
    reset();
    await generateDiff('fix', 'ctx', { model: 'claude', taskId: 'msg-3' });
    const body = JSON.parse(fetchCalls[0].init.body);
    assert.ok(!body.prompt.includes('PREVIOUS ERROR'), 'no error section in prompt');
  });
});

describe('llm-router: auth headers', () => {
  it('includes Authorization header when SUPABASE_ANON_KEY is set', async () => {
    const originalEnv = process.env.SUPABASE_ANON_KEY;
    process.env.SUPABASE_ANON_KEY = 'test-anon-key-123';
    try {
      reset();
      await generateDiff('fix', 'ctx', { model: 'claude', taskId: 'auth-1' });
      const headers = fetchCalls[0].init.headers;
      assert.strictEqual(headers['Authorization'], 'Bearer test-anon-key-123');
      assert.strictEqual(headers['apikey'], 'test-anon-key-123');
    } finally {
      if (originalEnv === undefined) {
        delete process.env.SUPABASE_ANON_KEY;
      } else {
        process.env.SUPABASE_ANON_KEY = originalEnv;
      }
    }
  });
});
