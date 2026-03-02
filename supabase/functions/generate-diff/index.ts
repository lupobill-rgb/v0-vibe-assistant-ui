import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIBE_SYSTEM_RULES = `VIBE PLATFORM — GOVERNING RULES (NON-NEGOTIABLE)
Mission: Convert user intent into deployed, production-grade software.
Stack: Next.js + NestJS + Supabase + Vercel + Docker executor.
LLM: You are the primary Claude execution engine. GPT-4 is infrastructure fallback only (rate limit / timeout / 529).

Rules — apply to every output:
1. Reliability over cleverness. Working output beats clever broken output.
2. Atomic diffs only. Never whole-file rewrites unless explicitly instructed.
3. Secure by default: no secrets in output, RLS on, least privilege.
4. Never silently fail. Return plain-English explanation if task cannot complete.
5. No raw stack traces in user-facing output. Ever.
6. OSS patterns first. No custom primitives when a standard approach exists.
7. Every change must be scoped, minimal, and purposeful.`;

/** Call Anthropic Claude and return { diff, usage }. Throws on failure. */
async function callClaude(systemMsg: string, prompt: string, maxTokens = 4096) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemMsg,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message ?? JSON.stringify(data));
  }

  return {
    diff: data.content?.[0]?.type === "text" ? data.content[0].text : "",
    usage: {
      input_tokens: data.usage?.input_tokens ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
      total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    },
  };
}

/** Call OpenAI GPT and return { diff, usage }. Throws on failure. */
async function callGpt(systemMsg: string, prompt: string, maxTokens = 4096) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message ?? JSON.stringify(data));
  }

  return {
    diff: data.choices?.[0]?.message?.content ?? "",
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
      total_tokens: data.usage?.total_tokens ?? 0,
    },
  };
}

const PLAN_SYSTEM =
  "You are VIBE, an AI website planner. Given a user's request, return a JSON array of pages to build.\n" +
  "Each page object must have: name, title, description.\n" +
  "Rules:\n" +
  "1. Always include an index/home page.\n" +
  "2. Each page must have a clear, distinct purpose.\n" +
  "3. Return between 1 and 6 pages depending on the request. " +
  "   - If the user asks for a single page, landing page, or one-pager, return EXACTLY 1 page (just index). " +
  "   - If the user asks for a dashboard or app, return 1-3 pages focused on core functionality. " +
  "   - If the user asks for a full website or multi-page site, return 3-6 pages.\n" +
  "4. Return ONLY valid JSON — no markdown fences, no explanation.\n" +
  "5. The JSON must be an array of objects: [{name, title, description}, ...].\n" +
  "6. Users can add more pages later — focus on the core pages that deliver the most value.";

const PROVIDERS: Record<string, (s: string, p: string, m?: number) => Promise<{ diff: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number } }>> = {
  claude: callClaude,
  gpt: callGpt,
};

function flipModel(model: string): string {
  return model === "claude" ? "gpt" : "claude";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { prompt, context, model = "claude", system, max_tokens, mode } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PROVIDERS[model]) {
      return new Response(
        JSON.stringify({ error: "Unsupported model: " + model }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system message: always prepend VIBE_SYSTEM_RULES
    const baseSystemMsg = mode === "plan"
      ? PLAN_SYSTEM
      : system
        ? system
        : "You are VIBE, an AI website builder. Return ONLY a valid unified diff. No markdown fences, no explanation." +
          (context ? "\nProject context:\n" + context : "");
    const systemMsg = VIBE_SYSTEM_RULES + "\n" + baseSystemMsg;
    const resolvedMaxTokens = max_tokens || 4096;

    // Try the requested model first
    let result: { diff: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number } };
    let fallbackUsed = false;
    let originalModel = model;

    try {
      result = await PROVIDERS[model](systemMsg, prompt, resolvedMaxTokens);
    } catch (primaryErr) {
      // Primary model failed — try the other provider
      const fallbackModel = flipModel(model);
      console.warn(`Primary model "${model}" failed: ${primaryErr.message}. Falling back to "${fallbackModel}".`);

      try {
        result = await PROVIDERS[fallbackModel](systemMsg, prompt, resolvedMaxTokens);
        fallbackUsed = true;
        originalModel = model;
      } catch (fallbackErr) {
        // Both providers failed
        throw new Error(
          `Both models failed. ${model}: ${primaryErr.message} | ${fallbackModel}: ${fallbackErr.message}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        diff: result.diff,
        usage: result.usage,
        model: fallbackUsed ? flipModel(model) : model,
        fallback_used: fallbackUsed,
        original_model: fallbackUsed ? originalModel : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
