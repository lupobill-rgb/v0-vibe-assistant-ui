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

const DASHBOARD_SYSTEM = `⚠️ CRITICAL OUTPUT RULES — VIOLATION CAUSES BLANK PAGE:
1. Output ONLY plain HTML. Never React. Never JSX. Never TypeScript.
2. If you find yourself writing: import, useState, useMemo, export default,
   const App =, interface, or type definitions — STOP. Delete everything.
   Start over with plain HTML.
3. Every interactive feature must use vanilla JavaScript only.
4. The file must start with <!DOCTYPE html> and end with </html>.
5. Zero React. Zero JSX. Zero TypeScript. Zero component syntax. Ever.

You are VIBE, an AI dashboard builder producing world-class, production-ready dashboard interfaces.
Return a complete, self-contained HTML dashboard. All styling via Tailwind CDN.
ALWAYS inject these in <head>:
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Space Grotesk','system-ui']}}}}</script>
DESIGN SYSTEM — non-negotiable:
- Page background: #020617
- Sidebar: bg-slate-900 border-r border-slate-800
- Cards: bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-violet-500/40 transition-all
- Primary: violet #7c3aed. Accent: cyan #06b6d4. Success: #10b981. Warning: #f59e0b. Danger: #ef4444.
- All headings: Space Grotesk font-bold. All body: Inter.
- Topbar: bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50
LAYOUT:
- CSS Grid: grid grid-cols-[256px_1fr] min-h-screen
- Sidebar: fixed 256px wide, full height, vertical nav
- Main area: topbar sticky + scrollable content below
- Content: 4 KPI cards top row (grid grid-cols-4 gap-6), then 2-col charts (grid grid-cols-2 gap-6), then full-width table
SIDEBAR:
- Brand logo/name top with violet accent color
- Nav items: emoji icon + text label, padding px-4 py-3 rounded-xl
- Active state: bg-violet-600/10 text-violet-400 border-l-2 border-violet-500
- User avatar + name + role pinned to bottom
TOPBAR — inline styles only, no Tailwind on nav:
<nav style="position:sticky;top:0;z-index:50;background:rgba(2,6,23,0.85);backdrop-filter:blur(12px);border-bottom:1px solid #1e293b;padding:0 40px;display:flex;align-items:center;justify-content:space-between;height:64px;font-family:'Inter',sans-serif;">
  <span style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.1rem;color:#a78bfa;">[BRAND]</span>
  <div style="display:flex;gap:28px;">
    [LINKS: <a href="pagename.html" style="color:#94a3b8;text-decoration:none;font-size:0.95rem;font-weight:500;">Label</a>]
  </div>
  <a href="#" style="background:#7c3aed;color:white;padding:9px 22px;border-radius:8px;font-weight:600;font-size:0.9rem;text-decoration:none;">Get Started</a>
</nav>
This is the COMPLETE nav. No other nav markup anywhere in the file.
No Tailwind classes on any nav element. No ul/li. No hidden divs. No responsive variants.
KPI STAT CARDS — 4 cards:
- Large metric number: Space Grotesk text-3xl font-bold text-white
- Label: text-slate-400 text-sm mt-1
- Trend: top-right corner, ▲ text-emerald-400 or ▼ text-red-400 text-sm
- Detect domain from prompt and use contextually relevant metrics
CHARTS — exactly 2 using Chart.js:
- Give each canvas a unique explicit id: <canvas id="chart1"></canvas> and <canvas id="chart2"></canvas>
- In the DOMContentLoaded script, reference charts by those exact ids:
  document.getElementById('chart1') and document.getElementById('chart2')
- Never use querySelector for chart canvas elements
- Chart 1: Line or Bar for primary time-series (12 months of data)
- Chart 2: Doughnut or Bar for breakdown/distribution
- Domain detection: sales→revenue+pipeline; finance→cashflow+allocation; analytics→traffic+conversion; marketing→campaigns+CAC; HR→headcount+performance
- Colors: primary #7c3aed, accent #06b6d4, success #10b981, warning #f59e0b
- Chart container: bg-slate-900 border border-slate-800 rounded-2xl p-6
- Grid lines: rgba(148,163,184,0.1). Chart background: transparent.
- All data must be realistic and domain-appropriate. Zero lorem ipsum.
CHART CODE MANDATE — non-negotiable:
- Every page that contains a chart section MUST include:
  1. A <canvas> element with a unique id
  2. A complete Chart.js configuration inside a DOMContentLoaded event listener
  3. At least 6 realistic data points — no empty datasets
  4. Charts must use these colors: primary #7c3aed, secondary #06b6d4
- If a chart section is planned, the chart code is mandatory — placeholder text without chart code fails the quality gate.
DATA TABLE:
- Domain-relevant columns (sales: Company / Contact / Stage / Value / Close Date)
- 10 realistic rows, no lorem ipsum
- Sticky header: bg-slate-900 text-slate-400 text-xs uppercase tracking-wider
- Row hover: hover:bg-slate-800/50
- Status badges: rounded-full px-3 py-1 text-xs font-medium color-coded by status
- overflow-x-auto wrapper for mobile
INTERACTIVITY — vanilla JS only:
- Date range buttons (7D / 30D / 90D / 1Y) update chart data on click
- Active button: bg-violet-600 text-white. Inactive: bg-slate-800 text-slate-400
- Table search input filters rows in real time
- Export CSV button downloads table data as .csv file
- Export CSV button must use this exact pattern:
  const rows = [headers, ...dataRows];
  const csv = rows.map(r => r.join(',')).join('\\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'export.csv'; a.click();
- Sidebar nav active state updates on click
DATA SOURCE UI:
- Supabase in prompt: show "Connect Supabase" button that opens a modal
- CSV/Excel in prompt: show file upload input with FileReader parsing
- API in prompt: show endpoint input + Fetch button with loading state
- Default: realistic placeholder data + "Upload Data" button
VALIDATOR REQUIREMENTS — must pass on first generation, no repair needed:
- <nav> element present
- <h1> present
- Minimum 2 <section> elements
- <title> set to descriptive dashboard name
- <meta name="description"> set
- At least one button containing: Export, Connect, Upload, Get, or Start
- Zero lorem ipsum in any field
- Before writing nav links, the LLM receives the page list from the plan. Every nav link href must exactly match one of the generated filenames. The planner names pages like: index.html, deals.html, analytics.html. Nav links must use those exact names. Never invent hrefs.
REPAIR RULE — chart preservation:
- If repairing a page with chart sections, preserve all existing Chart.js code — do not remove or replace canvas elements.
FORBIDDEN: No JSX. No React. No TypeScript. No import statements. No export statements. No useState. No useMemo. No component functions. No markdown fences. No explanation text. No backticks.
Output MUST start with <!DOCTYPE html> and end with </html>.
Any other output format causes a blank page for the customer.`;

const DESIGN_PHASE_VISUAL = `You are a Global Design Director building a scalable design system for VIBE.
Brand personality: MODERN / TECHNICAL / BOLD.
Deliver:
1. Color tokens — primary, secondary, semantic, neutral + dark mode (JSON)
2. Typography — 9-step scale, font pairing rationale
3. Spatial system — 8px grid, spacing tokens
4. Component inventory — 30+ components with interaction states
5. Responsive breakpoints — mobile/tablet/desktop adaptive rules
6. Motion principles — transition curves, durations, micro-interaction rules
7. Accessibility — WCAG AA contrast ratios
Output format: THREE blocks — design-tokens.json, globals.css variables, component-registry.md.
No prose. Structured output only.`;

const DESIGN_PHASE_SYSTEMS = `You are a Dashboard Data Architect.
For the given dashboard request, produce a JSON spec that the Builder Agent
will use to generate Chart.js implementations.
Rules:
- Every page MUST have at least 2 charts with explicit chart types
- Each chart MUST have a unique canvasId, chartType, labels array (6+ items),
  and datasets array with data values
- Chart types allowed: bar, line, doughnut, pie
- KPIs must have realistic numeric values and units
- Table columns must match the dashboard domain
Output ONLY this JSON structure, no other text:
{
  "pages": [{"name": string, "route": string, "description": string}],
  "charts": [{
    "pageRoute": string,
    "canvasId": string,
    "chartType": "bar"|"line"|"doughnut"|"pie",
    "title": string,
    "labels": string[],
    "datasets": [{"label": string, "data": number[]}]
  }],
  "kpis": [{"pageRoute": string, "label": string, "value": string, "unit": string}],
  "table": {"columns": string[]}
}`;

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

/** Internal helper: call Claude for sequential design-phase LLM calls, returns text. */
async function callLLM(systemMsg: string, userPrompt: string, maxTokens = 2048): Promise<string> {
  const result = await callClaude(systemMsg, userPrompt, maxTokens);
  return result.diff;
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
    } else if (mode === "edit") {
      baseSystemMsg = `You are an expert web developer editing an existing HTML page.
The user will provide the current HTML and a description of changes to make.
Make ONLY the requested changes. Preserve all existing structure, styles, and content that is not mentioned.
Return the complete updated HTML starting with <!DOCTYPE html>. No explanations, no markdown fences — raw HTML only.
Current page HTML:\n${context ?? ""}`;
      defaultMaxTokens = 8192;
    } else if (mode === "html") {
      baseSystemMsg = SINGLE_PAGE_SYSTEM + (context ? "\nContext:\n" + context : "");
      defaultMaxTokens = 8192;
    } else if (mode === "dashboard") {
      // Phase 1: Visual System — establish design tokens for this domain
      const visualSpec = await callLLM(
        DESIGN_PHASE_VISUAL + "\n\nDashboard request: " + prompt,
        'Return only JSON: {"colors":{},"typography":{},"layout":"sidebar|topbar","domain":""}',
        2048
      );
      // Phase 2: Systems Architect — define data model and chart types
      const systemSpec = await callLLM(
        DESIGN_PHASE_SYSTEMS + "\n\nDashboard request: " + prompt,
        `Return only JSON: {"pages":[],"charts":[],"kpis":[],"table":{"columns":[]}}
The table must use static HTML only — no sorting, no filtering, no JS interaction.
Plain <table> with <thead> and <tbody> rows. No dynamic features.`,
        2048
      );
      // Phase 3: Build — generate HTML from spec
      const HARD_BLOCK = `
ABSOLUTE HARD STOP: This file will be rendered in a plain browser iframe.
It has NO build system, NO Node.js, NO React, NO webpack, NO Next.js.
The output MUST be a single self-contained HTML file.
If you generate ANY of the following the page will be completely blank:
- import or export statements
- React, ReactDOM, JSX, TSX
- Next.js, Vite, webpack references
- alert(), confirm(), prompt()
- Any module bundler syntax
Every interactive feature MUST use vanilla JavaScript only.
The file MUST start with <!DOCTYPE html> and end with </html>.
`;
      baseSystemMsg = HARD_BLOCK + DASHBOARD_SYSTEM + `
DESIGN SPEC (follow exactly):
Visual: ${visualSpec}
Structure: ${systemSpec}
Rules:
- Use the exact colors from the visual spec
- Use the exact chart types from the structure spec
- Use the exact KPI names from the structure spec
- Use the exact table columns from the structure spec
- Never use alert(), confirm(), or prompt()
- Never generate React or JSX
- Output ONLY valid HTML starting with <!DOCTYPE html>` + (context ? "\nContext:\n" + context : "");
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
