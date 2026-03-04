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

// ── Mode-specific system prompts ─────────────────────────────────────────

const PLAN_SYSTEM =
  "You are VIBE, an AI website planner. " +
  "1. Given a user prompt, return a JSON array of page objects. Each object has: name, title, description. " +
  "2. Return ONLY valid JSON — no markdown fences, no explanation, no extra text. " +
  "3. Return between 1 and 6 pages depending on the request. " +
  "   - If the user asks for a single page, landing page, or one-pager, return EXACTLY 1 page (just index). " +
  "   - If the user asks for a dashboard or app, return 1-3 pages focused on core functionality. " +
  "   - If the user asks for a full website or multi-page site, return 3-6 pages. " +
  "4. Each page should serve a distinct purpose. " +
  "5. Descriptions should be specific enough to guide HTML generation. " +
  "6. Users can add more pages later — focus on the core pages that deliver the most value.";

const MULTI_PAGE_SYSTEM = `You are VIBE, an AI website builder generating one page of a multi-page website.
Return a complete, self-contained HTML page. All CSS in a single <style> tag in <head>. No external stylesheets or dependencies.
This page is part of a larger site — it MUST share a consistent header, footer, navigation, and visual identity with every other page.

STRUCTURE — EVERY PAGE:
- Semantic HTML: <header>, <nav>, <main>, <footer>.
- <header>: logo/site name on the left, <nav> links on the right, max 6 nav items.
- Nav links must have 3 CSS states: default, :hover (subtle color/underline shift), and .active (bold or accent-colored).
- Mark the current page's nav link with aria-current="page" and a visually distinct .active class.
- Nav links should use relative hrefs matching the page routes from the plan (e.g., href="/" for index, href="/about" for about).
- <footer>: secondary links row, copyright line, optional contact info. Consistent across all pages.

LAYOUT:
- CSS Grid or Flexbox for all layouts.
- Max content width 1200px, centered with margin: 0 auto.
- Generous section padding: 80-120px vertical, 24px horizontal.

TYPOGRAPHY:
- Page h1: font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 800.
- Section h2: font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700.
- Body text: 1rem with line-height: 1.6; max-width: 65ch for readability.
- Font stack: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif.

CONTENT:
- Interpret the page description to determine content, sections, and tone.
- Every section must have visible, styled content. No empty elements, no placeholder text, no Lorem ipsum.
- Include at least 2 meaningful content sections between header and footer.

DESIGN:
- Shared visual identity: same font stack, color palette, spacing, border-radius across all pages.
- Default when unspecified: dark theme (#0a0a0a background, #ffffff text, one accent color).
- Minimum 4.5:1 contrast ratio for all text.
- Smooth section transitions using subtle borders or background color shifts.

MOBILE RESPONSIVE:
- Single @media (max-width: 768px) breakpoint.
- Hamburger menu using CSS-only checkbox hack: hidden checkbox + label with ☰ icon toggles nav visibility.
- Nav stacks vertically on mobile, hidden by default, shown when checkbox is checked.

FORBIDDEN: NEVER output JSX, TSX, or React component syntax. No 'import' statements, no {/* comments */}, no {" "} expressions, no 'export default function'. No Lorem ipsum.
Output ONLY valid HTML that renders directly in a browser iframe with zero compilation. No markdown. No explanation. Start with <!DOCTYPE html>.`;

// Keep PAGE_SYSTEM as alias for backward compatibility in tests
const PAGE_SYSTEM = MULTI_PAGE_SYSTEM;

const SINGLE_PAGE_SYSTEM = `You are VIBE, an AI website builder that produces best-in-class single-page sites.
Return a complete, self-contained single-page HTML site. All CSS in a single <style> tag in <head>. No external stylesheets or dependencies.

LAYOUT & STRUCTURE:
- Use semantic HTML: <header>/<nav>, <main>, <section>, <footer>.
- Use CSS Grid or Flexbox for all layouts.
- Max content width 1200px, centered with margin: 0 auto.
- Generous section padding: 80-120px vertical, 24px horizontal.
- Navigation should link to sections via anchor IDs with smooth scrolling (scroll-behavior: smooth).

TYPOGRAPHY:
- Hero h1: font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 800.
- Section h2: font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700.
- Body text: 1rem with line-height: 1.6; max-width: 65ch for readability.
- Font stack: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif.

HERO SECTION:
- min-height: 100vh with content centered vertically and horizontally.
- One clear benefit-driven headline (never generic like "Welcome to Our Site").
- 1-2 sentence supporting subtext that explains the value proposition.
- Single primary CTA button with min 44px tap target, bold color, rounded corners.
- No stock photo descriptions. Use CSS gradients, shapes, or abstract patterns for visual interest.

CONTENT SECTIONS:
- Features: 3-column CSS Grid (1-column on mobile) with icon placeholder (emoji or CSS shape), heading, and description.
- Include a social proof or testimonials section with real-sounding quotes.
- Final CTA section before footer with a compelling call to action.
- Every section must have visible, styled content. No empty elements, no placeholder text, no Lorem ipsum.

DESIGN:
- Interpret the user's prompt for color palette, mood, and tone.
- Default when unspecified: dark theme (#0a0a0a background, #ffffff text, accent color derived from prompt context).
- Minimum 4.5:1 contrast ratio for all text.
- Smooth section transitions using subtle borders or background color shifts.
- Mobile responsive with a single @media (max-width: 768px) breakpoint.

FORBIDDEN: NEVER output JSX, TSX, or React component syntax. No 'import' statements, no {/* comments */}, no {" "} expressions, no 'export default function'. No Lorem ipsum.
Output ONLY valid HTML that renders directly in a browser iframe with zero compilation. No markdown. No explanation. Start with <!DOCTYPE html>.`;

const DASHBOARD_SYSTEM = `You are VIBE, an AI dashboard builder. Generate a Next.js dashboard page component.
Output a single valid Next.js page file with a default export. All styles in a <style jsx> tag or inline styles object.

DATA SOURCES — detect from the user's prompt and generate the matching connection logic:
- Supabase: import { createClient } from '@supabase/supabase-js'. Use env vars process.env.NEXT_PUBLIC_SUPABASE_URL and process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY. Query data in useEffect, store in state.
- CSV/Excel upload: render a file <input type="file"> that accepts .csv,.xlsx. Parse CSV with Papa.parse (import Papa from 'papaparse'), parse Excel with read() from 'xlsx' (import * as XLSX from 'xlsx'). Load parsed rows into component state.
- REST API: fetch() to the endpoint described in the prompt. Use an env var for any API key (e.g., process.env.NEXT_PUBLIC_API_KEY). Include loading state, error handling with try/catch, and a retry mechanism.
- If NO data source is specified: generate a realistic placeholder data array (10-20 rows) as a const inside the component so the dashboard is immediately useful and previewable.

LAYOUT (CSS Grid):
- Fixed left sidebar 240px wide + main content area: display: grid; grid-template-columns: 240px 1fr; min-height: 100vh.
- Sidebar: brand/logo at top, vertical nav links with emoji icon + text label, active link state (bold + accent border-left), user avatar/profile section at bottom.
- Top bar in main area: page title aligned left, search input + notification bell + user avatar aligned right.
- Content area below top bar: row of 4 KPI stat cards (CSS Grid: repeat(4, 1fr) with gap), then below that a chart placeholder area + data table side by side or stacked.
- Eye-tracking pattern: highest-value metric positioned top-left.
- Five-second rule: the single most critical metric must be visible without scrolling.

DESIGN:
- Interpret the user's prompt for domain, industry, and color palette.
- Default when unspecified: dark sidebar (#1a1a2e), light main content (#f8f9fa), accent color derived from prompt context.
- Minimalist: use 2-3 colors maximum. Every data state must be handled: loading spinner, empty state message, error state with retry button.
- Stat cards: large number, label below, optional trend arrow (▲/▼) with green/red color.
- Data table: striped rows, sticky header, horizontal scroll on overflow.

OUTPUT:
- Valid Next.js page component (React) with 'use client' directive at top.
- export default function DashboardPage() { ... }
- All in one file. No markdown. No explanation.`;

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

  // gpt-4-turbo supports max 4096 completion tokens
  const clampedTokens = Math.min(maxTokens, 4096);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      max_tokens: clampedTokens,
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

    // Build system message: select prompt based on mode, always prepend VIBE_SYSTEM_RULES
    let baseSystemMsg: string;
    let defaultMaxTokens = 4096;

    if (system) {
      // Explicit system prompt overrides mode-based selection
      baseSystemMsg = system;
    } else if (mode === "plan") {
      baseSystemMsg = PLAN_SYSTEM;
      defaultMaxTokens = 2048;
    } else if (mode === "page") {
      baseSystemMsg = PAGE_SYSTEM + (context ? "\nContext:\n" + context : "");
      defaultMaxTokens = 8192;
    } else if (mode === "html") {
      baseSystemMsg = SINGLE_PAGE_SYSTEM + (context ? "\nContext:\n" + context : "");
      defaultMaxTokens = 8192;
    } else if (mode === "dashboard") {
      baseSystemMsg = DASHBOARD_SYSTEM + (context ? "\nContext:\n" + context : "");
      defaultMaxTokens = 8192;
    } else {
      // Default: diff generation mode
      baseSystemMsg = "You are VIBE, an AI website builder. Return ONLY a valid unified diff. No markdown fences, no explanation." +
        (context ? "\nProject context:\n" + context : "");
    }

    const systemMsg = VIBE_SYSTEM_RULES + "\n" + baseSystemMsg;
    const resolvedMaxTokens = max_tokens || defaultMaxTokens;

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
        mode: mode || "diff",
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
