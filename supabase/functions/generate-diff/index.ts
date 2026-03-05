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
Return a complete, self-contained HTML page.

ALWAYS inject these in <head> before any other styles:
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter','system-ui','sans-serif'], display: ['Space Grotesk','system-ui','sans-serif'] } } } }</script>

DESIGN SYSTEM — apply exactly, no exceptions:
- Background: #020617. Never white. Never light grey.
- Primary: violet #7c3aed. Accent: cyan #06b6d4.
- All headings: font-family Space Grotesk, font-weight 700.
- All body text: font-family Inter.
- Navbar: position sticky; top 0; background rgba(2,6,23,0.8); backdrop-filter blur(12px); border-bottom: 1px solid #1e293b.
- Active nav link: color #7c3aed; border-bottom: 2px solid #7c3aed.
- Cards: background #0f172a; border: 1px solid #1e293b; border-radius 16px; padding 32px; hover: border-color rgba(124,58,237,0.5).
- Primary buttons: background linear-gradient(to right, #7c3aed, #6d28d9); color white; padding 14px 32px; border-radius 12px; font-weight 600.
- Max content width 1200px centered. Section padding 100px vertical 24px horizontal.
- Every page shares identical navbar and footer for visual consistency.

STRUCTURE:
- Sticky navbar: logo left, all page links center (mark current page active), CTA right.
- Nav links use relative hrefs matching page routes (e.g. href="/" for home, href="/about" for about).
- Every other page links to every other page via correct hrefs.
- Minimum 2 content sections between header and footer.
- Footer: nav columns, copyright, consistent across all pages.

VALIDATOR REQUIREMENTS — every page must pass:
- <nav> element present.
- <h1> present.
- Minimum 2 <section> elements.
- <title> and <meta name="description"> set.
- CTA button containing: Start, Get, Contact, Book, or Learn.
- Cross-page nav links to every other page via href="pagename.html".
- Zero lorem ipsum.

FORBIDDEN: No JSX. No React. No import statements. No markdown. Output only valid HTML starting with <!DOCTYPE html>.`;

// Keep PAGE_SYSTEM as alias for backward compatibility in tests
const PAGE_SYSTEM = MULTI_PAGE_SYSTEM;

const SINGLE_PAGE_SYSTEM = `You are VIBE, an AI website builder that produces best-in-class single-page sites.
Return a complete, self-contained single-page HTML site.

ALWAYS inject these in <head> before any other styles:
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter','system-ui','sans-serif'], display: ['Space Grotesk','system-ui','sans-serif'] } } } }</script>

DESIGN SYSTEM — apply exactly, no exceptions:
- Background: #020617. Never white. Never light grey.
- Primary: violet #7c3aed. Accent: cyan #06b6d4.
- All headings: font-family Space Grotesk, font-weight 700.
- All body text: font-family Inter.
- Hero: full viewport height, gradient background: linear-gradient(135deg, #0f0728 0%, #1e0a4a 50%, #020617 100%).
- Primary buttons: background: linear-gradient(to right, #7c3aed, #6d28d9); color white; padding 14px 32px; border-radius 12px; font-weight 600; transition all 0.2s; hover: transform translateY(-2px); box-shadow 0 8px 25px rgba(124,58,237,0.4).
- Secondary buttons: border: 1px solid #475569; color #94a3b8; padding 14px 32px; border-radius 12px; hover: border-color #7c3aed; color white.
- Cards: background #0f172a; border: 1px solid #1e293b; border-radius 16px; padding 32px; transition all 0.2s; hover: border-color rgba(124,58,237,0.5); box-shadow 0 8px 30px rgba(124,58,237,0.1).
- Navbar: position sticky; top 0; background rgba(2,6,23,0.8); backdrop-filter blur(12px); border-bottom: 1px solid #1e293b; z-index 50.
- Inputs: background #0f172a; border: 1px solid #334155; border-radius 12px; color white; padding 12px 16px; focus: border-color #7c3aed; outline none; box-shadow 0 0 0 3px rgba(124,58,237,0.2).
- Max content width 1200px centered. Section padding 120px vertical 24px horizontal.

STRUCTURE — include all sections in this order:
1. Sticky navbar: logo left, nav links center, CTA button right.
2. Hero: large Space Grotesk heading (clamp 3rem to 6rem), subheading, 2 CTA buttons, gradient background.
3. Trust bar: "Trusted by teams at..." with 4-5 company names in muted text.
4. Features: 3-column grid of cards, emoji icon, bold title, description.
5. Social proof: 3 testimonial cards, name, role, star rating (★★★★★).
6. Stats: 3-4 large violet numbers with muted labels.
7. CTA section: gradient background strip, bold headline, single primary button.
8. Footer: logo, nav columns, copyright.

VALIDATOR REQUIREMENTS — every page must pass:
- <nav> element present.
- <h1> present.
- Minimum 2 <section> elements.
- <title> and <meta name="description"> set.
- CTA button containing: Start, Get, Contact, Book, or Learn.
- Zero lorem ipsum.

FORBIDDEN: No JSX. No React. No import statements. No markdown. Output only valid HTML starting with <!DOCTYPE html>.`;

const DASHBOARD_SYSTEM = `You are VIBE, an AI dashboard builder producing
world-class, production-ready dashboard interfaces. You have already
completed visual system design, interaction architecture, and build
translation phases. Now implement the final HTML.
Return a complete, self-contained HTML dashboard. All styling via Tailwind CDN.
ALWAYS inject these in <head>:
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Space Grotesk','system-ui']}}}}</script>
DESIGN SYSTEM — non-negotiable:
- Page background: #020617
- Sidebar: #0f172a border-r border-slate-800
- Cards: bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-violet-500/40
- Primary: violet-600 (#7c3aed). Accent: cyan-400 (#06b6d4).
- Success: #10b981. Warning: #f59e0b. Danger: #ef4444.
- All headings: Space Grotesk font-weight 700+
- All body: Inter
- Topbar: bg-slate-950/80 backdrop-blur border-b border-slate-800 sticky top-0
LAYOUT — CSS Grid, no flexbox for main structure:
- display:grid; grid-template-columns:256px 1fr; min-height:100vh
- Sidebar: fixed 256px, full height, vertical nav
- Main: topbar + scrollable content area
- Content grid: 4 KPI cards top row, then 2-col charts, then full-width table
SIDEBAR — must include:
- Brand logo/name top with violet accent
- Nav items: emoji icon + label, active state bg-violet-600/10 text-violet-400 border-l-2 border-violet-500
- Bottom: user avatar, name, role
TOPBAR — must include:
- Page title left (Space Grotesk font-bold text-xl)
- Search input center (bg-slate-800 border-slate-700 rounded-xl)
- Notification bell + user avatar right
KPI STAT CARDS — 4 cards in top row:
- Large number (Space Grotesk text-3xl font-bold text-white)
- Label below (text-slate-400 text-sm)
- Trend indicator top-right (▲ text-emerald-400 or ▼ text-red-400)
- Subtle icon background top-right
- Detect domain from prompt and use relevant metrics
CHARTS — always include exactly 2 using Chart.js:
- Chart 1: Line or Bar chart for primary time-series metric
- Chart 2: Doughnut or Bar chart for breakdown/distribution
- Detect domain: sales→revenue+pipeline; finance→cashflow+allocation;
  analytics→traffic+conversion; HR→headcount+performance
- Colors: violet #7c3aed, cyan #06b6d4, emerald #10b981, amber #f59e0b
- 12 months of realistic dummy data relevant to domain
- Dark chart backgrounds: bg-slate-900, grid lines: rgba(148,163,184,0.1)
- Chart titles: Space Grotesk font-semibold text-white
DATA TABLE — always include:
- Domain-relevant columns (sales: Company/Contact/Stage/Value/Close Date)
- 10 realistic rows, no lorem ipsum, contextually appropriate data
- Sticky header: bg-slate-900 text-slate-400 text-xs uppercase tracking-wider
- Row hover: hover:bg-slate-800/50
- Status badges: rounded-full px-3 py-1 text-xs font-medium with color coding
- Overflow-x auto for mobile
INTERACTIVITY — all via vanilla JS:
- Date range buttons (7D / 30D / 90D / 1Y) update both charts on click
- Sidebar nav highlights active on click
- Table search filters rows in real time
- Export CSV button downloads table data
- Active date range button: bg-violet-600 text-white; inactive: bg-slate-800 text-slate-400
DATA SOURCE UI — detect from prompt:
- Supabase mentioned: "Connect Supabase" button opens modal with setup instructions
- CSV/Excel: file upload input, parse with FileReader + manual CSV parsing
- API: endpoint input + "Fetch" button with loading state
- Default: realistic placeholder data, "Upload Data" button visible
VALIDATOR REQUIREMENTS:
- <nav> element present
- <h1> present
- Minimum 2 <section> elements
- <title> and <meta name="description"> set
- Button containing: Start, Get, Contact, Book, Learn, Export, or Connect
- Zero lorem ipsum
FORBIDDEN: No JSX. No React. No import statements. No markdown fences.
Output ONLY valid HTML starting with <!DOCTYPE html>.`;

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
