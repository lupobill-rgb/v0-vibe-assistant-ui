import { parse as csvParse } from 'csv-parse/sync';
import { getPlatformSupabaseClient } from '../supabase/client';
import { ingestBudgetCSV, isBudgetRelated, type IngestResult } from './ingest-budget-csv';

// ── Types ────────────────────────────────────────────────────────────────

export interface AssetPublishResult {
  asset_id: string;
  team_id: string;
  asset_type: string;
  row_count: number;
  replaced: boolean;           // true if this was an upsert over existing
  /** Budget-specific ingest result when asset_type is 'budget_plan' */
  budget_ingest?: IngestResult;
  errors: string[];
}

export interface PublishOptions {
  teamId: string;
  assetType: string;
  rawContent: string;
  originalFilename: string;
  mimeType?: string;
  publishedBy?: string;
  metadata?: Record<string, unknown>;
  /** Org ID — required for budget_plan asset_type to resolve team names */
  orgId?: string;
}

// ── Asset type detection ─────────────────────────────────────────────────

const ASSET_TYPE_PATTERNS: [RegExp, string][] = [
  [/budget|financial|fy\d{2,4}|fiscal|allocation|spend.*plan/i, 'budget_plan'],
  [/price.?list|pricing|rate.?card|tariff/i, 'price_list'],
  [/product.?catalog|sku|inventory|product.?list/i, 'product_catalog'],
  [/employee|headcount|roster|staff|org.?chart/i, 'headcount'],
  [/sales.?target|quota|territory|pipeline/i, 'sales_targets'],
  [/policy|compliance|guideline|sop/i, 'policy_doc'],
];

/**
 * Detect the asset_type from prompt + filename.
 * Returns null if no publish intent detected.
 */
export function detectAssetType(prompt: string, filename?: string): string | null {
  const text = `${prompt} ${filename ?? ''}`;
  for (const [pattern, type] of ASSET_TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return null;
}

/**
 * Detect if the prompt implies a publish/share intent (not just a personal upload).
 */
export function hasPublishIntent(prompt: string): boolean {
  return /publish|share|distribute|push|broadcast|update.*team|team.*update|upload.*plan|plan.*upload/i.test(prompt);
}

// ── Core ingest ──────────────────────────────────────────────────────────

/**
 * Publish any team asset to published_assets.
 * Upserts via ON CONFLICT (team_id, asset_type) — re-upload replaces the old.
 *
 * For budget_plan assets, also populates budget_allocations for backward compat.
 */
export async function ingestTeamAsset(opts: PublishOptions): Promise<AssetPublishResult> {
  const {
    teamId,
    assetType,
    rawContent,
    originalFilename,
    mimeType = 'text/csv',
    publishedBy,
    metadata = {},
    orgId,
  } = opts;

  const errors: string[] = [];
  let rowCount = 0;
  let columnSchema: { name: string; pgType: string }[] | null = null;
  let sampleData: Record<string, unknown>[] | null = null;

  // Parse CSV to extract schema + sample for structured assets
  if (mimeType === 'text/csv' || originalFilename.endsWith('.csv')) {
    try {
      const rows: Record<string, string>[] = csvParse(rawContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      rowCount = rows.length;

      if (rows.length > 0) {
        // Infer column schema from first row
        columnSchema = Object.keys(rows[0]).map(col => {
          const sample = rows.slice(0, 20).map(r => r[col]);
          const allNumeric = sample.every(v => v === '' || !isNaN(Number(v)));
          return { name: col, pgType: allNumeric ? 'numeric' : 'text' };
        });
        sampleData = rows.slice(0, 20);
      }
    } catch (e: any) {
      errors.push(`CSV parse warning: ${e.message}`);
    }
  } else {
    // For non-CSV (JSON, etc.) store raw — no schema extraction
    try {
      const parsed = JSON.parse(rawContent);
      rowCount = Array.isArray(parsed) ? parsed.length : 1;
      sampleData = Array.isArray(parsed) ? parsed.slice(0, 20) : [parsed];
    } catch {
      // Not JSON — store raw, row_count stays 0
    }
  }

  // Check if an existing asset exists (to report replaced: true)
  const sb = getPlatformSupabaseClient();
  const { data: existing } = await sb
    .from('published_assets')
    .select('id')
    .eq('team_id', teamId)
    .eq('asset_type', assetType)
    .limit(1)
    .single();

  const replaced = !!existing;

  // Upsert into published_assets
  const { data: upserted, error: upsertErr } = await sb
    .from('published_assets')
    .upsert(
      {
        team_id: teamId,
        asset_type: assetType,
        mime_type: mimeType,
        original_filename: originalFilename,
        raw_content: rawContent,
        row_count: rowCount,
        column_schema: columnSchema,
        sample_data: sampleData,
        metadata,
        published_by: publishedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,asset_type' },
    )
    .select('id')
    .single();

  if (upsertErr) {
    console.error(`[INGEST] published_assets upsert FAILED for team=${teamId} type=${assetType}: ${upsertErr.message}`);
    errors.push(`Publish failed: ${upsertErr.message}`);
    return {
      asset_id: '',
      team_id: teamId,
      asset_type: assetType,
      row_count: rowCount,
      replaced,
      errors,
    };
  }

  console.log(`[INGEST] published_assets: wrote 1 row (asset_id=${upserted?.id}, team=${teamId}, type=${assetType}, ${rowCount} data rows, replaced=${replaced})`);

  const result: AssetPublishResult = {
    asset_id: upserted?.id ?? '',
    team_id: teamId,
    asset_type: assetType,
    row_count: rowCount,
    replaced,
    errors,
  };

  // ── Budget backward compat: also populate budget_allocations ──
  if (assetType === 'budget_plan' && orgId) {
    try {
      const budgetResult = await ingestBudgetCSV(
        rawContent,
        orgId,
        typeof metadata.fiscal_year === 'number' ? metadata.fiscal_year : undefined,
      );
      result.budget_ingest = budgetResult;
      console.log(`[INGEST] budget_allocations: wrote ${budgetResult.rows_processed} rows, failed ${budgetResult.rows_failed} rows (fiscal_year=${budgetResult.fiscal_year})`);
      if (budgetResult.rows_failed > 0) {
        errors.push(`Budget ingest: ${budgetResult.rows_failed} rows skipped`);
      }
    } catch (e: any) {
      console.error(`[INGEST] budget_allocations ingest FAILED: ${e.message}`);
      errors.push(`Budget ingest side-effect failed: ${e.message}`);
    }
  }

  return result;
}
