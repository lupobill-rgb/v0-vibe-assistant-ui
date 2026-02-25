import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// These tests require a running Supabase instance.
// They will be skipped if SUPABASE_URL / SUPABASE_SERVICE_KEY are not set.

const SKIP = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY;

/** Make a base64url-encoded JWT with the given payload (no real signing). */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

function request(
  server: http.Server,
  method: string,
  path: string,
  opts: { headers?: Record<string, string>; body?: unknown } = {}
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as { port: number };
    const payload = opts.body ? JSON.stringify(opts.body) : undefined;
    const headers: Record<string, string> = {
      ...(opts.headers || {}),
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(payload)) } : {}),
    };
    const req = http.request({ hostname: 'localhost', port: addr.port, method, path, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(data || 'null') }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('Billing HTTP — routes', { skip: SKIP ? 'SUPABASE_URL / SUPABASE_SERVICE_KEY not set' : false }, () => {
  let server: http.Server;
  let orgId: string;
  let otherOrgId: string;

  before(async () => {
    const { storage } = await import('./src/storage');
    const express = (await import('express')).default;
    const billingRouter = (await import('./src/routes/billing')).default;

    // Seed hierarchy: org → team → project → job
    const org = await storage.createOrganization({ name: 'http-billing-org', slug: `hbo-${Date.now()}` });
    orgId = org.id;

    const otherOrg = await storage.createOrganization({ name: 'http-billing-other', slug: `hbo2-${Date.now()}` });
    otherOrgId = otherOrg.id;

    const team = await storage.createTeam({ org_id: orgId, name: 'http-team', slug: `ht-${Date.now()}` });
    const project = await storage.createProject({
      name: `http-proj-${Date.now()}`,
      team_id: team.id,
      local_path: '/tmp/http-billing-test',
    });

    // Seed a completed job with token usage
    const taskId = `http-task-${Date.now()}`;
    await storage.createTask({
      task_id: taskId,
      user_prompt: 'add feature',
      project_id: project.id,
      source_branch: 'main',
      destination_branch: 'vibe/x',
      execution_state: 'completed',
      initiated_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      llm_model: 'gpt',
    });
    await storage.updateTaskUsageMetrics(taskId, {
      llm_prompt_tokens: 2000,
      llm_completion_tokens: 1000,
      llm_total_tokens: 3000,
    });

    // Boot a minimal express app with just the billing router
    const app = express();
    app.use(express.json());
    app.use('/api/billing', billingRouter);

    await new Promise<void>(res => { server = app.listen(0, res); });
  });

  after(async () => {
    if (server) await new Promise<void>(res => server.close(() => res()));
    // Cleanup test data
    try {
      const mod = await import('./src/supabase/client');
      const sb = mod.getPlatformSupabaseClient();
      if (orgId) await sb.from('organizations').delete().eq('id', orgId);
      if (otherOrgId) await sb.from('organizations').delete().eq('id', otherOrgId);
    } catch { /* best effort */ }
  });

  // ── Route tests (billing router no longer has auth middleware — that's in index.ts) ──

  it('GET /usage/:orgId returns correct aggregated data', async () => {
    const r = await request(server, 'GET', `/api/billing/usage/${orgId}`);
    assert.equal(r.status, 200);
    const body = r.body as any;
    assert.equal(body.orgId, orgId);
    assert.ok(Array.isArray(body.rows));
    const row = body.rows.find((x: any) => x.model === 'gpt');
    assert.ok(row, 'gpt row present');
    assert.equal(row.input_tokens, 2000);
    assert.equal(row.output_tokens, 1000);
    // cost = (2000/1e6)*10 + (1000/1e6)*30 = 0.02 + 0.03 = 0.05
    assert.ok(Math.abs(row.cost_usd - 0.05) < 1e-9, `cost=${row.cost_usd}`);
  });

  it('GET /usage/:orgId returns empty for unrelated org', async () => {
    const r = await request(server, 'GET', `/api/billing/usage/${otherOrgId}`);
    assert.equal(r.status, 200);
    const body = r.body as any;
    assert.equal(body.rows.length, 0);
  });

  it('GET /export/:orgId returns CSV content-type', async () => {
    return new Promise<void>((resolve, reject) => {
      const addr = server.address() as { port: number };
      const req = http.request({
        hostname: 'localhost', port: addr.port,
        method: 'GET', path: `/api/billing/export/${orgId}`,
      }, (res) => {
        assert.ok(res.headers['content-type']?.includes('text/csv'), `content-type=${res.headers['content-type']}`);
        let csv = '';
        res.on('data', c => csv += c);
        res.on('end', () => {
          assert.ok(csv.startsWith('date,model,input_tokens'), `csv starts=${csv.slice(0, 50)}`);
          assert.ok(csv.includes('gpt'), 'csv contains gpt row');
          assert.equal(res.statusCode, 200);
          resolve();
        });
      });
      req.on('error', reject);
      req.end();
    });
  });

  it('POST /budget/:orgId sets ceiling and GET /usage reflects it', async () => {
    const set = await request(server, 'POST', `/api/billing/budget/${orgId}`, {
      body: { limitUSD: 99.99 },
    });
    assert.equal(set.status, 200);

    const get = await request(server, 'GET', `/api/billing/usage/${orgId}`);
    assert.equal((get.body as any).budgetLimit, 99.99);
  });

  it('POST /budget rejects non-numeric limitUSD with 400', async () => {
    const r = await request(server, 'POST', `/api/billing/budget/${orgId}`, {
      body: { limitUSD: 'not-a-number' },
    });
    assert.equal(r.status, 400);
  });

  it('POST /budget rejects negative limitUSD with 400', async () => {
    const r = await request(server, 'POST', `/api/billing/budget/${orgId}`, {
      body: { limitUSD: -5 },
    });
    assert.equal(r.status, 400);
  });
});
