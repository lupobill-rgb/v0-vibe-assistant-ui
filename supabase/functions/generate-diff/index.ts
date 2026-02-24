import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@^0.39.0";
import OpenAI from "npm:openai@^4.77.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a code modification engine.
Given a user prompt and repository context, output ONLY a valid unified diff (git diff format).
- Do NOT include any explanation, prose, or markdown code fences.
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root.
- If creating a new file, use /dev/null as the source path.
- If no changes are needed, output exactly: NO_CHANGES`;

interface RequestBody {
  prompt: string;
  context: string;
  model?: "claude" | "openai";
}

interface DiffResponse {
  diff: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

async function generateWithClaude(
  prompt: string,
  context: string
): Promise<DiffResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\n## Repository Context\n${context}`,
      },
    ],
  });

  const diff = response.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { type: string; text: string }) => b.text)
    .join("");

  return {
    diff: diff.trim(),
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

async function generateWithOpenAI(
  prompt: string,
  context: string
): Promise<DiffResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4-turbo",
    max_tokens: 4096,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${prompt}\n\n## Repository Context\n${context}`,
      },
    ],
  });

  const diff = response.choices[0]?.message?.content ?? "";
  const usage = response.usage;

  return {
    diff: diff.trim(),
    usage: {
      input_tokens: usage?.prompt_tokens ?? 0,
      output_tokens: usage?.completion_tokens ?? 0,
      total_tokens: usage?.total_tokens ?? 0,
    },
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const { prompt, context, model = "claude" } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'prompt' field" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (!context || typeof context !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'context' field" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (model !== "claude" && model !== "openai") {
      return new Response(
        JSON.stringify({
          error: "Invalid 'model' field. Must be 'claude' or 'openai'.",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const result =
      model === "openai"
        ? await generateWithOpenAI(prompt, context)
        : await generateWithClaude(prompt, context);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    const status = message.includes("is not configured") ? 500 : 502;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
