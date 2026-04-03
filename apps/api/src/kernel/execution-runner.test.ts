import { describe, it, before, after, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

// ── Environment setup (must come before imports that read process.env) ──────

const MOCK_EDGE_PORT = 4199;
const MOCK_SUPABASE_PORT = 4200;

process.env.SUPABASE_URL = `http://localhost:${MOCK_SUPABASE_PORT}`;
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

// ── Mock Supabase REST server ───────────────────────────────────────────────
// Simulates PostgREST responses for the tables the runner queries.

const SKILL_ROW = {
  id: '11111111-1111-1111-1111-111111111111',
  plugin_name: 'sales',
  skill_name: 'crm-dashboard',
  team_function: 'sales',
  description: 'CRM dashboard skill',
  content: 'Build a CRM dashboard showing pipeline metrics.',
  is_active: true,
};

const EXECUTION_ROW = {
  id: '22222222-2222-2222-2222-222222222222',
  organization_id: '33333333-3333-3333-3333-333333333333',
  team_id: '44444444-4444-4444-4444-444444444444',
  skill_id: SKILL_ROW.id,
  trigger_source: 'hubspot',
  trigger_event: 'deal.created',
  trigger_payload: { deal_id: 'D-100', amount: 5000 },
  status: 'pending',
  created_at: new Date().toISOString(),
};

const TEAM_ROW = {
  id: EXECUTION_ROW.team_id,
  name: 'Sales',
  organization_id: EXECUTION_ROW.organization_id,
};

// Track what the runner wrote back
const updatedRows: Array<{ path: string; body: unknown }> = [];

let mockSupabase: http.Server;

function startMockSupabase(): Promise<void> {
  return new Promise((resolve) => {
    let claimCount = 0;

    mockSupabase = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${MOCK_SUPABASE_PORT}`);
      const table = url.pathname.replace('/rest/v1/', '');
      let body = '';

      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        // --- autonomous_executions SELECT (pending poll) ---
        if (req.method === 'GET' && table === 'autonomous_executions') {
          if (claimCount === 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(EXECUTION_ROW));
          } else {
            // After first claim, return 406 (PostgREST "no rows" for .single())
            res.writeHead(406, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'No rows found' }));
          }
          return;
        }

        // --- autonomous_executions PATCH (claim or complete/fail) ---
        if (req.method === 'PATCH' && table === 'autonomous_executions') {
          const parsed = body ? JSON.parse(body) : {};
          updatedRows.push({ path: req.url!, body: parsed });

          if (parsed.status === 'running') {
            claimCount++;
            // Return the claimed row with Prefer: return=representation
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ...EXECUTION_ROW, status: 'running' }));
          } else {
            // complete or failed update
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ...EXECUTION_ROW, status: parsed.status }));
          }
          return;
        }

        // --- skill_registry SELECT ---
        if (req.method === 'GET' && table === 'skill_registry') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(SKILL_ROW));
          return;
        }

        // --- teams SELECT ---
        if (req.method === 'GET' && table === 'teams') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(TEAM_ROW));
          return;
        }

        // --- team_members SELECT (for resolveKernelContext) ---
        if (req.method === 'GET' && table === 'team_members') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ role: 'admin' }));
          return;
        }

        // --- Any other table the context-injector queries ---
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }

        // Default fallback
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
      });
    });

    mockSupabase.listen(MOCK_SUPABASE_PORT, () => resolve());
  });
}

// ── Mock Edge Function server ───────────────────────────────────────────────

let mockEdge: http.Server;
let edgeCallCount = 0;
let lastEdgePayload: unknown = null;

function startMockEdge(): Promise<void> {
  return new Promise((resolve) => {
    mockEdge = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        edgeCallCount++;
        lastEdgePayload = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          diff: '<html><body>Generated dashboard</body></html>',
          mode: 'dashboard',
          usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 },
        }));
      });
    });

    mockEdge.listen(MOCK_EDGE_PORT, () => resolve());
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('execution-runner', () => {
  before(async () => {
    await startMockSupabase();
    await startMockEdge();

    // Point the edge function URL to our mock
    process.env.SUPABASE_URL = `http://localhost:${MOCK_EDGE_PORT}`;
  });

  after(async () => {
    // Need to invalidate the cached Supabase client
    mockSupabase?.close();
    mockEdge?.close();
  });

  beforeEach(() => {
    updatedRows.length = 0;
    edgeCallCount = 0;
    lastEdgePayload = null;
  });

  it('module exports startExecutionRunner and stopExecutionRunner', async () => {
    const mod = await import('./execution-runner');
    assert.strictEqual(typeof mod.startExecutionRunner, 'function');
    assert.strictEqual(typeof mod.stopExecutionRunner, 'function');
  });

  it('startExecutionRunner is idempotent (second call is a no-op)', async () => {
    const mod = await import('./execution-runner');
    // Call twice — should not throw
    mod.startExecutionRunner(60_000); // long interval so it doesn't fire
    mod.startExecutionRunner(60_000); // no-op
    mod.stopExecutionRunner();
  });

  it('stopExecutionRunner cleans up without error when not running', async () => {
    const mod = await import('./execution-runner');
    // Should not throw even if not running
    mod.stopExecutionRunner();
  });
});

// ── Structural tests (do not need mocks) ────────────────────────────────────

describe('execution-runner — structure', () => {
  it('file exists and is importable', async () => {
    const mod = await import('./execution-runner');
    assert.ok(mod, 'Module should be importable');
  });

  it('exports only startExecutionRunner and stopExecutionRunner', async () => {
    const mod = await import('./execution-runner');
    const exports = Object.keys(mod).sort();
    assert.deepStrictEqual(exports, ['startExecutionRunner', 'stopExecutionRunner']);
  });
});
