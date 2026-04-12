-- Marketing Dashboard skeleton: Figma-quality Marketing Performance Dashboard
-- Design benchmark: Linear + Vercel + Stripe aesthetic
-- Nav tabs: Overview | Campaigns | Channels | Lead Funnel | Attribution

UPDATE skill_registry
SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Marketing Performance Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<script>
window.__VIBE_SAMPLE__ = {
  kpis: [
    {id:"pipeline",label:"Pipeline Value",value:"$2.8M",trend:"+18.4%",direction:"up"},
    {id:"mqls",label:"MQLs",value:"342",trend:"+24",direction:"up"},
    {id:"cac",label:"CAC",value:"$1,240",trend:"-$86",direction:"up"},
    {id:"roi",label:"Marketing ROI",value:"312%",trend:"+28%",direction:"up"},
    {id:"cvr",label:"Conversion Rate",value:"3.8%",trend:"+0.4%",direction:"up"},
    {id:"email_ctr",label:"Email CTR",value:"4.2%",trend:"+0.6%",direction:"up"}
  ],
  campaigns: [
    {id:1,name:"Spring Product Launch",channel:"Email",budget:45000,spend:38200,leads:186,cpl:205,roi:342,status:"Active"},
    {id:2,name:"Enterprise ABM Q2",channel:"Paid",budget:82000,spend:64500,leads:94,cpl:686,roi:478,status:"Active"},
    {id:3,name:"SEO Content Blitz",channel:"Organic",budget:28000,spend:22400,leads:312,cpl:72,roi:520,status:"Active"},
    {id:4,name:"LinkedIn Thought Leadership",channel:"Social",budget:35000,spend:31200,leads:128,cpl:244,roi:195,status:"Active"},
    {id:5,name:"Webinar Series - AI Ops",channel:"Events",budget:18000,spend:16800,leads:76,cpl:221,roi:267,status:"Active"},
    {id:6,name:"Google Ads - Brand",channel:"Paid",budget:52000,spend:48900,leads:205,cpl:239,roi:285,status:"Active"},
    {id:7,name:"Customer Referral Program",channel:"Referral",budget:12000,spend:9600,leads:64,cpl:150,roi:680,status:"Active"},
    {id:8,name:"Partner Co-Marketing",channel:"Events",budget:22000,spend:18400,leads:92,cpl:200,roi:310,status:"Active"}
  ],
  funnel: [
    {stage:"Visitors",count:45000,color:"#7B61FF"},
    {stage:"Leads",count:1800,color:"#6366f1"},
    {stage:"MQLs",count:342,color:"#00B4D8"},
    {stage:"SQLs",count:156,color:"#0ea5e9"},
    {stage:"Opportunities",count:89,color:"#00E5A0"},
    {stage:"Customers",count:34,color:"#10b981"}
  ],
  channels: [
    {name:"Paid",value:32,color:"#7B61FF",spend:113400,leads:299,roi:340},
    {name:"Organic",value:28,color:"#00E5A0",spend:22400,leads:312,roi:520},
    {name:"Email",value:22,color:"#00B4D8",spend:38200,leads:186,roi:342},
    {name:"Social",value:12,color:"#f59e0b",spend:31200,leads:128,roi:195},
    {name:"Referral",value:6,color:"#ef4444",spend:9600,leads:64,roi:680}
  ],
  cac: [
    {month:"May 25",cac:1480,ltv:4200},
    {month:"Jun 25",cac:1420,ltv:4350},
    {month:"Jul 25",cac:1510,ltv:4280},
    {month:"Aug 25",cac:1390,ltv:4400},
    {month:"Sep 25",cac:1350,ltv:4520},
    {month:"Oct 25",cac:1410,ltv:4480},
    {month:"Nov 25",cac:1320,ltv:4600},
    {month:"Dec 25",cac:1280,ltv:4750},
    {month:"Jan 26",cac:1360,ltv:4680},
    {month:"Feb 26",cac:1300,ltv:4820},
    {month:"Mar 26",cac:1260,ltv:4900},
    {month:"Apr 26",cac:1240,ltv:4960}
  ],
  content: [
    {id:1,asset:"Ultimate Guide to AI Marketing",type:"Blog",views:12400,conversions:186,cvr:1.5,pipeline:124000},
    {id:2,asset:"ROI Calculator Tool",type:"Interactive",views:8200,conversions:328,cvr:4.0,pipeline:210000},
    {id:3,asset:"State of Marketing 2026",type:"Report",views:6800,conversions:204,cvr:3.0,pipeline:156000},
    {id:4,asset:"Product Demo Video",type:"Video",views:15600,conversions:312,cvr:2.0,pipeline:198000},
    {id:5,asset:"Marketing Automation Webinar",type:"Webinar",views:3200,conversions:192,cvr:6.0,pipeline:144000},
    {id:6,asset:"Customer Success Stories",type:"Case Study",views:4800,conversions:144,cvr:3.0,pipeline:108000},
    {id:7,asset:"Email Templates Library",type:"Resource",views:9400,conversions:282,cvr:3.0,pipeline:96000},
    {id:8,asset:"Competitive Analysis Framework",type:"Guide",views:5600,conversions:168,cvr:3.0,pipeline:134000},
    {id:9,asset:"LinkedIn Ad Playbook",type:"Guide",views:7200,conversions:216,cvr:3.0,pipeline:118000},
    {id:10,asset:"Marketing Metrics Dashboard",type:"Template",views:4200,conversions:126,cvr:3.0,pipeline:82000}
  ]
};
</script>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0A0E17;--surface:#111827;--surface2:#1a2236;--border:#1e293b;
  --text:#f1f5f9;--text2:#94a3b8;--text3:#64748b;
  --primary:#00E5A0;--accent:#00B4D8;--violet:#7B61FF;
  --amber:#f59e0b;--red:#ef4444;--emerald:#10b981;
  --font-heading:'Space Grotesk',sans-serif;
  --font-body:'Inter',sans-serif;
  --radius:12px;--radius-sm:8px;--radius-xs:6px;
}
html{background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:14px;line-height:1.5}
body{display:flex;min-height:100vh;overflow-x:hidden}

/* Sidebar */
.sidebar{width:260px;background:linear-gradient(180deg,#0A0E17 0%,#0d1424 100%);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:50}
.sidebar-brand{padding:24px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border)}
.sidebar-brand .logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#0A0E17;font-family:var(--font-heading)}
.sidebar-brand span{font-family:var(--font-heading);font-weight:600;font-size:16px;color:var(--text)}
.sidebar-nav{flex:1;padding:16px 12px;overflow-y:auto}
.nav-section{margin-bottom:24px}
.nav-section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:var(--text3);padding:0 12px;margin-bottom:8px}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);color:var(--text2);cursor:pointer;transition:all .2s;font-size:13px;font-weight:500;margin-bottom:2px;position:relative}
.nav-item:hover{color:var(--text);background:rgba(255,255,255,.04)}
.nav-item.active{color:var(--primary);background:linear-gradient(135deg,rgba(0,229,160,.08),rgba(0,180,216,.04));border:1px solid rgba(0,229,160,.15)}
.nav-item.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:20px;background:var(--primary);border-radius:0 4px 4px 0}
.nav-item svg{width:18px;height:18px;flex-shrink:0}

/* Main content */
.main{margin-left:260px;flex:1;min-height:100vh;display:flex;flex-direction:column}
.topbar{height:64px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:rgba(10,14,23,.8);backdrop-filter:blur(12px);position:sticky;top:0;z-index:40}
.topbar-title{font-family:var(--font-heading);font-size:20px;font-weight:600}
.topbar-actions{display:flex;align-items:center;gap:12px}
.btn{padding:8px 16px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;border:none;font-family:var(--font-body)}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--accent));color:#0A0E17;font-weight:600}
.btn-primary:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,229,160,.25)}
.btn-ghost{background:transparent;color:var(--text2);border:1px solid var(--border)}
.btn-ghost:hover{color:var(--text);border-color:var(--text3)}
.date-badge{font-size:12px;color:var(--text2);background:var(--surface);border:1px solid var(--border);padding:6px 14px;border-radius:var(--radius-xs);display:flex;align-items:center;gap:6px}

.content{flex:1;padding:28px 32px}

/* Tab navigation */
.tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:4px;margin-bottom:28px;width:fit-content}
.tab{padding:8px 20px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;transition:all .2s;border:none;background:transparent;font-family:var(--font-body)}
.tab:hover{color:var(--text)}
.tab.active{background:linear-gradient(135deg,rgba(0,229,160,.12),rgba(0,180,216,.08));color:var(--primary);font-weight:600;border:1px solid rgba(0,229,160,.2)}

/* KPI Cards */
.kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-bottom:28px}
.kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;position:relative;overflow:hidden;transition:all .25s}
.kpi-card:hover{border-color:var(--text3);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
.kpi-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}
.kpi-card:nth-child(1)::before{background:var(--violet)}
.kpi-card:nth-child(2)::before{background:var(--accent)}
.kpi-card:nth-child(3)::before{background:var(--primary)}
.kpi-card:nth-child(4)::before{background:var(--amber)}
.kpi-card:nth-child(5)::before{background:var(--red)}
.kpi-card:nth-child(6)::before{background:var(--emerald)}
.kpi-label{font-size:12px;color:var(--text3);font-weight:500;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.kpi-value{font-family:var(--font-heading);font-size:24px;font-weight:700;margin-bottom:6px}
.kpi-trend{display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500}
.kpi-trend.up{color:var(--primary)}
.kpi-trend.down{color:var(--red)}
.kpi-trend svg{width:14px;height:14px}

/* Chart containers */
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
.chart-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;transition:border-color .2s}
.chart-card:hover{border-color:var(--text3)}
.chart-card-title{font-family:var(--font-heading);font-size:15px;font-weight:600;margin-bottom:4px}
.chart-card-subtitle{font-size:12px;color:var(--text3);margin-bottom:20px}
.chart-full{grid-column:1/-1}

/* Doughnut chart */
.doughnut-wrap{display:flex;align-items:center;gap:32px}
.doughnut-container{position:relative;width:200px;height:200px;flex-shrink:0}
.doughnut-container canvas{width:200px!important;height:200px!important}
.doughnut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
.doughnut-center-value{font-family:var(--font-heading);font-size:28px;font-weight:700;color:var(--text)}
.doughnut-center-label{font-size:11px;color:var(--text3)}
.channel-legend{display:flex;flex-direction:column;gap:10px;flex:1}
.channel-legend-item{display:flex;align-items:center;gap:10px;font-size:13px}
.channel-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.channel-name{color:var(--text2);flex:1}
.channel-pct{font-weight:600;color:var(--text);min-width:36px;text-align:right}
.channel-bar{flex:1;max-width:120px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden}
.channel-bar-fill{height:100%;border-radius:3px;transition:width .6s ease}

/* Funnel */
.funnel-container{display:flex;flex-direction:column;gap:8px}
.funnel-row{display:flex;align-items:center;gap:14px}
.funnel-label{width:100px;font-size:12px;font-weight:500;color:var(--text2);text-align:right;flex-shrink:0}
.funnel-bar-wrap{flex:1;position:relative;height:36px}
.funnel-bar{height:100%;border-radius:var(--radius-xs);transition:width .8s cubic-bezier(.4,0,.2,1);display:flex;align-items:center;padding:0 12px;min-width:60px}
.funnel-bar-value{font-size:12px;font-weight:600;color:#fff}
.funnel-dropoff{font-size:11px;color:var(--text3);min-width:50px;text-align:left;margin-left:8px}

/* Bar chart */
.bar-chart-container{display:flex;flex-direction:column;gap:10px}
.bar-row{display:flex;align-items:center;gap:12px}
.bar-label{width:160px;font-size:12px;color:var(--text2);text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{flex:1;height:28px;background:var(--surface2);border-radius:var(--radius-xs);overflow:hidden;position:relative}
.bar-fill{height:100%;border-radius:var(--radius-xs);transition:width .8s cubic-bezier(.4,0,.2,1);display:flex;align-items:center;justify-content:flex-end;padding:0 10px}
.bar-fill-value{font-size:11px;font-weight:600;color:#fff}
.bar-roi{min-width:60px;text-align:right;font-size:12px;font-weight:600}

/* Line chart (CAC) */
.line-chart-area{position:relative;height:220px;margin-top:8px}
.line-chart-area canvas{width:100%!important;height:100%!important}

/* Tables */
.table-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:28px;transition:border-color .2s}
.table-card:hover{border-color:var(--text3)}
.table-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border)}
.table-title{font-family:var(--font-heading);font-size:15px;font-weight:600}
.table-subtitle{font-size:12px;color:var(--text3)}
table{width:100%;border-collapse:collapse}
thead th{text-align:left;padding:12px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);border-bottom:1px solid var(--border);background:rgba(255,255,255,.02)}
tbody td{padding:14px 16px;font-size:13px;border-bottom:1px solid rgba(30,41,59,.5)}
tbody tr{transition:background .15s}
tbody tr:hover{background:rgba(255,255,255,.02)}
tbody tr:last-child td{border-bottom:none}
.status-badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
.status-active{background:rgba(0,229,160,.1);color:var(--primary)}
.status-paused{background:rgba(245,158,11,.1);color:var(--amber)}
.budget-bar{width:80px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;display:inline-block;vertical-align:middle;margin-left:6px}
.budget-bar-fill{height:100%;border-radius:3px}
.roi-badge{padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600}
.type-badge{padding:3px 8px;border-radius:4px;font-size:11px;font-weight:500;background:var(--surface2);color:var(--text2)}

/* Tab panels */
.tab-panel{display:none}
.tab-panel.active{display:block}

/* Responsive */
@media(max-width:1400px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:1024px){
  .sidebar{display:none}
  .main{margin-left:0}
  .chart-grid{grid-template-columns:1fr}
  .kpi-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:640px){.kpi-grid{grid-template-columns:1fr}}

/* Animations */
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.animate-in{animation:fadeIn .4s ease forwards}
.kpi-card{animation:fadeIn .4s ease forwards}
.kpi-card:nth-child(2){animation-delay:.05s}
.kpi-card:nth-child(3){animation-delay:.1s}
.kpi-card:nth-child(4){animation-delay:.15s}
.kpi-card:nth-child(5){animation-delay:.2s}
.kpi-card:nth-child(6){animation-delay:.25s}

/* Scrollbar */
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--text3)}
</style>
</head>
<body>
<!-- Sidebar -->
<aside class="sidebar">
  <div class="sidebar-brand">
    <div class="logo">V</div>
    <span>VIBE</span>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section">
      <div class="nav-section-title">Marketing</div>
      <div class="nav-item active" data-tab="overview">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        Overview
      </div>
      <div class="nav-item" data-tab="campaigns">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        Campaigns
      </div>
      <div class="nav-item" data-tab="channels">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Channels
      </div>
      <div class="nav-item" data-tab="funnel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        Lead Funnel
      </div>
      <div class="nav-item" data-tab="attribution">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        Attribution
      </div>
    </div>
    <div class="nav-section">
      <div class="nav-section-title">Analyze</div>
      <div class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Reports
      </div>
      <div class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Insights
      </div>
    </div>
  </nav>
</aside>

<!-- Main Content -->
<div class="main">
  <header class="topbar">
    <div class="topbar-title">Marketing Performance</div>
    <div class="topbar-actions">
      <div class="date-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Last 30 days
      </div>
      <button class="btn btn-ghost">Export</button>
      <button class="btn btn-primary">+ New Campaign</button>
    </div>
  </header>

  <div class="content">
    <!-- Tabs -->
    <div class="tabs">
      <button class="tab active" data-tab="overview">Overview</button>
      <button class="tab" data-tab="campaigns">Campaigns</button>
      <button class="tab" data-tab="channels">Channels</button>
      <button class="tab" data-tab="funnel">Lead Funnel</button>
      <button class="tab" data-tab="attribution">Attribution</button>
    </div>

    <!-- === OVERVIEW TAB === -->
    <div class="tab-panel active" id="panel-overview">
      <!-- KPI Cards -->
      <div class="kpi-grid" id="kpi-container"></div>

      <!-- Charts Row 1: Channel Attribution + Lead Funnel -->
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card-title">Channel Attribution</div>
          <div class="chart-card-subtitle">Revenue contribution by marketing channel</div>
          <div class="doughnut-wrap">
            <div class="doughnut-container"><canvas id="doughnut-chart"></canvas><div class="doughnut-center"><div class="doughnut-center-value">5</div><div class="doughnut-center-label">Channels</div></div></div>
            <div class="channel-legend" id="channel-legend"></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">Lead Funnel</div>
          <div class="chart-card-subtitle">Conversion rates across pipeline stages</div>
          <div class="funnel-container" id="funnel-container"></div>
        </div>
      </div>

      <!-- Charts Row 2: Campaign ROI + CAC Trend -->
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card-title">Campaign ROI Comparison</div>
          <div class="chart-card-subtitle">Top 8 campaigns by return on investment</div>
          <div class="bar-chart-container" id="roi-chart"></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">CAC Trend</div>
          <div class="chart-card-subtitle">Customer acquisition cost vs. lifetime value — 12 months</div>
          <div class="line-chart-area"><canvas id="cac-chart"></canvas></div>
        </div>
      </div>
    </div>

    <!-- === CAMPAIGNS TAB === -->
    <div class="tab-panel" id="panel-campaigns">
      <div class="kpi-grid" id="kpi-container-campaigns"></div>
      <div class="table-card">
        <div class="table-header">
          <div>
            <div class="table-title">Active Campaigns</div>
            <div class="table-subtitle">Performance metrics for all running campaigns</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Campaign</th><th>Channel</th><th>Budget</th><th>Spend</th><th>Leads</th><th>CPL</th><th>ROI</th><th>Status</th></tr></thead>
          <tbody id="campaigns-table"></tbody>
        </table>
      </div>
    </div>

    <!-- === CHANNELS TAB === -->
    <div class="tab-panel" id="panel-channels">
      <div class="kpi-grid" id="kpi-container-channels"></div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card-title">Channel Attribution</div>
          <div class="chart-card-subtitle">Revenue contribution breakdown</div>
          <div class="doughnut-wrap">
            <div class="doughnut-container"><canvas id="doughnut-chart-channels"></canvas><div class="doughnut-center"><div class="doughnut-center-value">5</div><div class="doughnut-center-label">Channels</div></div></div>
            <div class="channel-legend" id="channel-legend-channels"></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">Channel ROI Comparison</div>
          <div class="chart-card-subtitle">Return on investment by channel</div>
          <div class="bar-chart-container" id="channel-roi-chart"></div>
        </div>
      </div>
      <div class="table-card">
        <div class="table-header">
          <div>
            <div class="table-title">Channel Performance</div>
            <div class="table-subtitle">Detailed metrics per channel</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Channel</th><th>Attribution %</th><th>Spend</th><th>Leads</th><th>CPL</th><th>ROI</th></tr></thead>
          <tbody id="channel-table"></tbody>
        </table>
      </div>
    </div>

    <!-- === FUNNEL TAB === -->
    <div class="tab-panel" id="panel-funnel">
      <div class="kpi-grid" id="kpi-container-funnel"></div>
      <div class="chart-grid">
        <div class="chart-card chart-full">
          <div class="chart-card-title">Full Lead Funnel</div>
          <div class="chart-card-subtitle">Stage-by-stage conversion with drop-off analysis</div>
          <div class="funnel-container" id="funnel-container-full"></div>
        </div>
      </div>
    </div>

    <!-- === ATTRIBUTION TAB === -->
    <div class="tab-panel" id="panel-attribution">
      <div class="kpi-grid" id="kpi-container-attribution"></div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card-title">CAC vs LTV — 12 Month Trend</div>
          <div class="chart-card-subtitle">Customer acquisition cost vs. lifetime value</div>
          <div class="line-chart-area"><canvas id="cac-chart-attr"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">Campaign ROI Rankings</div>
          <div class="chart-card-subtitle">All campaigns sorted by ROI</div>
          <div class="bar-chart-container" id="roi-chart-attr"></div>
        </div>
      </div>
      <div class="table-card">
        <div class="table-header">
          <div>
            <div class="table-title">Top Content Assets</div>
            <div class="table-subtitle">Content performance by pipeline attribution</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Asset</th><th>Type</th><th>Views</th><th>Conversions</th><th>CVR</th><th>Pipeline Attribution</th></tr></thead>
          <tbody id="content-table"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
  /* ── Data loading ── */
  var S = window.__VIBE_SAMPLE__ || {};

  async function loadData(table, key) {
    var rows = [];
    try { rows = await vibeLoadData(table, {team_id: window.__VIBE_TEAM_ID__}); } catch(e) {}
    if (!rows.length) rows = (window.__VIBE_SAMPLE__ || {})[key] || [];
    return rows;
  }

  /* ── KPI rendering ── */
  function renderKPIs(containerId, kpis) {
    var c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '';
    kpis.forEach(function(k) {
      var val = k.value || '--';
      var trend = k.trend || '';
      var dir = k.direction || 'up';
      var arrow = dir === 'up'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
      c.innerHTML += '<div class="kpi-card"><div class="kpi-label">' + k.label + '</div><div class="kpi-value">' + val + '</div><div class="kpi-trend ' + dir + '">' + arrow + trend + '</div></div>';
    });
  }

  /* ── Doughnut chart (canvas) ── */
  function renderDoughnut(canvasId, legendId, channels) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var size = 200;
    canvas.width = size * 2; canvas.height = size * 2;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    ctx.scale(2, 2);
    var total = channels.reduce(function(s, c) { return s + c.value; }, 0);
    var cx = size / 2, cy = size / 2, r = 78, inner = 52;
    var startAngle = -Math.PI / 2;
    channels.forEach(function(ch) {
      var slice = (ch.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.arc(cx, cy, inner, startAngle + slice, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = ch.color;
      ctx.fill();
      startAngle += slice;
    });
    // Legend
    var leg = document.getElementById(legendId);
    if (!leg) return;
    leg.innerHTML = '';
    channels.forEach(function(ch) {
      leg.innerHTML += '<div class="channel-legend-item"><span class="channel-dot" style="background:' + ch.color + '"></span><span class="channel-name">' + ch.name + '</span><div class="channel-bar"><div class="channel-bar-fill" style="width:' + ch.value + '%;background:' + ch.color + '"></div></div><span class="channel-pct">' + ch.value + '%</span></div>';
    });
  }

  /* ── Funnel ── */
  function renderFunnel(containerId, funnel) {
    var c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '';
    var max = funnel[0].count;
    funnel.forEach(function(f, i) {
      var pct = Math.max((f.count / max) * 100, 8);
      var dropoff = i > 0 ? '-' + (100 - Math.round((f.count / funnel[i - 1].count) * 100)) + '%' : '';
      c.innerHTML += '<div class="funnel-row"><div class="funnel-label">' + f.stage + '</div><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:' + pct + '%;background:' + f.color + '"><span class="funnel-bar-value">' + f.count.toLocaleString() + '</span></div></div><div class="funnel-dropoff">' + dropoff + '</div></div>';
    });
  }

  /* ── Bar chart (campaign ROI) ── */
  function renderBarChart(containerId, campaigns) {
    var c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '';
    var sorted = campaigns.slice().sort(function(a, b) { return b.roi - a.roi; });
    var max = sorted[0].roi;
    var colors = {'Paid':'#7B61FF','Organic':'#00E5A0','Email':'#00B4D8','Social':'#f59e0b','Events':'#ef4444','Referral':'#10b981'};
    sorted.forEach(function(cp) {
      var pct = Math.max((cp.roi / max) * 100, 5);
      var col = colors[cp.channel] || '#7B61FF';
      c.innerHTML += '<div class="bar-row"><div class="bar-label">' + cp.name + '</div><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + col + '"><span class="bar-fill-value">' + cp.roi + '%</span></div></div><div class="bar-roi" style="color:' + col + '">' + cp.roi + '%</div></div>';
    });
  }

  /* ── Channel ROI bar chart ── */
  function renderChannelROI(containerId, channels) {
    var c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '';
    var sorted = channels.slice().sort(function(a, b) { return b.roi - a.roi; });
    var max = sorted[0].roi;
    sorted.forEach(function(ch) {
      var pct = Math.max((ch.roi / max) * 100, 5);
      c.innerHTML += '<div class="bar-row"><div class="bar-label">' + ch.name + '</div><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + ch.color + '"><span class="bar-fill-value">' + ch.roi + '%</span></div></div><div class="bar-roi" style="color:' + ch.color + '">' + ch.roi + '%</div></div>';
    });
  }

  /* ── Line chart (CAC trend) — pure canvas ── */
  function renderCACChart(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var rect = canvas.parentElement.getBoundingClientRect();
    var W = rect.width || 500, H = 220;
    canvas.width = W * 2; canvas.height = H * 2;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    var pad = {top: 20, right: 20, bottom: 36, left: 50};
    var cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;
    var allVals = data.map(function(d) { return d.cac; }).concat(data.map(function(d) { return d.ltv; }));
    var minV = Math.min.apply(null, allVals) * 0.85, maxV = Math.max.apply(null, allVals) * 1.05;
    function x(i) { return pad.left + (i / (data.length - 1)) * cw; }
    function y(v) { return pad.top + (1 - (v - minV) / (maxV - minV)) * ch; }

    // Grid lines
    ctx.strokeStyle = 'rgba(30,41,59,.5)';
    ctx.lineWidth = 0.5;
    for (var g = 0; g < 5; g++) {
      var gy = pad.top + (g / 4) * ch;
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(W - pad.right, gy); ctx.stroke();
      var gv = maxV - (g / 4) * (maxV - minV);
      ctx.fillStyle = '#64748b'; ctx.font = '10px Inter'; ctx.textAlign = 'right';
      ctx.fillText('$' + Math.round(gv).toLocaleString(), pad.left - 8, gy + 3);
    }

    // X labels
    ctx.fillStyle = '#64748b'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    data.forEach(function(d, i) {
      if (i % 2 === 0) ctx.fillText(d.month, x(i), H - 8);
    });

    // LTV area
    ctx.beginPath();
    ctx.moveTo(x(0), y(data[0].ltv));
    data.forEach(function(d, i) { ctx.lineTo(x(i), y(d.ltv)); });
    ctx.lineTo(x(data.length - 1), pad.top + ch);
    ctx.lineTo(x(0), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,229,160,.06)';
    ctx.fill();

    // LTV line
    ctx.beginPath();
    data.forEach(function(d, i) { i === 0 ? ctx.moveTo(x(i), y(d.ltv)) : ctx.lineTo(x(i), y(d.ltv)); });
    ctx.strokeStyle = '#00E5A0'; ctx.lineWidth = 2; ctx.stroke();

    // CAC area
    ctx.beginPath();
    ctx.moveTo(x(0), y(data[0].cac));
    data.forEach(function(d, i) { ctx.lineTo(x(i), y(d.cac)); });
    ctx.lineTo(x(data.length - 1), pad.top + ch);
    ctx.lineTo(x(0), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = 'rgba(123,97,255,.06)';
    ctx.fill();

    // CAC line
    ctx.beginPath();
    data.forEach(function(d, i) { i === 0 ? ctx.moveTo(x(i), y(d.cac)) : ctx.lineTo(x(i), y(d.cac)); });
    ctx.strokeStyle = '#7B61FF'; ctx.lineWidth = 2; ctx.stroke();

    // Data points
    data.forEach(function(d, i) {
      ctx.beginPath(); ctx.arc(x(i), y(d.ltv), 3, 0, Math.PI * 2); ctx.fillStyle = '#00E5A0'; ctx.fill();
      ctx.beginPath(); ctx.arc(x(i), y(d.cac), 3, 0, Math.PI * 2); ctx.fillStyle = '#7B61FF'; ctx.fill();
    });

    // Legend
    ctx.fillStyle = '#00E5A0'; ctx.fillRect(W - 140, 6, 12, 3);
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
    ctx.fillText('LTV', W - 124, 11);
    ctx.fillStyle = '#7B61FF'; ctx.fillRect(W - 80, 6, 12, 3);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('CAC', W - 64, 11);
  }

  /* ── Campaign table ── */
  function renderCampaignTable(campaigns) {
    var tb = document.getElementById('campaigns-table');
    if (!tb) return;
    tb.innerHTML = '';
    var channelColors = {'Paid':'#7B61FF','Organic':'#00E5A0','Email':'#00B4D8','Social':'#f59e0b','Events':'#ef4444','Referral':'#10b981'};
    campaigns.forEach(function(c) {
      var utilPct = Math.round((c.spend / c.budget) * 100);
      var utilColor = utilPct > 90 ? '#ef4444' : utilPct > 70 ? '#f59e0b' : '#00E5A0';
      var roiColor = c.roi >= 400 ? '#00E5A0' : c.roi >= 250 ? '#00B4D8' : '#f59e0b';
      var chColor = channelColors[c.channel] || '#7B61FF';
      tb.innerHTML += '<tr>' +
        '<td style="font-weight:500;color:var(--text)">' + c.name + '</td>' +
        '<td><span style="color:' + chColor + '">' + c.channel + '</span></td>' +
        '<td>$' + c.budget.toLocaleString() + '</td>' +
        '<td>$' + c.spend.toLocaleString() + '<div class="budget-bar"><div class="budget-bar-fill" style="width:' + utilPct + '%;background:' + utilColor + '"></div></div></td>' +
        '<td>' + c.leads + '</td>' +
        '<td>$' + c.cpl + '</td>' +
        '<td><span class="roi-badge" style="background:' + roiColor + '20;color:' + roiColor + '">' + c.roi + '%</span></td>' +
        '<td><span class="status-badge status-' + c.status.toLowerCase() + '"><span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block"></span> ' + c.status + '</span></td>' +
        '</tr>';
    });
  }

  /* ── Channel table ── */
  function renderChannelTable(channels) {
    var tb = document.getElementById('channel-table');
    if (!tb) return;
    tb.innerHTML = '';
    channels.forEach(function(ch) {
      var cpl = ch.leads > 0 ? Math.round(ch.spend / ch.leads) : 0;
      tb.innerHTML += '<tr>' +
        '<td><span style="display:inline-flex;align-items:center;gap:8px"><span class="channel-dot" style="background:' + ch.color + '"></span><span style="font-weight:500;color:var(--text)">' + ch.name + '</span></span></td>' +
        '<td>' + ch.value + '%</td>' +
        '<td>$' + ch.spend.toLocaleString() + '</td>' +
        '<td>' + ch.leads + '</td>' +
        '<td>$' + cpl + '</td>' +
        '<td><span class="roi-badge" style="background:' + ch.color + '20;color:' + ch.color + '">' + ch.roi + '%</span></td>' +
        '</tr>';
    });
  }

  /* ── Content table ── */
  function renderContentTable(content) {
    var tb = document.getElementById('content-table');
    if (!tb) return;
    tb.innerHTML = '';
    content.forEach(function(c) {
      tb.innerHTML += '<tr>' +
        '<td style="font-weight:500;color:var(--text)">' + c.asset + '</td>' +
        '<td><span class="type-badge">' + c.type + '</span></td>' +
        '<td>' + c.views.toLocaleString() + '</td>' +
        '<td>' + c.conversions + '</td>' +
        '<td>' + c.cvr + '%</td>' +
        '<td style="font-weight:500;color:var(--primary)">$' + c.pipeline.toLocaleString() + '</td>' +
        '</tr>';
    });
  }

  /* ── Tab switching ── */
  function initTabs() {
    var tabs = document.querySelectorAll('.tab');
    var navItems = document.querySelectorAll('.nav-item[data-tab]');

    function activate(tabName) {
      tabs.forEach(function(t) { t.classList.toggle('active', t.getAttribute('data-tab') === tabName); });
      navItems.forEach(function(n) { n.classList.toggle('active', n.getAttribute('data-tab') === tabName); });
      document.querySelectorAll('.tab-panel').forEach(function(p) {
        p.classList.toggle('active', p.id === 'panel-' + tabName);
      });
      // Re-render charts for the activated tab
      if (tabName === 'channels') {
        renderDoughnut('doughnut-chart-channels', 'channel-legend-channels', S.channels || []);
        renderChannelROI('channel-roi-chart', S.channels || []);
      }
      if (tabName === 'funnel') {
        renderFunnel('funnel-container-full', S.funnel || []);
      }
      if (tabName === 'attribution') {
        renderCACChart('cac-chart-attr', S.cac || []);
        renderBarChart('roi-chart-attr', S.campaigns || []);
      }
    }

    tabs.forEach(function(t) {
      t.addEventListener('click', function() { activate(t.getAttribute('data-tab')); });
    });
    navItems.forEach(function(n) {
      n.addEventListener('click', function() { activate(n.getAttribute('data-tab')); });
    });
  }

  /* ── Init ── */
  async function init() {
    var kpis = [];
    try { kpis = await vibeLoadData('marketing_kpis', {team_id: window.__VIBE_TEAM_ID__}); } catch(e) {}
    if (!kpis.length) kpis = (window.__VIBE_SAMPLE__ || {}).kpis || [];

    var campaigns = [];
    try { campaigns = await vibeLoadData('marketing_campaigns', {team_id: window.__VIBE_TEAM_ID__}); } catch(e) {}
    if (!campaigns.length) campaigns = (window.__VIBE_SAMPLE__ || {}).campaigns || [];

    var funnel = [];
    try { funnel = await vibeLoadData('marketing_funnel', {team_id: window.__VIBE_TEAM_ID__}); } catch(e) {}
    if (!funnel.length) funnel = (window.__VIBE_SAMPLE__ || {}).funnel || [];

    var channels = [];
    try { channels = await vibeLoadData('marketing_channels', {team_id: window.__VIBE_TEAM_ID__}); } catch(e) {}
    if (!channels.length) channels = (window.__VIBE_SAMPLE__ || {}).channels || [];

    var cac = [];
    try { cac = await vibeLoadData('marketing_cac', {team_id: window.__VIBE_TEAM_ID__}); } catch(e) {}
    if (!cac.length) cac = (window.__VIBE_SAMPLE__ || {}).cac || [];

    var content = [];
    try { content = await vibeLoadData('marketing_content', {team_id: window.__VIBE_TEAM_ID__}); } catch(e) {}
    if (!content.length) content = (window.__VIBE_SAMPLE__ || {}).content || [];

    // Store for tab switches
    S.kpis = kpis; S.campaigns = campaigns; S.funnel = funnel;
    S.channels = channels; S.cac = cac; S.content = content;

    // Overview tab
    renderKPIs('kpi-container', kpis);
    renderDoughnut('doughnut-chart', 'channel-legend', channels);
    renderFunnel('funnel-container', funnel);
    renderBarChart('roi-chart', campaigns);
    renderCACChart('cac-chart', cac);

    // Campaigns tab
    renderKPIs('kpi-container-campaigns', kpis);
    renderCampaignTable(campaigns);

    // Channels tab (rendered on tab switch)
    renderKPIs('kpi-container-channels', kpis);
    renderChannelTable(channels);

    // Funnel tab (rendered on tab switch)
    renderKPIs('kpi-container-funnel', kpis);

    // Attribution tab (rendered on tab switch)
    renderKPIs('kpi-container-attribution', kpis);
    renderContentTable(content);

    initTabs();
  }

  // Resize handler
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      renderCACChart('cac-chart', S.cac || []);
      renderDoughnut('doughnut-chart', 'channel-legend', S.channels || []);
      var activePanel = document.querySelector('.tab-panel.active');
      if (activePanel && activePanel.id === 'panel-attribution') {
        renderCACChart('cac-chart-attr', S.cac || []);
      }
      if (activePanel && activePanel.id === 'panel-channels') {
        renderDoughnut('doughnut-chart-channels', 'channel-legend-channels', S.channels || []);
      }
    }, 150);
  });

  init();
})();
</script>
</body>
</html>$$
WHERE skill_name = 'marketing-dashboard';
