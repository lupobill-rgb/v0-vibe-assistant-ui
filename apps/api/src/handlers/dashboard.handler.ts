import path from 'path';
import fs from 'fs';
import { storage } from '../storage';
import { getPlatformSupabaseClient } from '../supabase/client';
import { isBudgetRelated } from '../lib/ingest-budget-csv';
import { ingestTeamAsset, detectAssetType, hasPublishIntent } from '../lib/ingest-team-asset';
import {
  resolveColorScheme,
  buildColorBlock,
  validateStarterSiteQuality,
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
  goldenMatch: { matched: boolean; skillName: string; content: string; htmlSkeleton: string | null };
  startedAtMs: number;
  modelCalls: number;
  totalTokens: number;
  timeline: any[];
  pageNames: string[];
  auditDepartment: string;
  edgeCall: (payload: any) => Promise<{ text: string; ok: boolean; status: number }>;
  injectSupabaseCredentials: (html: string) => string;
  signPreviewToken: (jobId: string) => string;
  writeAuditLog: (params: any) => void;
  PREVIEWS_DIR: string;
  FRONTEND_BASE_URL: string;
  MAX_INITIAL_PAGES: number;
}

/**
 * Dashboard fast path — bypass planner, single Edge call.
 * Returns updated mutable counters via the params object (modelCalls, totalTokens, pageNames, timeline, goldenMatch).
 * Returns true if the fast path handled the job, false if it should fall through to planner.
 */
export async function handleDashboardJob(params: DashboardHandlerParams): Promise<boolean> {
  const {
    taskId, resolvedMode, upload_id, org, prompt, project, user_id,
    resolvedModel, budgets, startedAtMs, auditDepartment,
    edgeCall, injectSupabaseCredentials, signPreviewToken, writeAuditLog,
    PREVIEWS_DIR, FRONTEND_BASE_URL, MAX_INITIAL_PAGES,
  } = params;
  let { enrichedPrompt, modelCalls, totalTokens, pageNames, timeline, goldenMatch } = params;

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
    let dashData: { diff: string; truncated?: boolean; model?: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens: number } };
    try {
      dashData = JSON.parse(dashResult.text);
    } catch {
      throw new Error(`Dashboard edge returned invalid JSON (${dashResult.text.length} chars)`);
    }
    if (dashData.truncated) {
      console.warn(`[DASHBOARD-TRUNCATED] LLM output was truncated — HTML may be incomplete (${dashData.diff?.length ?? 0} chars)`);
      await storage.logEvent(taskId, 'Warning: LLM output was truncated. Dashboard HTML may be incomplete — closing tags were auto-repaired.', 'warning');
    }
    if (dashData.usage?.total_tokens) totalTokens += dashData.usage.total_tokens;

    // ── Post-LLM budget re-ingest ──
    if (preIngestAssetType === 'budget_plan' && preIngestPublishTeamId && org) {
      try {
        const budgetDataMatch = dashData.diff.match(
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

    // ── Dashboard quality validation gate ──
    const dashQuality = validateStarterSiteQuality(
      [{ route: '/', html: dashData.diff }],
      /placeholder|sample data/i.test(prompt),
      true,
    );
    if (!dashQuality.ok) {
      await storage.logEvent(taskId, `Dashboard quality gate failed: ${dashQuality.reasons.join(' | ')}`, 'warning');
      const elapsedMs = Date.now() - startedAtMs;
      const remainingMs = budgets.stepDeadlinesMs.building - elapsedMs;
      if (remainingMs > 30_000) {
        await storage.logEvent(taskId, 'Attempting dashboard quality repair pass', 'info');
        const repairPrompt = `Return ONLY valid HTML starting with <!DOCTYPE html>. No explanation. No markdown. No preamble.
Repair this dashboard HTML so it includes ALL of the following:
- <nav> element with navigation links
- At least 4 KPI/stat cards with metric values
- At least 2 Chart.js charts with <canvas> elements AND corresponding new Chart() initialization scripts immediately after each canvas
- A data table with <table> element
- <title> tag with descriptive dashboard name
- Sidebar + main content CSS grid layout: grid-cols-[256px_1fr]
- Every <canvas> must have: height="200" style="height:200px !important; max-height:200px;"
Keep all existing Tailwind classes, CSS variables (var(--bg), var(--primary), etc.), fonts, and vibeLoadData() calls intact.
Fix ONLY what is missing — preserve everything that already works.
${dashData.diff}`;
        try {
          const repairResult = await Promise.race([
            edgeCall({ prompt: repairPrompt, model: resolvedModel, mode: 'edit', color_block: dashColorBlock }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Repair timed out')), remainingMs - 5_000)),
          ]);
          modelCalls += 1;
          if (repairResult.ok) {
            const repairData = JSON.parse(repairResult.text);
            if (repairData.diff && repairData.diff.trim().length > dashData.diff.trim().length * 0.5) {
              const repairQuality = validateStarterSiteQuality(
                [{ route: '/', html: repairData.diff }],
                /placeholder|sample data/i.test(prompt),
                true,
              );
              const originalFailCount = dashQuality.reasons.length;
              const repairFailCount = repairQuality.reasons.length;
              if (repairFailCount < originalFailCount) {
                dashData.diff = repairData.diff;
                if (repairData.usage?.total_tokens) totalTokens += repairData.usage.total_tokens;
                await storage.logEvent(taskId, `Dashboard repair accepted: ${originalFailCount} → ${repairFailCount} failures (${repairData.usage?.total_tokens ?? 0} tokens)`, 'info');
              } else {
                await storage.logEvent(taskId, `Repair rejected — did not improve quality (${originalFailCount} → ${repairFailCount} failures). Keeping original.`, 'warning');
              }
            } else {
              await storage.logEvent(taskId, 'Repair output too short — keeping original', 'warning');
            }
          }
        } catch (repairErr: any) {
          await storage.logEvent(taskId, `Dashboard repair failed (non-blocking): ${repairErr.message}`, 'warning');
        }
      } else {
        await storage.logEvent(taskId, `Skipping repair — insufficient time budget (${Math.round(remainingMs / 1000)}s remaining)`, 'warning');
      }
    }

    const previewDir = path.join(PREVIEWS_DIR, taskId);
    fs.mkdirSync(previewDir, { recursive: true });
    fs.writeFileSync(path.join(previewDir, 'index.html'), injectSupabaseCredentials(dashData.diff));
    pageNames = ['index'];
    timeline.push({ step: 'dashboard-fast-path', startedAt: new Date(startedAtMs).toISOString(), endedAt: new Date().toISOString(), durationMs: Date.now() - startedAtMs, status: 'completed' });
    await storage.setTaskDiff(taskId, JSON.stringify([{ name: 'Dashboard', filename: 'index.html', route: '/', html: dashData.diff }]));
    fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(pageNames));
    fs.writeFileSync(path.join(previewDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
    const previewToken = signPreviewToken(taskId);
    await storage.setPreviewUrl(taskId, `${FRONTEND_BASE_URL}/previews/${taskId}/index.html?token=${previewToken}`);
    await storage.logEvent(taskId, 'Preview generated', 'info');
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
    if (org) writeAuditLog({ org_id: org.id, user_id: user_id!, team_id: project.team_id, job_id: taskId, artifact_type: 'dashboard', generated_output: dashData.diff, department: auditDepartment });
    await storage.logEvent(taskId, 'Dashboard job completed successfully (fast path)', 'info');

    // ── Auto-cache skeleton: backfill html_skeleton for golden templates ──
    if (goldenMatch.matched && !goldenMatch.htmlSkeleton
        && dashData.diff.length > 20000 && dashData.diff.includes('new Chart(')) {
      try {
        const { error: cacheErr } = await getPlatformSupabaseClient()
          .from('skill_registry')
          .update({ html_skeleton: dashData.diff })
          .eq('skill_name', goldenMatch.skillName);
        if (cacheErr) {
          console.error(`[GOLDEN-CACHE] Failed to cache skeleton for "${goldenMatch.skillName}": ${cacheErr.message}`);
        } else {
          console.log(`[GOLDEN-CACHE] Cached html_skeleton for "${goldenMatch.skillName}" (${dashData.diff.length} chars)`);
          await storage.logEvent(taskId, `Cached golden template skeleton: ${goldenMatch.skillName} (${dashData.diff.length} chars — future builds will be deterministic)`, 'info');
        }
      } catch (cacheWriteErr: any) {
        console.error(`[GOLDEN-CACHE] Exception caching skeleton: ${cacheWriteErr.message}`);
      }
    }

    // Write back mutable counters to params
    params.modelCalls = modelCalls;
    params.totalTokens = totalTokens;
    params.pageNames = pageNames;

    return true;
  } catch (dashErr: any) {
    await storage.logEvent(taskId, `Dashboard fast path failed (${dashErr.message}), falling back to planner pipeline`, 'warning');
    return false;
  }
}
