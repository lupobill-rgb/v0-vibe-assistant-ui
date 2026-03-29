import { storage } from './storage';

const EDGE_FUNCTION_URL =
  process.env.SUPABASE_EDGE_FUNCTION_URL ||
  'https://ptaqytvztkhjpuawdxng.supabase.co/functions/v1/generate-diff';

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export interface RouterDiffResult {
  diff: string;
  summary?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generic Edge Function caller for non-diff LLM calls (e.g. UX review JSON).
 * Sends a custom system prompt and returns the raw response.
 */
export async function callEdgeFunction(params: {
  prompt: string;
  model?: ModelId;
  system?: string;
  max_tokens?: number;
}): Promise<{ diff: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number }; model: string }> {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is not set. Cannot call generate-diff Edge Function.');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      prompt: params.prompt,
      model: params.model || 'claude',
      system: params.system,
      max_tokens: params.max_tokens || 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Edge Function error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { diff?: string; usage?: { input_tokens: number; output_tokens: number; total_tokens: number }; model?: string; error?: string };
  if (data.error) {
    throw new Error(`Edge Function returned error: ${data.error}`);
  }

  return {
    diff: data.diff || '',
    usage: data.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    model: data.model || params.model || 'claude',
  };
}

/** Supported model identifiers for the edge function */
type ModelId = 'claude' | 'gpt' | 'gemini' | 'fireworks';

/** Ordered failover chains per primary model */
const FAILOVER_CHAINS: Record<ModelId, ModelId[]> = {
  claude: ['gpt', 'gemini', 'fireworks'],
  gpt: ['claude', 'gemini', 'fireworks'],
  gemini: ['claude', 'gpt', 'fireworks'],
  fireworks: ['claude', 'gpt', 'gemini'],
};

/** Context window limits (input tokens) per model. Used to skip models that can't fit the request. */
const CONTEXT_LIMITS: Record<ModelId, number> = {
  claude: 200_000,
  gpt: 128_000,
  gemini: 1_000_000,
  fireworks: 128_000,
};

/** Rough token estimate (~3.5 chars per token). */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

function flipModel(model: ModelId): ModelId {
  return model === 'claude' ? 'gpt' : 'claude';
}

async function callEdgeDiff(
  fullPrompt: string,
  context: string,
  model: ModelId,
  systemPrompt?: string
): Promise<{
  diff: string;
  summary?: string;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number };
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`;
    headers['apikey'] = anonKey;
  }

  const body: Record<string, unknown> = {
    prompt: fullPrompt,
    context,
    model,
  };
  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Edge function error (HTTP ${response.status}): ${errorBody}`
    );
  }

  const result = (await response.json()) as {
    diff: string;
    summary?: string;
    usage: { input_tokens: number; output_tokens: number; total_tokens: number };
  };

  return { diff: result.diff, summary: result.summary, usage: result.usage };
}

export async function generateDiff(
  prompt: string,
  context: string,
  options: { model: ModelId; taskId: string; systemPrompt?: string },
  previousError?: string
): Promise<RouterDiffResult> {
  const startTime = Date.now();

  // Build the full prompt, appending previous error context when retrying
  let fullPrompt = prompt;
  if (previousError) {
    fullPrompt += `\n\n---\n\nPREVIOUS ERROR (please fix and regenerate the diff):\n${previousError}`;
  }

  let result: { diff: string; summary?: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number } } | undefined;
  let usedModel: ModelId = options.model;
  const errors: string[] = [];
  const estimatedTokens = estimateTokens(fullPrompt + context);

  // Build the full chain: primary first, then fallbacks
  const chain: ModelId[] = [options.model, ...(FAILOVER_CHAINS[options.model] || [])];

  for (const model of chain) {
    // Context window pre-check (Section 6.3 of redundancy plan)
    const limit = CONTEXT_LIMITS[model];
    if (limit && estimatedTokens >= limit * 0.9) {
      const msg = `${model}: request (~${estimatedTokens} tokens) exceeds context window (${limit})`;
      errors.push(msg);
      await storage.logEvent(options.taskId, `[LLM Failover] Skipping ${msg}`, 'info');
      continue;
    }

    try {
      result = await callEdgeDiff(fullPrompt, context, model, options.systemPrompt);
      usedModel = model;
      break;
    } catch (err) {
      const message = (err as Error).message;
      errors.push(`${model}: ${message}`);

      if (model === options.model) {
        await storage.logEvent(
          options.taskId,
          `LLM primary model "${model}" failed: ${message}. Cascading to fallback chain.`,
          'warning'
        );
      } else {
        await storage.logEvent(
          options.taskId,
          `LLM fallback "${model}" failed: ${message}. Trying next provider.`,
          'warning'
        );
      }
    }
  }

  if (!result) {
    throw new Error(`All LLM providers failed. ${errors.join(' | ')}`);
  }

  const latencyMs = Date.now() - startTime;
  const fallbackNote = usedModel !== options.model ? ` (fallback from ${options.model})` : '';
  await storage.logEvent(
    options.taskId,
    `LLM call complete: model=${usedModel} (via edge fn)${fallbackNote} input_tokens=${result.usage.input_tokens} output_tokens=${result.usage.output_tokens} latency=${latencyMs}ms`,
    'info'
  );

  return { diff: result.diff, summary: result.summary, usage: result.usage };
}
