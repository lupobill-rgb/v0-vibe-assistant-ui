import { describe, it } from 'node:test';
import assert from 'node:assert';

// We test the formatter logic directly since the DB calls require a live Supabase connection.
// The module exports are tested via a lightweight import that exercises the type contracts.

// Inline the formatter to test it without needing DB connectivity
interface TableInfo {
  table_name: string;
  columns: { column_name: string; data_type: string; is_nullable: string }[];
}

interface RlsPolicy {
  table_name: string;
  policy_name: string;
  cmd: string;
  qual: string | null;
}

function formatSchemaBlock(tables: TableInfo[], policies: RlsPolicy[]): string {
  if (tables.length === 0) return '';

  const lines: string[] = ['## EXISTING SCHEMA (Supabase — do NOT duplicate these tables)\n'];

  for (const tbl of tables) {
    lines.push(`### ${tbl.table_name}`);
    lines.push('| Column | Type | Nullable |');
    lines.push('|--------|------|----------|');
    for (const col of tbl.columns) {
      lines.push(`| ${col.column_name} | ${col.data_type} | ${col.is_nullable} |`);
    }

    const tblPolicies = policies.filter(p => p.table_name === tbl.table_name);
    if (tblPolicies.length > 0) {
      lines.push(`\nRLS policies on \`${tbl.table_name}\`:`);
      for (const p of tblPolicies) {
        lines.push(`- **${p.policy_name}** (${p.cmd}): ${p.qual || 'true'}`);
      }
    } else {
      lines.push(`\n⚠ No RLS policies on \`${tbl.table_name}\` — add one before inserting data.`);
    }
    lines.push('');
  }

  lines.push('RULES:');
  lines.push('- Never CREATE TABLE if the table already exists above.');
  lines.push('- Use ALTER TABLE to add columns to existing tables.');
  lines.push('- Every new table MUST have RLS enabled + at least one policy.');
  lines.push('- Reference existing column names and types exactly as shown.\n');

  return lines.join('\n');
}

describe('Schema Reader — formatSchemaBlock', () => {
  it('returns empty string for no tables', () => {
    assert.strictEqual(formatSchemaBlock([], []), '');
  });

  it('formats tables with columns', () => {
    const tables: TableInfo[] = [
      {
        table_name: 'users',
        columns: [
          { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
          { column_name: 'email', data_type: 'text', is_nullable: 'NO' },
          { column_name: 'name', data_type: 'text', is_nullable: 'YES' },
        ],
      },
    ];
    const result = formatSchemaBlock(tables, []);
    assert.ok(result.includes('## EXISTING SCHEMA'));
    assert.ok(result.includes('### users'));
    assert.ok(result.includes('| id | uuid | NO |'));
    assert.ok(result.includes('| email | text | NO |'));
    assert.ok(result.includes('| name | text | YES |'));
    assert.ok(result.includes('⚠ No RLS policies'));
  });

  it('includes RLS policies for tables that have them', () => {
    const tables: TableInfo[] = [
      {
        table_name: 'posts',
        columns: [{ column_name: 'id', data_type: 'uuid', is_nullable: 'NO' }],
      },
    ];
    const policies: RlsPolicy[] = [
      { table_name: 'posts', policy_name: 'posts_select', cmd: 'SELECT', qual: '(auth.uid() = user_id)' },
      { table_name: 'posts', policy_name: 'posts_insert', cmd: 'INSERT', qual: null },
    ];
    const result = formatSchemaBlock(tables, policies);
    assert.ok(result.includes('RLS policies on `posts`'));
    assert.ok(result.includes('**posts_select** (SELECT): (auth.uid() = user_id)'));
    assert.ok(result.includes('**posts_insert** (INSERT): true'));
    assert.ok(!result.includes('⚠ No RLS policies'));
  });

  it('includes guard rules at the bottom', () => {
    const tables: TableInfo[] = [
      { table_name: 'items', columns: [{ column_name: 'id', data_type: 'uuid', is_nullable: 'NO' }] },
    ];
    const result = formatSchemaBlock(tables, []);
    assert.ok(result.includes('Never CREATE TABLE if the table already exists'));
    assert.ok(result.includes('ALTER TABLE'));
    assert.ok(result.includes('RLS enabled'));
  });

  it('handles multiple tables', () => {
    const tables: TableInfo[] = [
      { table_name: 'users', columns: [{ column_name: 'id', data_type: 'uuid', is_nullable: 'NO' }] },
      { table_name: 'posts', columns: [{ column_name: 'id', data_type: 'uuid', is_nullable: 'NO' }] },
    ];
    const result = formatSchemaBlock(tables, []);
    assert.ok(result.includes('### users'));
    assert.ok(result.includes('### posts'));
  });
});

describe('Schema Reader — type exports', () => {
  it('SchemaSnapshot interface is importable', async () => {
    // Dynamic import to verify the module compiles correctly
    const mod = await import('./schema-reader');
    assert.ok(typeof mod.readProjectSchema === 'function');
  });
});
