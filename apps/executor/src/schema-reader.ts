import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase-client';

// ── Encryption (mirrors apps/api/src/routes/supabase.ts) ──────────────

function deriveKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY env var is not set');
  return crypto.scryptSync(raw, 'vibe-supabase-salt', 32);
}

function decrypt(stored: string): string {
  const [ivHex, tagHex, encHex] = stored.split(':');
  const key = deriveKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(encHex, 'hex', 'utf8') + decipher.final('utf8');
}

// ── Schema types ──────────────────────────────────────────────────────

export interface TableInfo {
  table_name: string;
  columns: { column_name: string; data_type: string; is_nullable: string }[];
}

export interface RlsPolicy {
  table_name: string;
  policy_name: string;
  cmd: string;
  qual: string | null;
}

export interface SchemaSnapshot {
  tables: TableInfo[];
  policies: RlsPolicy[];
  formatted: string;
}

// ── Connection lookup ─────────────────────────────────────────────────

async function getProjectSupabaseClient(projectId: string) {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('supabase_connections')
    .select('url, service_key_enc')
    .eq('project_id', projectId)
    .single();

  if (error || !data) return null;

  const serviceKey = decrypt(data.service_key_enc);
  return createClient(data.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
  });
}

// ── Schema reader ─────────────────────────────────────────────────────

export async function readProjectSchema(projectId: string): Promise<SchemaSnapshot | null> {
  const client = await getProjectSupabaseClient(projectId);
  if (!client) return null;

  // Query tables and columns from information_schema
  const { data: colRows, error: colErr } = await client.rpc('exec_sql', {
    query: `
      SELECT t.table_name, c.column_name, c.data_type, c.is_nullable
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON c.table_schema = t.table_schema AND c.table_name = t.table_name
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `,
  });

  // Query RLS policies
  const { data: policyRows, error: polErr } = await client.rpc('exec_sql', {
    query: `
      SELECT tablename AS table_name, policyname AS policy_name, cmd, qual::text
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `,
  });

  // Parse tables from column rows
  const tableMap = new Map<string, TableInfo>();
  const columns = Array.isArray(colRows) ? colRows : [];
  for (const row of columns) {
    const tbl = row.table_name as string;
    if (!tableMap.has(tbl)) {
      tableMap.set(tbl, { table_name: tbl, columns: [] });
    }
    tableMap.get(tbl)!.columns.push({
      column_name: row.column_name as string,
      data_type: row.data_type as string,
      is_nullable: row.is_nullable as string,
    });
  }
  const tables = Array.from(tableMap.values());

  // Parse policies
  const policies: RlsPolicy[] = (Array.isArray(policyRows) ? policyRows : []).map((r: Record<string, unknown>) => ({
    table_name: r.table_name as string,
    policy_name: r.policy_name as string,
    cmd: r.cmd as string,
    qual: (r.qual as string) || null,
  }));

  const formatted = formatSchemaBlock(tables, policies);
  return { tables, policies, formatted };
}

// ── Formatter ─────────────────────────────────────────────────────────

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
