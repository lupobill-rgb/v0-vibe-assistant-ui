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
