import path from 'path';
import fs from 'fs';
import { storage } from '../storage';
import { resolveGoldenTemplateMatch } from '../kernel/context-injector';
import { runSelfHealingScan } from '../lib/debug-agent';
import {
  StarterSitePlan,
  buildStarterSitePlan,
  resolveColorScheme,
  buildColorBlock,
  mapWithConcurrency,
  validateStarterSiteQuality,
  writePagePlanArtifact,
} from '../starter-site';

export interface PlannerHandlerParams {
  taskId: string;
  prompt: string;
  enrichedPrompt: string;
  resolvedMode: string;
  resolvedModel: string;
  mode: string;
  budgets: any;
  goldenMatch: { matched: boolean; skillName: string; content: string; htmlSkeleton: string | null };
  org: { id: string; name?: string; [key: string]: any } | null | undefined;
  project: { team_id: string; [key: string]: any };
  user_id: string;
  startedAtMs: number;
  modelCalls: number;
  totalTokens: number;
  retries: number;
  fallbacks: number;
  timeline: any[];
  pageNames: string[];
  auditDepartment: string;
  resolvedConversationId: string | undefined;
  edgeCall: (payload: any) => Promise<{ text: string; ok: boolean; status: number }>;
  injectSupabaseCredentials: (html: string) => string;
  signPreviewToken: (jobId: string) => string;
  writeAuditLog: (params: any) => void;
  runStep: <T>(name: 'planning' | 'building' | 'validating' | 'security' | 'ux' | 'self-healing', fn: () => Promise<T>) => Promise<T>;
  PREVIEWS_DIR: string;
  FRONTEND_BASE_URL: string;
  MAX_INITIAL_PAGES: number;
}

/**
 * Planner pipeline — plan → build pages → validate → finalize.
 * Mutates params.modelCalls, params.totalTokens, params.pageNames in place.
 */
export async function handlePlannerPipeline(params: PlannerHandlerParams): Promise<void> {
  const {
    taskId, prompt, resolvedMode, resolvedModel, mode, budgets,
    org, project, user_id, startedAtMs, auditDepartment, resolvedConversationId,
    edgeCall, injectSupabaseCredentials, signPreviewToken, writeAuditLog, runStep,
    PREVIEWS_DIR, FRONTEND_BASE_URL, MAX_INITIAL_PAGES,
  } = params;
  let { enrichedPrompt, goldenMatch, modelCalls, totalTokens, pageNames, timeline, retries, fallbacks } = params;

  // ── Golden Template Resolution (planner fallback) ──
  if (!goldenMatch.matched) {
    try {
      const plannerGolden = await resolveGoldenTemplateMatch(prompt);
      if (plannerGolden.matched) {
        goldenMatch = plannerGolden;
        enrichedPrompt += `\n\n--- GOLDEN TEMPLATE: ${plannerGolden.skillName} ---\nFollow this template exactly as the primary build blueprint. Do not ask clarifying questions — build directly from these instructions:\n\n${plannerGolden.content}\n--- END GOLDEN TEMPLATE ---`;
        await storage.logEvent(taskId, `Matched golden template: ${plannerGolden.skillName}`, 'info');
      }
    } catch (gtErr: any) {
      console.warn('[KERNEL] golden template lookup failed:', gtErr.message);
    }
  }

  // ── Planning step ──
  let plan: StarterSitePlan | null = null;
  try {
    plan = await runStep('planning', async () => {
    await storage.logEvent(taskId, 'Generating plan...', 'info');
    console.log('[KERNEL] enrichedPrompt prefix:', enrichedPrompt.slice(0, 300));
    const planResult = await edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: 'plan' });
    modelCalls += 1;
    if (!planResult.ok) throw new Error(planResult.text || `Plan call returned ${planResult.status}`);
    const planData = JSON.parse(planResult.text);
    if (planData.usage?.total_tokens) totalTokens += planData.usage.total_tokens;
    let planPages: any;
    if (typeof planData.diff === 'string') {
      let raw = planData.diff.trim();
      const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (fenceMatch) raw = fenceMatch[1].trim();
      raw = raw.replace(/,\s*([\]}])/g, '$1');
      try {
        planPages = JSON.parse(raw);
      } catch {
        const jsonStart = raw.search(/[{[]/);
        if (jsonStart >= 0) {
          const opener = raw[jsonStart];
          const closer = opener === '{' ? '}' : ']';
          let depth = 0;
          let jsonEnd = -1;
          for (let ci = jsonStart; ci < raw.length; ci++) {
            if (raw[ci] === opener) depth++;
            else if (raw[ci] === closer) depth--;
            if (depth === 0) { jsonEnd = ci; break; }
          }
          if (jsonEnd > jsonStart) {
            const extracted = raw.slice(jsonStart, jsonEnd + 1).replace(/,\s*([\]}])/g, '$1');
            planPages = JSON.parse(extracted);
            console.log(`[PLAN] Extracted JSON from position ${jsonStart}-${jsonEnd} (stripped ${raw.length - jsonEnd - 1} trailing chars)`);
          } else {
            throw new Error(`Could not extract JSON from plan response (${raw.length} chars)`);
          }
        } else {
          throw new Error(`No JSON found in plan response (${raw.length} chars)`);
        }
      }
    } else {
      planPages = planData.diff;
    }
    const pagesArray = Array.isArray(planPages) ? planPages : planPages?.pages ?? null;
    const llmColorScheme = Array.isArray(planPages) ? null : planPages?.color_scheme ?? null;
    const result = buildStarterSitePlan(Array.isArray(pagesArray) ? pagesArray : null, prompt, llmColorScheme);
    if (result.notes.length > 0) await storage.logEvent(taskId, result.notes.join(' '), 'info');
    await storage.logEvent(taskId, `Plan received: ${result.pages.length} page(s) — ${result.pages.map((p) => p.name).join(', ')}`, 'info');
    return result;
    });
  } catch (planErr: any) {
    await storage.logEvent(taskId, `Plan call failed (${planErr.message}), falling back to single-page build...`, 'warning');
    plan = null;
  }

  const previewDir = path.join(PREVIEWS_DIR, taskId);
  try {
    fs.mkdirSync(previewDir, { recursive: true });
    if (plan) writePagePlanArtifact(previewDir, plan);
  } catch (mkErr: any) {
    console.warn(`Could not create preview directory: ${mkErr.message}`);
  }

  const colorScheme = plan?.colorScheme ?? resolveColorScheme(prompt);
  const colorBlock = buildColorBlock(colorScheme);
  console.log('[KERNEL] resolved color scheme:', JSON.stringify(colorScheme));

  if (plan) {
    const currentPlan = plan;
    await runStep('building', async () => {
      const builtPages = await mapWithConcurrency(currentPlan.pages, 1, async (page, i) => {
        const safeName = page.route === '/' ? 'index' : page.route.slice(1);
        await storage.logEvent(taskId, 'Building page ' + (i + 1) + ' of ' + currentPlan.pages.length + ': ' + page.name + '...', 'info');
        console.log('[KERNEL] page prompt prefix:', page.description.slice(0, 300));
        const pageBuildMode = resolvedMode === 'site' ? 'site' : 'page';
        const pageContext = `PagePlan JSON: ${JSON.stringify(currentPlan)}. File: app${page.route === '/' ? '' : page.route}/page.tsx. Include navbar, metadata title/description, 2+ sections, and CTA button.`;
        const pageResult = await edgeCall({
          prompt: enrichedPrompt + '\n\nPage to build: ' + page.description,
          model: resolvedModel,
          mode: pageBuildMode,
          context: pageContext,
          color_block: colorBlock,
        });
        modelCalls += 1;
        if (!pageResult.ok) throw new Error('Page ' + page.name + ' returned ' + pageResult.status);
        const pageData = JSON.parse(pageResult.text);
        if (pageData.usage?.total_tokens) totalTokens += pageData.usage.total_tokens;
        fs.writeFileSync(path.join(previewDir, safeName + '.html'), injectSupabaseCredentials(pageData.diff));
        return page;
      });
      pageNames = builtPages.map((p) => (p.route === '/' ? 'index' : p.route.slice(1)));
    });

    if (pageNames.length < Math.min(2, currentPlan.pages.length)) {
      throw new Error(`pages generated check failed (${pageNames.length}/${currentPlan.pages.length})`);
    }

    await runStep('validating', async () => {
      const MAX_REPAIR_ATTEMPTS = 2;
      let repairAttempts = 0;
      const htmlFiles = pageNames.map((name) => ({
        route: name === 'index' ? '/' : `/${name}`,
        html: fs.readFileSync(path.join(previewDir, `${name}.html`), 'utf8'),
      }));
      const quality = validateStarterSiteQuality(htmlFiles, /placeholder/i.test(prompt), mode === 'dashboard');
      if (!quality.ok) {
        await storage.logEvent(taskId, `Quality gate failed, repairing ${quality.failingRoutes.join(', ')}`, 'warning');
        await storage.logEvent(taskId, `[QA REASONS] ${quality.reasons.join(' | ')}`, 'warn');
        for (const failingRoute of quality.failingRoutes.slice(0, 1)) {
          if (repairAttempts >= MAX_REPAIR_ATTEMPTS) {
            await storage.logEvent(taskId, `Max repair attempts (${MAX_REPAIR_ATTEMPTS}) reached — accepting current output`, 'warning');
            break;
          }
          repairAttempts += 1;
          const fileName = failingRoute === '/' ? 'index' : failingRoute.slice(1);
          const existing = fs.readFileSync(path.join(previewDir, `${fileName}.html`), 'utf8');
          const repairMode = 'page';
          const repairPrompt = `Return ONLY valid HTML starting with <!DOCTYPE html>. No explanation. No markdown. No preamble.\nRepair this HTML page so it includes: <nav>, <h1>, at least 2 <section> elements, <title>, <meta name="description">, a CTA button containing Start/Get/Contact/Book/Learn, and zero lorem ipsum.\nKeep all existing Tailwind classes, fonts, and design tokens intact.\n${existing}`;
          const repairResult = await edgeCall({ prompt: repairPrompt, model: resolvedModel, mode: repairMode, color_block: colorBlock });
          modelCalls += 1;
          if (repairResult.ok) {
            const repairData = JSON.parse(repairResult.text);
            fs.writeFileSync(path.join(previewDir, `${fileName}.html`), injectSupabaseCredentials(repairData.diff));
            if (repairData.usage?.total_tokens) totalTokens += repairData.usage.total_tokens;
          }
        }
      }
    });

    await runStep('security', async () => new Promise((r) => setTimeout(r, 5)));

    const uxResult = await runStep('ux', async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    const selfHealResult = await runStep('self-healing', async () => {
      return await runSelfHealingScan(taskId, previewDir);
    });

    const pagesArray = currentPlan.pages.filter((p) => pageNames.includes(p.route === '/' ? 'index' : p.route.slice(1))).map((p) => {
      const safeName = p.route === '/' ? 'index' : p.route.slice(1);
      const html = fs.readFileSync(path.join(previewDir, `${safeName}.html`), 'utf-8');
      return { name: p.name, filename: `${safeName}.html`, route: p.route, html };
    });
    await storage.setTaskDiff(taskId, JSON.stringify(pagesArray));
  } else {
    // ── Fallback: single-page build ──
    const fallbackMode = resolvedMode === 'dashboard' ? 'dashboard' : 'html';
    await storage.logEvent(taskId, `Calling Edge Function (single-page ${fallbackMode} mode)...`, 'info');
    console.log('[KERNEL] enrichedPrompt prefix:', enrichedPrompt.slice(0, 300));
    const fallbackResult = await edgeCall({ prompt: enrichedPrompt, model: resolvedModel, mode: fallbackMode, color_block: colorBlock });
    modelCalls += 1;
    if (!fallbackResult.ok) throw new Error(fallbackResult.text || `Edge Function returned ${fallbackResult.status}`);

    let data: { diff: string; model?: string; usage: { input_tokens?: number; output_tokens?: number; total_tokens: number } };
    try {
      data = JSON.parse(fallbackResult.text);
    } catch {
      console.error(`Job ${taskId} — raw response (${fallbackResult.text.length} chars):`, fallbackResult.text.slice(0, 500));
      throw new Error(`Edge Function returned invalid JSON (${fallbackResult.text.length} chars)`);
    }

    if (data.usage?.total_tokens) totalTokens += data.usage.total_tokens;
    fs.writeFileSync(path.join(previewDir, 'index.html'), injectSupabaseCredentials(data.diff));
    pageNames = ['index'];
    await storage.setTaskDiff(taskId, JSON.stringify([{ name: 'Home', filename: 'index.html', route: '/', html: data.diff }]));
  }

  // ── Finalize ──
  fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(pageNames));
  fs.writeFileSync(path.join(previewDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
  const firstPage = pageNames[0].replace(/[^a-zA-Z0-9_-]/g, '_');
  const previewToken = signPreviewToken(taskId);
  await storage.setPreviewUrl(taskId, `${FRONTEND_BASE_URL}/previews/${taskId}/${firstPage}.html?token=${previewToken}`);
  await storage.logEvent(taskId, 'Preview generated', 'info');
  await storage.logEvent(taskId, `LLM responded: ${totalTokens} tokens used`, 'info');
  await storage.logEvent(taskId, `Job Timeline: ${JSON.stringify({ timeline, modelStats: { selected: resolvedModel, modelCalls, retries, fallbacks }, totalTokens, maxPages: MAX_INITIAL_PAGES, wallTimeMs: Date.now() - startedAtMs })}`, 'info');
  if (modelCalls > budgets.maxModelCalls || totalTokens > budgets.maxTokensOut || (Date.now() - startedAtMs) > budgets.maxWallTimeMs) {
    await storage.logEvent(taskId, 'Starter build budget exceeded', 'warning');
  }
  await storage.updateTaskUsageMetrics(taskId, {
    llm_model: resolvedModel,
    llm_prompt_tokens: 0,
    llm_completion_tokens: 0,
    llm_total_tokens: totalTokens,
  });
  await storage.updateTaskState(taskId, 'completed');
  if (org) await storage.incrementCreditsUsed(org.id).catch(() => {});
  if (org) {
    const outputForAudit = pageNames.map((p: string) => { try { return fs.readFileSync(path.join(previewDir, `${p}.html`), 'utf-8'); } catch { return ''; } }).join('\n');
    writeAuditLog({ org_id: org.id, user_id: user_id!, team_id: project.team_id, job_id: taskId, artifact_type: resolvedMode || 'site', generated_output: outputForAudit, department: auditDepartment });
  }
  await storage.logEvent(taskId, 'Job completed successfully', 'info');

  // Store assistant response in conversation after successful build
  if (resolvedConversationId) {
    try {
      const task = await storage.getTask(taskId);
      const summary = task?.preview_url
        ? `Built successfully. Preview: ${task.preview_url}`
        : 'Build completed.';
      await storage.addMessage({
        conversation_id: resolvedConversationId,
        role: 'assistant',
        content: summary,
        job_id: taskId,
        metadata: { execution_state: task?.execution_state, total_tokens: totalTokens },
      });
    } catch (msgErr: any) {
      console.warn(`[CONVERSATION] Failed to store assistant message: ${msgErr.message}`);
    }
  }

  // Write back mutable counters
  params.modelCalls = modelCalls;
  params.totalTokens = totalTokens;
  params.pageNames = pageNames;
}
