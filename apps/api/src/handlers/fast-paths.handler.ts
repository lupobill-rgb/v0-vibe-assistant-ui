import path from 'path';
import fs from 'fs';
import { storage } from '../storage';
import { getPlatformSupabaseClient } from '../supabase/client';
import { resolveColorScheme } from '../starter-site';

export interface DeterministicTemplateParams {
  taskId: string;
  goldenMatch: { matched: boolean; skillName: string; content: string; htmlSkeleton: string | null };
  org: { id: string; name?: string; [key: string]: any } | null | undefined;
  orgName: string;
  teamName: string;
  prompt: string;
  project: { team_id: string; [key: string]: any };
  user_id: string;
  auditDepartment: string;
  startedAtMs: number;
  timeline: any[];
  injectSupabaseCredentials: (html: string) => string;
  signPreviewToken: (jobId: string) => string;
  writeAuditLog: (params: any) => void;
  PREVIEWS_DIR: string;
  FRONTEND_BASE_URL: string;
}

/**
 * Deterministic template path — zero LLM calls when html_skeleton exists.
 * Returns true if handled, false to fall through.
 */
export async function handleDeterministicTemplate(params: DeterministicTemplateParams): Promise<boolean> {
  const {
    taskId, goldenMatch, org, orgName, teamName, prompt, project, user_id,
    auditDepartment, startedAtMs, timeline,
    injectSupabaseCredentials, signPreviewToken, writeAuditLog,
    PREVIEWS_DIR, FRONTEND_BASE_URL,
  } = params;

  if (!(goldenMatch.matched && goldenMatch.htmlSkeleton)) return false;

  console.log(`[GOLDEN-DETERMINISTIC] Template "${goldenMatch.skillName}" has HTML skeleton — bypassing LLM pipeline`);
  await storage.logEvent(taskId, `Deterministic template path: ${goldenMatch.skillName} (zero LLM calls)`, 'info');
  await storage.updateTaskState(taskId, 'building');

  // Resolve brand tokens
  let brandCompany = orgName || 'Company';
  const brandTeamName = teamName || 'Team';
  if (org?.id) {
    const { data: brand } = await getPlatformSupabaseClient()
      .from('brand_tokens').select('company_name').eq('org_id', org.id).limit(1).single();
    if (brand?.company_name) brandCompany = brand.company_name;
  }
  const skelColorScheme = resolveColorScheme(prompt);

  const html = goldenMatch.htmlSkeleton
    .replace(/\{\{BRAND_COMPANY\}\}/g, brandCompany)
    .replace(/\{\{BRAND_TEAM\}\}/g, brandTeamName)
    .replace(/\{\{BRAND_PRIMARY\}\}/g, skelColorScheme.primary)
    .replace(/\{\{BRAND_BG\}\}/g, skelColorScheme.bg)
    .replace(/\{\{BRAND_TEXT\}\}/g, skelColorScheme.text)
    .replace(/\{\{BRAND_SURFACE\}\}/g, skelColorScheme.surface)
    .replace(/\{\{BRAND_BORDER\}\}/g, skelColorScheme.border);

  const previewDir = path.join(PREVIEWS_DIR, taskId);
  fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(path.join(previewDir, 'index.html'), injectSupabaseCredentials(html));
  fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(['index']));
  const previewToken = signPreviewToken(taskId);
  await storage.setPreviewUrl(taskId, `${FRONTEND_BASE_URL}/previews/${taskId}/index.html?token=${previewToken}`);
  await storage.setTaskDiff(taskId, JSON.stringify([{ name: 'Dashboard', filename: 'index.html', route: '/', html }]));
  timeline.push({ step: 'deterministic-template', startedAt: new Date(startedAtMs).toISOString(), endedAt: new Date().toISOString(), durationMs: Date.now() - startedAtMs, status: 'completed' });
  fs.writeFileSync(path.join(previewDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
  await storage.logEvent(taskId, 'Preview generated (deterministic template — zero LLM tokens)', 'info');
  await storage.logEvent(taskId, `Job Timeline: ${JSON.stringify({ timeline, modelStats: { selected: 'deterministic', modelCalls: 0, retries: 0, fallbacks: 0 }, totalTokens: 0, wallTimeMs: Date.now() - startedAtMs })}`, 'info');
  await storage.updateTaskUsageMetrics(taskId, { llm_model: 'deterministic', llm_prompt_tokens: 0, llm_completion_tokens: 0, llm_total_tokens: 0 });
  await storage.updateTaskState(taskId, 'completed');
  if (org) writeAuditLog({ org_id: org.id, user_id: user_id!, team_id: project.team_id, job_id: taskId, artifact_type: 'dashboard', generated_output: html, department: auditDepartment });
  await storage.logEvent(taskId, `Dashboard completed (deterministic template: ${goldenMatch.skillName} — zero credits consumed)`, 'success');
  return true;
}

export interface AppFastPathParams {
  taskId: string;
  upload_id: string | undefined;
  resolvedMode: string;
  teamName: string;
  enrichedPrompt: string;
  resolvedModel: string;
  org: { id: string; [key: string]: any } | null | undefined;
  project: { team_id: string; [key: string]: any };
  user_id: string;
  auditDepartment: string;
  modelCalls: number;
  totalTokens: number;
  pageNames: string[];
  timeline: any[];
  edgeCall: (payload: any) => Promise<{ text: string; ok: boolean; status: number }>;
  injectSupabaseCredentials: (html: string) => string;
  signPreviewToken: (jobId: string) => string;
  writeAuditLog: (params: any) => void;
  PREVIEWS_DIR: string;
  FRONTEND_BASE_URL: string;
}

/**
 * App fast path — full-stack CRUD via APP_SYSTEM.
 * Returns true if handled, false to fall through.
 */
export async function handleAppFastPath(params: AppFastPathParams): Promise<boolean> {
  const {
    taskId, upload_id, resolvedMode, teamName, enrichedPrompt, resolvedModel,
    org, project, user_id, auditDepartment, timeline,
    edgeCall, injectSupabaseCredentials, signPreviewToken, writeAuditLog,
    PREVIEWS_DIR, FRONTEND_BASE_URL,
  } = params;
  let { modelCalls, totalTokens, pageNames } = params;

  if (upload_id || resolvedMode !== 'app') return false;

  try {
    await storage.updateTaskState(taskId, 'building');
    await storage.logEvent(taskId, `App fast path activated (team: ${teamName}) — routing to APP_SYSTEM`, 'info');
    const appResult = await edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: 'app' });
    modelCalls += 1;
    if (!appResult.ok) throw new Error(appResult.text || `App edge call returned ${appResult.status}`);
    let appData: { diff: string; model?: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens: number } };
    try {
      appData = JSON.parse(appResult.text);
    } catch {
      throw new Error(`App edge returned invalid JSON (${appResult.text.length} chars)`);
    }
    if (appData.usage?.total_tokens) totalTokens += appData.usage.total_tokens;
    const previewDir = path.join(PREVIEWS_DIR, taskId);
    fs.mkdirSync(previewDir, { recursive: true });
    fs.writeFileSync(path.join(previewDir, 'index.html'), injectSupabaseCredentials(appData.diff));
    pageNames = ['index'];
    await storage.setTaskDiff(taskId, JSON.stringify([{ name: 'App', filename: 'index.html', route: '/', html: appData.diff }]));
    fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(pageNames));
    fs.writeFileSync(path.join(previewDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
    const previewToken = signPreviewToken(taskId);
    await storage.setPreviewUrl(taskId, `${FRONTEND_BASE_URL}/previews/${taskId}/index.html?token=${previewToken}`);
    await storage.logEvent(taskId, 'Preview generated', 'info');
    await storage.logEvent(taskId, `LLM responded: ${totalTokens} tokens used`, 'info');
    await storage.updateTaskUsageMetrics(taskId, {
      llm_model: appData.model ?? resolvedModel,
      llm_prompt_tokens: appData.usage?.input_tokens ?? 0,
      llm_completion_tokens: appData.usage?.output_tokens ?? 0,
      llm_total_tokens: appData.usage?.total_tokens ?? 0,
    });
    await storage.updateTaskState(taskId, 'completed');
    if (org) await storage.incrementCreditsUsed(org.id).catch(() => {});
    if (org) writeAuditLog({ org_id: org.id, user_id: user_id!, team_id: project.team_id, job_id: taskId, artifact_type: 'app', generated_output: appData.diff, department: auditDepartment });
    await storage.logEvent(taskId, 'App job completed successfully (fast path)', 'info');

    params.modelCalls = modelCalls;
    params.totalTokens = totalTokens;
    params.pageNames = pageNames;
    return true;
  } catch (appErr: any) {
    await storage.logEvent(taskId, `App fast path failed (${appErr.message}), falling back to planner pipeline`, 'warning');
    return false;
  }
}
