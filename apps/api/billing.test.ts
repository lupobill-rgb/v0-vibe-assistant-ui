import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// These tests require a running Supabase instance.
// They will be skipped if SUPABASE_URL / SUPABASE_SERVICE_KEY are not set.

const SKIP = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY;

describe('Billing storage — org-scoped isolation', { skip: SKIP ? 'SUPABASE_URL / SUPABASE_SERVICE_KEY not set' : false }, () => {
  // Lazy-load so the module doesn't throw when env vars are missing
  let storage: typeof import('./src/storage').storage;
  let orgId: string;
  let otherOrgId: string;
  let teamId: string;
  let projectId: string;

  before(async () => {
    const mod = await import('./src/storage');
    storage = mod.storage;

    // Seed hierarchy: org → team → project
    const org = await storage.createOrganization({ name: 'billing-test-org', slug: `bt-${Date.now()}` });
    orgId = org.id;

    const otherOrg = await storage.createOrganization({ name: 'billing-other-org', slug: `bo-${Date.now()}` });
    otherOrgId = otherOrg.id;

    const team = await storage.createTeam({ org_id: orgId, name: 'billing-team', slug: `bteam-${Date.now()}` });
    teamId = team.id;

    const project = await storage.createProject({
      name: `billing-proj-${Date.now()}`,
      team_id: teamId,
      local_path: '/tmp/billing-test',
    });
    projectId = project.id;

    // Seed a completed job with token usage
    await storage.createTask({
      task_id: `billing-task-${Date.now()}`,
      user_prompt: 'fix bug',
      project_id: projectId,
      source_branch: 'main',
      destination_branch: 'vibe/1',
      execution_state: 'completed',
      initiated_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      llm_model: 'claude',
    });

    // Get the task ID back and update usage metrics
    const tasks = await storage.listRecentTasks(10);
    const task = tasks.find(t => t.project_id === projectId);
    if (task) {
      await storage.updateTaskUsageMetrics(task.task_id, {
        llm_prompt_tokens: 1000,
        llm_completion_tokens: 500,
        llm_total_tokens: 1500,
      });
    }
  });

  after(async () => {
    // Cleanup: delete the test orgs (cascades to teams → projects → jobs)
    if (storage) {
      try {
        const mod = await import('./src/supabase/client');
        const sb = mod.getPlatformSupabaseClient();
        await sb.from('organizations').delete().eq('id', orgId);
        await sb.from('organizations').delete().eq('id', otherOrgId);
      } catch { /* best effort */ }
    }
  });

  it('getBillingUsage scopes to org and computes cost correctly', async () => {
    const rows = await storage.getBillingUsage(orgId);
    assert.ok(rows.length > 0, 'expected rows for org');
    const row = rows.find(r => r.model === 'claude')!;
    assert.ok(row, 'claude model row present');
    assert.equal(row.input_tokens, 1000);
    assert.equal(row.output_tokens, 500);
    // (1000/1e6)*3 + (500/1e6)*15 = 0.003 + 0.0075 = 0.0105 USD
    assert.ok(Math.abs(row.cost_usd - 0.0105) < 1e-9, `cost=${row.cost_usd}`);
    assert.equal(row.job_count, 1);
  });

  it('getBillingUsage returns no rows for other org (no bleed)', async () => {
    const rows = await storage.getBillingUsage(otherOrgId);
    assert.equal(rows.length, 0);
  });

  it('getBillingExport returns per-task rows only for org', async () => {
    const rows = await storage.getBillingExport(orgId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].llm_prompt_tokens, 1000);
    assert.equal(rows[0].llm_completion_tokens, 500);
  });

  it('getBillingExport is empty for other org', async () => {
    const rows = await storage.getBillingExport(otherOrgId);
    assert.equal(rows.length, 0);
  });

  it('getTenantSpend matches expected cost for org', async () => {
    const spend = await storage.getTenantSpend(orgId);
    assert.ok(Math.abs(spend - 0.0105) < 1e-9, `spend=${spend}`);
  });

  it('getTenantSpend is 0 for other org', async () => {
    const spend = await storage.getTenantSpend(otherOrgId);
    assert.equal(spend, 0);
  });

  it('getTenantBudget returns null when no budget set', async () => {
    const budget = await storage.getTenantBudget(orgId);
    assert.equal(budget, null);
  });

  it('setTenantBudget persists and getTenantBudget retrieves it', async () => {
    await storage.setTenantBudget(orgId, 25.00);
    const budget = await storage.getTenantBudget(orgId);
    assert.equal(budget, 25.00);
  });

  it('setTenantBudget upserts — second call updates existing ceiling', async () => {
    await storage.setTenantBudget(orgId, 50.00);
    const budget = await storage.getTenantBudget(orgId);
    assert.equal(budget, 50.00);
  });

  it('budget for other org is unaffected by org upsert', async () => {
    const budget = await storage.getTenantBudget(otherOrgId);
    assert.equal(budget, null);
  });
});
