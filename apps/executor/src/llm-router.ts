import { storage } from './storage';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ptaqytvztkhjpuawdxng.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-diff`;

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
      prompt,
      context,
      model: options.model,
      mode: 'diff',
      previousError,
      max_tokens: 4096,
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

  const text: string = data.diff || '';
  const usage = data.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
  const modelUsed = data.model || options.model;

  const latencyMs = Date.now() - startTime;
  storage.logEvent(
    options.taskId,
    `LLM call complete: model=${modelUsed} input_tokens=${usage.input_tokens} output_tokens=${usage.output_tokens} latency=${latencyMs}ms (via Edge Function)`,
    'info'
  );

  return { diff: text.trim(), usage };
}
