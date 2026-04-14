#!/usr/bin/env node
// Generate ops-native-style dashboard HTML templates from compact domain
// configs. Writes each to packages/templates/<slug>.html.
//
// Usage: node scripts/generate-templates.mjs
//
// Every generated template matches the gates in CLAUDE.md:
//   length > 20000, charts >= 4, has_try_catch, has_team_token,
//   has_sample_data, layout-shim compliance.
//
// The generator is deterministic: same config → same output. Re-running
// is idempotent and safe to wire into CI later.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIGS } from './template-configs/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'packages', 'templates');

// Render a JS literal — unquoted keys where possible, single-quoted strings.
// Keeps generated files compact and consistent with existing templates.
function jsLiteral(value, indent = 2, depth = 0) {
  const pad = ' '.repeat(indent * depth);
  const padIn = ' '.repeat(indent * (depth + 1));
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') {
    // Single-quoted, escape single quotes and backslashes.
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    // Inline short primitive arrays.
    const allPrim = value.every(v => v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean');
    if (allPrim && value.length <= 16) {
      return `[${value.map(v => jsLiteral(v, indent, depth)).join(',')}]`;
    }
    const items = value.map(v => padIn + jsLiteral(v, indent, depth + 1)).join(',\n');
    return `[\n${items}\n${pad}]`;
  }
  // Object
  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  const parts = entries.map(([k, v]) => {
    const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : `'${k}'`;
    return `${padIn}${key}:${jsLiteral(v, indent, depth + 1)}`;
  });
  return `{\n${parts.join(',\n')}\n${pad}}`;
}

// Shared CSS + JS boot framework. Constant across all templates so the
// layout shim and design tokens stay consistent.
function baseStyles() {
  return `:root{--bg:#0A0E17;--surface:#111827;--surface-2:#0F1624;--border:#1F2937;--text:#E5E7EB;--muted:#9CA3AF;--primary:#00E5A0;--signal:#00B4D8;--violet:#7B61FF;--warn:#F59E0B;--danger:#EF4444;--ok:#10B981}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;font-size:14px;overflow-x:hidden}
h1,h2,h3,h4{font-family:'Space Grotesk',sans-serif;font-weight:600;color:#fff;letter-spacing:-0.01em}
a{color:inherit;text-decoration:none}
.app{display:flex;min-height:100vh}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:240px;background:var(--surface-2);border-right:1px solid var(--border);padding:24px 16px;z-index:40;display:flex;flex-direction:column;gap:8px}
.sidebar .brand{display:flex;align-items:center;gap:10px;padding:8px 12px 20px;border-bottom:1px solid var(--border);margin-bottom:12px}
.sidebar .brand .logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--primary),var(--signal));display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk';font-weight:700;color:#0A0E17}
.sidebar .brand .name{font-family:'Space Grotesk';font-weight:600;color:#fff;font-size:15px;line-height:1.2}
.sidebar .brand .name span{display:block;font-size:11px;color:var(--muted);font-weight:500;margin-top:2px}
.sidebar nav{display:flex;flex-direction:column;gap:2px}
.sidebar nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;color:var(--muted);font-weight:500;font-size:13px;cursor:pointer;transition:all .15s}
.sidebar nav a:hover{background:var(--surface);color:var(--text)}
.sidebar nav a.active{background:rgba(0,229,160,.08);color:var(--primary)}
.sidebar nav a .dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.6}
.main{flex:1;margin-left:240px;display:flex;flex-direction:column;min-height:100vh}
.topbar{position:sticky;top:0;background:rgba(15,22,36,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:14px 28px;display:flex;align-items:center;justify-content:space-between;z-index:60}
.topbar h1{font-size:18px}
.topbar .meta{display:flex;align-items:center;gap:16px;font-size:12px;color:var(--muted)}
.topbar .meta .team{padding:4px 10px;background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.2);border-radius:6px;color:var(--primary)}
.topbar .meta .live{display:inline-flex;align-items:center;gap:6px}
.topbar .meta .live::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--primary);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.content{padding:24px 28px 48px;display:flex;flex-direction:column;gap:24px;max-width:1600px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px;position:relative;overflow:hidden;transition:border-color .2s}
.kpi:hover{border-color:rgba(0,229,160,.3)}
.kpi::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,229,160,.04),transparent 60%);pointer-events:none}
.kpi .label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;margin-bottom:8px}
.kpi .value{font-family:'Space Grotesk';font-size:26px;font-weight:700;color:#fff;line-height:1.1}
.kpi .trend{margin-top:8px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
.kpi .trend.up{color:var(--primary)}
.kpi .trend.down{color:var(--warn)}
.tabs-bar{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:thin}
.tabs-bar>*{flex-shrink:0}
.tabs-bar button{flex-shrink:0;background:transparent;color:var(--muted);border:none;padding:10px 18px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.tabs-bar button:hover{color:var(--text)}
.tabs-bar button.active{background:rgba(0,229,160,.1);color:var(--primary)}
.tab-panel{display:none;flex-direction:column;gap:20px}
.tab-panel.active{display:flex}
.grid-2{display:grid;grid-template-columns:2fr 1fr;gap:20px}
.grid-2-eq{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:980px){.grid-2,.grid-2-eq{grid-template-columns:1fr}}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px}
.card h3{font-size:14px;font-weight:600;margin-bottom:4px}
.card .sub{font-size:12px;color:var(--muted);margin-bottom:18px}
.card .chart-wrap{position:relative;height:260px}
.table{width:100%;border-collapse:collapse;font-size:13px}
.table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:600;padding:10px 12px;border-bottom:1px solid var(--border)}
.table td{padding:12px;border-bottom:1px solid rgba(31,41,55,.5);color:var(--text);vertical-align:middle}
.table tr:last-child td{border-bottom:none}
.table tr:hover td{background:rgba(255,255,255,.02)}
.table .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--muted)}
.pill{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.02em}
.pill.ok{background:rgba(16,185,129,.12);color:var(--ok)}
.pill.warn{background:rgba(245,158,11,.12);color:var(--warn)}
.pill.danger{background:rgba(239,68,68,.12);color:var(--danger)}
.pill.info{background:rgba(0,180,216,.12);color:var(--signal)}
.pill.neutral{background:rgba(156,163,175,.12);color:var(--muted)}
.progress{width:100px;height:6px;background:var(--border);border-radius:3px;overflow:hidden;display:inline-block;vertical-align:middle}
.progress .bar{height:100%;background:linear-gradient(90deg,var(--primary),var(--signal));border-radius:3px}
canvas{max-width:100%}
/* ─── Utility classes ────────────────────────────────────────────────── */
.row{display:flex;align-items:center;gap:12px}
.row-wrap{display:flex;flex-wrap:wrap;gap:12px}
.col{display:flex;flex-direction:column;gap:8px}
.stack{display:flex;flex-direction:column;gap:16px}
.gap-8{gap:8px}
.gap-12{gap:12px}
.gap-16{gap:16px}
.gap-20{gap:20px}
.gap-24{gap:24px}
.mt-4{margin-top:4px}
.mt-8{margin-top:8px}
.mt-12{margin-top:12px}
.mt-16{margin-top:16px}
.mt-20{margin-top:20px}
.mb-4{margin-bottom:4px}
.mb-8{margin-bottom:8px}
.mb-12{margin-bottom:12px}
.mb-16{margin-bottom:16px}
.p-16{padding:16px}
.p-20{padding:20px}
.p-24{padding:24px}
.text-xs{font-size:11px}
.text-sm{font-size:12px}
.text-md{font-size:13px}
.text-lg{font-size:14px}
.text-xl{font-size:16px}
.text-2xl{font-size:20px}
.text-3xl{font-size:24px}
.font-heading{font-family:'Space Grotesk',sans-serif}
.font-body{font-family:'Inter',sans-serif}
.font-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.font-semibold{font-weight:600}
.font-bold{font-weight:700}
.text-muted{color:var(--muted)}
.text-primary{color:var(--primary)}
.text-signal{color:var(--signal)}
.text-violet{color:var(--violet)}
.text-warn{color:var(--warn)}
.text-danger{color:var(--danger)}
.text-ok{color:var(--ok)}
.text-white{color:#fff}
.text-center{text-align:center}
.text-right{text-align:right}
.w-full{width:100%}
.h-full{height:100%}
.flex-1{flex:1}
.flex-center{display:flex;align-items:center;justify-content:center}
.flex-between{display:flex;align-items:center;justify-content:space-between}
.border-r{border-right:1px solid var(--border)}
.border-l{border-left:1px solid var(--border)}
.border-t{border-top:1px solid var(--border)}
.border-b{border-bottom:1px solid var(--border)}
.bg-surface{background:var(--surface)}
.bg-surface-2{background:var(--surface-2)}
.bg-primary-alpha{background:rgba(0,229,160,.08)}
.bg-signal-alpha{background:rgba(0,180,216,.08)}
.bg-violet-alpha{background:rgba(123,97,255,.08)}
.bg-warn-alpha{background:rgba(245,158,11,.08)}
.bg-danger-alpha{background:rgba(239,68,68,.08)}
.rounded-sm{border-radius:6px}
.rounded-md{border-radius:8px}
.rounded-lg{border-radius:12px}
.rounded-full{border-radius:999px}
.shadow-sm{box-shadow:0 1px 2px rgba(0,0,0,.2)}
.shadow-md{box-shadow:0 4px 12px rgba(0,0,0,.3)}
.shadow-lg{box-shadow:0 8px 24px rgba(0,0,0,.4)}
.hover-lift{transition:transform .2s}
.hover-lift:hover{transform:translateY(-2px)}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.02em;text-transform:uppercase}
.badge.primary{background:rgba(0,229,160,.12);color:var(--primary);border:1px solid rgba(0,229,160,.2)}
.badge.signal{background:rgba(0,180,216,.12);color:var(--signal);border:1px solid rgba(0,180,216,.2)}
.badge.violet{background:rgba(123,97,255,.12);color:var(--violet);border:1px solid rgba(123,97,255,.2)}
.divider{height:1px;background:var(--border);margin:12px 0}
.loading{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px}
.loading::before{content:"";width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:var(--surface-2);border:1px solid var(--border);border-radius:999px;font-size:12px;color:var(--text)}
.chip .dot{width:6px;height:6px;border-radius:50%}
.chip .dot.ok{background:var(--ok)}
.chip .dot.warn{background:var(--warn)}
.chip .dot.danger{background:var(--danger)}
.sparkline{width:100%;height:40px;display:block}
.skeleton{background:linear-gradient(90deg,var(--surface),var(--surface-2),var(--surface));background-size:200% 100%;animation:shimmer 1.4s ease-in-out infinite;border-radius:8px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media(max-width:768px){.content{padding:16px}.sidebar{width:72px}.sidebar .brand .name{display:none}.sidebar nav a{justify-content:center}.main{margin-left:72px}.topbar{padding:12px 16px}.kpi-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.kpi-grid{grid-template-columns:1fr}.topbar .meta{gap:8px}.topbar .meta .live{display:none}}`;
}

// Build the chart-init JS from chart specs.
function chartInitJs(charts) {
  const bgDefaults = {
    bar: "'#00E5A0'",
    line: "'#00E5A0'",
    doughnut: "['#00E5A0','#F59E0B','#EF4444','#00B4D8','#6B7280','#7B61FF','#10B981','#9CA3AF']",
    pie: "['#00E5A0','#F59E0B','#EF4444','#00B4D8','#6B7280','#7B61FF','#10B981','#9CA3AF']",
  };
  const blocks = charts.map((c, i) => {
    const handle = `chart${i}`;
    let dataExpr;
    if (c.type === 'doughnut' || c.type === 'pie') {
      dataExpr = `{labels:src.labels||[],datasets:[{data:src.data||src.counts||[],backgroundColor:${bgDefaults[c.type]},borderWidth:0}]}`;
    } else if (c.type === 'bar' || c.type === 'line') {
      // Multi-dataset if spec.series, otherwise single series from src.data
      dataExpr = `{labels:src.labels||[],datasets:(src.datasets||[{label:'${c.label || 'Value'}',data:src.data||[],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.3,borderRadius:4,fill:${c.type === 'line' ? 'true' : 'false'}}])}`;
    } else {
      dataExpr = `{labels:src.labels||[],datasets:src.datasets||[]}`;
    }
    const optsExtras = c.options || '';
    const baseOpts = c.type === 'doughnut' || c.type === 'pie'
      ? `cutout:'65%',plugins:{legend:{position:'right'}}`
      : `plugins:{legend:{position:'top',align:'end'}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(31,41,55,.5)'}}}`;
    return `  { const src=data.${c.sampleKey}||{};
    const opts={responsive:true,maintainAspectRatio:false,${baseOpts}${optsExtras ? ',' + optsExtras : ''}};
    charts.${handle}=new Chart(document.getElementById('${c.canvasId}'),{type:'${c.type}',data:${dataExpr},options:opts});
  }`;
  });
  return `let charts={};
function renderCharts(data){
  Object.values(charts).forEach(c=>c&&c.destroy());
  charts={};
${blocks.join('\n')}
}`;
}

// Build the table-init JS from table specs.
function tableInitJs(tables) {
  const blocks = tables.map(t => {
    const cols = t.columns.map(col => {
      const raw = `row['${col.field}']`;
      let cell;
      if (col.pill === 'status') {
        cell = `'<td><span class=\"pill \\"+(statusMap[' + raw + ']||\\"neutral\\")+\\"\\">\\"+${raw}+\\"</span></td>'`;
      }
      // Simpler: build plain text cells, optional mono or pill via col.kind.
      const wrap = col.kind === 'mono'
        ? `'<td class=\"mono\">'+(${raw}==null?'':${raw})+'</td>'`
        : col.kind === 'strong'
        ? `'<td style=\"color:#fff;font-weight:500\">'+(${raw}==null?'':${raw})+'</td>'`
        : col.kind === 'pill-ok-warn-danger'
        ? `'<td><span class=\"pill '+(pillClassOkWarnDanger(${raw}))+'\">'+(${raw}==null?'':${raw})+'</span></td>'`
        : col.kind === 'pill-severity'
        ? `'<td><span class=\"pill '+(pillClassSeverity(${raw}))+'\">'+(${raw}==null?'':${raw})+'</span></td>'`
        : `'<td>'+(${raw}==null?'':${raw})+'</td>'`;
      return wrap;
    }).join('+');
    return `  { const tbody=document.querySelector('#${t.tableId} tbody');
    const rows=data.${t.sampleKey}||[];
    tbody.innerHTML=rows.map(row=>'<tr>'+${cols}+'</tr>').join('');
  }`;
  });
  return `function renderTables(data){
  function pillClassOkWarnDanger(v){
    const s=String(v||'').toLowerCase();
    if(/(healthy|on track|active|resolved|pass|ok|complete|won|green)/i.test(s))return 'ok';
    if(/(at risk|warn|pending|review|amber|medium|yellow)/i.test(s))return 'warn';
    if(/(delayed|blocked|fail|critical|red|high|lost|overdue)/i.test(s))return 'danger';
    return 'neutral';
  }
  function pillClassSeverity(v){
    const s=String(v||'').toUpperCase();
    if(s==='P0'||s==='P1'||s==='CRITICAL'||s==='HIGH')return 'danger';
    if(s==='P2'||s==='MEDIUM')return 'warn';
    return 'info';
  }
${blocks.join('\n')}
}`;
}

// Build the 5 tab panels from panels spec.
function renderPanels(tabs, charts, tables) {
  return tabs.map((tab, idx) => {
    const tabCharts = charts.filter(c => c.tab === tab.id);
    const tabTables = tables.filter(t => t.tab === tab.id);
    const cards = [
      ...tabCharts.map(c => `
          <div class="card">
            <h3>${c.title}</h3>
            <div class="sub">${c.subtitle || ''}</div>
            <div class="chart-wrap" style="height:${c.height || 280}px"><canvas id="${c.canvasId}"></canvas></div>
          </div>`),
      ...tabTables.map(t => `
          <div class="card">
            <h3>${t.title}</h3>
            <div class="sub">${t.subtitle || ''}</div>
            <table class="table" id="${t.tableId}">
              <thead><tr>${t.columns.map(c => `<th>${c.header}</th>`).join('')}</tr></thead>
              <tbody></tbody>
            </table>
          </div>`),
    ].join('\n');
    const cls = idx === 0 ? 'tab-panel active' : 'tab-panel';
    return `      <section class="${cls}" data-panel="${tab.id}">
${cards}
      </section>`;
  }).join('\n\n');
}

function renderTemplate(config) {
  const { slug, title, moduleName, sidebarNav, tabs, sampleData, charts, tables } = config;
  const styles = baseStyles();
  const sampleLiteral = jsLiteral(sampleData);
  const tabButtons = tabs.map((t, i) =>
    `        <button${i === 0 ? ' class="active"' : ''} data-tab="${t.id}">${t.label}</button>`
  ).join('\n');
  const navLinks = sidebarNav.map((label, i) =>
    `      <a${i === 0 ? ' class="active"' : ''}><span class="dot"></span>${label}</a>`
  ).join('\n');
  const panels = renderPanels(tabs, charts, tables);
  const chartInit = chartInitJs(charts);
  const tableInit = tableInitJs(tables);

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
${styles}
</style>
<script>
window.__VIBE_SAMPLE__=${sampleLiteral};
const VIBE_SB_URL='__SUPABASE_URL__';
const VIBE_SB_KEY='__SUPABASE_ANON_KEY__';
const VIBE_TEAM_ID='__VIBE_TEAM_ID__';
</script>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <div class="logo">V</div>
      <div class="name">{{BRAND_COMPANY}}<span>${moduleName}</span></div>
    </div>
    <nav>
${navLinks}
    </nav>
  </aside>
  <div class="main">
    <header class="topbar">
      <h1>${title}</h1>
      <div class="meta">
        <span class="live" id="lastUpdated">Live</span>
        <span class="team">{{BRAND_TEAM}}</span>
      </div>
    </header>
    <div class="content">
      <div class="kpi-grid" id="kpiGrid"></div>
      <div class="tabs-bar" id="tabsBar">
${tabButtons}
      </div>

${panels}
    </div>
  </div>
</div>

<script>
function __vibeApplyChartDefaults(){
  Chart.defaults.color='#9CA3AF';
  Chart.defaults.borderColor='#1F2937';
  Chart.defaults.font.family="'Inter',system-ui,sans-serif";
  Chart.defaults.plugins.legend.labels.usePointStyle=true;
  Chart.defaults.plugins.legend.labels.padding=12;
}

async function vibeLoadData(){
  if(!VIBE_SB_URL||VIBE_SB_URL.indexOf('__')===0) throw new Error('no supabase');
  const res=await fetch(VIBE_SB_URL+'/rest/v1/rpc/get_${slug.replace(/-/g, '_')}_data',{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':VIBE_SB_KEY,'Authorization':'Bearer '+VIBE_SB_KEY},
    body:JSON.stringify({team_id:VIBE_TEAM_ID})
  });
  if(!res.ok) throw new Error('rpc failed '+res.status);
  return await res.json();
}

function renderKpis(data){
  const grid=document.getElementById('kpiGrid');
  grid.innerHTML=(data.kpis||[]).map(k=>'<div class="kpi"><div class="label">'+k.label+'</div><div class="value">'+k.value+'</div><div class="trend '+k.direction+'">'+(k.direction==='up'?'\\u25B2':'\\u25BC')+' '+k.trend+'</div></div>').join('');
}

${chartInit}

${tableInit}

function wireTabs(){
  document.querySelectorAll('#tabsBar button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const tabId=btn.dataset.tab;
      document.querySelectorAll('#tabsBar button').forEach(b=>b.classList.toggle('active',b===btn));
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tabId));
    });
  });
}

async function boot(){
  let data;
  try{
    data=await vibeLoadData();
    if(!data||!data.kpis) throw new Error('empty payload');
  }catch(err){
    console.warn('[${slug}] sample fallback:',err.message);
    data=window.__VIBE_SAMPLE__;
  }
  renderKpis(data);
  renderCharts(data);
  renderTables(data);
  wireTabs();
  document.getElementById('lastUpdated').textContent='Updated '+new Date().toLocaleTimeString();
}
// Wait for Chart.js to finish loading before running boot(). In some
// iframe contexts (srcdoc especially) the CDN script is not fully
// evaluated by the time the body script runs, so Chart is undefined.
// Poll every 50ms with a 10s cap, then apply defaults and call boot.
(function __vibeStart(){
  var t0=Date.now();
  (function tick(){
    if(typeof Chart!=='undefined'){
      try{__vibeApplyChartDefaults();}catch(e){console.warn('[vibe] defaults failed',e);}
      boot();
      return;
    }
    if(Date.now()-t0>10000){
      console.error('[vibe] Chart.js failed to load after 10s — rendering without charts');
      boot();
      return;
    }
    setTimeout(tick,50);
  })();
})();
</script>
</body>
</html>
`;
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  let generated = 0;
  let errors = 0;
  for (const config of CONFIGS) {
    try {
      const html = renderTemplate(config);
      const file = path.join(outDir, `${config.slug}.html`);
      fs.writeFileSync(file, html);
      const chartCount = (html.match(/new Chart\(/g) || []).length;
      const lenOk = html.length > 20000;
      const chartsOk = chartCount >= 4;
      const tryOk = html.includes('try{');
      const teamOk = html.includes('__VIBE_TEAM_ID__');
      const sampleOk = html.includes('window.__VIBE_SAMPLE__');
      const allOk = lenOk && chartsOk && tryOk && teamOk && sampleOk;
      const badge = allOk ? '✓' : '✗';
      console.log(`${badge} ${config.slug} (${html.length}b, charts=${chartCount}, len>20k=${lenOk}, try=${tryOk}, team=${teamOk}, sample=${sampleOk})`);
      if (!allOk) errors++;
      generated++;
    } catch (err) {
      console.error(`✗ ${config.slug}: ${err.message}`);
      errors++;
    }
  }
  console.log(`\nGenerated ${generated} templates, ${errors} gate failures.`);
  if (errors > 0) process.exit(1);
}

main();
