import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Edge Function version — bump on every deploy
const EDGE_FUNCTION_VERSION = "2.0.0"; // 2026-03-25 — v6.0 wrapper architecture: VIBE_SYSTEM_RULES → 5-line wrapper + skill injection

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIBE_SYSTEM_RULES = `You are VIBE, the AI execution engine for this team.
Output exactly what the user's intent requires — no more, no less.
If the user asks to build, produce a complete deployable artifact.
If the user asks to draft, analyze, or plan, produce that content directly.
Follow any DEPARTMENT SKILLS injected below precisely.`;

// ── Supabase helper scripts (conditionally injected) ─────────────────────

const SUPABASE_HELPERS = `
SUPABASE FORM INTEGRATION — required on every page with a form:
Inject this script in <head> (platform replaces placeholders at deploy time):
<script>
window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";
window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";
</script>
Every <form> must use this pattern instead of action="...formspree...":
<form onsubmit="return vibeSubmitForm(event, this)">
Add this script before </body>:
<script>
async function vibeSubmitForm(e, form) {
  e.preventDefault();
  const btn = form.querySelector('[type=submit]');
  const origText = btn.textContent;
  btn.textContent = 'Sending...'; btn.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/form_submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.__VIBE_SUPABASE_ANON_KEY__,
        'Authorization': 'Bearer ' + window.__VIBE_SUPABASE_ANON_KEY__,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ project_id: document.body.dataset.projectId || '', page_route: location.pathname, form_name: form.dataset.formName || 'contact', payload: data })
    });
    if (res.ok) { form.reset(); const msg = form.querySelector('.form-success'); if (msg) msg.classList.remove('hidden'); }
    else { alert('Something went wrong. Please try again.'); }
  } catch { alert('Network error. Please try again.'); }
  finally { btn.textContent = origText; btn.disabled = false; }
  return false;
}
</script>

SPEND FORM INTEGRATION — required on any page with an expense or spend form:
The <head> SUPABASE_URL/ANON_KEY script (see above) must also be present.
Add this script in <head> (platform replaces __TEAM_ID__ at deploy time):
<script>window.__VIBE_TEAM_ID__="__TEAM_ID__";</script>
Use this form pattern:
<form onsubmit="return vibeLogSpend(event, this)">
  <select name="category" required>...</select>
  <input name="amount" type="number" step="0.01" min="0" required />
  <input name="description" type="text" />
  <input name="vendor" type="text" />
  <input name="date" type="date" />
  <button type="submit">Log Spend</button>
</form>
Add this script before </body>:
<script>
async function vibeLogSpend(e, form) {
  e.preventDefault();
  const btn = form.querySelector('[type=submit]');
  const origText = btn.textContent;
  btn.textContent = 'Saving...'; btn.disabled = true;
  const fd = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/team_spend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.__VIBE_SUPABASE_ANON_KEY__,
        'Authorization': 'Bearer ' + window.__VIBE_SUPABASE_ANON_KEY__,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        team_id: window.__VIBE_TEAM_ID__,
        category: fd.category,
        amount: parseFloat(fd.amount),
        description: fd.description || '',
        vendor: fd.vendor || '',
        quarter: Math.ceil((new Date().getMonth() + 1) / 3),
        spend_date: fd.date || new Date().toISOString().split('T')[0]
      })
    });
    if (res.ok) {
      form.reset();
      const msg = form.querySelector('.form-success');
      if (msg) msg.classList.remove('hidden');
      else { const t = document.createElement('div'); t.textContent = 'Spend logged successfully!'; t.className = 'text-green-600 mt-2 font-medium'; form.appendChild(t); setTimeout(() => t.remove(), 3000); }
    } else { alert('Failed to log spend. Please try again.'); }
  } catch { alert('Network error. Please try again.'); }
  finally { btn.textContent = origText; btn.disabled = false; }
  return false;
}
</script>

LIVE DATA INTEGRATION — required on ALL pages that display Supabase data (including dashboards):
The <head> SUPABASE_URL/ANON_KEY script (see above) must also be present.
Add this script before </body>:
<script>
async function vibeLoadData(table,filters={}){
  const url=window.__VIBE_SUPABASE_URL__;
  const key=window.__VIBE_SUPABASE_ANON_KEY__;
  if(!url||!key)return[];
  let ep=url+'/rest/v1/'+table+'?select=*';
  Object.entries(filters).forEach(([k,v])=>{ep+='&'+k+'=eq.'+v;});
  const r=await fetch(ep,{headers:{'apikey':key,'Authorization':'Bearer '+key}});
  return r.ok?await r.json():[];
}
</script>
VARIABLE NAMES — in all JS code, read credentials from window.__VIBE_SUPABASE_URL__, window.__VIBE_SUPABASE_ANON_KEY__, and window.__VIBE_TEAM_ID__. The double-underscore placeholders (__SUPABASE_URL__ etc.) are ONLY valid inside the <head> assignment scripts where the platform replaces them at deploy time.
`;

const SUPABASE_HELPER_SIGNALS = /\b(form|submit|database|supabase|data|crud|save|store|expense|spend|budget|contact|signup|login|register)\b/i;

function needsSupabaseHelpers(prompt: string): boolean {
  return SUPABASE_HELPER_SIGNALS.test(prompt);
}

// ── Mode-specific system prompts ─────────────────────────────────────────

const PLAN_SYSTEM =
  "You are VIBE, an AI website planner. " +
  "1. Given a user prompt, return a JSON object with two keys: 'pages' and 'color_scheme'. " +
  "2. 'pages' is an array of page objects. Each object has: name, title, description. " +
  "3. 'color_scheme' is a mandatory object with keys: bg, text, primary, surface, border, mode. " +
  "4. Return ONLY valid JSON — no markdown fences, no explanation, no extra text. " +
  "5. Return between 1 and 6 pages depending on the request. " +
  "   - If the user asks for a single page, landing page, or one-pager, return EXACTLY 1 page (just index). " +
  "   - If the user asks for a dashboard or app, return 1-3 pages focused on core functionality. " +
  "   - If the user asks for a full website or multi-page site, return 3-6 pages. " +
  "6. Each page should serve a distinct purpose. " +
  "7. Descriptions should be specific enough to guide HTML generation. " +
  "8. Users can add more pages later — focus on the core pages that deliver the most value. " +
  "COLOR_SCHEME EXTRACTION RULES (mandatory): " +
  "- User says 'white', 'clean', 'minimal', or 'light' → bg: '#ffffff', text: '#111827', surface: '#f8fafc', border: '#e2e8f0', mode: 'light'. " +
  "- User says 'dark' or 'dark mode' → bg: '#0f172a', text: '#f8fafc', surface: '#1e293b', border: '#334155', mode: 'dark'. " +
  "- User mentions a specific color → use it as primary, keep other defaults for that mode. " +
  "- No color instruction at all → bg: '#ffffff', text: '#111827', primary: '#7c3aed', surface: '#f8fafc', border: '#e2e8f0', mode: 'light'. DEFAULT IS LIGHT. " +
  "- Brand color from TEAM CONTEXT → use as primary only, never as bg. " +
  "Example output: " +
  '{"pages":[{"name":"index","title":"Acme","description":"Landing page"}],"color_scheme":{"bg":"#ffffff","text":"#111827","primary":"#7c3aed","surface":"#f8fafc","border":"#e2e8f0","mode":"light"}}';

const MULTI_PAGE_SYSTEM = `You are VIBE, an AI website builder generating one page of a multi-page website.
Start <style> with the :root block from VIBE_SYSTEM_RULES rule COLORS. Use var(--bg), var(--primary), var(--surface) throughout. Zero hardcoded color values.
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
- Colors come from the PRE-BUILT COLOR BLOCK (CSS variables). Use var(--bg), var(--text), var(--primary), var(--surface), var(--border) for ALL colors.
- Never hardcode hex color values. Never use bg-slate-900, bg-slate-950, text-white, or any Tailwind color class.
- All headings: Space Grotesk font-weight 700+. All body: Inter.
- Navbar: sticky top-0 bg-[var(--surface)] backdrop-blur-md border-b border-[var(--border)] z-50
- Active nav link: text-[var(--primary)] border-b-2 border-[var(--primary)]
- Cards: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 hover:border-[var(--primary)] transition-all duration-300
- Primary buttons: bg-[var(--primary)] text-[var(--bg)] px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
- Secondary buttons: border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] px-8 py-3 rounded-xl transition-all duration-200
- Inputs: bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2
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

FORMS — every form must work via Supabase (see SUPABASE FORM INTEGRATION in VIBE_SYSTEM_RULES):
- Use <form onsubmit="return vibeSubmitForm(event, this)" data-form-name="contact">
- Include name, email fields minimum with required attribute
- Submit button type="submit" with descriptive text
- Add <div class="form-success hidden">Thank you! We'll be in touch.</div> after the submit button
- Include the vibeSubmitForm script before </body> (see VIBE_SYSTEM_RULES)

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
Start <style> with the :root block from VIBE_SYSTEM_RULES rule COLORS. Use var(--bg), var(--primary), var(--surface) throughout. Zero hardcoded color values.
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
- Colors come from the PRE-BUILT COLOR BLOCK (CSS variables). Use var(--bg), var(--text), var(--primary), var(--surface), var(--border) for ALL colors.
- Never hardcode hex color values. Never use bg-slate-900, bg-slate-950, text-white, or any Tailwind color class.
- All headings: Space Grotesk font-weight 700+. All body: Inter.
- Hero: min-h-screen flex items-center justify-center background: var(--bg)
- Navbar: sticky top-0 bg-[var(--surface)] backdrop-blur-md border-b border-[var(--border)] z-50
- Cards: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 hover:border-[var(--primary)] transition-all duration-300
- Primary buttons: bg-[var(--primary)] text-[var(--bg)] px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl
- Secondary buttons: border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200
- Inputs: bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2 w-full
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

FORMS — every form must work via Supabase (see SUPABASE FORM INTEGRATION in VIBE_SYSTEM_RULES):
- Use <form onsubmit="return vibeSubmitForm(event, this)" data-form-name="contact">
- Include name and email fields minimum with required attribute
- Submit button type="submit" with descriptive text
- Add <div class="form-success hidden">Thank you! We'll be in touch.</div> after the submit button
- Include the vibeSubmitForm script before </body> (see VIBE_SYSTEM_RULES)

STRUCTURE — include all sections in order:
1. Sticky glassmorphism navbar: logo left, anchor links center, CTA right.
2. Hero: full viewport, gradient bg, Space Grotesk h1 clamp(3rem,6vw,5rem), subheading, 2 CTA buttons.
3. Trust bar: "Trusted by teams at..." 4-5 company names in muted text.
4. Features: 3-column grid of fade-up cards, emoji/icon, bold title, description.
5. Social proof: 3 testimonial cards with name, role, company, star rating ★★★★★.
6. Stats: 3-4 large violet numbers with cyan accents, muted labels.
7. Working form section: contact or signup form via Supabase (see SUPABASE FORM INTEGRATION).
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
6. LIVE DATA via vibeLoadData():
   When BUDGET CONTEXT or TEAM CONTEXT provides Supabase table names, ALL chart data, KPI values, and table rows MUST be loaded at runtime via vibeLoadData(tableName, filters).
   Show a loading skeleton while data loads. Show an empty state if no rows return.
   Use realistic FALLBACK sample data ONLY when no Supabase context is provided (no table names in prompt or context).
   NEVER use raw fetch() or XMLHttpRequest — always use vibeLoadData().
   REQUIRED PATTERN — follow this exactly when Supabase tables are referenced:
   a) In <head>, inject the credentials script (platform replaces placeholders at deploy):
      <script>window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";</script>
   b) Before </body>, inject the vibeLoadData function:
      <script>
      async function vibeLoadData(table,filters={}){
        const url=window.__VIBE_SUPABASE_URL__;const key=window.__VIBE_SUPABASE_ANON_KEY__;
        if(!url||!key)return[];
        let ep=url+'/rest/v1/'+table+'?select=*';
        Object.entries(filters).forEach(([k,v])=>{ep+='&'+k+'=eq.'+v;});
        const r=await fetch(ep,{headers:{'apikey':key,'Authorization':'Bearer '+key}});
        return r.ok?await r.json():[];
      }
      </script>
   c) Load data and populate dashboard in an async IIFE:
      <script>
      (async function(){
        const rows = await vibeLoadData('budget_allocations', {team_id: window.__VIBE_TEAM_ID__});
        if(!rows.length){ document.getElementById('empty-state').style.display='block'; return; }
        // populate KPI cards, chart datasets, and table rows from rows
      })();
      </script>

Start <style> with the :root block from VIBE_SYSTEM_RULES rule COLORS. Use var(--bg), var(--primary), var(--surface) throughout. Zero hardcoded color values.

You are VIBE, an AI dashboard builder producing world-class, production-ready dashboard interfaces.
Return a complete, self-contained HTML dashboard. Load data via vibeLoadData() when Supabase tables are referenced; use realistic fallback constants only when no table context is provided. All styling via Tailwind CDN.
ALWAYS inject these in <head>:
<script>window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";</script>
<script>window.__VIBE_TEAM_ID__="__TEAM_ID__";</script>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Space Grotesk','system-ui']}}}}</script>
DESIGN SYSTEM — non-negotiable:
- Colors come from the PRE-BUILT COLOR BLOCK (CSS variables). Use var(--bg), var(--text), var(--primary), var(--surface), var(--border) for ALL colors.
- Never hardcode hex color values. Never use bg-slate-900, bg-slate-950, text-white, or any Tailwind color class for backgrounds/text.
- Sidebar: bg-[var(--surface)] border-r border-[var(--border)]
- Cards: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--primary)] transition-all
- Semantic colors allowed for status only: Success: #10b981. Warning: #f59e0b. Danger: #ef4444.
- All headings: Space Grotesk font-bold. All body: Inter.
- Topbar: bg-[var(--surface)] backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50
LAYOUT:
- CSS Grid: grid grid-cols-[256px_1fr] min-h-screen
- Sidebar: fixed 256px wide, full height, vertical nav
- Main area: topbar sticky + scrollable content below
- Content: 4 KPI cards top row (grid grid-cols-4 gap-6), then 2-col charts (grid grid-cols-2 gap-6), then full-width table
SIDEBAR:
- Brand logo/name top with var(--primary) accent color
- Nav items: emoji icon + text label, padding px-4 py-3 rounded-xl
- Active state: bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] border-l-2 border-[var(--primary)]
- User avatar + name + role pinned to bottom
TOPBAR — inline styles only, no Tailwind on nav:
<nav style="position:sticky;top:0;z-index:50;background:var(--surface);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 40px;display:flex;align-items:center;justify-content:space-between;height:64px;font-family:'Inter',sans-serif;">
  <span style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.1rem;color:var(--primary);">[BRAND]</span>
  <div style="display:flex;gap:28px;">
    [LINKS: <a href="pagename.html" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Label</a>]
  </div>
  <a href="#" style="background:var(--primary);color:var(--bg);padding:9px 22px;border-radius:8px;font-weight:600;font-size:0.9rem;text-decoration:none;">Get Started</a>
</nav>
This is the COMPLETE nav. No other nav markup anywhere in the file.
No Tailwind classes on any nav element. No ul/li. No hidden divs. No responsive variants.
KPI STAT CARDS — 4 cards in grid-cols-4 gap-6 (grid-cols-2 on mobile):
- Card: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden
- Large metric number: Space Grotesk text-3xl font-bold text-[var(--text)] truncate
- Label: text-[var(--text)] opacity-60 text-sm mt-1 truncate
- Trend: absolute top-4 right-4, ▲ text-emerald-400 or ▼ text-red-400 text-sm
- CRITICAL: Use relative+absolute positioning so trend badge never overlaps metric text. Add min-h-[120px] to each card.
- Detect domain from prompt and use contextually relevant metrics
CHARTS — minimum 2 using Chart.js v3+ (CDN loads v4):
- ALLOWED chart types: 'bar', 'line', 'doughnut', 'pie'. For horizontal bars use type:'bar' with options.indexAxis:'y'.
- BANNED (Chart.js v2, will throw "not a registered controller"): 'horizontalBar', 'radar', 'polarArea', 'bubble', 'scatter' unless you register them. NEVER use type:'horizontalBar'.
- Give each canvas a unique explicit id (e.g. id="chart1", id="chart2", id="chartGeo", id="chartIndustry")
- Initialize each chart in an inline <script> immediately after its <canvas> (see CHART CODE MANDATE)
- Never use querySelector for chart canvas elements — use getElementById
- Overview section: Chart 1: Line or Bar for primary time-series (12 months of data). Chart 2: Doughnut or Bar for breakdown/distribution.
- Every additional nav section that displays data MUST also have at least one Chart.js chart with full initialization code.
- Domain detection: sales→revenue+pipeline; finance→cashflow+allocation; analytics→traffic+conversion; marketing→campaigns+CAC; HR→headcount+performance
- Colors: primary var(--primary), accent #06b6d4, success #10b981, warning #f59e0b
- Chart container: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6
- Grid lines: rgba(148,163,184,0.1). Chart background: transparent.
- All data must be realistic and domain-appropriate. Zero lorem ipsum.
CHART CODE MANDATE — non-negotiable:
- Every page that contains a chart section MUST include:
  1. A <canvas> element with a unique id
  2. A complete Chart.js new Chart() call
  3. At least 6 realistic data points — no empty datasets
  4. Charts must read primary color from getComputedStyle(document.documentElement).getPropertyValue('--primary') at runtime. Secondary: #06b6d4
- CANVAS HEIGHT RULE: Every <canvas> MUST have explicit height via BOTH the HTML attribute AND inline CSS. Charts must never expand beyond their container.
  Required format: <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>
  A <canvas> without both height="200" and style="height:200px !important; max-height:200px;" fails the quality gate.
- CRITICAL PLACEMENT RULE: Place each chart's <script> tag IMMEDIATELY after its <canvas> element, inside the same container div. Do NOT defer all chart code to a single DOMContentLoaded listener at the bottom of the page — the output may be truncated.
  Example pattern — WITH live data (FOLLOW THIS EXACTLY when Supabase tables are referenced):
  <div class="chart-container">
    <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>
    <script>
    (async function(){
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      const rows = await vibeLoadData('budget_allocations', {team_id: window.__VIBE_TEAM_ID__});
      const labels = rows.map(r => r.department || r.category || r.name);
      const values = rows.map(r => r.amount || r.value || 0);
      new Chart(document.getElementById('chart1'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Budget', data: values, backgroundColor: primary }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
      });
    })();
    </script>
  </div>
  Example pattern — WITHOUT Supabase context (fallback only):
  <div class="chart-container">
    <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>
    <script>
    (function(){
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      new Chart(document.getElementById('chart1'), {
        type: 'bar',
        data: { labels: ['Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ label: 'Revenue', data: [12,19,3,5,2,3], backgroundColor: primary }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
      });
    })();
    </script>
  </div>
- For hidden sections (display:none), wrap the chart init in setTimeout(()=>{...}, 100) so Chart.js can measure canvas size when switchView reveals it.
- If a chart section is planned, the chart code is mandatory — placeholder text without chart code fails the quality gate.
- NEVER create a <canvas> without a corresponding new Chart() call in a <script> immediately after it.
- When Supabase table context is provided, ALL chart/table/KPI data MUST be loaded via vibeLoadData(). Include the Supabase credentials script in <head> and vibeLoadData() before </body>. Use await vibeLoadData('table_name') inside an async IIFE to populate charts and tables. Show loading skeletons while data loads.
- When NO Supabase table context is provided (e.g. generic "sales dashboard"), use realistic hardcoded sample data as fallback constants.
DATA TABLE:
- Domain-relevant columns (sales: Company / Contact / Stage / Value / Close Date)
- 10 realistic rows, no lorem ipsum
- Sticky header: bg-[var(--surface)] text-[var(--text)] opacity-60 text-xs uppercase tracking-wider
- Row hover: hover:bg-[var(--border)]
- Status badges: rounded-full px-3 py-1 text-xs font-medium color-coded by status
- overflow-x-auto wrapper for mobile
INTERACTIVITY — vanilla JS only:
- Date range buttons (7D / 30D / 90D / 1Y) update chart data on click
- Active button: bg-[var(--primary)] text-[var(--bg)]. Inactive: bg-[var(--surface)] text-[var(--text)]
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
MULTI-SECTION NAVIGATION — MANDATORY for dashboards with sidebar nav:
- Every sidebar nav item MUST correspond to a <section> with a matching id="view-[name]" (e.g. id="view-overview", id="view-geographic", id="view-industry").
- ONLY the first section (overview/default) is visible on load. All others start with style="display:none".
- Add a global switchView function that toggles sections and updates the active nav state:
  <script>
  function switchView(evt, viewId) {
    if (evt) evt.preventDefault();
    document.querySelectorAll('[id^="view-"]').forEach(s => s.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.remove('active');
      if (n.dataset.section === viewId) n.classList.add('active');
    });
    // Re-render any Chart.js canvases inside the newly visible section
    const canvases = document.getElementById(viewId).querySelectorAll('canvas');
    canvases.forEach(c => { const chart = Chart.getChart(c); if (chart) chart.resize(); });
  }
  </script>
- Each sidebar nav item uses: <a href="#" class="nav-item" data-section="view-[name]" onclick="switchView(event,'view-[name]')">
- The active nav item class adds: bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] border-l-2 border-[var(--primary)]
- EVERY section MUST be fully populated with domain-relevant data:
  * Overview: KPI cards + primary charts + data table (the default view).
  * Geographic / Regional: Map visualization or regional breakdown bar chart + stats by region/location. Use Chart.js bar or doughnut chart with geographic labels.
  * Industry / Category: Industry-specific or category-specific breakdown chart + comparison table. Use Chart.js chart with industry/category labels.
  * Any other nav section: Relevant charts, tables, and KPI cards with realistic data. NO empty sections. NO placeholder text.
- CRITICAL: Sections hidden with display:none cause Chart.js to render at 0px size. The switchView function above calls chart.resize() to fix this. Additionally, wrap each hidden section's inline chart <script> in setTimeout(()=>{...}, 100) so the chart initializes after the DOM is ready. The chart.resize() in switchView will then correct the size when the section becomes visible.
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
FORBIDDEN: No JSX. No React. No TypeScript. No import statements. No export statements. No useState. No useMemo. No component functions. No markdown fences. No explanation text. No backticks. No raw fetch() — use vibeLoadData() only. No XMLHttpRequest.
Output MUST start with <!DOCTYPE html> and end with </html>.
Any other output format causes a blank page for the customer.`;

const APP_SYSTEM = `⚠️ CRITICAL OUTPUT RULES — VIOLATION CAUSES BLANK PAGE:
1. Output ONLY plain HTML. Never React. Never JSX. Never TypeScript.
2. If you find yourself writing: import, useState, useMemo, export default,
   const App =, interface, or type definitions — STOP. Delete everything.
   Start over with plain HTML.
3. Every interactive feature must use vanilla JavaScript only.
4. The file must start with <!DOCTYPE html> and end with </html>.
5. Zero React. Zero JSX. Zero TypeScript. Zero component syntax. Ever.

You are VIBE, a full-stack app builder.
BUILD A WORKING APPLICATION. NOT a website. NOT a landing page. NOT a marketing page.
The app opens directly to a DATA TABLE. ALL data reads and writes use the Supabase REST API. ZERO hardcoded records.

CRITICAL — IFRAME SAFETY:
This HTML runs inside a sandboxed iframe. Inline event handlers (onclick, onchange, onsubmit, onmouseover, onfocus, onblur, oninput, onkeydown, onkeyup, onkeypress, etc.) are BLOCKED and will silently fail.
You MUST attach ALL event listeners in JavaScript using addEventListener or event delegation (document.addEventListener('click', ...)).
NEVER put event handlers in HTML attributes. NEVER use onclick="..." or onchange="..." or onsubmit="..." anywhere in the HTML.
For dynamically created elements use event delegation: attach one listener on a parent/document and check e.target.closest('.your-class').

HEAD must include:
<script src="https://cdn.tailwindcss.com"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
<script>window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";<\/script>
Placeholders are replaced at deploy time. In all other JS, use window.__VIBE_SUPABASE_URL__ and window.__VIBE_SUPABASE_ANON_KEY__ (see Rule 15).

Start <style> with the :root block from VIBE_SYSTEM_RULES rule COLORS. Use var(--bg), var(--primary), var(--surface) throughout. Zero hardcoded color values.

REQUIRED LAYOUT:
<body>
<div style="display:flex;height:100vh;overflow:hidden;">
  <aside id="sidebar" style="width:240px;min-width:240px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;">
    <div style="padding:1.5rem 1rem;border-bottom:1px solid var(--border);"><h1 style="font-family:'Space Grotesk',sans-serif;font-size:1.1rem;font-weight:700;color:var(--primary);">APP NAME</h1></div>
    <nav id="sidebar-nav" style="padding:1rem 0.5rem;display:flex;flex-direction:column;gap:0.25rem;"></nav>
  </aside>
  <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
    <header style="padding:1rem 1.5rem;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
      <h2 id="view-title" style="font-size:1.1rem;font-weight:600;color:var(--text);">Records</h2>
      <button id="btn-add" style="background:var(--primary);color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:500;font-size:0.875rem;">+ Add New</button>
    </header>
    <div style="padding:0.75rem 1.5rem;background:var(--surface);border-bottom:1px solid var(--border);display:flex;gap:0.75rem;">
      <input id="search-input" placeholder="Search..." style="flex:1;max-width:320px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.75rem;font-size:0.875rem;outline:none;">
    </div>
    <main id="main-content" style="flex:1;overflow:auto;padding:1.5rem;">
      <div id="loading-state" style="text-align:center;padding:4rem;color:#64748b;">Loading...</div>
      <div id="empty-state" style="display:none;text-align:center;padding:4rem 2rem;">
        <p style="color:#64748b;font-size:1rem;margin-bottom:1rem;">No records yet</p>
        <button id="btn-empty-add" style="background:var(--primary);color:#fff;border:none;padding:0.6rem 1.25rem;border-radius:6px;cursor:pointer;font-weight:500;">Add your first record</button>
      </div>
      <div id="table-container" style="display:none;overflow-x:auto;"></div>
    </main>
  </div>
</div>
<div id="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:50;"></div>
<div id="modal" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:2rem;width:480px;max-width:90vw;max-height:85vh;overflow-y:auto;z-index:51;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
    <h3 id="modal-title" style="font-size:1rem;font-weight:600;color:var(--text);">Add Record</h3>
    <button id="modal-close-btn" style="background:none;border:none;color:var(--text);font-size:1.5rem;cursor:pointer;line-height:1;">&times;</button>
  </div>
  <form id="record-form"></form>
</div>
<div id="vibe-toast" style="display:none;position:fixed;bottom:1.5rem;right:1.5rem;padding:0.75rem 1.25rem;border-radius:8px;font-size:0.875rem;z-index:100;color:#fff;"></div>
</body>

ALL DATA lives in Supabase table app_data: {id uuid, collection text, record jsonb, created_at timestamptz}
Infer collection name(s) from the prompt (contacts, deals, tasks, etc).

REQUIRED JAVASCRIPT — implement every function completely, no stubs:

const COLLECTION = 'INFER_FROM_PROMPT';
let allRows = [];
let editingId = null;

function vibeHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': window.__VIBE_SUPABASE_ANON_KEY__,
    'Authorization': 'Bearer ' + window.__VIBE_SUPABASE_ANON_KEY__
  };
}

async function loadRecords() {
  document.getElementById('loading-state').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('table-container').style.display = 'none';
  try {
    const r = await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/app_data?collection=eq.' + COLLECTION + '&order=created_at.desc', { headers: vibeHeaders() });
    allRows = await r.json();
    renderTable(allRows);
  } catch(e) { showToast('Failed to load records', 'error'); }
  document.getElementById('loading-state').style.display = 'none';
}

function renderTable(rows) {
  if (!rows || rows.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('table-container').style.display = 'none';
    return;
  }
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('table-container').style.display = 'block';
  const fields = Object.keys(rows[0].record || {});
  let html = '<table style="width:100%;border-collapse:collapse;font-size:0.875rem;">';
  html += '<thead style="background:var(--surface2);"><tr>';
  fields.forEach(f => { html += '<th style="text-align:left;padding:0.6rem 0.75rem;color:#94a3b8;font-weight:500;border-bottom:1px solid var(--border);">' + f + '</th>'; });
  html += '<th style="text-align:right;padding:0.6rem 0.75rem;color:#94a3b8;font-weight:500;border-bottom:1px solid var(--border);">Actions</th></tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr style="border-bottom:1px solid var(--border);">';
    fields.forEach(f => {
      const val = row.record[f] ?? '';
      html += '<td style="padding:0.6rem 0.75rem;color:var(--text);">' + String(val) + '</td>';
    });
    html += '<td style="padding:0.6rem 0.75rem;text-align:right;">';
    html += '<button class="edit-btn" data-id="' + row.id + '" style="background:none;border:1px solid var(--border);color:var(--text);padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.75rem;margin-right:0.4rem;">Edit</button>';
    html += '<button class="delete-btn" data-id="' + row.id + '" style="background:none;border:1px solid var(--danger);color:var(--danger);padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.75rem;">Delete</button>';
    html += '</td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('table-container').innerHTML = html;
}

function openModal(id) {
  editingId = id || null;
  document.getElementById('modal-title').textContent = id ? 'Edit Record' : 'Add Record';
  const form = document.getElementById('record-form');
  const fields = FORM_FIELDS;
  let html = '';
  let record = {};
  if (id) { const row = allRows.find(r => r.id === id); if (row) record = row.record; }
  fields.forEach(f => {
    html += '<div style="margin-bottom:1rem;">';
    html += '<label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:0.4rem;">' + f.label + (f.required ? ' *' : '') + '</label>';
    if (f.type === 'select') {
      html += '<select name="' + f.name + '" style="width:100%;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;">';
      f.options.forEach(o => { html += '<option value="' + o + '"' + (record[f.name] === o ? ' selected' : '') + '>' + o + '</option>'; });
      html += '</select>';
    } else if (f.type === 'textarea') {
      html += '<textarea name="' + f.name + '" rows="3" style="width:100%;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;resize:vertical;">' + (record[f.name] || '') + '</textarea>';
    } else {
      html += '<input type="' + f.type + '" name="' + f.name + '" value="' + (record[f.name] || '') + '" ' + (f.required ? 'required' : '') + ' style="width:100%;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;">';
    }
    html += '</div>';
  });
  html += '<div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem;">';
  html += '<button type="button" class="cancel-btn" style="background:none;border:1px solid var(--border);color:var(--text);padding:0.5rem 1rem;border-radius:6px;cursor:pointer;">Cancel</button>';
  html += '<button type="submit" style="background:var(--primary);color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:500;">Save</button>';
  html += '</div>';
  form.innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById('modal').style.display = 'block';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal').style.display = 'none';
  editingId = null;
}

async function saveRecord(event) {
  event.preventDefault();
  const form = event.target;
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  const btn = form.querySelector('[type=submit]');
  btn.textContent = 'Saving...'; btn.disabled = true;
  try {
    if (editingId) {
      await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/app_data?id=eq.' + editingId, { method: 'PATCH', headers: { ...vibeHeaders(), 'Prefer': 'return=representation' }, body: JSON.stringify({ record: data }) });
    } else {
      await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/app_data', { method: 'POST', headers: { ...vibeHeaders(), 'Prefer': 'return=representation' }, body: JSON.stringify({ collection: COLLECTION, record: data }) });
    }
    closeModal();
    await loadRecords();
    showToast('Saved successfully', 'success');
  } catch(e) { showToast('Save failed', 'error'); }
  btn.textContent = 'Save'; btn.disabled = false;
}

async function confirmDelete(id) {
  if (!confirm('Delete this record?')) return;
  try {
    await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/app_data?id=eq.' + id, { method: 'DELETE', headers: vibeHeaders() });
    await loadRecords();
    showToast('Deleted', 'success');
  } catch(e) { showToast('Delete failed', 'error'); }
}

function filterTable() {
  const q = document.getElementById('search-input').value.toLowerCase();
  renderTable(allRows.filter(row => JSON.stringify(row.record).toLowerCase().includes(q)));
}

function showToast(msg, type) {
  const t = document.getElementById('vibe-toast');
  t.textContent = msg;
  t.style.background = type === 'success' ? '#22c55e' : '#ef4444';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
  loadRecords();
  document.getElementById('btn-add').addEventListener('click', function() { openModal(); });
  document.getElementById('btn-empty-add').addEventListener('click', function() { openModal(); });
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('search-input').addEventListener('input', filterTable);
  document.getElementById('record-form').addEventListener('submit', function(e) { saveRecord(e); });
  document.addEventListener('click', function(e) {
    var editBtn = e.target.closest('.edit-btn');
    var deleteBtn = e.target.closest('.delete-btn');
    var cancelBtn = e.target.closest('.cancel-btn');
    if (editBtn) openModal(editBtn.dataset.id);
    if (deleteBtn) confirmDelete(deleteBtn.dataset.id);
    if (cancelBtn) closeModal();
  });
});

CRITICAL: Replace COLLECTION with the actual collection name inferred from the user prompt (e.g. 'contacts', 'deals', 'tasks', 'tickets', 'invoices').
FORM_FIELDS is a JS array defined before openModal: const FORM_FIELDS = [{name:'field_name', label:'Field Label', type:'text|email|number|select|textarea', required:true, options:['opt1','opt2']}];
For select fields infer sensible options from the prompt context.

If the user requests multiple entity types (e.g. Contacts AND Deals for a CRM), build sidebar nav items for each entity.
Each nav item switches the active COLLECTION and reloads the table.
The sidebar nav must be built dynamically in DOMContentLoaded based on an array of collections.

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
- Chart types allowed: bar, line, doughnut, pie (NEVER horizontalBar — use bar with indexAxis:'y')
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

// ── Dashboard request detection ─────────────────────────────────────────
const DASHBOARD_KEYWORDS = [
  "dashboard", "analytics", "chart", "pipeline", "report",
  "tracker", "metrics", "kpi", "visualiz",
];

function isDashboardRequest(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return DASHBOARD_KEYWORDS.some((kw) => lower.includes(kw));
}

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

function getGuidedNextSteps(prompt: string, mode: string): string[] {
  if (mode === "plan") return [];
  const lower = prompt.toLowerCase();
  const dataKeywords = /\b(revenue|pipeline|sales|dashboard|analytics|data|metrics|performance|report|forecast|crm|contacts|deals)\b/;
  const alreadyConnected = /\b(uploaded|csv|connected|hubspot|salesforce|airtable)\b/;
  if (dataKeywords.test(lower) && !alreadyConnected.test(lower)) {
    return [
      "Connect your CRM (HubSpot or Salesforce) to populate this dashboard with live data",
      "Upload a CSV file with your data to see real numbers instead of placeholders",
      "Go to Marketplace → Connectors to set up your data sources",
    ];
  }
  return [];
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
    let { prompt, context, model = "claude", system, max_tokens, mode, color_block } = await req.json() as { prompt: string; context?: string; model?: string; system?: string; max_tokens?: number; mode?: string; color_block?: string };
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

    // ── Direct dashboard fast path ──────────────────────────────────────
    // Fast path removed — LLM + department skills determine output format
    // isDashboardRequest() kept for diagnostics but no longer bypasses the pipeline
    if (false) {
      try {
        const colorInjection = color_block
          ? `\nPRE-BUILT COLOR BLOCK (server-resolved, non-negotiable):\n${color_block}\nUse var(--bg), var(--text), var(--primary), var(--surface), var(--border) for ALL color decisions. Never use raw hex values.\n`
          : "";
        const directSystem = VIBE_SYSTEM_RULES + "\n" + DASHBOARD_SYSTEM + colorInjection;
        const directResult = await PROVIDERS[model](directSystem, prompt, 16384);

        // Validate we got HTML back
        const html = directResult.diff.trim();
        if (html.startsWith("<!DOCTYPE html>") || html.startsWith("<!doctype html>")) {
          return new Response(
            JSON.stringify({
              diff: html,
              usage: directResult.usage,
              model,
              mode: "dashboard",
              fast_path: true,
              version: EDGE_FUNCTION_VERSION,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // If response isn't valid HTML, fall through to normal pipeline
        console.warn("Dashboard fast path returned non-HTML, falling through to pipeline.");
      } catch (fastPathErr) {
        console.warn(`Dashboard fast path failed: ${(fastPathErr as Error).message}. Falling through to pipeline.`);
      }
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
Make ONLY the requested changes. Preserve ALL existing structure, styles, scripts, charts, data, and content that is not explicitly mentioned in the edit request.
Return the complete updated HTML starting with <!DOCTYPE html>. No explanations, no markdown fences — raw HTML only.
CRITICAL: The output must be the FULL HTML document. Do NOT truncate, summarize, or omit any sections. Every element from the original must appear in your output unless the user asked to remove it.`;
      // Move context to user message instead of system to save context window
      prompt = `Edit request: ${prompt}\n\nCurrent HTML to edit:\n${context ?? ""}`;
      defaultMaxTokens = 24000;
    } else if (mode === "html") {
      baseSystemMsg = SINGLE_PAGE_SYSTEM + (context ? "\nContext:\n" + context : "");
      defaultMaxTokens = 8192;
    } else if (mode === "dashboard") {
      // Single LLM call — no separate design spec phase
      // Previous 2-call approach hit Supabase 150s wall-time limit causing 504s
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
STRUCTURAL REQUIREMENTS:
- Include at least 4 KPI stat cards with realistic values
- Include at least 2 Chart.js charts (bar, line, doughnut, or pie)
- Each chart canvas must have a unique id (e.g. id="chart1", id="chart2")
- Include a data table with relevant columns for the domain
- The table must use static HTML only — plain <table> with <thead> and <tbody>
- Detect the domain from the user prompt and use contextually relevant metrics
- Never use alert(), confirm(), or prompt()
- Never generate React or JSX
- Output ONLY valid HTML starting with <!DOCTYPE html>` + (context ? "\nContext:\n" + context : "");
      defaultMaxTokens = 16384;
    } else if (mode === "app") {
      baseSystemMsg = APP_SYSTEM;
      defaultMaxTokens = 16384;
    } else {
      // Default: diff generation mode
      baseSystemMsg = "You are VIBE, an AI website builder. Return ONLY a valid unified diff. No markdown fences, no explanation." +
        (context ? "\nProject context:\n" + context : "");
    }

    // Inject the server-resolved color block so the LLM never decides colors
    const colorInjection = color_block
      ? `\n\nPRE-BUILT COLOR BLOCK (server-resolved, non-negotiable):\nThe HTML file already contains this block in <head> — do not remove it, do not override it, do not add competing color declarations:\n${color_block}\nUse var(--bg), var(--text), var(--primary), var(--surface), var(--border) for ALL color decisions. Never use raw hex values.\n`
      : "";
    const supabaseBlock = (mode !== "plan" && needsSupabaseHelpers(prompt)) ? "\n" + SUPABASE_HELPERS : "";
    const systemMsg = VIBE_SYSTEM_RULES + "\n" + baseSystemMsg + colorInjection + supabaseBlock;
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
        version: EDGE_FUNCTION_VERSION,
        guided_next_steps: getGuidedNextSteps(prompt, mode || "diff"),
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
