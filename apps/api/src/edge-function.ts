/**
 * Client for the Supabase Edge Function that generates diffs via LLM.
 * Replaces the old executor-based LLM pipeline.
 */

const SUPABASE_URL = "https://ptaqytvztkhjpuawdxng.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export interface DiffResult {
  diff: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export async function generateDiff(
  prompt: string,
  context?: string,
  model: string = "claude"
): Promise<DiffResult> {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY is not configured");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-diff`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, context, model }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Edge Function returned ${res.status}` }));
    throw new Error(err.error || "Edge Function call failed");
  }

  return res.json(); // { diff, usage }
}
