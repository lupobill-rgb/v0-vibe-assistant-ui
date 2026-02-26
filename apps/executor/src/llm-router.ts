import { storage } from './storage';

const EDGE_FUNCTION_URL =
  process.env.SUPABASE_EDGE_FUNCTION_URL ||
  'https://ptaqytvztkhjpuawdxng.supabase.co/functions/v1/generate-diff';

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export interface RouterDiffResult {
  diff: string;
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
  model?: 'claude' | 'gpt';
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

function flipModel(model: 'claude' | 'gpt'): 'claude' | 'gpt' {
  return model === 'claude' ? 'gpt' : 'claude';
}

async function callEdgeDiff(
  fullPrompt: string,
  context: string,
  model: 'claude' | 'gpt'
): Promise<{
  diff: string;
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

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: fullPrompt,
      context,
      model,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Edge function error (HTTP ${response.status}): ${errorBody}`
    );
  }

  const result = (await response.json()) as {
    diff: string;
    usage: { input_tokens: number; output_tokens: number; total_tokens: number };
  };

  return { diff: result.diff, usage: result.usage };
}

export async function generateDiff(
  prompt: string,
  context: string,
  options: { model: 'claude' | 'gpt'; taskId: string },
  previousError?: string
): Promise<RouterDiffResult> {
  const startTime = Date.now();

  // Build the full prompt, appending previous error context when retrying
  let fullPrompt = prompt;
  if (previousError) {
    fullPrompt += `\n\n---\n\nPREVIOUS ERROR (please fix and regenerate the diff):\n${previousError}`;
  }

  let result: { diff: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number } };
  let usedModel = options.model;

  try {
    result = await callEdgeDiff(fullPrompt, context, options.model);
  } catch (primaryErr) {
    // Primary model failed — try the other provider
    const fallbackModel = flipModel(options.model);
    storage.logEvent(
      options.taskId,
      `LLM primary model "${options.model}" failed: ${(primaryErr as Error).message}. Falling back to "${fallbackModel}".`,
      'warning'
    );

    try {
      result = await callEdgeDiff(fullPrompt, context, fallbackModel);
      usedModel = fallbackModel;
    } catch (fallbackErr) {
      // Both providers failed
      throw new Error(
        `Both LLM providers failed. ${options.model}: ${(primaryErr as Error).message} | ${fallbackModel}: ${(fallbackErr as Error).message}`
      );
    }
  }

  const latencyMs = Date.now() - startTime;
  const modelLabel = usedModel === 'claude' ? 'claude (via edge fn)' : 'gpt (via edge fn)';
  const fallbackNote = usedModel !== options.model ? ` (fallback from ${options.model})` : '';
  storage.logEvent(
    options.taskId,
    `LLM call complete: model=${modelLabel}${fallbackNote} input_tokens=${result.usage.input_tokens} output_tokens=${result.usage.output_tokens} latency=${latencyMs}ms`,
    'info'
  );

  return { diff: result.diff, usage: result.usage };
}
