import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Edge Function version — bump on every deploy
const EDGE_FUNCTION_VERSION = "2.6.0"; // 2026-03-30 — Remove all SAMPLE_DATA fallbacks; dashboards show empty state when vibeLoadData returns []

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildVibeSystemRules(teamName?: string, orgName?: string): string {
  const team = teamName || 'this team';
  const org = orgName || 'the platform';
  return `You are VIBE, the AI execution engine for ${team} on the ${org} platform.
Output exactly what the user's intent requires — no more, no less.
If the user asks to build, produce a complete deployable artifact.
If the user asks to draft, analyze, or plan, produce that content directly.
Follow any DEPARTMENT SKILLS injected below precisely.`;
}

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
  if(!url||!key){console.error('[vibeLoadData] missing URL or key',{url:!!url,key:!!key});return[];}
  let token=key;
  try{const ref=url.split('//')[1].split('.')[0];const s=JSON.parse(localStorage.getItem('sb-'+ref+'-auth-token')||'{}');if(s.access_token)token=s.access_token;}catch(e){}
  let ep=url+'/rest/v1/'+table+'?select=*';
  Object.entries(filters).forEach(([k,v])=>{if(v)ep+='&'+k+'=eq.'+v;});
  console.log('[vibeLoadData] fetching from:',ep);
  try{const r=await fetch(ep,{headers:{'apikey':key,'Authorization':'Bearer '+token}});if(!r.ok){console.error('[vibeLoadData] error:',r.status,await r.text());return[];}const rows=await r.json();console.log('[vibeLoadData] result:',rows.length,'rows');return rows;}
  catch(e){console.error('[vibeLoadData] fetch failed:',e);return[];}
}
</script>
VARIABLE NAMES — in all JS code, read credentials from window.__VIBE_SUPABASE_URL__, window.__VIBE_SUPABASE_ANON_KEY__, and window.__VIBE_TEAM_ID__. The double-underscore placeholders (__SUPABASE_URL__ etc.) are ONLY valid inside the <head> assignment scripts where the platform replaces them at deploy time.
`;

const SUPABASE_HELPER_SIGNALS = /\b(form|submit|database|supabase|data|crud|save|store|expense|spend|budget|contact|signup|login|register)\b/i;

function needsSupabaseHelpers(prompt: string): boolean {
  return SUPABASE_HELPER_SIGNALS.test(prompt);
}

// ── Shared design system constants (deduplicated across modes) ──────────

const DESIGN_SYSTEM_CORE = `DESIGN SYSTEM — non-negotiable:
- Colors come from the PRE-BUILT COLOR BLOCK (CSS variables). Use var(--bg), var(--text), var(--primary), var(--surface), var(--border) for ALL colors.
- Never hardcode hex color values. Never use bg-slate-900, bg-slate-950, text-white, or any Tailwind color class.
- All headings: Syne font-weight 700-800. All body: Inter.`;

const SCROLL_ANIMATIONS = `SCROLL ANIMATIONS — required:
Add this script before </body>:
<script>
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('animate-in'); } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
</script>
Add to <style>: .fade-up { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; } .animate-in { opacity: 1; transform: translateY(0); }`;

const FORM_RULES = `FORMS — every form must work via Supabase (see SUPABASE FORM INTEGRATION injected above):
- Use <form onsubmit="return vibeSubmitForm(event, this)" data-form-name="contact">
- Include name and email fields minimum with required attribute
- Submit button type="submit" with descriptive text
- Add <div class="form-success hidden">Thank you! We'll be in touch.</div> after the submit button
- Include the vibeSubmitForm script before </body> (see SUPABASE FORM INTEGRATION above)`;

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
  "- User says 'dark' or 'dark mode' → bg: '#0A0E17', text: '#E8ECF4', surface: '#0F1420', border: '#1a2030', mode: 'dark'. " +
  "- User mentions a specific color → use it as primary, keep other defaults for that mode. " +
  "- No color instruction at all → bg: '#0A0E17', text: '#E8ECF4', primary: '#00E5A0', surface: '#0F1420', border: '#1a2030', mode: 'dark'. DEFAULT IS DARK. " +
  "- Brand color from TEAM CONTEXT → use as primary only, never as bg. " +
  "Example output: " +
  '{"pages":[{"name":"index","title":"Acme","description":"Landing page"}],"color_scheme":{"bg":"#0A0E17","text":"#E8ECF4","primary":"#00E5A0","surface":"#0F1420","border":"#1a2030","mode":"dark"}}';

const MULTI_PAGE_SYSTEM = `You are VIBE, an AI website builder generating one page of a multi-page website.
Start <style> with the :root block from the PRE-BUILT COLOR BLOCK injected below. Use var(--bg), var(--primary), var(--surface) throughout. Zero hardcoded color values.
Return a complete, self-contained HTML page. Output starts with <!DOCTYPE html> — no explanation, no preamble.

ALWAYS inject in <head>:
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Syne','system-ui']}}}}</script>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
<meta property="og:title" content="PAGE_TITLE">
<meta property="og:description" content="PAGE_DESCRIPTION">
<meta property="og:type" content="website">

${DESIGN_SYSTEM_CORE}
- Navbar: sticky top-0 bg-[var(--surface)] backdrop-blur-md border-b border-[var(--border)] z-50
- Active nav link: text-[var(--primary)] border-b-2 border-[var(--primary)]
- Cards: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 hover:border-[var(--primary)] transition-all duration-300
- Primary buttons: bg-[var(--primary)] text-[var(--bg)] px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
- Secondary buttons: border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] px-8 py-3 rounded-xl transition-all duration-200
- Inputs: bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2
- Max content width 1200px centered. Section padding py-24 px-6.
- Every page shares identical navbar and footer.

${SCROLL_ANIMATIONS}
Apply fade-up class to all cards, sections, and feature blocks.

${FORM_RULES}

STRUCTURE — include all sections:
1. Sticky navbar: logo left, page nav center (mark current page active with aria-current="page"), CTA button right.
2. Page-specific hero with gradient background and h1.
3. Minimum 2 content sections relevant to the page purpose.
4. Footer: nav columns, copyright, consistent across all pages.
5. Nav links use JavaScript onclick handlers to show/hide sections within the same page — never use href links to separate .html files. All content must exist in a single HTML file with sections toggled by JS.
6. Every page section is reachable from the nav.

VALIDATOR REQUIREMENTS:
- <nav> present. <h1> present. Minimum 2 <section> elements.
- <title> and <meta name="description"> set.
- CTA button containing: Start, Get, Contact, Book, or Learn.
- Navigation uses JS onclick to show/hide sections — no href to separate .html files.
- Zero lorem ipsum.

RESPONSIVE:
- Single @media (max-width: 768px) breakpoint.
- CSS-only hamburger menu for mobile nav.
- Cards stack to single column on mobile.

FORBIDDEN: No JSX. No React. No import statements. No markdown fences. No explanation before <!DOCTYPE html>.`;

// Keep PAGE_SYSTEM as alias for backward compatibility in tests
const PAGE_SYSTEM = MULTI_PAGE_SYSTEM;

const SINGLE_PAGE_SYSTEM = `You are VIBE, an AI website builder producing best-in-class single-page sites.
Start <style> with the :root block from the PRE-BUILT COLOR BLOCK injected below. Use var(--bg), var(--primary), var(--surface) throughout. Zero hardcoded color values.
Return a complete, self-contained HTML site. Output starts with <!DOCTYPE html> — no explanation, no preamble.

ALWAYS inject in <head>:
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Syne','system-ui']}}}}</script>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
<meta property="og:title" content="SITE_TITLE">
<meta property="og:description" content="SITE_DESCRIPTION">
<meta property="og:type" content="website">

${DESIGN_SYSTEM_CORE}
- Hero: min-h-screen flex items-center justify-center background: var(--bg)
- Navbar: sticky top-0 bg-[var(--surface)] backdrop-blur-md border-b border-[var(--border)] z-50
- Cards: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 hover:border-[var(--primary)] transition-all duration-300
- Primary buttons: bg-[var(--primary)] text-[var(--bg)] px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl
- Secondary buttons: border border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200
- Inputs: bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2 w-full
- Max content width 1200px centered. Section padding py-24 px-6.

${SCROLL_ANIMATIONS}
Apply fade-up class to all cards, feature blocks, testimonials, and stat numbers.

${FORM_RULES}

STRUCTURE — include all sections in order:
1. Sticky glassmorphism navbar: logo left, anchor links center, CTA right.
2. Hero: full viewport, gradient bg, Syne h1 clamp(3rem,6vw,5rem), subheading, 2 CTA buttons.
3. Trust bar: "Trusted by teams at..." 4-5 company names in muted text.
4. Features: 3-column grid of fade-up cards, emoji/icon, bold title, description.
5. Social proof: 3 testimonial cards with name, role, company, star rating ★★★★★.
6. Stats: 3-4 large numbers with UbiVibe gradient accents, muted labels.
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
6. LIVE DATA via vibeLoadData() — MANDATORY for ALL dashboards:
   ALL chart data, KPI values, and table rows MUST be loaded at runtime via vibeLoadData(tableName, filters). No exceptions.
   Show a loading skeleton while data loads. Show an empty state if no rows return.
   If vibeLoadData() returns an empty array, render an empty state: show the chart/table container with a message "No data yet. Connect your data source to populate this dashboard." Never generate hardcoded data arrays. Never invent metrics.
   NEVER use raw fetch() or XMLHttpRequest — always use vibeLoadData().
   TABLE NAME RESOLUTION: Use table names from TEAM CONTEXT or BUDGET CONTEXT if provided. If no specific table name is given, infer from the domain: sales/GTM→'gtm_deals', budget/finance→'budget_allocations', contacts/CRM→'contacts', analytics→'page_views'. Always filter by team_id: {team_id: window.__VIBE_TEAM_ID__}.
   REQUIRED PATTERN — follow this exactly:
   a) In <head>, inject the credentials script (platform replaces placeholders at deploy):
      <script>window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";</script>
   b) Before </body>, inject the vibeLoadData function:
      <script>
      async function vibeLoadData(table,filters={}){
        const url=window.__VIBE_SUPABASE_URL__;const key=window.__VIBE_SUPABASE_ANON_KEY__;
        if(!url||!key){console.error('[vibeLoadData] missing URL or key',{url:!!url,key:!!key});return[];}
        let token=key;
        try{const ref=url.split('//')[1].split('.')[0];const s=JSON.parse(localStorage.getItem('sb-'+ref+'-auth-token')||'{}');if(s.access_token)token=s.access_token;}catch(e){}
        let ep=url+'/rest/v1/'+table+'?select=*';
        Object.entries(filters).forEach(([k,v])=>{if(v)ep+='&'+k+'=eq.'+v;});
        console.log('[vibeLoadData] fetching from:',ep);
        try{const r=await fetch(ep,{headers:{'apikey':key,'Authorization':'Bearer '+token}});if(!r.ok){console.error('[vibeLoadData] error:',r.status,await r.text());return[];}const rows=await r.json();console.log('[vibeLoadData] result:',rows.length,'rows');return rows;}
        catch(e){console.error('[vibeLoadData] fetch failed:',e);return[];}
      }
      </script>
   c) Load data and populate dashboard in an async IIFE.
      <script>
      (async function(){
        let rows = await vibeLoadData('budget_allocations', {team_id: window.__VIBE_TEAM_ID__});
        if(!rows.length){
          // Show empty state — NEVER fall back to hardcoded data
          document.querySelectorAll('[data-empty-state]').forEach(el => el.style.display = 'flex');
          return;
        }
        // populate KPI cards, chart datasets, and table rows from rows
      })();
      </script>
      If vibeLoadData returns [], show empty state containers with the message "No data yet. Connect your data source to populate this dashboard." Never generate hardcoded sample data arrays.

Start <style> with the :root block from the PRE-BUILT COLOR BLOCK injected below. Use var(--bg), var(--primary), var(--surface) throughout. Zero hardcoded color values.

You are VIBE, an AI dashboard builder producing world-class, production-ready dashboard interfaces.
Return a complete, self-contained HTML dashboard. ALL data MUST be loaded via vibeLoadData() — zero hardcoded data values in charts, KPIs, or tables. Show empty states when vibeLoadData returns []. All styling via Tailwind CDN.
ALWAYS inject these in <head>:
<script>window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";</script>
<script>window.__VIBE_TEAM_ID__="__TEAM_ID__";</script>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Syne','system-ui']}}}}</script>
${DESIGN_SYSTEM_CORE}
- Sidebar: bg-[var(--surface)] border-r border-[var(--border)]
- Cards: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--primary)] transition-all
- Semantic colors allowed for status only: Success: #10b981. Warning: #f59e0b. Danger: #ef4444.
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
  <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem;color:var(--primary);">[BRAND]</span>
  <div style="display:flex;gap:28px;">
    [LINKS: <a href="#" data-section="view-[name]" onclick="switchView(event,'view-[name]')" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Label</a>]
  </div>
  <a href="#" style="background:var(--primary);color:var(--bg);padding:9px 22px;border-radius:8px;font-weight:600;font-size:0.9rem;text-decoration:none;">Get Started</a>
</nav>
This is the COMPLETE nav. No other nav markup anywhere in the file.
No Tailwind classes on any nav element. No ul/li. No hidden divs. No responsive variants.
KPI STAT CARDS — 4 cards in grid-cols-4 gap-6 (grid-cols-2 on mobile):
- Card: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden
- Large metric number: Syne text-3xl font-bold text-[var(--text)] truncate
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
- Colors: primary var(--primary), accent #00B4D8, success #10b981, warning #f59e0b
- Chart container: bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6
- Grid lines: rgba(148,163,184,0.1). Chart background: transparent.
- Zero lorem ipsum. Zero hardcoded data arrays.
CHART CODE MANDATE — non-negotiable:
- Every page that contains a chart section MUST include:
  1. A <canvas> element with a unique id
  2. A complete Chart.js new Chart() call
  3. Data loaded via vibeLoadData() — if empty, show an empty state message inside the chart container
  4. Charts must read primary color from getComputedStyle(document.documentElement).getPropertyValue('--primary') at runtime. Secondary: #00B4D8
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
  NEVER use hardcoded chart data. NEVER define SAMPLE_DATA arrays. Even when no explicit table name is in context, infer the table name from the domain and use vibeLoadData(). If vibeLoadData returns [], show an empty state with a message "No data yet. Connect your data source to populate this dashboard."
- For hidden sections (display:none), wrap the chart init in setTimeout(()=>{...}, 100) so Chart.js can measure canvas size when switchView reveals it.
- If a chart section is planned, the chart code is mandatory — placeholder text without chart code fails the quality gate.
- NEVER create a <canvas> without a corresponding new Chart() call in a <script> immediately after it.
- ALL chart/table/KPI data MUST use vibeLoadData(). Include the Supabase credentials script in <head> and vibeLoadData() before </body>. Use await vibeLoadData('table_name') inside an async IIFE to populate charts and tables. Show loading skeletons while data loads. If vibeLoadData returns [], render an empty state container — NEVER fall back to hardcoded data.
DATA TABLE:
- Domain-relevant columns (sales: Company / Contact / Stage / Value / Close Date)
- Rows populated via vibeLoadData(), no hardcoded rows, no lorem ipsum
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
  * Any other nav section: Relevant charts, tables, and KPI cards populated via vibeLoadData(). Show empty state if no data.
- CRITICAL: Sections hidden with display:none cause Chart.js to render at 0px size. The switchView function above calls chart.resize() to fix this. Additionally, wrap each hidden section's inline chart <script> in setTimeout(()=>{...}, 100) so the chart initializes after the DOM is ready. The chart.resize() in switchView will then correct the size when the section becomes visible.
DATA SOURCE UI:
- Supabase in prompt: show "Connect Supabase" button that opens a modal
- CSV/Excel in prompt: show file upload input with FileReader parsing
- API in prompt: show endpoint input + Fetch button with loading state
- Default: empty state + "Upload Data" button
VALIDATOR REQUIREMENTS — must pass on first generation, no repair needed:
- <nav> element present
- <h1> present
- Minimum 2 <section> elements
- <title> set to descriptive dashboard name
- <meta name="description"> set
- At least one button containing: Export, Connect, Upload, Get, or Start
- Zero lorem ipsum in any field
- Navigation links must use JavaScript onclick handlers to show/hide sections within the same page — never use href links to separate .html files. All content must exist in a single HTML file with sections toggled by JS.
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">
<script>window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";<\/script>
Placeholders are replaced at deploy time. In all other JS, use window.__VIBE_SUPABASE_URL__ and window.__VIBE_SUPABASE_ANON_KEY__ (see Rule 15).

Start <style> with the :root block from the PRE-BUILT COLOR BLOCK injected below. Use var(--bg), var(--primary), var(--surface) throughout. Zero hardcoded color values.

REQUIRED LAYOUT:
<body>
<div style="display:flex;height:100vh;overflow:hidden;">
  <aside id="sidebar" style="width:240px;min-width:240px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;">
    <div style="padding:1.5rem 1rem;border-bottom:1px solid var(--border);"><h1 style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;color:var(--primary);">APP NAME</h1></div>
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

// ── Dashboard chart enforcement (appended to user message, not system) ──
function isDashboardPrompt(prompt: string): boolean {
  const signals = ['dashboard', 'pipeline', 'kpi', 'metrics',
    'analytics', 'chart', 'revenue', 'performance', 'tracking',
    'overview', 'report'];
  const lower = prompt.toLowerCase();
  return signals.some(s => lower.includes(s));
}

const CHART_ENFORCEMENT = `

MANDATORY CHART REQUIREMENT:
This dashboard MUST include Chart.js charts. Do NOT skip charts.
ALL chart data MUST come from vibeLoadData(). NEVER generate hardcoded data arrays.

STEP 1: Include this script tag in <head>:
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

STEP 2: Load data via vibeLoadData(). Infer the table name from the
user's domain: sales/GTM→'gtm_deals', finance→'budget_allocations',
marketing→'campaigns', contacts→'contacts'. Always filter by
{team_id: window.__VIBE_TEAM_ID__}.

STEP 3: Include AT LEAST 3 Chart.js charts. Choose chart types that
best fit the data:
- Bar or horizontal bar for comparisons (value by category)
- Line for trends over time (monthly, weekly)
- Doughnut or pie for distribution (deals by stage, spend by channel)

Each chart MUST follow this exact pattern:
<canvas id="uniqueChartId" style="max-height:300px"></canvas>
<script>
(async function(){
  const rows = await vibeLoadData('table_name', {team_id: window.__VIBE_TEAM_ID__});
  if(!rows.length){
    document.getElementById('uniqueChartId').parentElement.innerHTML =
      '<div data-empty-state style="display:flex;align-items:center;justify-content:center;min-height:200px;color:var(--text);opacity:0.6;">No data yet. Connect your data source to populate this dashboard.</div>';
    return;
  }
  new Chart(document.getElementById('uniqueChartId').getContext('2d'), {
    type: 'bar',
    data: { labels: rows.map(r=>r.name), datasets: [{ label: '...', data: rows.map(r=>r.value), ... }] },
    options: { responsive: true, plugins: { tooltip: { enabled: true } } }
  });
})();
</script>

EVERY canvas MUST have a unique id.
NEVER use ES module imports. Use the global Chart object from CDN.
NEVER define SAMPLE_DATA. NEVER invent metrics or placeholder numbers.

STEP 4: Include 4-6 KPI cards. Populate values from vibeLoadData() rows.
If no data, show "--" as the value with the label still visible.

STEP 5: All date range buttons (7D/30D/90D/1Y/ALL) must re-query
vibeLoadData with appropriate date filters and update the charts.

EMPTY STATE RULE: If vibeLoadData returns [], show an empty state
inside each chart/table/KPI container with the message:
"No data yet. Connect your data source to populate this dashboard."
Include a "Connect Data Source" button that calls vibePrompt('Connect my data source').
NEVER generate hardcoded data arrays as a fallback.
`;

// ── Landing page content enforcement (appended to user message, not system) ──
function isLandingPagePrompt(prompt: string): boolean {
  const signals = ['landing page', 'landing', 'webinar', 'signup',
    'registration', 'conversion', 'lead gen', 'launch', 'waitlist',
    'coming soon', 'event page', 'promo'];
  const lower = prompt.toLowerCase();
  return signals.some(s => lower.includes(s));
}

const LANDING_PAGE_ENFORCEMENT = `

MANDATORY LANDING PAGE CONTENT:
This is a landing page. It MUST have visible, readable content.
Do NOT generate empty sections or blank hero areas.

REQUIRED SECTIONS (generate ALL with real content):

1. HERO SECTION:
   - Large headline (text-3xl or bigger, white text on gradient)
   - Subheadline (text-lg, slightly transparent white)
   - Primary CTA button (prominent, contrasting color)
   - Optional: hero image, video embed, or animated element
   The hero MUST have visible text content. Not just a gradient background.

2. REGISTRATION/SIGNUP FORM (if event or webinar):
   - Name, Email, Company fields minimum
   - Submit button with clear action text ("Register Now", "Save My Spot")
   - Form must call vibeSubmitForm() on submit
   - Brief value prop next to form ("Join 500+ leaders...")

3. ABOUT/VALUE SECTION:
   - 3-4 benefit cards or feature highlights
   - Each card: icon or emoji, title, 1-2 sentence description
   - Use a grid layout (2x2 or 3-column)

4. SPEAKERS/TEAM SECTION (if event or webinar):
   - 3-4 speaker cards with: name, title, company, brief bio
   - Use placeholder avatar circles with initials
   - Generate realistic speaker names and titles

5. AGENDA/SCHEDULE (if event or webinar):
   - 4-6 time slots with session titles and descriptions
   - Format: time | session title | speaker name
   - Generate realistic agenda items related to the topic

6. SOCIAL PROOF:
   - 3 testimonial quotes or company logos
   - "Trusted by teams at..." with 4-5 company names

7. FINAL CTA:
   - Repeat the primary call to action
   - Urgency element ("Limited spots", "Register by [date]")

8. FOOTER:
   - Company name, links, copyright

VISUAL RULES:
- Hero gradient must have TEXT on top of it, not just color
- All text must be readable (white on dark gradient, dark on light bg)
- Sections alternate background colors for visual rhythm
- Mobile responsive — stack columns on small screens
- Smooth scroll to sections from nav links

Generate ALL content based on the user's topic. If they said "Q3 webinar
about AI", generate AI-related headlines, speaker bios about AI leaders,
agenda items about AI implementation, etc. Make it feel real and specific.

Do NOT leave any section empty. Do NOT use placeholder text like
"Lorem ipsum" or "[Your content here]".
`;

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
      model: "gpt-4o",
      max_tokens: Math.min(maxTokens, 16384),
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

/** Call Google Gemini and return { diff, usage }. Throws on failure. */
async function callGemini(systemMsg: string, prompt: string, maxTokens = 4096, systemPrefix?: string) {
  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_API_KEY not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrefix
            ? `${systemPrefix}\n\n---\n\n${systemMsg}`
            : systemMsg }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message ?? JSON.stringify(data));
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const usageMeta = data.usageMetadata;

  return {
    diff: text,
    usage: {
      input_tokens: usageMeta?.promptTokenCount ?? 0,
      output_tokens: usageMeta?.candidatesTokenCount ?? 0,
      total_tokens: (usageMeta?.promptTokenCount ?? 0) + (usageMeta?.candidatesTokenCount ?? 0),
    },
  };
}

/** Call DeepSeek directly via DeepSeek API and return { diff, usage }. Throws on failure. */
async function callDeepseek(systemMsg: string, prompt: string, maxTokens = 4096) {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: Math.min(maxTokens, 16384),
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

/** Call DeepSeek V3 via Fireworks AI and return { diff, usage }. Throws on failure. */
async function callFireworks(systemMsg: string, prompt: string, maxTokens = 4096) {
  const apiKey = Deno.env.get("FIREWORKS_API_KEY");
  if (!apiKey) throw new Error("FIREWORKS_API_KEY not configured");

  const res = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "accounts/fireworks/models/deepseek-v3",
      max_tokens: Math.min(maxTokens, 16384),
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

// ── Provider registry & failover chain ───────────────────────────────

type ProviderFn = (s: string, p: string, m?: number) => Promise<{ diff: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number } }>;

const PROVIDERS: Record<string, ProviderFn> = {
  claude: callClaude,
  gpt: callGpt,
  gemini: callGemini,
  deepseek: callDeepseek,
  fireworks: callFireworks,
};

/** Context window limits per provider (input tokens). Used to skip providers that can't fit the request. */
const PROVIDER_CONTEXT_LIMITS: Record<string, number> = {
  claude: 200_000,
  gpt: 128_000,
  gemini: 1_000_000,
  deepseek: 64_000,
  fireworks: 128_000,
};

/** Ordered failover chains. Primary pipeline cascades through all providers. */
const FAILOVER_CHAIN: Record<string, string[]> = {
  claude: ["gpt", "deepseek", "gemini", "fireworks"],
  gpt: ["deepseek", "claude", "gemini", "fireworks"],
  gemini: ["deepseek", "claude", "gpt", "fireworks"],
  deepseek: ["gpt", "gemini", "claude", "fireworks"],
  fireworks: ["deepseek", "claude", "gpt", "gemini"],
};

/** Rough token estimate (~3.5 chars per token, conservative). */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/** Check if a provider can fit the estimated request size. */
function fitsProvider(provider: string, estimatedTokens: number): boolean {
  const limit = PROVIDER_CONTEXT_LIMITS[provider];
  return limit ? estimatedTokens < limit * 0.9 : true; // 90% safety margin
}

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
    let { prompt, context, model = "deepseek", system, max_tokens, mode, color_block, team_name, org_name, inject_supabase_helpers, system_prefix } = await req.json() as { prompt: string; context?: string; model?: string; system?: string; max_tokens?: number; mode?: string; color_block?: string; team_name?: string; org_name?: string; inject_supabase_helpers?: boolean; system_prefix?: string };
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

    // Build system message: select prompt based on mode, always prepend vibeRules
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
Navigation links must use JavaScript onclick handlers to show/hide sections within the same page — never use href links to separate .html files.
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
- Include at least 4 KPI stat cards populated via vibeLoadData — show "--" if no data
- Include at least 2 Chart.js charts (bar, line, doughnut, or pie) — show empty state message if vibeLoadData returns []
- Each chart canvas must have a unique id (e.g. id="chart1", id="chart2")
- Include a data table with relevant columns for the domain, populated via vibeLoadData — show "No data yet" row if empty
- NEVER define const SAMPLE_DATA or any hardcoded data arrays — all data comes from vibeLoadData()
- Detect the domain from the user prompt and use contextually relevant metrics
- Never use alert(), confirm(), or prompt()
- Never generate React or JSX
- Output ONLY valid HTML starting with <!DOCTYPE html>` + (context ? "\nContext:\n" + context : "");
      defaultMaxTokens = 16384;

      // SAMPLE DATA OVERRIDE: when no real data source is connected,
      // allow the LLM to hardcode realistic sample data so charts render
      const isSampleData = /\bsample data\b/i.test(prompt) || /\[Data source: sample data\]/i.test(prompt);
      if (isSampleData) {
        baseSystemMsg += `

SAMPLE DATA MODE — OVERRIDES "no hardcoded data" rules above:
This user has NO connected data sources and chose to build with sample data.
You MUST generate realistic, domain-appropriate hardcoded data arrays for ALL charts, KPIs, and tables.
Do NOT use vibeLoadData(). Do NOT show empty states. Do NOT show "No data yet" messages.
Instead, define const SAMPLE_DATA arrays with 10-20 realistic rows and use them to populate every chart, KPI card, and table.
Make the data look real: use plausible names, dates, amounts, percentages, and statuses for the domain.
The dashboard must look fully populated and impressive on first load.`;
      }
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
    // Supabase helpers injected when API signals via structured flag (or legacy marker fallback)
    let supabaseBlock = "";
    if (inject_supabase_helpers) {
      supabaseBlock = "\n" + SUPABASE_HELPERS;
    } else if (prompt.includes('__INJECT_SUPABASE_HELPERS__')) {
      // Legacy fallback: strip marker from prompt if still present
      supabaseBlock = "\n" + SUPABASE_HELPERS;
      prompt = prompt.replace('__INJECT_SUPABASE_HELPERS__', '');
    }
    const vibeRules = buildVibeSystemRules(team_name, org_name);
    const prefixBlock = system_prefix ? system_prefix + "\n\n---\n\n" : "";
    const systemMsg = prefixBlock + vibeRules + "\n" + baseSystemMsg + colorInjection + supabaseBlock;
    const resolvedMaxTokens = max_tokens || defaultMaxTokens;

    // Log token budget usage for monitoring (1 token ≈ 4 chars)
    const estSystemTokens = Math.ceil(systemMsg.length / 4);
    const estPromptTokens = Math.ceil(prompt.length / 4);
    console.log(`[token-budget] mode=${mode || 'diff'} model=${model} system≈${estSystemTokens}tok prompt≈${estPromptTokens}tok total≈${estSystemTokens + estPromptTokens}tok maxOutput=${resolvedMaxTokens}`);

    // Append content enforcement to user message based on intent
    const isSampleDataPrompt = /\bsample data\b/i.test(prompt) || /\[Data source: sample data\]/i.test(prompt);
    if (isDashboardPrompt(prompt) && mode !== "dashboard") {
      // Only append CHART_ENFORCEMENT for non-dashboard modes (e.g. page/html)
      // Dashboard mode already has comprehensive chart instructions in DASHBOARD_SYSTEM;
      // appending CHART_ENFORCEMENT would contradict its data-sourcing rules.
      if (isSampleDataPrompt) {
        // Override: use hardcoded sample data instead of vibeLoadData
        prompt = prompt + `

MANDATORY CHART REQUIREMENT:
This dashboard MUST include Chart.js charts with REALISTIC HARDCODED SAMPLE DATA.
The user has no connected data source. Do NOT use vibeLoadData(). Do NOT show empty states.
Generate const SAMPLE_DATA arrays with 10-20 realistic domain-appropriate rows.
Use these arrays to populate ALL Chart.js charts, KPI cards, and data tables.
Include at least 3 charts (bar, line, doughnut) and 4-6 KPI cards — all fully populated.`;
      } else {
        prompt = prompt + CHART_ENFORCEMENT;
      }
    } else if (isLandingPagePrompt(prompt)) {
      prompt = prompt + LANDING_PAGE_ENFORCEMENT;
    }

    // ── Multi-provider failover (see docs/llm-redundancy-plan.md) ──────
    // Try requested model first, then cascade through failover chain.
    // Skip providers whose context window can't fit the request.
    // Failover is PRE-stream only — no mid-stream provider switches.
    let result: { diff: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number } };
    let fallbackUsed = false;
    let originalModel = model;
    let usedModel = model;

    const estimatedTokenCount = estimateTokens(systemMsg + prompt);
    const chain = FAILOVER_CHAIN[model] || ["gpt", "gemini", "fireworks"];
    const errors: string[] = [];

    // Try primary provider first (with 1 retry)
    if (PROVIDERS[model] && fitsProvider(model, estimatedTokenCount)) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          result = await PROVIDERS[model](systemMsg, prompt, resolvedMaxTokens);
          break;
        } catch (err) {
          const msg = `${model} attempt ${attempt + 1}: ${err.message}`;
          errors.push(msg);
          console.warn(`[LLM Failover] ${msg}`);
          // On rate limit, skip retry and go to fallback immediately
          if (err.message?.includes("429") || err.message?.includes("529")) break;
        }
      }
    } else if (!fitsProvider(model, estimatedTokenCount)) {
      errors.push(`${model}: request (~${estimatedTokenCount} tokens) exceeds context window`);
    }

    // If primary failed, cascade through fallback chain
    if (!result) {
      for (const fallback of chain) {
        if (!PROVIDERS[fallback]) continue;
        if (!fitsProvider(fallback, estimatedTokenCount)) {
          errors.push(`${fallback}: request exceeds context window (${PROVIDER_CONTEXT_LIMITS[fallback]})`);
          continue;
        }

        try {
          result = await PROVIDERS[fallback](systemMsg, prompt, resolvedMaxTokens);
          fallbackUsed = true;
          usedModel = fallback;
          console.warn(`[LLM Failover] Succeeded on fallback provider: ${fallback}`);
          break;
        } catch (err) {
          const msg = `${fallback}: ${err.message}`;
          errors.push(msg);
          console.warn(`[LLM Failover] ${msg}`);
        }
      }
    }

    if (!result) {
      throw new Error(`All LLM providers failed. ${errors.join(" | ")}`);
    }

    // JSON validation for plan mode (structured output)
    if (mode === "plan" && result.diff) {
      try {
        JSON.parse(result.diff);
      } catch {
        // Try to extract JSON from the response
        const jsonMatch = result.diff.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[1]);
            result.diff = jsonMatch[1];
          } catch {
            // If still invalid and we haven't exhausted retries, this is caught by the caller
            console.warn("[LLM Failover] Plan mode returned invalid JSON, passing through for caller to handle");
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        diff: result.diff,
        usage: result.usage,
        model: usedModel,
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
