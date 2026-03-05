import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIBE_SYSTEM_RULES = `VIBE PLATFORM — GOVERNING RULES (NON-NEGOTIABLE)
Mission: Convert user intent into deployed, production-grade software.
Stack: Next.js + NestJS + Supabase + Vercel + Docker executor.
LLM: You are the primary Claude execution engine. GPT-4 is infrastructure fallback only.

Rules — apply to every output:
1. Reliability over cleverness. Working output beats clever broken output.
2. Atomic diffs only. Never whole-file rewrites unless explicitly instructed.
3. Secure by default: no secrets in output, RLS on, least privilege.
4. Never silently fail. Return plain-English explanation if task cannot complete.
5. No raw stack traces in user-facing output. Ever.
6. OSS patterns first. No custom primitives when a standard approach exists.
7. Every change must be scoped, minimal, and purposeful.
8. Every generated HTML page must include: favicon, OG meta tags, working forms via Formspree, scroll animations, hover/active/focus states on all interactive elements.
9. Never generate a form that submits nowhere. Use action="https://formspree.io/f/demo" on all forms.
10. Output starts with <!DOCTYPE html> and nothing else. No explanation. No preamble. No markdown.`;

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
Return a complete, self-contained HTML page. Output starts with <!DOCTYPE html> — no explanation, no preamble.

ALWAYS inject in <head>:
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Space Grotesk','system-ui']}}}}</script>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
<meta property="og:title" content="PAGE_TITLE">
<meta property="og:description" content="PAGE_DESCRIPTION">
<meta property="og:type" content="website">

DESIGN SYSTEM — non-negotiable:
- Background: #020617. Never white. Never light grey.
- Primary: violet #7c3aed. Accent: cyan #06b6d4.
- All headings: Space Grotesk font-weight 700+. All body: Inter.
- Navbar: sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50
- Active nav link: text-violet-400 border-b-2 border-violet-500
- Cards: bg-slate-900 border border-slate-800 rounded-2xl p-8 hover:border-violet-500/50 transition-all duration-300
- Primary buttons: bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/25
- Secondary buttons: border border-slate-600 text-slate-300 hover:border-violet-500 hover:text-white px-8 py-3 rounded-xl transition-all duration-200
- Inputs: bg-slate-800 border border-slate-700 rounded-xl text-white px-4 py-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20
- Max content width 1200px centered. Section padding py-24 px-6.
- Every page shares identical navbar and footer.

SCROLL ANIMATIONS — required on every page:
Add this script before </body>:
<script>
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('animate-in'); } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
</script>
Add to <style>: .fade-up { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; } .animate-in { opacity: 1; transform: translateY(0); }
Apply fade-up class to all cards, sections, and feature blocks.

FORMS — every form must work:
- Use <form action="https://formspree.io/f/demo" method="POST">
- Include name, email fields minimum
- Submit button with loading state via onclick="this.textContent='Sending...'"
- Success message div hidden by default, shown on submit via JS

STRUCTURE — include all sections:
1. Sticky navbar: logo left, page nav center (mark current page active with aria-current="page"), CTA button right.
2. Page-specific hero with gradient background and h1.
3. Minimum 2 content sections relevant to the page purpose.
4. Footer: nav columns, copyright, consistent across all pages.
5. Nav links use relative hrefs matching page routes.
6. Every page links to every other page.

VALIDATOR REQUIREMENTS:
- <nav> present. <h1> present. Minimum 2 <section> elements.
- <title> and <meta name="description"> set.
- CTA button containing: Start, Get, Contact, Book, or Learn.
- Cross-page nav links to every other page via href="pagename.html".
- Zero lorem ipsum.

RESPONSIVE:
- Single @media (max-width: 768px) breakpoint.
- CSS-only hamburger menu for mobile nav.
- Cards stack to single column on mobile.

FORBIDDEN: No JSX. No React. No import statements. No markdown fences. No explanation before <!DOCTYPE html>.`;

// Keep PAGE_SYSTEM as alias for backward compatibility in tests
const PAGE_SYSTEM = MULTI_PAGE_SYSTEM;

const SINGLE_PAGE_SYSTEM = `You are VIBE, an AI website builder producing best-in-class single-page sites.
Return a complete, self-contained HTML site. Output starts with <!DOCTYPE html> — no explanation, no preamble.

ALWAYS inject in <head>:
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Space Grotesk','system-ui']}}}}</script>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
<meta property="og:title" content="SITE_TITLE">
<meta property="og:description" content="SITE_DESCRIPTION">
<meta property="og:type" content="website">

DESIGN SYSTEM — non-negotiable:
- Background: #020617. Never white. Never light grey.
- Primary: violet #7c3aed. Accent: cyan #06b6d4.
- All headings: Space Grotesk font-weight 700+. All body: Inter.
- Hero: min-h-screen flex items-center justify-center background: linear-gradient(135deg, #0f0728 0%, #1e0a4a 50%, #020617 100%)
- Navbar: sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50
- Cards: bg-slate-900 border border-slate-800 rounded-2xl p-8 hover:border-violet-500/50 transition-all duration-300
- Primary buttons: bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/30
- Secondary buttons: border border-slate-600 text-slate-300 hover:border-violet-500 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200
- Inputs: bg-slate-800 border border-slate-700 rounded-xl text-white px-4 py-3 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 w-full
- Max content width 1200px centered. Section padding py-24 px-6.

SCROLL ANIMATIONS — required:
Add this script before </body>:
<script>
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('animate-in'); } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
</script>
Add to <style>: .fade-up { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; } .animate-in { opacity: 1; transform: translateY(0); }
Apply fade-up class to all cards, feature blocks, testimonials, and stat numbers.

FORMS — every form must work:
- Use <form action="https://formspree.io/f/demo" method="POST">
- Include name and email fields minimum
- Submit button: onclick="this.textContent='Sending...';this.disabled=true"
- Show success message after submit via JS

STRUCTURE — include all sections in order:
1. Sticky glassmorphism navbar: logo left, anchor links center, CTA right.
2. Hero: full viewport, gradient bg, Space Grotesk h1 clamp(3rem,6vw,5rem), subheading, 2 CTA buttons.
3. Trust bar: "Trusted by teams at..." 4-5 company names in muted text.
4. Features: 3-column grid of fade-up cards, emoji/icon, bold title, description.
5. Social proof: 3 testimonial cards with name, role, company, star rating ★★★★★.
6. Stats: 3-4 large violet numbers with cyan accents, muted labels.
7. Working form section: contact or signup form via Formspree.
8. Pricing: 3-tier pricing cards if relevant to prompt, with toggle monthly/annual.
9. Final CTA: gradient strip, bold headline, single primary button.
10. Footer: logo, nav columns, social links, copyright.

VALIDATOR REQUIREMENTS:
- <nav> present. <h1> present. Minimum 2 <section> elements.
- <title> and <meta name="description"> set.
- CTA button containing: Start, Get, Contact, Book, or Learn.
- Zero lorem ipsum.

RESPONSIVE:
- CSS-only hamburger menu for mobile.
- All grids collapse to single column below 768px.
- Hero text scales with clamp().

FORBIDDEN: No JSX. No React. No import statements. No markdown fences. No explanation before <!DOCTYPE html>.`;

const DASHBOARD_SYSTEM = `You are VIBE, an AI dashboard builder producing world-class, production-ready dashboard interfaces.
Return a complete, self-contained HTML dashboard. Output starts with <!DOCTYPE html> — no explanation, no preamble.

ALWAYS inject in <head>:
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Space Grotesk','system-ui']}}}}</script>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>">
<meta property="og:title" content="DASHBOARD_TITLE">
<meta property="og:description" content="DASHBOARD_DESCRIPTION">

DESIGN SYSTEM — non-negotiable:
- Page: bg-slate-950 text-white font-sans
- Sidebar: bg-slate-900 border-r border-slate-800 w-64 fixed h-full
- Cards: bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-violet-500/40 transition-all duration-200
- Primary: violet-600. Accent: cyan-400. Success: emerald-500. Warning: amber-500. Danger: red-500.
- All headings: Space Grotesk. All body: Inter.
- Topbar: bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40
- Active sidebar item: bg-violet-600/10 text-violet-400 border-l-2 border-violet-500
- Table header: bg-slate-900 text-slate-400 text-xs uppercase tracking-wider
- Row hover: hover:bg-slate-800/50

LAYOUT — CSS Grid:
- Wrapper: display:grid; grid-template-columns:256px 1fr; min-height:100vh
- Sidebar: fixed 256px full height
- Main: flex flex-col
- Topbar: sticky top-0
- Content: p-6 overflow-auto
- KPI row: grid grid-cols-4 gap-4 mb-6
- Charts row: grid grid-cols-2 gap-6 mb-6
- Table: full width

SIDEBAR — required:
- Brand logo/name with violet accent at top (Space Grotesk font-bold text-xl)
- Nav items with emoji icon + text label
- Active state on first item by default
- Divider between nav sections
- User avatar + name + role at bottom
- All nav clicks switch content via JS (SPA — no page reloads, no href to other files)

TOPBAR — required:
- Page title left (Space Grotesk font-bold text-xl)
- Search input center (bg-slate-800 border-slate-700 rounded-xl px-4 py-2)
- Date range buttons right: 7D / 30D / 90D / 1Y (active: bg-violet-600, inactive: bg-slate-800)
- Notification bell + user avatar far right

KPI STAT CARDS — 4 cards required:
- Large number: Space Grotesk text-3xl font-bold text-white
- Label: text-slate-400 text-sm mt-1
- Trend: text-emerald-400 text-sm (▲ positive) or text-red-400 (▼ negative)
- Icon: top-right corner, muted color
- Detect domain from prompt and use relevant metrics with realistic numbers

CHARTS — exactly 2 required using Chart.js:
- Initialize in <script> at bottom of <body> using new Chart(ctx, config)
- Chart 1: Line chart — primary time-series (revenue, traffic, users over 12 months)
- Chart 2: Doughnut or Bar — breakdown/distribution relevant to domain
- Domain detection: sales→revenue+pipeline; finance→cashflow+budget; analytics→traffic+conversion; HR→headcount+performance
- 12 months of realistic dummy data — Jan through Dec with contextually appropriate values
- Colors: violet #7c3aed, cyan #06b6d4, emerald #10b981, amber #f59e0b, red #ef4444
- Chart container: bg-slate-900 rounded-2xl p-6 border border-slate-800
- Chart title: Space Grotesk font-semibold text-white mb-4
- Dark grid lines: rgba(148,163,184,0.1)
- Date range buttons must update chart data on click

DATA TABLE — required:
- Domain-relevant columns with realistic header names
- 10 realistic data rows — no lorem ipsum, contextually appropriate
- Sticky header
- Search input filters rows in real time via JS
- Status badges: rounded-full px-3 py-1 text-xs font-medium with color coding
- Checkbox column for bulk selection
- Export CSV button: downloads table as CSV file via JS Blob
- overflow-x-auto for mobile

SPA NAVIGATION — required:
- All sidebar nav clicks show/hide content sections via JS (display block/none)
- Never use href to other HTML files
- Active sidebar item updates on click
- Page title in topbar updates on nav click
- URL does not change on navigation

DATA SOURCE UI — detect from prompt:
- Default: realistic placeholder data + "Upload Data" button in topbar
- CSV mentioned: file <input accept=".csv"> that parses with FileReader and loads into table + charts
- Supabase mentioned: "Connect Supabase" button opens modal
- API mentioned: endpoint input + Fetch button with loading spinner

CSV EXPORT — working implementation required:
function exportCSV() {
  const rows = [['Column1','Column2','Column3']]; // use actual headers
  // add actual data rows
  const csv = rows.map(r => r.join(',')).join('\\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'export.csv';
  a.click();
}

RESPONSIVE:
- Below 768px: sidebar hidden, hamburger menu button shown
- KPI cards: grid-cols-2 below 768px, grid-cols-1 below 480px
- Charts: full width stacked below 768px
- Table: overflow-x-auto

VALIDATOR REQUIREMENTS:
- <nav> present. <h1> present. Minimum 2 <section> elements.
- <title> and <meta name="description"> set.
- Button containing: Export, Connect, Start, or Get.
- Zero lorem ipsum.

FORBIDDEN: No JSX. No React. No import statements. No markdown fences. No explanation before <!DOCTYPE html>. No multi-page hrefs.`;

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
