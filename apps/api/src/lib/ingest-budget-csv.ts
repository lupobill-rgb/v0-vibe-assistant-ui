import { parse as csvParse } from 'csv-parse/sync';
import { getPlatformSupabaseClient } from '../supabase/client';

interface TeamRow { id: string; name: string }

/** Resolve org team names → IDs (case-insensitive) */
export async function resolveTeams(orgId: string): Promise<Map<string, string>> {
  const sb = getPlatformSupabaseClient();
  const { data } = await sb
    .from('teams')
    .select('id, name')
    .eq('org_id', orgId);
  const map = new Map<string, string>();
  if (data) {
    for (const t of data as TeamRow[]) {
      map.set(t.name.toLowerCase().trim(), t.id);
    }
  }
  return map;
}

export interface IngestResult {
  rows_processed: number;
  rows_failed: number;
  fiscal_year: number;
  errors: string[];
}

/**
 * Parse a budget CSV and upsert rows into budget_allocations.
 * Shared by /api/finance/upload-plan route and the auto-ingest job pipeline.
 *
 * Expected CSV columns: team, category, q1, q2, q3, q4
 */
export async function ingestBudgetCSV(
  csvContent: string,
  orgId: string,
  fiscalYear?: number,
): Promise<IngestResult> {
  const fy = fiscalYear || new Date().getFullYear();

  let rows: Record<string, string>[];
  try {
    rows = csvParse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (e: any) {
    return { rows_processed: 0, rows_failed: 0, fiscal_year: fy, errors: [`CSV parse error: ${e.message}`] };
  }

  if (!rows.length) {
    return { rows_processed: 0, rows_failed: 0, fiscal_year: fy, errors: ['CSV file is empty'] };
  }

  const teamMap = await resolveTeams(orgId);
  const sb = getPlatformSupabaseClient();
  let rowsProcessed = 0;
  let rowsFailed = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2; // +1 header, +1 for 1-based

    const teamName = (row.team || '').trim();
    const category = (row.category || '').trim();
    const q1 = parseFloat(row.q1 || '0');
    const q2 = parseFloat(row.q2 || '0');
    const q3 = parseFloat(row.q3 || '0');
    const q4 = parseFloat(row.q4 || '0');

    if (!teamName) { errors.push(`Row ${lineNum}: missing team name`); rowsFailed++; continue; }
    if (!category) { errors.push(`Row ${lineNum}: missing category`); rowsFailed++; continue; }

    const teamId = teamMap.get(teamName.toLowerCase());
    if (!teamId) { errors.push(`Row ${lineNum}: team "${teamName}" not found`); rowsFailed++; continue; }

    if ([q1, q2, q3, q4].some(isNaN)) { errors.push(`Row ${lineNum}: non-numeric amount`); rowsFailed++; continue; }

    const { error: upsertErr } = await sb
      .from('budget_allocations')
      .upsert(
        {
          organization_id: orgId,
          team_id: teamId,
          category,
          fiscal_year: fy,
          q1_amount: q1,
          q2_amount: q2,
          q3_amount: q3,
          q4_amount: q4,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'team_id,category,fiscal_year' },
      );

    if (upsertErr) { errors.push(`Row ${lineNum}: ${upsertErr.message}`); rowsFailed++; }
    else { rowsProcessed++; }
  }

  console.log(`[BUDGET-CSV] budget_allocations ingest complete: ${rowsProcessed} rows written, ${rowsFailed} rows failed, fiscal_year=${fy}`);
  return { rows_processed: rowsProcessed, rows_failed: rowsFailed, fiscal_year: fy, errors };
}

/** Budget-related keywords for auto-ingest detection */
const BUDGET_KEYWORDS = /budget|financial|fy\d{2,4}|fiscal|allocation|spend|expense|plan.?upload|csv/i;

/** Check if a prompt suggests budget/financial data */
export function isBudgetRelated(prompt: string): boolean {
  return BUDGET_KEYWORDS.test(prompt);
}
