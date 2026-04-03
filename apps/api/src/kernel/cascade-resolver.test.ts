import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveCascade } from './cascade-resolver';

// ── Fake IDs ────────────────────────────────────────────────────────
const ORG_ID = '00000000-0000-0000-0000-000000000001';
const TEAM_A = '00000000-0000-0000-0000-00000000000a';
const TEAM_B = '00000000-0000-0000-0000-00000000000b';
const TEAM_C = '00000000-0000-0000-0000-00000000000c';
const SKILL_SRC = 'skill-src-0001';
const SKILL_B1 = 'skill-b-0001';
const SKILL_C1 = 'skill-c-0001';
const EXEC_ID = 'exec-0001';
const ASSET_1 = 'asset-0001';
const SUB_1 = 'sub-0001';
const SUB_2 = 'sub-0002';

// ── Mock Supabase builder ───────────────────────────────────────────

type Row = Record<string, unknown>;

interface TableDef {
  rows: Row[];
  insertCounter?: number;
  insertedRows?: Row[];
}

function createMockClient(tables: Record<string, TableDef>) {
  const inserts: Record<string, Row[]> = {};

  const client = {
    from(tableName: string) {
      const table = tables[tableName] ?? { rows: [] };
      let filtered = [...table.rows];
      let insertPayload: Row | null = null;
      let didInsert = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: Record<string, (...args: any[]) => any> = {
        select() { return chain; },
        eq(col: string, val: unknown) {
          filtered = filtered.filter((r) => r[col] === val);
          return chain;
        },
        in(col: string, vals: unknown[]) {
          filtered = filtered.filter((r) => vals.includes(r[col]));
          return chain;
        },
        single() {
          if (didInsert) {
            const last = table.insertedRows?.[table.insertedRows.length - 1];
            return { data: last ?? null, error: null };
          }
          const row = filtered[0] ?? null;
          return { data: row, error: row ? null : { message: 'not found' } };
        },
        insert(payload: Row) {
          didInsert = true;
          insertPayload = payload;
          if (!inserts[tableName]) inserts[tableName] = [];
          inserts[tableName].push(payload);

          if (tableName === 'autonomous_executions') {
            table.insertCounter = (table.insertCounter ?? 0) + 1;
            if (!table.insertedRows) table.insertedRows = [];
            table.insertedRows.push({ id: `new-exec-${table.insertCounter}`, ...payload });
          }
          return chain;
        },
        // For calls that don't end in .single() — resolve to array
        then(
          resolve: (v: { data: unknown; error: unknown }) => void,
          _reject?: (e: unknown) => void,
        ) {
          if (didInsert && tableName !== 'autonomous_executions') {
            resolve({ data: insertPayload, error: null });
          } else if (didInsert) {
            const last = table.insertedRows?.[table.insertedRows.length - 1];
            resolve({ data: last ?? null, error: null });
          } else {
            resolve({ data: filtered, error: null });
          }
        },
      };

      return chain;
    },
  };

  return { client: client as unknown as Parameters<typeof resolveCascade>[1], inserts };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('cascade-resolver', () => {

  it('dispatches downstream executions for each subscriber team skill', async () => {
    const { client, inserts } = createMockClient({
      autonomous_executions: {
        rows: [{
          id: EXEC_ID, skill_id: SKILL_SRC, team_id: TEAM_A,
          organization_id: ORG_ID, status: 'complete',
        }],
      },
      published_assets: {
        rows: [{ id: ASSET_1, team_id: TEAM_A }],
      },
      feed_subscriptions: {
        rows: [
          { id: SUB_1, asset_id: ASSET_1, subscriber_team_id: TEAM_B, status: 'active' },
          { id: SUB_2, asset_id: ASSET_1, subscriber_team_id: TEAM_C, status: 'active' },
        ],
      },
      skill_registry: {
        rows: [
          { id: SKILL_B1, team_function: 'marketing', is_active: true },
          { id: SKILL_C1, team_function: 'sales', is_active: true },
        ],
      },
      teams: {
        rows: [
          { id: TEAM_B, slug: 'marketing' },
          { id: TEAM_C, slug: 'sales' },
        ],
      },
      cascade_edges: { rows: [] },
    });

    const result = await resolveCascade(EXEC_ID, client);

    assert.strictEqual(result.dispatched, 2, 'should dispatch 2 downstream executions');
    assert.strictEqual(result.errors.length, 0, `unexpected errors: ${result.errors.join(', ')}`);
    assert.strictEqual(result.edges.length, 2);

    // Verify autonomous_executions inserts
    const execInserts = inserts['autonomous_executions'] ?? [];
    assert.strictEqual(execInserts.length, 2);
    assert.strictEqual(execInserts[0].trigger_source, 'cascade');
    assert.strictEqual(execInserts[0].trigger_event, 'upstream_complete');
    assert.strictEqual(execInserts[0].status, 'pending');
    assert.strictEqual(execInserts[0].organization_id, ORG_ID);

    // Verify cascade_edges inserts
    const edgeInserts = inserts['cascade_edges'] ?? [];
    assert.strictEqual(edgeInserts.length, 2);
    assert.strictEqual(edgeInserts[0].source_execution_id, EXEC_ID);
    assert.strictEqual(edgeInserts[0].source_skill_id, SKILL_SRC);
  });

  it('returns early when execution is not complete', async () => {
    const { client } = createMockClient({
      autonomous_executions: {
        rows: [{
          id: EXEC_ID, skill_id: SKILL_SRC, team_id: TEAM_A,
          organization_id: ORG_ID, status: 'running',
        }],
      },
    });

    const result = await resolveCascade(EXEC_ID, client);

    assert.strictEqual(result.dispatched, 0);
    assert.ok(result.errors[0]?.includes('not \'complete\''));
  });

  it('returns early when execution does not exist', async () => {
    const { client } = createMockClient({
      autonomous_executions: { rows: [] },
    });

    const result = await resolveCascade('nonexistent', client);

    assert.strictEqual(result.dispatched, 0);
    assert.ok(result.errors[0]?.includes('Execution not found'));
  });

  it('returns 0 dispatches when no published assets exist', async () => {
    const { client } = createMockClient({
      autonomous_executions: {
        rows: [{
          id: EXEC_ID, skill_id: SKILL_SRC, team_id: TEAM_A,
          organization_id: ORG_ID, status: 'complete',
        }],
      },
      published_assets: { rows: [] },
    });

    const result = await resolveCascade(EXEC_ID, client);

    assert.strictEqual(result.dispatched, 0);
    assert.strictEqual(result.errors.length, 0);
  });

  it('returns 0 dispatches when no active subscriptions', async () => {
    const { client } = createMockClient({
      autonomous_executions: {
        rows: [{
          id: EXEC_ID, skill_id: SKILL_SRC, team_id: TEAM_A,
          organization_id: ORG_ID, status: 'complete',
        }],
      },
      published_assets: {
        rows: [{ id: ASSET_1, team_id: TEAM_A }],
      },
      feed_subscriptions: { rows: [] },
    });

    const result = await resolveCascade(EXEC_ID, client);

    assert.strictEqual(result.dispatched, 0);
    assert.strictEqual(result.errors.length, 0);
  });

  it('skips self-referential cascades', async () => {
    const { client, inserts } = createMockClient({
      autonomous_executions: {
        rows: [{
          id: EXEC_ID, skill_id: SKILL_SRC, team_id: TEAM_A,
          organization_id: ORG_ID, status: 'complete',
        }],
      },
      published_assets: {
        rows: [{ id: ASSET_1, team_id: TEAM_A }],
      },
      feed_subscriptions: {
        rows: [
          { id: SUB_1, asset_id: ASSET_1, subscriber_team_id: TEAM_A, status: 'active' },
        ],
      },
      skill_registry: {
        rows: [{ id: SKILL_SRC, team_function: 'data', is_active: true }],
      },
      teams: {
        rows: [{ id: TEAM_A, slug: 'data' }],
      },
      cascade_edges: { rows: [] },
    });

    const result = await resolveCascade(EXEC_ID, client);

    assert.strictEqual(result.dispatched, 0, 'self-referential cascade must be skipped');
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual((inserts['autonomous_executions'] ?? []).length, 0);
  });

  it('deduplicates subscriber teams with multiple subscriptions', async () => {
    const ASSET_2 = 'asset-0002';
    const { client } = createMockClient({
      autonomous_executions: {
        rows: [{
          id: EXEC_ID, skill_id: SKILL_SRC, team_id: TEAM_A,
          organization_id: ORG_ID, status: 'complete',
        }],
      },
      published_assets: {
        rows: [
          { id: ASSET_1, team_id: TEAM_A },
          { id: ASSET_2, team_id: TEAM_A },
        ],
      },
      feed_subscriptions: {
        rows: [
          { id: SUB_1, asset_id: ASSET_1, subscriber_team_id: TEAM_B, status: 'active' },
          { id: SUB_2, asset_id: ASSET_2, subscriber_team_id: TEAM_B, status: 'active' },
        ],
      },
      skill_registry: {
        rows: [{ id: SKILL_B1, team_function: 'marketing', is_active: true }],
      },
      teams: {
        rows: [{ id: TEAM_B, slug: 'marketing' }],
      },
      cascade_edges: { rows: [] },
    });

    const result = await resolveCascade(EXEC_ID, client);

    assert.strictEqual(result.dispatched, 1, 'duplicate subscriber should dispatch only once per skill');
  });
});
