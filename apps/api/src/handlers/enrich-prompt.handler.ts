import { storage } from '../storage';
import { resolveKernelContext } from '../kernel/context-injector';
import { getPlatformSupabaseClient } from '../supabase/client';

export interface EnrichPromptParams {
  prompt: string;
  user_id: string | null;
  org: { id: string; [key: string]: any } | null | undefined;
  project_id: string;
  project: { team_id: string; [key: string]: any };
  mode: string;
  goldenMatch: { matched: boolean; skillName: string; content: string; htmlSkeleton: string | null };
  upload_id: string | undefined;
  conversation_id: string | undefined;
}

export interface EnrichPromptResult {
  enrichedPrompt: string;
  injectSupabaseHelpers: boolean;
  resolvedConversationId: string | undefined;
}

/**
 * Enrich the user prompt with kernel context, golden template, conversation history,
 * upload data, and prior-job context.
 */
export async function enrichPrompt(params: EnrichPromptParams): Promise<EnrichPromptResult> {
  const {
    prompt, user_id, org, project_id, project, mode,
    goldenMatch, upload_id, conversation_id,
  } = params;

  let enrichedPrompt = prompt;
  let injectSupabaseHelpers = false;

  // Kernel context injection
  if (user_id && org) {
    try {
      const kernel = await resolveKernelContext(user_id, org.id, project.team_id, prompt, mode);
      if (kernel.context) {
        enrichedPrompt = `${kernel.context}\n\nUSER REQUEST:\n${prompt}`;
        injectSupabaseHelpers = kernel.injectSupabaseHelpers;
      }
    } catch (kernelErr: any) {
      console.warn(`[KERNEL] resolveKernelContext failed (non-blocking): ${kernelErr.message}`);
    }
  }

  // Golden template injection
  if (goldenMatch.matched) {
    enrichedPrompt += `\n\n--- GOLDEN TEMPLATE: ${goldenMatch.skillName} ---\nFollow this template exactly as the primary build blueprint. Do not ask clarifying questions — build directly from these instructions:\n\n${goldenMatch.content}\n--- END GOLDEN TEMPLATE ---`;
    console.log(`[GOLDEN] Injected template "${goldenMatch.skillName}" — skipping clarifying questions`);
  }

  // Conversation context injection
  let resolvedConversationId = conversation_id;
  if (resolvedConversationId) {
    try {
      const conversationContext = await storage.getConversationContext(resolvedConversationId, 10);
      if (conversationContext) {
        enrichedPrompt = `CONVERSATION HISTORY (prior messages in this session):\n${conversationContext}\n\nNEW REQUEST:\n${enrichedPrompt}`;
      }
    } catch (ctxErr: any) {
      console.warn(`[CONVERSATION] Failed to load context (non-blocking): ${ctxErr.message}`);
    }
  }

  // Upload context injection
  if (upload_id) {
    const { data: uploadRow, error: uploadErr } = await getPlatformSupabaseClient()
      .from('user_uploads')
      .select('original_filename, table_name, columns, column_schema, sample_data, row_count, aggregated_stats')
      .eq('id', upload_id)
      .single();

    if (uploadErr) {
      console.warn(`[UPLOAD] Failed to fetch upload ${upload_id}: ${uploadErr.message}`);
    } else if (uploadRow) {
      if (project_id) {
        await getPlatformSupabaseClient()
          .from('user_uploads')
          .update({ project_id })
          .eq('id', upload_id);
      }
      const schema = uploadRow.column_schema as Record<string, string>;
      const schemaStr = Object.entries(schema).map(([k, v]) => `${k} (${v})`).join(', ');
      const stats = uploadRow.aggregated_stats as Record<string, unknown> | null;

      let dataContext: string;
      if (stats && Object.keys(stats).length > 0) {
        const statsJson = JSON.stringify(stats, null, 2);
        const sampleRows = uploadRow.sample_data as Record<string, unknown>[];
        const sampleJson = JSON.stringify(sampleRows.slice(0, 5), null, 2);
        dataContext = `The user has uploaded data. Table: ${uploadRow.table_name}. Columns: ${schemaStr}. Total rows: ${uploadRow.row_count}.

AGGREGATED STATS (computed from ALL ${uploadRow.row_count} rows — use these for totals, charts, and summaries):
${statsJson}

SAMPLE ROWS (first 5, for format reference only — do NOT use these for totals or counts):
${sampleJson}

Build the dashboard using the AGGREGATED STATS above for all numbers, totals, charts, and breakdowns. Embed the aggregated data directly in the HTML as JavaScript variables. Do not use placeholder or mock data. Do not compute totals from sample rows.\n\n`;
      } else {
        const sampleRows = uploadRow.sample_data as Record<string, unknown>[];
        const sampleJson = JSON.stringify(sampleRows, null, 2);
        dataContext = `The user has uploaded data. Table: ${uploadRow.table_name}. Columns: ${schemaStr}. Total rows: ${uploadRow.row_count}. Here are sample rows (first ${sampleRows.length} rows):\n${sampleJson}\nBuild the dashboard using this real data. Embed the data directly in the HTML as a JavaScript variable. Do not use placeholder or mock data.\n\n`;
      }
      enrichedPrompt = dataContext + enrichedPrompt;
      console.log(`[UPLOAD] Injected context — table=${uploadRow.table_name}, ${uploadRow.row_count} rows, schema=${schemaStr}, hasAggregates=${!!stats}`);
    }
  }

  // Prior-job context injection
  const promptLenBefore = enrichedPrompt.length;
  const { data: priorJob } = await getPlatformSupabaseClient()
    .from('jobs')
    .select('last_diff')
    .eq('project_id', project_id)
    .eq('execution_state', 'completed')
    .not('last_diff', 'is', null)
    .order('initiated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (priorJob?.last_diff) {
    try {
      const pages = JSON.parse(priorJob.last_diff) as Array<{ name?: string; html?: string }>;
      if (Array.isArray(pages) && pages.length > 0) {
        const existingPages = pages
          .filter((p) => {
            if (typeof p?.name !== 'string' || typeof p?.html !== 'string') return false;
            const h = p.html.trimStart();
            if (p.html.length < 2000) return false;
            return h.startsWith('<!DOCTYPE') || h.startsWith('<html');
          })
          .map((p) => `PAGE: ${p.name}\n${p.html}`)
          .join('\n---\n');
        if (existingPages && !enrichedPrompt.includes('EXISTING PAGES (patch these')) {
          enrichedPrompt =
            `CRITICAL OUTPUT RULE: Your response must start with <!DOCTYPE html> — no explanation, no commentary, no markdown fences before or after the HTML.\n\nEXISTING PAGES (patch these, do not rebuild from scratch):\n${existingPages}\n\nThe user wants to make this change to the existing output above. Modify it to incorporate the change. Do NOT regenerate from scratch. Return the COMPLETE updated file with the change applied. Preserve everything that was not mentioned in the change request.\n\n${enrichedPrompt}`;
          console.log(`[ITERATE] Prior context injected for project ${project_id} — prompt grew from ${promptLenBefore} to ${enrichedPrompt.length} chars (+${enrichedPrompt.length - promptLenBefore})`);
        }
      }
    } catch {
      // Ignore malformed historical last_diff payloads
    }
  } else {
    console.log(`[ITERATE] No prior output found for project ${project_id} — treating as new build`);
  }

  return { enrichedPrompt, injectSupabaseHelpers, resolvedConversationId };
}
