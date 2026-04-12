UPDATE skill_registry SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Win/Loss Analysis Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<script>
window.__VIBE_CONFIG__={supabaseUrl:"__SUPABASE_URL__",supabaseKey:"__SUPABASE_ANON_KEY__",teamId:"__VIBE_TEAM_ID__"};
window.__VIBE_SAMPLE__={
  kpis:[
    {id:"win-rate",label:"Win Rate",value:"34.2%",trend:"+2.1%",direction:"up"},
    {id:"deals-won",label:"Deals Won",value:"47",trend:"+8",direction:"up"},
    {id:"deals-lost",label:"Deals Lost",value:"89",trend:"-3",direction:"down"},
    {id:"avg-won-deal",label:"Avg Won Deal",value:"$124K",trend:"+$11K",direction:"up"},
    {id:"top-loss-reason",label:"Top Loss Reason",value:"Price",trend:"31%",direction:"neutral"},
    {id:"competitive-win-rate",label:"Competitive Win Rate",value:"28%",trend:"-1.4%",direction:"down"}
  ],
  trend:[
    {month:"May 2025",winRate:29.1,won:3,lost:8},
    {month:"Jun 2025",winRate:31.4,won:4,lost:9},
    {month:"Jul 2025",winRate:28.7,won:3,lost:7},
    {month:"Aug 2025",winRate:33.2,won:5,lost:10},
    {month:"Sep 2025",winRate:30.5,won:4,lost:9},
    {month:"Oct 2025",winRate:35.8,won:5,lost:9},
    {month:"Nov 2025",winRate:32.1,won:4,lost:8},
    {month:"Dec 2025",winRate:36.4,won:4,lost:7},
    {month:"Jan 2026",winRate:33.9,won:5,lost:10},
    {month:"Feb 2026",winRate:35.2,won:4,lost:7},
    {month:"Mar 2026",winRate:37.1,won:5,lost:8},
    {month:"Apr 2026",winRate:34.2,won:4,lost:8}
  ],
  lossreasons:[
    {reason:"Price",count:28,pct:31.5},
    {reason:"Competition",count:19,pct:21.3},
    {reason:"Timing",count:15,pct:16.9},
    {reason:"No Budget",count:12,pct:13.5},
    {reason:"No Champion",count:9,pct:10.1},
    {reason:"Other",count:6,pct:6.7}
  ],
  reps:[
    {name:"Sarah Chen",winRate:48.2,won:13,lost:14},
    {name:"Marcus Johnson",winRate:41.7,won:10,lost:14},
    {name:"Priya Patel",winRate:38.9,won:7,lost:11},
    {name:"David Kim",winRate:35.0,won:7,lost:13},
    {name:"Emily Rodriguez",winRate:30.4,won:4,lost:9},
    {name:"James Wilson",winRate:27.8,won:3,lost:8},
    {name:"Lisa Thompson",winRate:25.0,won:2,lost:6},
    {name:"Alex Martinez",winRate:18.2,won:1,lost:4}
  ],
  competitors:[
    {name:"Acme Corp",winRate:35.2,wins:6,losses:11},
    {name:"TechRival",winRate:28.6,wins:4,losses:10},
    {name:"DataPrime",winRate:25.0,wins:3,losses:9},
    {name:"CloudFirst",winRate:22.2,wins:2,losses:7},
    {name:"Nexus AI",winRate:30.8,wins:4,losses:9},
    {name:"SalesPro",winRate:20.0,wins:2,losses:8}
  ],
  losses:[
    {company:"Meridian Health",value:"$245,000",stageLost:"Negotiation",reason:"Price",competitor:"Acme Corp",owner:"Marcus Johnson",date:"2026-04-08"},
    {company:"Titan Manufacturing",value:"$189,000",stageLost:"Proposal",reason:"Competition",competitor:"TechRival",owner:"Sarah Chen",date:"2026-04-06"},
    {company:"Apex Financial",value:"$312,000",stageLost:"Negotiation",reason:"No Budget",competitor:"-",owner:"David Kim",date:"2026-04-04"},
    {company:"Crestview Labs",value:"$87,000",stageLost:"Discovery",reason:"Timing",competitor:"-",owner:"Emily Rodriguez",date:"2026-04-02"},
    {company:"Orion Logistics",value:"$156,000",stageLost:"Proposal",reason:"Price",competitor:"DataPrime",owner:"Priya Patel",date:"2026-03-30"},
    {company:"Silverline Tech",value:"$203,000",stageLost:"Negotiation",reason:"Competition",competitor:"Nexus AI",owner:"James Wilson",date:"2026-03-28"},
    {company:"Pinnacle Retail",value:"$94,000",stageLost:"Discovery",reason:"No Champion",competitor:"-",owner:"Lisa Thompson",date:"2026-03-25"},
    {company:"Redwood Systems",value:"$178,000",stageLost:"Proposal",reason:"Price",competitor:"SalesPro",owner:"Alex Martinez",date:"2026-03-22"},
    {company:"Cascade Energy",value:"$267,000",stageLost:"Negotiation",reason:"No Budget",competitor:"-",owner:"Sarah Chen",date:"2026-03-19"},
    {company:"Vanguard Media",value:"$121,000",stageLost:"Proposal",reason:"Timing",competitor:"CloudFirst",owner:"Marcus Johnson",date:"2026-03-16"},
    {company:"Summit Pharma",value:"$345,000",stageLost:"Negotiation",reason:"Price",competitor:"Acme Corp",owner:"David Kim",date:"2026-03-13"},
    {company:"Ironclad Security",value:"$99,000",stageLost:"Discovery",reason:"Other",competitor:"-",owner:"Emily Rodriguez",date:"2026-03-10"},
    {company:"Northwind Tech",value:"$215,000",stageLost:"Proposal",reason:"Competition",competitor:"TechRival",owner:"Priya Patel",date:"2026-03-07"},
    {company:"Beacon Analytics",value:"$142,000",stageLost:"Negotiation",reason:"No Champion",competitor:"-",owner:"James Wilson",date:"2026-03-04"},
    {company:"Horizon Cloud",value:"$188,000",stageLost:"Proposal",reason:"Price",competitor:"DataPrime",owner:"Lisa Thompson",date:"2026-03-01"}
  ],
  wins:[
    {company:"Atlas Dynamics",value:"$198,000",keyFactor:"ROI Story",competitorDisplaced:"Acme Corp",owner:"Sarah Chen",closeDate:"2026-04-09"},
    {company:"BrightPath Education",value:"$134,000",keyFactor:"Integration Speed",competitorDisplaced:"TechRival",owner:"Marcus Johnson",closeDate:"2026-04-05"},
    {company:"CoreVault Solutions",value:"$256,000",keyFactor:"Executive Alignment",competitorDisplaced:"-",owner:"Sarah Chen",closeDate:"2026-04-01"},
    {company:"Dynamo Industries",value:"$89,000",keyFactor:"Time to Value",competitorDisplaced:"CloudFirst",owner:"Priya Patel",closeDate:"2026-03-27"},
    {company:"EverGreen Capital",value:"$312,000",keyFactor:"ROI Story",competitorDisplaced:"Nexus AI",owner:"David Kim",closeDate:"2026-03-23"},
    {company:"FrontLine Defense",value:"$145,000",keyFactor:"Champion Support",competitorDisplaced:"-",owner:"Marcus Johnson",closeDate:"2026-03-18"},
    {company:"GlobalReach Telecom",value:"$178,000",keyFactor:"Product Fit",competitorDisplaced:"SalesPro",owner:"Sarah Chen",closeDate:"2026-03-14"},
    {company:"HighPoint Consulting",value:"$67,000",keyFactor:"Integration Speed",competitorDisplaced:"-",owner:"Emily Rodriguez",closeDate:"2026-03-09"},
    {company:"InnovateTech Labs",value:"$223,000",keyFactor:"Executive Alignment",competitorDisplaced:"Acme Corp",owner:"Priya Patel",closeDate:"2026-03-05"},
    {company:"JetStream Logistics",value:"$156,000",keyFactor:"Time to Value",competitorDisplaced:"DataPrime",owner:"David Kim",closeDate:"2026-03-01"}
  ]
};
</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg-primary:#0A0E17;--bg-card:#111827;--bg-card-hover:#1a2332;
  --border:#1F2937;--border-hover:#374151;
  --text-primary:#F9FAFB;--text-secondary:#9CA3AF;--text-muted:#6B7280;
  --vibe-green:#00E5A0;--vibe-green-dim:rgba(0,229,160,0.15);
  --vibe-cyan:#00B4D8;--vibe-cyan-dim:rgba(0,180,216,0.15);
  --vibe-violet:#7B61FF;--vibe-violet-dim:rgba(123,97,255,0.15);
  --vibe-amber:#F59E0B;--vibe-amber-dim:rgba(245,158,11,0.15);
  --vibe-red:#EF4444;--vibe-red-dim:rgba(239,68,68,0.15);
  --vibe-blue:#3B82F6;--vibe-blue-dim:rgba(59,130,246,0.15);
  --radius:12px;--radius-sm:8px;--radius-lg:16px;
  --shadow:0 4px 24px rgba(0,0,0,0.3);
  --transition:all 0.2s ease;
}
body{font-family:'Inter',sans-serif;background:var(--bg-primary);color:var(--text-primary);min-height:100vh;overflow-x:hidden}
h1,h2,h3,h4,h5,h6{font-family:'Space Grotesk',sans-serif}

/* Header */
.dashboard-header{
  background:linear-gradient(135deg,rgba(0,229,160,0.08),rgba(0,180,216,0.06),rgba(123,97,255,0.04));
  border-bottom:1px solid var(--border);
  padding:28px 32px;
  backdrop-filter:blur(20px);
}
.header-content{max-width:1440px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.header-title{font-size:28px;font-weight:700;background:linear-gradient(135deg,var(--vibe-green),var(--vibe-cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.header-subtitle{font-size:14px;color:var(--text-secondary);margin-top:4px}
.header-badge{display:inline-flex;align-items:center;gap:6px;background:var(--vibe-green-dim);border:1px solid rgba(0,229,160,0.3);border-radius:20px;padding:6px 14px;font-size:12px;font-weight:500;color:var(--vibe-green)}
.header-badge .dot{width:6px;height:6px;border-radius:50%;background:var(--vibe-green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}

/* Navigation */
.nav-tabs{
  display:flex;gap:4px;padding:8px 32px;background:rgba(17,24,39,0.8);
  border-bottom:1px solid var(--border);max-width:100%;overflow-x:auto;
  backdrop-filter:blur(12px);
}
.nav-tab{
  padding:10px 20px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;
  color:var(--text-secondary);cursor:pointer;transition:var(--transition);
  border:1px solid transparent;white-space:nowrap;background:transparent;
}
.nav-tab:hover{color:var(--text-primary);background:var(--bg-card-hover);border-color:var(--border)}
.nav-tab.active{color:var(--vibe-green);background:var(--vibe-green-dim);border-color:rgba(0,229,160,0.3)}

/* Main container */
.main-container{max-width:1440px;margin:0 auto;padding:24px 32px 48px}

/* Tab panels */
.tab-panel{display:none}
.tab-panel.active{display:block}

/* KPI Grid */
.kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-bottom:28px}
@media(max-width:1200px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){.kpi-grid{grid-template-columns:repeat(2,1fr)}}
.kpi-card{
  background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);
  padding:20px;transition:var(--transition);position:relative;overflow:hidden;
}
.kpi-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--vibe-green),var(--vibe-cyan));opacity:0;transition:var(--transition);
}
.kpi-card:hover{border-color:var(--border-hover);transform:translateY(-2px);box-shadow:var(--shadow)}
.kpi-card:hover::before{opacity:1}
.kpi-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);margin-bottom:10px}
.kpi-value{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;color:var(--text-primary);margin-bottom:8px}
.kpi-trend{font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px}
.kpi-trend.up{color:#10B981;background:rgba(16,185,129,0.12)}
.kpi-trend.down{color:#EF4444;background:rgba(239,68,68,0.12)}
.kpi-trend.neutral{color:var(--vibe-amber);background:var(--vibe-amber-dim)}

/* Chart card */
.chart-card{
  background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);
  padding:24px;margin-bottom:20px;transition:var(--transition);
}
.chart-card:hover{border-color:var(--border-hover);box-shadow:var(--shadow)}
.chart-title{font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:4px}
.chart-desc{font-size:12px;color:var(--text-muted);margin-bottom:20px}
.chart-wrap{position:relative;width:100%;height:320px}
.chart-wrap canvas{width:100%!important;height:100%!important}

/* Grid layouts */
.grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.grid-3-2{display:grid;grid-template-columns:3fr 2fr;gap:20px}
@media(max-width:1024px){.grid-2,.grid-3-2{grid-template-columns:1fr}}

/* Tables */
.table-card{
  background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);
  padding:24px;margin-bottom:20px;overflow:hidden;
}
.table-title{font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:600;margin-bottom:16px}
.table-scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{
  text-align:left;padding:10px 14px;font-size:11px;font-weight:600;
  text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);
  border-bottom:1px solid var(--border);background:rgba(0,0,0,0.2);white-space:nowrap;
}
tbody td{padding:12px 14px;border-bottom:1px solid rgba(31,41,55,0.5);color:var(--text-secondary);white-space:nowrap}
tbody tr:hover td{background:var(--bg-card-hover);color:var(--text-primary)}
.badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600}
.badge-red{background:var(--vibe-red-dim);color:var(--vibe-red)}
.badge-green{background:var(--vibe-green-dim);color:var(--vibe-green)}
.badge-amber{background:var(--vibe-amber-dim);color:var(--vibe-amber)}
.badge-cyan{background:var(--vibe-cyan-dim);color:var(--vibe-cyan)}
.badge-violet{background:var(--vibe-violet-dim);color:var(--vibe-violet)}
.badge-blue{background:var(--vibe-blue-dim);color:var(--vibe-blue)}

/* Summary panels */
.insight-panel{
  background:linear-gradient(135deg,rgba(0,229,160,0.06),rgba(123,97,255,0.04));
  border:1px solid rgba(0,229,160,0.2);border-radius:var(--radius-lg);
  padding:24px;margin-bottom:20px;
}
.insight-title{font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;color:var(--vibe-green);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.insight-list{list-style:none;padding:0}
.insight-list li{padding:8px 0;font-size:13px;color:var(--text-secondary);border-bottom:1px solid rgba(31,41,55,0.4);display:flex;align-items:flex-start;gap:8px}
.insight-list li:last-child{border-bottom:none}
.insight-list li::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--vibe-green);margin-top:6px;flex-shrink:0}

/* Donut center label */
.donut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none}
.donut-center .big{font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;color:var(--text-primary)}
.donut-center .sub{font-size:11px;color:var(--text-muted)}

/* Progress bar for rep breakdown */
.progress-inline{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.progress-label{font-size:13px;color:var(--text-secondary);width:140px;flex-shrink:0}
.progress-bar{flex:1;height:8px;background:rgba(31,41,55,0.6);border-radius:4px;overflow:hidden}
.progress-fill{height:100%;border-radius:4px;transition:width 0.6s ease}
.progress-value{font-size:13px;font-weight:600;color:var(--text-primary);width:50px;text-align:right}

/* Animations */
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.animate-in{animation:fadeIn 0.4s ease forwards}
</style>
</head>
<body>

<header class="dashboard-header">
  <div class="header-content">
    <div>
      <h1 class="header-title">Win/Loss Analysis</h1>
      <p class="header-subtitle">Deal outcome intelligence &mdash; identify patterns, improve win rates</p>
    </div>
    <div class="header-badge"><span class="dot"></span> Live Data</div>
  </div>
</header>

<nav class="nav-tabs" id="navTabs">
  <button class="nav-tab active" data-tab="overview">Overview</button>
  <button class="nav-tab" data-tab="loss-reasons">Loss Reasons</button>
  <button class="nav-tab" data-tab="competitive">Competitive</button>
  <button class="nav-tab" data-tab="by-rep">By Rep</button>
  <button class="nav-tab" data-tab="trends">Trends</button>
</nav>

<main class="main-container">

<!-- ========== OVERVIEW TAB ========== -->
<section class="tab-panel active" id="tab-overview">
  <div class="kpi-grid" id="kpiGrid"></div>

  <div class="grid-2">
    <div class="chart-card animate-in">
      <h3 class="chart-title">Win/Loss Trend</h3>
      <p class="chart-desc">Monthly win rate over the last 12 months</p>
      <div class="chart-wrap"><canvas id="chartTrend"></canvas></div>
    </div>
    <div class="chart-card animate-in">
      <h3 class="chart-title">Loss Reasons Breakdown</h3>
      <p class="chart-desc">Primary reasons for deal losses this period</p>
      <div class="chart-wrap" style="display:flex;align-items:center;justify-content:center;position:relative">
        <canvas id="chartLossReasons"></canvas>
        <div class="donut-center"><div class="big">89</div><div class="sub">Total Losses</div></div>
      </div>
    </div>
  </div>

  <div class="insight-panel animate-in">
    <div class="insight-title"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#00E5A0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Key Insights</div>
    <ul class="insight-list">
      <li>Price is the #1 loss reason at 31.5% &mdash; consider revisiting pricing tiers for mid-market deals</li>
      <li>Sarah Chen leads win rate at 48.2% &mdash; opportunity to replicate her playbook across the team</li>
      <li>Competitive win rate of 28% against Acme Corp is highest &mdash; leverage existing battlecards</li>
      <li>Win rate trending up from 29.1% to 34.2% over 12 months &mdash; positive momentum</li>
      <li>Deals lost in Negotiation stage have highest average value ($267K) &mdash; late-stage losses are most costly</li>
    </ul>
  </div>

  <div class="table-card animate-in">
    <h3 class="table-title" style="color:var(--vibe-red)">Recent Losses</h3>
    <div class="table-scroll">
      <table><thead><tr><th>Company</th><th>Value</th><th>Stage Lost</th><th>Reason</th><th>Competitor</th><th>Owner</th><th>Date</th></tr></thead>
      <tbody id="tableLosses"></tbody></table>
    </div>
  </div>

  <div class="table-card animate-in">
    <h3 class="table-title" style="color:var(--vibe-green)">Recent Wins</h3>
    <div class="table-scroll">
      <table><thead><tr><th>Company</th><th>Value</th><th>Key Factor</th><th>Competitor Displaced</th><th>Owner</th><th>Close Date</th></tr></thead>
      <tbody id="tableWins"></tbody></table>
    </div>
  </div>
</section>

<!-- ========== LOSS REASONS TAB ========== -->
<section class="tab-panel" id="tab-loss-reasons">
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:28px">
    <div class="kpi-card"><div class="kpi-label">Top Loss Reason</div><div class="kpi-value" style="color:var(--vibe-red)">Price</div><div class="kpi-trend neutral">31.5% of losses</div></div>
    <div class="kpi-card"><div class="kpi-label">Avg Loss Value</div><div class="kpi-value">$183K</div><div class="kpi-trend down">&#9660; +$12K vs prior</div></div>
    <div class="kpi-card"><div class="kpi-label">Most Common Stage</div><div class="kpi-value" style="color:var(--vibe-amber)">Proposal</div><div class="kpi-trend neutral">38% of losses</div></div>
  </div>
  <div class="grid-3-2">
    <div class="chart-card">
      <h3 class="chart-title">Loss Reasons Deep Dive</h3>
      <p class="chart-desc">Detailed breakdown with counts per reason</p>
      <div class="chart-wrap"><canvas id="chartLossBar"></canvas></div>
    </div>
    <div class="chart-card">
      <h3 class="chart-title">Loss by Deal Stage</h3>
      <p class="chart-desc">Where in the pipeline deals are lost</p>
      <div class="chart-wrap" style="display:flex;align-items:center;justify-content:center;position:relative">
        <canvas id="chartLossStage"></canvas>
        <div class="donut-center"><div class="big">89</div><div class="sub">Lost Deals</div></div>
      </div>
    </div>
  </div>
  <div class="insight-panel">
    <div class="insight-title"><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#00E5A0" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="#00E5A0" stroke-width="2" stroke-linecap="round"/></svg> Loss Reason Analysis</div>
    <ul class="insight-list">
      <li>Price objections peak in Negotiation stage &mdash; 72% of price-related losses happen after Proposal</li>
      <li>Competition losses cluster around 2 main competitors: Acme Corp and TechRival</li>
      <li>No Champion losses are entirely preventable with better qualification at Discovery</li>
      <li>Timing losses correlate with fiscal Q4 &mdash; budget cycles play a significant role</li>
    </ul>
  </div>
</section>

<!-- ========== COMPETITIVE TAB ========== -->
<section class="tab-panel" id="tab-competitive">
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:28px">
    <div class="kpi-card"><div class="kpi-label">Overall Competitive Win Rate</div><div class="kpi-value" style="color:var(--vibe-cyan)">28%</div><div class="kpi-trend down">&#9660; 1.4% vs prior</div></div>
    <div class="kpi-card"><div class="kpi-label">Best Against</div><div class="kpi-value" style="color:var(--vibe-green)">Acme Corp</div><div class="kpi-trend up">&#9650; 35.2% win rate</div></div>
    <div class="kpi-card"><div class="kpi-label">Worst Against</div><div class="kpi-value" style="color:var(--vibe-red)">SalesPro</div><div class="kpi-trend down">&#9660; 20.0% win rate</div></div>
  </div>
  <div class="chart-card">
    <h3 class="chart-title">Win Rate vs Each Competitor</h3>
    <p class="chart-desc">Head-to-head competitive performance</p>
    <div class="chart-wrap"><canvas id="chartCompetitive"></canvas></div>
  </div>
  <div class="table-card">
    <h3 class="table-title">Competitive Deal Log</h3>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Competitor</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>Trend</th></tr></thead>
        <tbody id="tableCompetitors"></tbody>
      </table>
    </div>
  </div>
</section>

<!-- ========== BY REP TAB ========== -->
<section class="tab-panel" id="tab-by-rep">
  <div class="chart-card">
    <h3 class="chart-title">Win Rate by Sales Rep</h3>
    <p class="chart-desc">Individual performance comparison across the team</p>
    <div class="chart-wrap"><canvas id="chartByRep"></canvas></div>
  </div>
  <div class="grid-2">
    <div class="chart-card">
      <h3 class="chart-title">Rep Performance Bars</h3>
      <p class="chart-desc">Visual win rate comparison</p>
      <div id="repBars" style="padding:8px 0"></div>
    </div>
    <div class="table-card">
      <h3 class="table-title">Rep Scorecard</h3>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Rep</th><th>Won</th><th>Lost</th><th>Win Rate</th><th>Status</th></tr></thead>
          <tbody id="tableReps"></tbody>
        </table>
      </div>
    </div>
  </div>
</section>

<!-- ========== TRENDS TAB ========== -->
<section class="tab-panel" id="tab-trends">
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px">
    <div class="kpi-card"><div class="kpi-label">12-Month High</div><div class="kpi-value" style="color:var(--vibe-green)">37.1%</div><div class="kpi-trend up">Mar 2026</div></div>
    <div class="kpi-card"><div class="kpi-label">12-Month Low</div><div class="kpi-value" style="color:var(--vibe-red)">28.7%</div><div class="kpi-trend down">Jul 2025</div></div>
    <div class="kpi-card"><div class="kpi-label">Avg Win Rate</div><div class="kpi-value">33.0%</div><div class="kpi-trend neutral">12-mo average</div></div>
    <div class="kpi-card"><div class="kpi-label">Trend Direction</div><div class="kpi-value" style="color:var(--vibe-green)">&#9650; Up</div><div class="kpi-trend up">+5.1pp YoY</div></div>
  </div>
  <div class="chart-card">
    <h3 class="chart-title">Win Rate Trend &mdash; 12 Months</h3>
    <p class="chart-desc">Monthly win rate with won and lost deal volume overlay</p>
    <div class="chart-wrap" style="height:400px"><canvas id="chartTrendFull"></canvas></div>
  </div>
  <div class="chart-card">
    <h3 class="chart-title">Deal Volume Trend</h3>
    <p class="chart-desc">Won vs lost deals per month</p>
    <div class="chart-wrap"><canvas id="chartVolume"></canvas></div>
  </div>
</section>

</main>

<script>
(function(){
  var D=window.__VIBE_SAMPLE__;
  var chartDefaults={
    color:'#9CA3AF',
    borderColor:'#1F2937',
    font:{family:'Inter'}
  };
  Chart.defaults.color=chartDefaults.color;
  Chart.defaults.borderColor=chartDefaults.borderColor;
  Chart.defaults.font.family=chartDefaults.font.family;

  /* ---- NAV ---- */
  var tabs=document.querySelectorAll('.nav-tab');
  tabs.forEach(function(t){
    t.addEventListener('click',function(){
      tabs.forEach(function(x){x.classList.remove('active')});
      t.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.remove('active')});
      var panel=document.getElementById('tab-'+t.getAttribute('data-tab'));
      if(panel)panel.classList.add('active');
    });
  });

  /* ---- KPIs ---- */
  var kpiGrid=document.getElementById('kpiGrid');
  try{
    var kpis=D.kpis||[];
    kpis.forEach(function(k){
      var card=document.createElement('div');card.className='kpi-card animate-in';
      card.innerHTML='<div class="kpi-label">'+k.label+'</div><div class="kpi-value">'+k.value+'</div><div class="kpi-trend '+k.direction+'">'+(k.direction==='up'?'&#9650; ':k.direction==='down'?'&#9660; ':'')+k.trend+'</div>';
      kpiGrid.appendChild(card);
    });
  }catch(e){kpiGrid.innerHTML='<div class="kpi-card"><div class="kpi-label">Error</div><div class="kpi-value">--</div></div>'}

  /* ---- CHART: Win/Loss Trend (Overview) ---- */
  try{
    var trendData=D.trend||[];
    new Chart(document.getElementById('chartTrend').getContext('2d'),{
      type:'line',
      data:{
        labels:trendData.map(function(t){return t.month.split(' ')[0].substring(0,3)+' '+t.month.split(' ')[1].slice(-2)}),
        datasets:[{
          label:'Win Rate %',data:trendData.map(function(t){return t.winRate}),
          borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.1)',
          fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#00E5A0',pointBorderColor:'#0A0E17',pointBorderWidth:2,pointHoverRadius:6
        }]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{backgroundColor:'#111827',titleColor:'#F9FAFB',bodyColor:'#9CA3AF',borderColor:'#1F2937',borderWidth:1,cornerRadius:8,padding:12,
          callbacks:{label:function(c){return 'Win Rate: '+c.parsed.y+'%'}}}},
        scales:{
          x:{grid:{display:false},ticks:{font:{size:11}}},
          y:{min:20,max:45,grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return v+'%'},font:{size:11}}}
        }
      }
    });
  }catch(e){console.error('Trend chart error:',e)}

  /* ---- CHART: Loss Reasons Doughnut (Overview) ---- */
  try{
    var lr=D.lossreasons||[];
    var lrColors=['#EF4444','#F59E0B','#00B4D8','#7B61FF','#3B82F6','#6B7280'];
    new Chart(document.getElementById('chartLossReasons').getContext('2d'),{
      type:'doughnut',
      data:{
        labels:lr.map(function(r){return r.reason}),
        datasets:[{data:lr.map(function(r){return r.count}),backgroundColor:lrColors,borderColor:'#0A0E17',borderWidth:3,hoverOffset:6}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,cutout:'68%',
        plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',font:{size:11}}},
        tooltip:{backgroundColor:'#111827',titleColor:'#F9FAFB',bodyColor:'#9CA3AF',borderColor:'#1F2937',borderWidth:1,cornerRadius:8,padding:12,
          callbacks:{label:function(c){return c.label+': '+c.raw+' ('+lr[c.dataIndex].pct+'%)'}}}}
      }
    });
  }catch(e){console.error('Loss reasons chart error:',e)}

  /* ---- CHART: Loss Reasons Bar (Loss Reasons Tab) ---- */
  try{
    var lr2=D.lossreasons||[];
    new Chart(document.getElementById('chartLossBar').getContext('2d'),{
      type:'bar',
      data:{
        labels:lr2.map(function(r){return r.reason}),
        datasets:[{label:'Deals Lost',data:lr2.map(function(r){return r.count}),
          backgroundColor:['rgba(239,68,68,0.7)','rgba(245,158,11,0.7)','rgba(0,180,216,0.7)','rgba(123,97,255,0.7)','rgba(59,130,246,0.7)','rgba(107,114,128,0.7)'],
          borderColor:['#EF4444','#F59E0B','#00B4D8','#7B61FF','#3B82F6','#6B7280'],borderWidth:1,borderRadius:6,barPercentage:0.6}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,indexAxis:'y',
        plugins:{legend:{display:false},tooltip:{backgroundColor:'#111827',titleColor:'#F9FAFB',bodyColor:'#9CA3AF',borderColor:'#1F2937',borderWidth:1,cornerRadius:8}},
        scales:{x:{grid:{color:'rgba(31,41,55,0.5)'},ticks:{font:{size:11}}},y:{grid:{display:false},ticks:{font:{size:12,weight:500}}}}
      }
    });
  }catch(e){console.error('Loss bar chart error:',e)}

  /* ---- CHART: Loss by Stage Doughnut (Loss Reasons Tab) ---- */
  try{
    var stages=[{stage:'Discovery',count:18},{stage:'Proposal',count:34},{stage:'Negotiation',count:37}];
    new Chart(document.getElementById('chartLossStage').getContext('2d'),{
      type:'doughnut',
      data:{
        labels:stages.map(function(s){return s.stage}),
        datasets:[{data:stages.map(function(s){return s.count}),backgroundColor:['#00B4D8','#F59E0B','#EF4444'],borderColor:'#0A0E17',borderWidth:3}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,cutout:'68%',
        plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',font:{size:11}}},
        tooltip:{backgroundColor:'#111827',titleColor:'#F9FAFB',bodyColor:'#9CA3AF',borderColor:'#1F2937',borderWidth:1,cornerRadius:8}}
      }
    });
  }catch(e){console.error('Loss stage chart error:',e)}

  /* ---- CHART: Competitive Win Rate (Competitive Tab) ---- */
  try{
    var comp=D.competitors||[];
    new Chart(document.getElementById('chartCompetitive').getContext('2d'),{
      type:'bar',
      data:{
        labels:comp.map(function(c){return c.name}),
        datasets:[
          {label:'Win Rate %',data:comp.map(function(c){return c.winRate}),backgroundColor:'rgba(0,229,160,0.6)',borderColor:'#00E5A0',borderWidth:1,borderRadius:6,barPercentage:0.5,yAxisID:'y'},
          {label:'Losses',data:comp.map(function(c){return c.losses}),backgroundColor:'rgba(239,68,68,0.4)',borderColor:'#EF4444',borderWidth:1,borderRadius:6,barPercentage:0.5,yAxisID:'y1'}
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{usePointStyle:true,pointStyle:'circle',padding:16,font:{size:11}}},
        tooltip:{backgroundColor:'#111827',titleColor:'#F9FAFB',bodyColor:'#9CA3AF',borderColor:'#1F2937',borderWidth:1,cornerRadius:8}},
        scales:{
          x:{grid:{display:false},ticks:{font:{size:11}}},
          y:{position:'left',grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return v+'%'},font:{size:11}}},
          y1:{position:'right',grid:{display:false},ticks:{font:{size:11}}}
        }
      }
    });
  }catch(e){console.error('Competitive chart error:',e)}

  /* ---- CHART: By Rep (By Rep Tab) ---- */
  try{
    var reps=D.reps||[];
    var repColors=reps.map(function(r){return r.winRate>=40?'rgba(0,229,160,0.7)':r.winRate>=30?'rgba(0,180,216,0.7)':r.winRate>=25?'rgba(245,158,11,0.7)':'rgba(239,68,68,0.7)'});
    new Chart(document.getElementById('chartByRep').getContext('2d'),{
      type:'bar',
      data:{
        labels:reps.map(function(r){return r.name}),
        datasets:[{label:'Win Rate %',data:reps.map(function(r){return r.winRate}),backgroundColor:repColors,
          borderColor:reps.map(function(r){return r.winRate>=40?'#00E5A0':r.winRate>=30?'#00B4D8':r.winRate>=25?'#F59E0B':'#EF4444'}),
          borderWidth:1,borderRadius:6,barPercentage:0.6}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,indexAxis:'y',
        plugins:{legend:{display:false},tooltip:{backgroundColor:'#111827',titleColor:'#F9FAFB',bodyColor:'#9CA3AF',borderColor:'#1F2937',borderWidth:1,cornerRadius:8,
          callbacks:{label:function(c){var r=reps[c.dataIndex];return r.name+': '+r.winRate+'% ('+r.won+'W/'+r.lost+'L)'}}}},
        scales:{x:{grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return v+'%'},font:{size:11}},max:60},y:{grid:{display:false},ticks:{font:{size:12,weight:500}}}}
      }
    });
  }catch(e){console.error('By rep chart error:',e)}

  /* ---- Rep Progress Bars ---- */
  try{
    var repBars=document.getElementById('repBars');
    var reps2=D.reps||[];
    var barColors=['#00E5A0','#00E5A0','#00B4D8','#00B4D8','#F59E0B','#F59E0B','#EF4444','#EF4444'];
    reps2.forEach(function(r,i){
      var row=document.createElement('div');row.className='progress-inline';
      row.innerHTML='<span class="progress-label">'+r.name+'</span><div class="progress-bar"><div class="progress-fill" style="width:'+r.winRate+'%;background:'+barColors[i]+'"></div></div><span class="progress-value">'+r.winRate+'%</span>';
      repBars.appendChild(row);
    });
  }catch(e){console.error('Rep bars error:',e)}

  /* ---- Rep Table ---- */
  try{
    var tableReps=document.getElementById('tableReps');
    (D.reps||[]).forEach(function(r){
      var status=r.winRate>=40?'<span class="badge badge-green">Top</span>':r.winRate>=30?'<span class="badge badge-cyan">On Track</span>':r.winRate>=25?'<span class="badge badge-amber">At Risk</span>':'<span class="badge badge-red">Needs Help</span>';
      tableReps.innerHTML+='<tr><td style="color:var(--text-primary);font-weight:500">'+r.name+'</td><td style="color:var(--vibe-green)">'+r.won+'</td><td style="color:var(--vibe-red)">'+r.lost+'</td><td style="font-weight:600">'+r.winRate+'%</td><td>'+status+'</td></tr>';
    });
  }catch(e){console.error('Rep table error:',e)}

  /* ---- CHART: Trend Full (Trends Tab) ---- */
  try{
    var td=D.trend||[];
    new Chart(document.getElementById('chartTrendFull').getContext('2d'),{
      type:'line',
      data:{
        labels:td.map(function(t){return t.month}),
        datasets:[
          {label:'Win Rate %',data:td.map(function(t){return t.winRate}),borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.08)',fill:true,tension:0.4,pointRadius:5,pointBackgroundColor:'#00E5A0',pointBorderColor:'#0A0E17',pointBorderWidth:2,pointHoverRadius:7,yAxisID:'y'},
          {label:'Deals Won',data:td.map(function(t){return t.won}),type:'bar',backgroundColor:'rgba(0,229,160,0.25)',borderColor:'#00E5A0',borderWidth:1,borderRadius:4,barPercentage:0.4,yAxisID:'y1'},
          {label:'Deals Lost',data:td.map(function(t){return t.lost}),type:'bar',backgroundColor:'rgba(239,68,68,0.25)',borderColor:'#EF4444',borderWidth:1,borderRadius:4,barPercentage:0.4,yAxisID:'y1'}
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{usePointStyle:true,pointStyle:'circle',padding:16,font:{size:11}}},
        tooltip:{backgroundColor:'#111827',titleColor:'#F9FAFB',bodyColor:'#9CA3AF',borderColor:'#1F2937',borderWidth:1,cornerRadius:8,mode:'index',intersect:false}},
        scales:{
          x:{grid:{display:false},ticks:{font:{size:10},maxRotation:45}},
          y:{position:'left',grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return v+'%'},font:{size:11}},min:20,max:45},
          y1:{position:'right',grid:{display:false},ticks:{font:{size:11}},min:0,max:15}
        }
      }
    });
  }catch(e){console.error('Trend full chart error:',e)}

  /* ---- CHART: Deal Volume (Trends Tab) ---- */
  try{
    var td2=D.trend||[];
    new Chart(document.getElementById('chartVolume').getContext('2d'),{
      type:'bar',
      data:{
        labels:td2.map(function(t){return t.month.split(' ')[0].substring(0,3)+' '+t.month.split(' ')[1].slice(-2)}),
        datasets:[
          {label:'Won',data:td2.map(function(t){return t.won}),backgroundColor:'rgba(0,229,160,0.6)',borderColor:'#00E5A0',borderWidth:1,borderRadius:4,barPercentage:0.7},
          {label:'Lost',data:td2.map(function(t){return t.lost}),backgroundColor:'rgba(239,68,68,0.5)',borderColor:'#EF4444',borderWidth:1,borderRadius:4,barPercentage:0.7}
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{usePointStyle:true,pointStyle:'circle',padding:16,font:{size:11}}},
        tooltip:{backgroundColor:'#111827',titleColor:'#F9FAFB',bodyColor:'#9CA3AF',borderColor:'#1F2937',borderWidth:1,cornerRadius:8}},
        scales:{x:{grid:{display:false},stacked:true,ticks:{font:{size:11}}},y:{grid:{color:'rgba(31,41,55,0.5)'},stacked:true,ticks:{font:{size:11}}}}
      }
    });
  }catch(e){console.error('Volume chart error:',e)}

  /* ---- Competitor Table ---- */
  try{
    var tableComp=document.getElementById('tableCompetitors');
    (D.competitors||[]).forEach(function(c){
      var trendBadge=c.winRate>=30?'<span class="badge badge-green">&#9650; Strong</span>':c.winRate>=25?'<span class="badge badge-amber">&#9644; Neutral</span>':'<span class="badge badge-red">&#9660; Weak</span>';
      tableComp.innerHTML+='<tr><td style="color:var(--text-primary);font-weight:500">'+c.name+'</td><td style="color:var(--vibe-green)">'+c.wins+'</td><td style="color:var(--vibe-red)">'+c.losses+'</td><td style="font-weight:600">'+c.winRate+'%</td><td>'+trendBadge+'</td></tr>';
    });
  }catch(e){console.error('Competitor table error:',e)}

  /* ---- Losses Table ---- */
  try{
    var tableLosses=document.getElementById('tableLosses');
    var reasonBadge=function(r){
      var map={Price:'badge-red',Competition:'badge-amber',Timing:'badge-cyan','No Budget':'badge-violet','No Champion':'badge-blue',Other:'badge-amber'};
      return '<span class="badge '+(map[r]||'badge-amber')+'">'+r+'</span>';
    };
    (D.losses||[]).forEach(function(l){
      tableLosses.innerHTML+='<tr><td style="color:var(--text-primary);font-weight:500">'+l.company+'</td><td>'+l.value+'</td><td>'+l.stageLost+'</td><td>'+reasonBadge(l.reason)+'</td><td>'+(l.competitor||'-')+'</td><td>'+l.owner+'</td><td>'+l.date+'</td></tr>';
    });
  }catch(e){console.error('Losses table error:',e)}

  /* ---- Wins Table ---- */
  try{
    var tableWins=document.getElementById('tableWins');
    (D.wins||[]).forEach(function(w){
      tableWins.innerHTML+='<tr><td style="color:var(--text-primary);font-weight:500">'+w.company+'</td><td style="color:var(--vibe-green)">'+w.value+'</td><td><span class="badge badge-green">'+w.keyFactor+'</span></td><td>'+(w.competitorDisplaced||'-')+'</td><td>'+w.owner+'</td><td>'+w.closeDate+'</td></tr>';
    });
  }catch(e){console.error('Wins table error:',e)}

  /* ---- vibeLoadData placeholder ---- */
  async function vibeLoadData(){
    try{
      var cfg=window.__VIBE_CONFIG__||{};
      if(!cfg.supabaseUrl||cfg.supabaseUrl==='__SUPABASE_URL__')return;
      var res=await fetch(cfg.supabaseUrl+'/rest/v1/rpc/get_win_loss_data',{
        method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabaseKey,'Authorization':'Bearer '+cfg.supabaseKey},
        body:JSON.stringify({team_id:cfg.teamId})
      });
      if(!res.ok)throw new Error('API '+res.status);
      var live=await res.json();
      if(live&&live.kpis)window.__VIBE_SAMPLE__=live;
    }catch(err){
      console.warn('vibeLoadData fallback to sample:',err);
    }
  }
  try{vibeLoadData()}catch(e){console.warn('vibeLoadData init error:',e)}
})();
</script>
</body>
</html>$$
WHERE skill_name = 'win-loss-analysis';
