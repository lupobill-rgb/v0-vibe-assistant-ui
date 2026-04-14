#!/usr/bin/env node
// One-shot: dump skill_registry.html_skeleton for the 29 templates
// to packages/templates/<skill_name>.html, and generate placeholder
// HTML for any row missing a skeleton.
//
// Usage: node scripts/dump-skeletons.mjs
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env at repo root.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'packages', 'templates');

// Load .env (simple parser — no dotenv dependency)
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv(path.join(repoRoot, '.env.local'));
loadEnv(path.join(repoRoot, '.env'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const TEMPLATES = [
  'operations-dashboard','operations-command-center','abm-dashboard','executive-dashboard',
  'executive-command-dashboard','sales-crm-dashboard','enterprise-onboarding','crm-dashboard',
  'marketing-dashboard','finance-dashboard','pharma-analytics-dashboard','pharma-phase1-dashboard',
  'pharma-phase2-dashboard','pharma-phase3-dashboard','pharma-phase4-dashboard','youth-sports-league-manager',
  'hr-dashboard','legal-dashboard','sprint-dashboard','support-dashboard','portfolio-dashboard',
  'pnl-dashboard','ecommerce-analytics','email-analytics','marketing-performance-dashboard',
  'product-analytics','survey-analytics','build-dashboard','build-dashboard-admin',
];

function titleCase(slug) {
  return slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function placeholderHtml(skillName) {
  const title = titleCase(skillName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — {{BRAND_COMPANY}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
:root{--bg:#0A0E17;--surface:#111827;--surface-2:#0F1624;--border:#1F2937;--text:#E5E7EB;--muted:#9CA3AF;--primary:#00E5A0;--signal:#00B4D8;--violet:#7B61FF}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;font-size:14px;overflow-x:hidden}
h1,h2,h3,h4{font-family:'Space Grotesk',sans-serif;font-weight:600;color:#fff}
.app{display:flex;min-height:100vh}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:240px;background:var(--surface-2);border-right:1px solid var(--border);padding:24px 16px;z-index:40}
.sidebar .brand{display:flex;align-items:center;gap:10px;padding:8px 12px 20px;border-bottom:1px solid var(--border);margin-bottom:12px}
.sidebar .brand .logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--primary),var(--signal));display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk';font-weight:700;color:#0A0E17}
.sidebar .brand .name{font-family:'Space Grotesk';font-weight:600;color:#fff;font-size:15px;line-height:1.2}
.sidebar .brand .name span{display:block;font-size:11px;color:var(--muted);font-weight:500;margin-top:2px}
.main{flex:1;margin-left:240px;display:flex;flex-direction:column;min-height:100vh}
.topbar{position:sticky;top:0;background:rgba(15,22,36,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:14px 28px;display:flex;align-items:center;justify-content:space-between;z-index:60}
.topbar h1{font-size:18px}
.topbar .team{padding:4px 10px;background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.2);border-radius:6px;color:var(--primary);font-size:12px}
.content{padding:24px 28px 48px;display:flex;flex-direction:column;gap:24px}
.tabs-bar{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;overflow-x:auto;flex-wrap:nowrap}
.tabs-bar>*{flex-shrink:0}
.tabs-bar button{flex-shrink:0;background:transparent;color:var(--muted);border:none;padding:10px 18px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.tabs-bar button.active{background:rgba(0,229,160,.1);color:var(--primary)}
.hero{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:48px 40px;text-align:center}
.hero .icon{width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,rgba(0,229,160,.15),rgba(0,180,216,.15));border:1px solid rgba(0,229,160,.3);display:inline-flex;align-items:center;justify-content:center;font-family:'Space Grotesk';font-size:32px;font-weight:700;color:var(--primary);margin-bottom:20px}
.hero h2{font-size:22px;margin-bottom:8px}
.hero p{color:var(--muted);font-size:14px;max-width:480px;margin:0 auto 24px}
.hero .cta{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:linear-gradient(135deg,var(--primary),var(--signal));color:#0A0E17;border:none;border-radius:10px;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer;text-decoration:none}
.sidebar nav{display:flex;flex-direction:column;gap:2px}
.sidebar nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;color:var(--muted);font-weight:500;font-size:13px;cursor:pointer}
.sidebar nav a.active{background:rgba(0,229,160,.08);color:var(--primary)}
.sidebar nav a .dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.6}
</style>
<script>
window.__VIBE_SAMPLE__ = {
  kpis:[],
  metrics:{labels:[],values:[]},
  rows:[]
};
const __SUPABASE_URL__ = '__SUPABASE_URL__';
const __SUPABASE_ANON_KEY__ = '__SUPABASE_ANON_KEY__';
const __VIBE_TEAM_ID__ = '__VIBE_TEAM_ID__';
</script>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <div class="logo">V</div>
      <div class="name">{{BRAND_COMPANY}}<span>${title}</span></div>
    </div>
    <nav>
      <a class="active"><span class="dot"></span>Overview</a>
      <a><span class="dot"></span>Reports</a>
      <a><span class="dot"></span>Settings</a>
    </nav>
  </aside>
  <div class="main">
    <header class="topbar">
      <h1>${title}</h1>
      <div class="team">{{BRAND_TEAM}}</div>
    </header>
    <div class="content">
      <div class="tabs-bar">
        <button class="active" data-tab="overview">Overview</button>
      </div>
      <section class="hero">
        <div class="icon">${title.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
        <h2>Connect your data to get started</h2>
        <p>This dashboard is ready — connect a data source and {{BRAND_COMPANY}} will populate it with live metrics.</p>
        <a class="cta" href="/settings/connectors">Connect a data source →</a>
      </section>
    </div>
  </div>
</div>
<script>
try {
  const data = window.__VIBE_SAMPLE__;
  console.log('[${skillName}] placeholder loaded, sample keys:', Object.keys(data));
} catch (err) {
  console.warn('[${skillName}] placeholder error:', err);
}
</script>
</body>
</html>
`;
}

async function fetchSkeleton(skillName) {
  const url = `${SUPABASE_URL}/rest/v1/skill_registry?skill_name=eq.${encodeURIComponent(skillName)}&select=html_skeleton`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status} for ${skillName}`);
  const rows = await res.json();
  return rows?.[0]?.html_skeleton ?? null;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const dumped = [];
  const generated = [];
  const errors = [];

  for (const name of TEMPLATES) {
    const filePath = path.join(outDir, `${name}.html`);
    try {
      const skeleton = await fetchSkeleton(name);
      if (skeleton && skeleton.length > 0) {
        fs.writeFileSync(filePath, skeleton);
        dumped.push({ name, length: skeleton.length });
      } else {
        fs.writeFileSync(filePath, placeholderHtml(name));
        generated.push(name);
      }
    } catch (err) {
      errors.push({ name, error: err.message });
    }
  }

  console.log(`\nDumped ${dumped.length}:`);
  for (const d of dumped) console.log(`  ${d.name} (${d.length})`);
  console.log(`\nGenerated placeholders ${generated.length}:`);
  for (const g of generated) console.log(`  ${g}`);
  if (errors.length) {
    console.log(`\nErrors ${errors.length}:`);
    for (const e of errors) console.log(`  ${e.name}: ${e.error}`);
  }
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.html'));
  console.log(`\nTotal files in packages/templates: ${files.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
