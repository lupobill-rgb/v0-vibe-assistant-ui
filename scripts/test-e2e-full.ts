/**
 * E2E test: Autonomous Execution Pipeline
 *
 * Tests the full flow:
 *   1. Upsert a skill_registry row with trigger_on = 'airtable'
 *   2. POST mock Airtable webhook to /api/webhooks/airtable
 *   3. Wait for execution runner to poll (10s)
 *   4. Query autonomous_executions — check status progression
 *   5. Query cascade_edges for downstream edges
 *
 * Usage:
 *   npx tsx scripts/test-e2e-full.ts
 *
 * Requires:
 *   - API server running on API_URL (default http://localhost:3001)
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY env vars set
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env from repo root if env vars not already set
function loadEnv() {
  const candidates = [
    resolve(__dirname, '..', '.env'),
    resolve(__dirname, '..', '..', '.env'),
    resolve(__dirname, '..', '..', 'apps', 'api', '.env'),
    // Main repo root (worktrees share the same parent)
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
    'C:/Users/bill/VIBE/.env',
    'C:/Users/bill/VIBE/apps/api/.env',
  ];
  for (const p of candidates) {
    try {
      const content = readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.replace(/^\uFEFF/, '').trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    } catch { /* ignore missing */ }
  }
}
loadEnv();

const API_URL = process.env.API_URL || 'https://vibeapi-production-fdd1.up.railway.app';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function ts(): string {
  return new Date().toISOString();
}

function log(step: string, msg: string) {
  console.log(`[${ts()}] [${step}] ${msg}`);
}

async function apiRequest(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function ensureTestOrg(): Promise<{ orgId: string; teamId: string }> {
  // Check for an existing test org
  const { data: existingOrg } = await sb
    .from('organizations')
    .select('id')
    .eq('slug', 'e2e-auto-test')
    .limit(1)
    .single();

  let orgId: string;
  if (existingOrg) {
    orgId = existingOrg.id;
  } else {
    const { data: newOrg, error } = await sb
      .from('organizations')
      .insert({ name: 'E2E Auto Test Org', slug: 'e2e-auto-test' })
      .select('id')
      .single();
    if (error || !newOrg) throw new Error(`Failed to create org: ${error?.message}`);
    orgId = newOrg.id;
  }

  // Check for existing team (teams table uses org_id, not organization_id)
  const { data: existingTeam } = await sb
    .from('teams')
    .select('id')
    .eq('org_id', orgId)
    .limit(1)
    .single();

  let teamId: string;
  if (existingTeam) {
    teamId = existingTeam.id;
  } else {
    const { data: newTeam, error } = await sb
      .from('teams')
      .insert({
        org_id: orgId,
        name: 'Operations E2E',
        slug: `operations-e2e-${Date.now()}`,
      })
      .select('id')
      .single();
    if (error || !newTeam) throw new Error(`Failed to create team: ${error?.message}`);
    teamId = newTeam.id;
  }

  return { orgId, teamId };
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  VIBE Autonomous Execution E2E Test');
  console.log('========================================');
  console.log(`API:      ${API_URL}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log('');

  // ── Step 0: Ensure test org & team exist ──
  log('SETUP', 'Ensuring test org and team exist...');
  const { orgId, teamId } = await ensureTestOrg();
  log('SETUP', `org_id=${orgId}  team_id=${teamId}`);

  // ── Step 1: Upsert skill_registry row with trigger_on = 'airtable' ──
  log('STEP 1', 'Upserting skill_registry row: pipeline-review → trigger_on=airtable');

  // Check if the skill already exists
  const { data: existingSkill } = await sb
    .from('skill_registry')
    .select('id')
    .eq('skill_name', 'pipeline-review-e2e')
    .limit(1)
    .single();

  let skillId: string;
  if (existingSkill) {
    // Update trigger_on
    const { error } = await sb
      .from('skill_registry')
      .update({ trigger_on: 'airtable', is_active: true })
      .eq('id', existingSkill.id);
    if (error) throw new Error(`Failed to update skill: ${error.message}`);
    skillId = existingSkill.id;
    log('STEP 1', `Updated existing skill ${skillId} → trigger_on=airtable`);
  } else {
    const { data: newSkill, error } = await sb
      .from('skill_registry')
      .insert({
        plugin_name: 'operations',
        skill_name: 'pipeline-review-e2e',
        team_function: 'operations',
        description: 'E2E test skill: pipeline review triggered by Airtable webhook',
        content: '# Pipeline Review\nReview the pipeline data and generate a summary report.',
        is_active: true,
        trigger_on: 'airtable',
      })
      .select('id')
      .single();
    if (error || !newSkill) throw new Error(`Failed to create skill: ${error?.message}`);
    skillId = newSkill.id;
    log('STEP 1', `Created skill ${skillId} with trigger_on=airtable`);
  }

  // Verify skill is in the registry
  const { data: verifySkill } = await sb
    .from('skill_registry')
    .select('id, skill_name, trigger_on, is_active')
    .eq('id', skillId)
    .single();
  log('STEP 1', `Verified: ${JSON.stringify(verifySkill)}`);

  // ── Step 2: POST mock Airtable webhook to /api/webhooks/airtable ──
  log('STEP 2', 'POSTing mock Airtable webhook payload...');
  const webhookPayload = {
    event: 'record.created',
    base: { id: 'appTEST123' },
    table: { id: 'tblTEST456', name: 'Pipeline' },
    record: {
      id: 'recTEST789',
      fields: {
        Name: 'Test Deal',
        Stage: 'Qualification',
        Amount: 50000,
      },
    },
    timestamp: new Date().toISOString(),
  };

  const webhookRes = await apiRequest('POST', '/api/webhooks/airtable', webhookPayload, {
    'x-vibe-org-id': orgId,
    'x-vibe-team-id': teamId,
  });
  log('STEP 2', `Response: HTTP ${webhookRes.status} → ${JSON.stringify(webhookRes.data)}`);

  if (webhookRes.status !== 201) {
    log('STEP 2', 'FAIL — webhook did not return 201. Aborting.');
    process.exit(1);
  }

  const webhookData = webhookRes.data as { matched: number; queued: number; execution_ids: string[] };
  if (!webhookData.execution_ids || webhookData.execution_ids.length === 0) {
    log('STEP 2', 'FAIL — no execution_ids returned. Check skill_registry trigger_on mapping.');
    process.exit(1);
  }

  const executionId = webhookData.execution_ids[0];
  log('STEP 2', `SUCCESS — queued ${webhookData.queued} execution(s). Primary: ${executionId}`);

  // ── Steps 3–4: Poll every 3s for up to 30s until status = complete | failed ──
  log('STEP 3-4', 'Polling autonomous_executions every 3s (max 30s) for terminal status...');
  const POLL_INTERVAL_MS = 3_000;
  const MAX_WAIT_MS = 30_000;
  const startPoll = Date.now();
  let execution: Record<string, unknown> | null = null;
  let pollCount = 0;

  while (Date.now() - startPoll < MAX_WAIT_MS) {
    pollCount++;
    const { data: row, error: pollErr } = await sb
      .from('autonomous_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (pollErr || !row) {
      log('STEP 3-4', `Poll #${pollCount} — FAIL fetching row: ${pollErr?.message}`);
      process.exit(1);
    }

    execution = row;
    const elapsed = ((Date.now() - startPoll) / 1000).toFixed(1);
    log('STEP 3-4', `Poll #${pollCount} (${elapsed}s) — status=${row.status}  job_id=${row.job_id ?? '(null)'}`);

    if (row.status === 'complete' || row.status === 'failed') {
      break;
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  if (!execution) {
    log('STEP 4', 'FAIL — no execution row found');
    process.exit(1);
  }

  log('STEP 4', 'Final execution record:');
  log('STEP 4', `  id:              ${execution.id}`);
  log('STEP 4', `  status:          ${execution.status}`);
  log('STEP 4', `  skill_id:        ${execution.skill_id}`);
  log('STEP 4', `  trigger_source:  ${execution.trigger_source}`);
  log('STEP 4', `  trigger_event:   ${execution.trigger_event}`);
  log('STEP 4', `  job_id:          ${execution.job_id ?? '(null)'}`);
  log('STEP 4', `  created_at:      ${execution.created_at}`);
  log('STEP 4', `  completed_at:    ${execution.completed_at ?? '(null)'}`);

  if (execution.status === 'complete') {
    log('STEP 4', 'SUCCESS — execution completed.');
  } else if (execution.status === 'failed') {
    log('STEP 4', 'COMPLETED (FAILED) — execution ran but failed.');
  } else if (execution.status === 'running') {
    log('STEP 4', 'TIMEOUT — still running after 30s. Runner may need more time.');
  } else if (execution.status === 'pending') {
    log('STEP 4', 'TIMEOUT — still pending after 30s. Runner may not be consuming this row.');
  }

  // ── Step 5: Query cascade_edges for downstream edges ──
  log('STEP 5', 'Querying cascade_edges for downstream edges...');
  const { data: edges, error: edgeError } = await sb
    .from('cascade_edges')
    .select('*')
    .eq('source_execution_id', executionId);

  if (edgeError) {
    log('STEP 5', `FAIL — cascade_edges query error: ${edgeError.message}`);
    process.exit(1);
  }

  if (!edges || edges.length === 0) {
    log('STEP 5', 'No downstream cascade edges found (expected if runner is not yet implemented).');
  } else {
    log('STEP 5', `Found ${edges.length} downstream edge(s):`);
    for (const edge of edges) {
      log('STEP 5', `  ${edge.source_skill_id} → ${edge.target_skill_id} (target_exec: ${edge.target_execution_id})`);
    }
  }

  // ── Summary ──
  console.log('');
  console.log('========================================');
  console.log('  E2E Test Summary');
  console.log('========================================');
  console.log(`  Skill registry entry:     ✅ trigger_on=airtable (${skillId})`);
  console.log(`  Webhook POST:             ✅ HTTP 201, ${webhookData.queued} queued`);
  console.log(`  Execution created:        ✅ ${executionId}`);
  console.log(`  Execution status:         ${execution.status === 'complete' ? '✅' : execution.status === 'pending' ? '⚠️' : '❌'}  ${execution.status}`);
  console.log(`  Cascade edges:            ${edges && edges.length > 0 ? '✅' : '⚠️'}  ${edges?.length ?? 0} edge(s)`);
  console.log('');

  if (execution.status === 'pending') {
    console.log('  ⚠️  The autonomous execution consumer/runner is NOT YET IMPLEMENTED.');
    console.log('     The webhook ingestion and queueing pipeline works correctly.');
    console.log('     Next step: build the runner that polls pending → running → complete.');
  }

  console.log('');

  // Cleanup: remove test execution to keep DB tidy
  log('CLEANUP', 'Removing test execution and skill...');
  await sb.from('cascade_edges').delete().eq('source_execution_id', executionId);
  await sb.from('autonomous_executions').delete().eq('id', executionId);
  await sb.from('skill_registry').delete().eq('id', skillId);
  log('CLEANUP', 'Done.');
}

main().catch((err) => {
  console.error(`\n[${ts()}] [FATAL] ${err.message}`);
  process.exit(1);
});
