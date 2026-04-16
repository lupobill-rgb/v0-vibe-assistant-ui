import { storage } from '../storage';
import { getPlatformSupabaseClient } from '../supabase/client';
import type { GoldenMatch } from '../orchestrator/orchestrator.types';
import { isBudgetRelated } from '../lib/ingest-budget-csv';
import { ingestTeamAsset, detectAssetType, hasPublishIntent } from '../lib/ingest-team-asset';
import {
  resolveColorScheme,
  buildColorBlock,
} from '../starter-site';

export interface DashboardHandlerParams {
  taskId: string;
  resolvedMode: string;
  upload_id: string | undefined;
  org: { id: string; [key: string]: any } | null | undefined;
  prompt: string;
  enrichedPrompt: string;
  project: { team_id: string; [key: string]: any };
  user_id: string;
  resolvedModel: string;
  budgets: { stepDeadlinesMs: { building: number; [key: string]: number }; [key: string]: any };
  goldenMatch: GoldenMatch;
  startedAtMs: number;
  modelCalls: number;
  totalTokens: number;
  timeline: any[];
  pageNames: string[];
  auditDepartment: string;
  edgeCall: (payload: any) => Promise<{ text: string; ok: boolean; status: number }>;
  signPreviewToken: (jobId: string) => string;
  writeAuditLog: (params: any) => void;
  FRONTEND_BASE_URL: string;
  MAX_INITIAL_PAGES: number;
}

/**
 * Dashboard fast path — bypass planner, single Edge call.
 * Stores dashboard_data JSON in jobs.last_diff. No HTML processing.
 * Returns true if the fast path handled the job, false if it should fall through to planner.
 */
export async function handleDashboardJob(params: DashboardHandlerParams): Promise<boolean> {
  const {
    taskId, resolvedMode, upload_id, org, prompt, project, user_id,
    resolvedModel, budgets, startedAtMs, auditDepartment,
    edgeCall, writeAuditLog, MAX_INITIAL_PAGES,
  } = params;
  let { enrichedPrompt, modelCalls, totalTokens, timeline } = params;

  if (resolvedMode !== 'dashboard' && !upload_id) return false;

  try {
    await storage.updateTaskState(taskId, 'building');
    await storage.logEvent(taskId, `Dashboard fast path activated (${upload_id ? 'file upload' : 'keyword match'}) — skipping planner`, 'info');

    // ── Auto-publish team asset before LLM call ──
    let preIngestPublishTeamId: string | undefined;
    let preIngestAssetType: string | undefined;
    if (upload_id && org) {
      try {
        const { data: uploadForIngest } = await getPlatformSupabaseClient()
          .from('user_uploads')
          .select('raw_content, original_filename')
          .eq('id', upload_id)
          .single();
        const uploadFilename = uploadForIngest?.original_filename || '';
        const assetType = detectAssetType(prompt, uploadFilename);
        const isCSV = uploadFilename.endsWith('.csv') || uploadFilename.endsWith('.CSV');
        if (assetType || hasPublishIntent(prompt) || isBudgetRelated(prompt) || isCSV) {
          if (uploadForIngest?.raw_content) {
            const publishTeamId = project.team_id || (org as any).default_team_id;
            if (publishTeamId) {
              const resolvedType = assetType || (isBudgetRelated(prompt) ? 'budget_plan' : 'general');
              preIngestPublishTeamId = publishTeamId;
              preIngestAssetType = resolvedType;
              console.log(`[AUTO-INGEST] Calling ingestTeamAsset: upload_id=${upload_id} type=${resolvedType} team=${publishTeamId} file=${uploadFilename}`);
              const publishResult = await ingestTeamAsset({
                teamId: publishTeamId,
                assetType: resolvedType,
                rawContent: uploadForIngest.raw_content,
                originalFilename: uploadForIngest.original_filename || 'upload.csv',
                orgId: org.id,
                publishedBy: user_id,
                metadata: { source: 'auto_ingest', job_id: taskId },
              });
              await storage.logEvent(taskId, `Published team asset: type=${resolvedType}, ${publishResult.row_count} rows${publishResult.replaced ? ' (replaced previous)' : ''}`, 'info');
              if (publishResult.budget_ingest) {
                await storage.logEvent(taskId, `Budget allocations synced (raw): ${publishResult.budget_ingest.rows_processed} rows written`, 'info');
              }
              if (publishResult.errors.length > 0) {
                await storage.logEvent(taskId, `Asset publish warnings: ${publishResult.errors.slice(0, 3).join('; ')}`, 'warning');
              }
            }
          } else {
            console.warn(`[AUTO-INGEST] No raw_content for upload ${upload_id} — skipping asset publish`);
          }
        } else {
          console.log(`[AUTO-INGEST] Skipped: no matching asset type, publish intent, or CSV for upload ${upload_id} (file=${uploadFilename})`);
        }
      } catch (ingestErr: any) {
        console.error(`[AUTO-INGEST] Team asset publish failed (non-blocking): ${ingestErr.message}`);
        await storage.logEvent(taskId, `Team asset auto-publish failed: ${ingestErr.message}`, 'warning');
      }
    }

    // ── Inject budget-data extraction instruction for LLM ──
    if (preIngestAssetType === 'budget_plan') {
      enrichedPrompt += `\n\nCRITICAL — BUDGET DATA OUTPUT REQUIREMENT:
After applying any requested changes (reductions, increases, reallocations, etc.) to the uploaded budget data, you MUST include a hidden script tag in your HTML output containing the FINAL ADJUSTED budget numbers as a JSON array.
Format — place this EXACTLY before </body>:
<script id="vibe-budget-data" type="application/json">
[{"team":"TeamName","category":"CategoryName","q1":1234,"q2":1234,"q3":1234,"q4":1234}, ...]
</script>
Each object must have: team (string), category (string), q1/q2/q3/q4 (numbers — the ADJUSTED values after applying the user's requested changes).
Include ALL rows from the original data with their final calculated values. This is how the adjusted numbers get saved to the database.`;
    }

    const dashColorBlock = buildColorBlock(resolveColorScheme(prompt));
    const dashResult = await Promise.race([
      edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: 'dashboard', color_block: dashColorBlock }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Dashboard edge call timed out after ${budgets.stepDeadlinesMs.building / 1000}s`)), budgets.stepDeadlinesMs.building)),
    ]);
    modelCalls += 1;
    if (!dashResult.ok) throw new Error(dashResult.text || `Dashboard edge call returned ${dashResult.status}`);
    let dashData: { diff: string; dashboard_data?: any; truncated?: boolean; model?: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens: number } };
    try {
      dashData = JSON.parse(dashResult.text);
    } catch {
      throw new Error(`Dashboard edge returned invalid JSON (${dashResult.text.length} chars)`);
    }
    if (dashData.truncated) {
      console.warn(`[DASHBOARD-TRUNCATED] LLM output was truncated (${dashData.diff?.length ?? 0} chars)`);
      await storage.logEvent(taskId, 'Warning: LLM output was truncated.', 'warning');
    }
    if (dashData.usage?.total_tokens) totalTokens += dashData.usage.total_tokens;

    // ── Post-LLM budget re-ingest ──
    if (preIngestAssetType === 'budget_plan' && preIngestPublishTeamId && org) {
      try {
        const rawDiff = dashData.diff || '';
        const budgetDataMatch = rawDiff.match(
          /<script\s+id="vibe-budget-data"\s+type="application\/json">\s*([\s\S]*?)\s*<\/script>/i,
        );
        if (budgetDataMatch?.[1]) {
          const adjustedRows: { team: string; category: string; q1: number; q2: number; q3: number; q4: number }[] = JSON.parse(budgetDataMatch[1]);
          if (Array.isArray(adjustedRows) && adjustedRows.length > 0) {
            const csvHeader = 'team,category,q1,q2,q3,q4';
            const csvLines = adjustedRows.map(r =>
              `${r.team},${r.category},${r.q1},${r.q2},${r.q3},${r.q4}`,
            );
            const adjustedCSV = [csvHeader, ...csvLines].join('\n');

            console.log(`[POST-LLM-INGEST] Extracted ${adjustedRows.length} adjusted budget rows from LLM output`);

            const { ingestBudgetCSV: reIngestBudgetCSV } = await import('../lib/ingest-budget-csv');
            const reIngestResult = await reIngestBudgetCSV(adjustedCSV, org.id);

            console.log(`[POST-LLM-INGEST] budget_allocations re-ingested: wrote ${reIngestResult.rows_processed} rows, failed ${reIngestResult.rows_failed} rows`);
            await storage.logEvent(
              taskId,
              `Budget allocations updated with LLM-calculated values: ${reIngestResult.rows_processed} rows written to budget_allocations`,
              'info',
            );
            if (reIngestResult.errors.length > 0) {
              await storage.logEvent(taskId, `Budget re-ingest warnings: ${reIngestResult.errors.slice(0, 3).join('; ')}`, 'warning');
            }
          } else {
            console.warn('[POST-LLM-INGEST] vibe-budget-data tag found but contained no valid rows');
          }
        } else {
          console.log('[POST-LLM-INGEST] No vibe-budget-data tag found in LLM output — budget_allocations retains raw upload values');
        }
      } catch (reIngestErr: any) {
        console.error(`[POST-LLM-INGEST] Failed to extract/re-ingest budget data: ${reIngestErr.message}`);
        await storage.logEvent(taskId, `Budget re-ingest from LLM output failed (non-blocking): ${reIngestErr.message}`, 'warning');
      }
    }

    // ── Store dashboard_data JSON (no HTML processing) ──
    if (dashData.dashboard_data) {
      await storage.setTaskDiff(taskId, JSON.stringify(dashData.dashboard_data));
    } else {
      await storage.setTaskDiff(taskId, JSON.stringify({ error: 'no_dashboard_data', raw: dashData }));
    }

    timeline.push({ step: 'dashboard-fast-path', startedAt: new Date(startedAtMs).toISOString(), endedAt: new Date().toISOString(), durationMs: Date.now() - startedAtMs, status: 'completed' });
    await storage.logEvent(taskId, `LLM responded: ${totalTokens} tokens used`, 'info');
    await storage.logEvent(taskId, `Job Timeline: ${JSON.stringify({ timeline, modelStats: { selected: resolvedModel, modelCalls, retries: 0, fallbacks: 0 }, totalTokens, maxPages: MAX_INITIAL_PAGES, wallTimeMs: Date.now() - startedAtMs })}`, 'info');
    await storage.updateTaskUsageMetrics(taskId, {
      llm_model: dashData.model ?? resolvedModel,
      llm_prompt_tokens: dashData.usage?.input_tokens ?? 0,
      llm_completion_tokens: dashData.usage?.output_tokens ?? 0,
      llm_total_tokens: dashData.usage?.total_tokens ?? 0,
    });
    await storage.updateTaskState(taskId, 'completed');
    if (org) await storage.incrementCreditsUsed(org.id).catch(() => {});
    if (org) writeAuditLog({ org_id: org.id, user_id: user_id!, team_id: project.team_id, job_id: taskId, artifact_type: 'dashboard', generated_output: JSON.stringify(dashData.dashboard_data ?? dashData), department: auditDepartment });
    await storage.logEvent(taskId, 'Dashboard job completed successfully (fast path)', 'info');

    // Write back mutable counters to params
    params.modelCalls = modelCalls;
    params.totalTokens = totalTokens;
    params.pageNames = params.pageNames;

    return true;
  } catch (dashErr: any) {
    await storage.logEvent(taskId, `Dashboard fast path failed (${dashErr.message}), falling back to planner pipeline`, 'warning');
    return false;
  }
}
