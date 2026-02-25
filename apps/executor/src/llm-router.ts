import { storage } from './storage';

const EDGE_FUNCTION_URL =
  process.env.SUPABASE_EDGE_FUNCTION_URL ||
  'https://ptaqytvztkhjpuawdxng.supabase.co/functions/v1/generate-diff';

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
  if (!SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is not set. Cannot call generate-diff Edge Function.');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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

  const data = await response.json();
  if (data.error) {
    throw new Error(`Edge Function returned error: ${data.error}`);
  }

  return {
    diff: data.diff || '',
    usage: data.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    model: data.model || params.model || 'claude',
  };
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

  // Map executor model names to edge function model names
  const edgeModel: 'claude' | 'openai' = options.model === 'gpt' ? 'openai' : 'claude';

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
      model: edgeModel,
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

  const latencyMs = Date.now() - startTime;
  const modelLabel = options.model === 'claude' ? 'claude (via edge fn)' : 'gpt (via edge fn)';
  storage.logEvent(
    options.taskId,
    `LLM call complete: model=${modelLabel} input_tokens=${result.usage.input_tokens} output_tokens=${result.usage.output_tokens} latency=${latencyMs}ms`,
    'info'
  );

  return { diff: result.diff, usage: result.usage };
}
