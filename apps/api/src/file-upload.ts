import { getPlatformSupabaseClient } from './supabase/client';
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import path from 'path';

/** Max rows we'll accept per upload */
const MAX_ROWS = 50_000;

/** Characters allowed in generated table names */
const SAFE_NAME_RE = /[^a-z0-9_]/g;

export interface UploadResult {
  tableName: string;
  rowCount: number;
  columns: { name: string; pgType: string }[];
}

/**
 * Sanitise a filename into a valid Postgres table name.
 * Prefix with "ud_" (user-data) to avoid collisions with system tables.
 */
export function deriveTableName(filename: string, userId: string): string {
  const base = path.basename(filename, path.extname(filename));
  const safe = base.toLowerCase().replace(SAFE_NAME_RE, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
  const shortId = userId.replace(/-/g, '').slice(0, 8);
  const name = `ud_${safe}_${shortId}`;
  // Postgres identifier limit is 63 chars
  return name.slice(0, 63);
}

/**
 * Parse an uploaded buffer into an array of row objects.
 * Supports CSV (.csv) and Excel (.xlsx, .xls).
 */
export function parseFile(buffer: Buffer, filename: string): Record<string, unknown>[] {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.csv') {
    const rows = csvParse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: true,
      relax_column_count: true,
    }) as Record<string, unknown>[];
    return rows;
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Excel file has no sheets');
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    return rows;
  }

  throw new Error(`Unsupported file type: ${ext}. Only .csv, .xlsx, and .xls are supported.`);
}

/**
 * Infer a Postgres column type from a sample of values.
 */
function inferPgType(values: unknown[]): string {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';

  let allInt = true;
  let allNum = true;
  let allBool = true;

  for (const v of nonNull.slice(0, 200)) {
    const s = String(v).trim();
    if (allBool && s !== 'true' && s !== 'false' && s !== '0' && s !== '1') allBool = false;
    if (allInt && !/^-?\d+$/.test(s)) allInt = false;
    if (allNum && isNaN(Number(s))) allNum = false;
  }

  if (allBool) return 'boolean';
  if (allInt) return 'bigint';
  if (allNum) return 'double precision';
  return 'text';
}

/**
 * Build a column schema from parsed rows.
 */
export function inferSchema(rows: Record<string, unknown>[]): { name: string; pgType: string }[] {
  if (rows.length === 0) return [];

  // Collect all keys across rows (handles sparse data)
  const keySet = new Set<string>();
  for (const row of rows.slice(0, 500)) {
    for (const k of Object.keys(row)) keySet.add(k);
  }

  const columns: { name: string; pgType: string }[] = [];
  for (const key of keySet) {
    const safeName = key.toLowerCase().replace(SAFE_NAME_RE, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '') || 'col';
    const sample = rows.map((r) => r[key]);
    columns.push({ name: safeName, pgType: inferPgType(sample) });
  }
  return columns;
}

/**
 * Create a Supabase table dynamically, insert rows, and enable RLS.
 * Returns metadata about what was created.
 */
export async function createTableAndInsert(
  rows: Record<string, unknown>[],
  columns: { name: string; pgType: string }[],
  tableName: string,
  userId: string
): Promise<UploadResult> {
  if (rows.length > MAX_ROWS) {
    throw new Error(`File has ${rows.length} rows, max is ${MAX_ROWS}`);
  }
  if (columns.length === 0) {
    throw new Error('No columns detected in file');
  }

  const sb = getPlatformSupabaseClient();

  // Build CREATE TABLE DDL
  const colDefs = columns.map((c) => `"${c.name}" ${c.pgType}`).join(',\n  ');
  const createSQL = `
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      owner_id uuid NOT NULL DEFAULT auth.uid(),
      ${colDefs},
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `;

  // Enable RLS and add policy so users can only read their own rows
  const rlsSQL = `
    ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "owner_read_${tableName}"
      ON "${tableName}" FOR SELECT
      USING (owner_id = auth.uid());

    CREATE POLICY "service_insert_${tableName}"
      ON "${tableName}" FOR INSERT
      WITH CHECK (true);
  `;

  // Execute DDL via Supabase rpc (requires a helper function) or raw SQL
  // Using supabase-js .rpc() with a generic SQL executor isn't available,
  // so we use the REST API to call a postgres function.
  // Fallback: use the admin client to run SQL via pg_net or the management API.
  // Simplest safe approach: use supabase.rpc with a pre-deployed exec_sql function,
  // or inline via the REST Data API by creating a stored procedure.
  // For VIBE, we use the service-role client which has full access.

  const { error: createErr } = await sb.rpc('exec_sql', { query: createSQL });
  if (createErr) {
    // If exec_sql doesn't exist, create it first
    if (createErr.message?.includes('exec_sql')) {
      const bootstrap = `
        CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void
        LANGUAGE plpgsql SECURITY DEFINER AS $$
        BEGIN EXECUTE query; END;
        $$;
      `;
      const { error: bootstrapErr } = await sb.rpc('exec_sql', { query: bootstrap });
      // If even this fails, we need to create exec_sql via migration
      if (bootstrapErr) {
        throw new Error(`Cannot execute DDL: exec_sql function not available. ${bootstrapErr.message}`);
      }
      // Retry create
      const { error: retryErr } = await sb.rpc('exec_sql', { query: createSQL });
      if (retryErr) throw new Error(`Failed to create table: ${retryErr.message}`);
    } else {
      throw new Error(`Failed to create table: ${createErr.message}`);
    }
  }

  // Apply RLS
  const { error: rlsErr } = await sb.rpc('exec_sql', { query: rlsSQL });
  if (rlsErr) {
    console.warn(`[FILE-UPLOAD] RLS policy warning (may already exist): ${rlsErr.message}`);
  }

  // Insert rows in batches of 500
  const BATCH_SIZE = 500;
  const colNames = columns.map((c) => c.name);
  // Map original keys to safe column names
  const keyMap = new Map<string, string>();
  const originalKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
  for (let i = 0; i < originalKeys.length && i < columns.length; i++) {
    keyMap.set(originalKeys[i], columns[i].name);
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const mapped = batch.map((row) => {
      const obj: Record<string, unknown> = { owner_id: userId };
      for (const [origKey, safeKey] of keyMap) {
        obj[safeKey] = row[origKey] ?? null;
      }
      return obj;
    });

    const { error: insertErr } = await sb.from(tableName).insert(mapped);
    if (insertErr) {
      throw new Error(`Insert failed at row ${i}: ${insertErr.message}`);
    }
    inserted += batch.length;
  }

  // Track upload in user_uploads metadata table
  await sb.from('user_uploads').insert({
    user_id: userId,
    table_name: tableName,
    row_count: inserted,
    columns: JSON.stringify(columns),
  }).then(({ error }) => {
    if (error) console.warn(`[FILE-UPLOAD] Could not track upload: ${error.message}`);
  });

  return { tableName, rowCount: inserted, columns };
}

/**
 * Build a context string describing uploaded data for injection into LLM prompts.
 */
export function buildDataContext(result: UploadResult): string {
  const colList = result.columns.map((c) => `  - "${c.name}" (${c.pgType})`).join('\n');
  return `UPLOADED DATA:
Table: "${result.tableName}"
Rows: ${result.rowCount}
Columns:
${colList}
Query this table with: SELECT * FROM "${result.tableName}" WHERE owner_id = auth.uid()`;
}
