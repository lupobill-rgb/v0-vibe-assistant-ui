UPDATE skill_registry SET html_skeleton = $$
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Pipeline Review Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<script>
window.__VIBE_TEAM_ID__="__VIBE_TEAM_ID__";
window.__SUPABASE_URL__="__SUPABASE_URL__";
window.__SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";
window.__VIBE_SAMPLE__={
  kpis:[
    {id:"total-pipeline",label:"Total Pipeline",value:"$3.8M",trend:"+12%",direction:"up"},
    {id:"deals-at-risk",label:"Deals at Risk",value:"12",trend:"+3",direction:"down"},
    {id:"avg-stage-age",label:"Avg Stage Age",value:"18d",trend:"-2d",direction:"up"},
    {id:"win-rate",label:"Win Rate",value:"34%",trend:"+4%",direction:"up"},
    {id:"pipeline-coverage",label:"Pipeline Coverage",value:"3.2x",trend:"+0.3x",direction:"up"},
    {id:"stalled-deals",label:"Stalled Deals",value:"8",trend:"-2",direction:"up"}
  ],
  deals:[
    {company:"Acme Corp",stage:"Negotiation",value:420000,daysInStage:8,owner:"Sarah Chen",nextAction:"Send revised proposal",risk:"on-track"},
    {company:"TechFlow Inc",stage:"Proposal",value:185000,daysInStage:22,owner:"Marcus Johnson",nextAction:"Schedule demo",risk:"at-risk"},
    {company:"GlobalPay",stage:"Qualified",value:310000,daysInStage:5,owner:"Sarah Chen",nextAction:"Discovery call",risk:"on-track"},
    {company:"DataSync Ltd",stage:"Prospecting",value:95000,daysInStage:14,owner:"Emily Rodriguez",nextAction:"Initial outreach",risk:"on-track"},
    {company:"CloudBase",stage:"Negotiation",value:275000,daysInStage:31,owner:"Marcus Johnson",nextAction:"Follow up on pricing",risk:"stalled"},
    {company:"NexGen AI",stage:"Proposal",value:520000,daysInStage:12,owner:"Sarah Chen",nextAction:"Technical review",risk:"on-track"},
    {company:"Vertex Labs",stage:"Qualified",value:148000,daysInStage:19,owner:"Emily Rodriguez",nextAction:"Send case study",risk:"at-risk"},
    {company:"PayStream",stage:"Negotiation",value:390000,daysInStage:6,owner:"David Kim",nextAction:"Contract review",risk:"on-track"},
    {company:"InnoTech",stage:"Prospecting",value:72000,daysInStage:28,owner:"David Kim",nextAction:"Qualify budget",risk:"stalled"},
    {company:"FinServe Pro",stage:"Proposal",value:445000,daysInStage:15,owner:"Sarah Chen",nextAction:"Stakeholder alignment",risk:"at-risk"},
    {company:"MedTech Solutions",stage:"Closed",value:310000,daysInStage:2,owner:"Marcus Johnson",nextAction:"Onboarding",risk:"on-track"},
    {company:"RetailMax",stage:"Qualified",value:165000,daysInStage:11,owner:"Emily Rodriguez",nextAction:"Product demo",risk:"on-track"},
    {company:"Quantum Data",stage:"Negotiation",value:580000,daysInStage:18,owner:"David Kim",nextAction:"Legal review",risk:"at-risk"},
    {company:"AgriTech Co",stage:"Prospecting",value:88000,daysInStage:35,owner:"Marcus Johnson",nextAction:"Re-engage contact",risk:"stalled"},
    {company:"Lumin Health",stage:"Proposal",value:295000,daysInStage:9,owner:"Sarah Chen",nextAction:"ROI presentation",risk:"on-track"},
    {company:"SecureNet",stage:"Qualified",value:210000,daysInStage:7,owner:"David Kim",nextAction:"Technical assessment",risk:"on-track"},
    {company:"EduPlatform",stage:"Prospecting",value:125000,daysInStage:16,owner:"Emily Rodriguez",nextAction:"Schedule intro call",risk:"on-track"},
    {company:"BuildRight",stage:"Negotiation",value:340000,daysInStage:25,owner:"Marcus Johnson",nextAction:"Discount approval",risk:"at-risk"},
    {company:"CyberShield",stage:"Proposal",value:470000,daysInStage:4,owner:"David Kim",nextAction:"Scope finalization",risk:"on-track"},
    {company:"TransLog",stage:"Qualified",value:195000,daysInStage:21,owner:"Emily Rodriguez",nextAction:"Champion alignment",risk:"at-risk"},
    {company:"BioGen Labs",stage:"Prospecting",value:68000,daysInStage:42,owner:"Sarah Chen",nextAction:"Re-qualify opportunity",risk:"stalled"},
    {company:"UrbanTech",stage:"Negotiation",value:415000,daysInStage:10,owner:"Marcus Johnson",nextAction:"Procurement meeting",risk:"on-track"},
    {company:"SmartGrid",stage:"Proposal",value:230000,daysInStage:17,owner:"Emily Rodriguez",nextAction:"Technical deep dive",risk:"at-risk"},
    {company:"NanoMed",stage:"Closed",value:185000,daysInStage:1,owner:"David Kim",nextAction:"Kickoff meeting",risk:"on-track"},
    {company:"AeroSpace Dynamics",stage:"Qualified",value:375000,daysInStage:8,owner:"Sarah Chen",nextAction:"Executive sponsor intro",risk:"on-track"},
    {company:"FoodChain Co",stage:"Prospecting",value:110000,daysInStage:19,owner:"Marcus Johnson",nextAction:"Pain point validation",risk:"on-track"},
    {company:"LogiFlow",stage:"Negotiation",value:290000,daysInStage:29,owner:"David Kim",nextAction:"Final terms",risk:"stalled"},
    {company:"PharmaCore",stage:"Proposal",value:610000,daysInStage:11,owner:"Sarah Chen",nextAction:"Compliance review",risk:"on-track"},
    {company:"GreenEnergy",stage:"Qualified",value:175000,daysInStage:13,owner:"Emily Rodriguez",nextAction:"Use case mapping",risk:"on-track"},
    {company:"MetalWorks",stage:"Prospecting",value:82000,daysInStage:24,owner:"David Kim",nextAction:"Identify decision maker",risk:"at-risk"},
    {company:"VisionAI",stage:"Negotiation",value:505000,daysInStage:7,owner:"Sarah Chen",nextAction:"SOW finalization",risk:"on-track"},
    {company:"CloudKitchen",stage:"Proposal",value:155000,daysInStage:20,owner:"Marcus Johnson",nextAction:"Budget reconfirmation",risk:"at-risk"},
    {company:"TeleHealth Plus",stage:"Qualified",value:245000,daysInStage:6,owner:"David Kim",nextAction:"Security questionnaire",risk:"on-track"},
    {company:"AutoDrive",stage:"Prospecting",value:135000,daysInStage:31,owner:"Emily Rodriguez",nextAction:"Warm intro via partner",risk:"stalled"},
    {company:"SolarTech",stage:"Negotiation",value:360000,daysInStage:14,owner:"Marcus Johnson",nextAction:"Multi-year structure",risk:"on-track"},
    {company:"DigiBank",stage:"Proposal",value:490000,daysInStage:8,owner:"Sarah Chen",nextAction:"Pilot scoping",risk:"on-track"},
    {company:"HealthBridge",stage:"Closed",value:220000,daysInStage:1,owner:"Emily Rodriguez",nextAction:"Implementation plan",risk:"on-track"},
    {company:"RoboLab",stage:"Qualified",value:158000,daysInStage:15,owner:"David Kim",nextAction:"Product fit assessment",risk:"at-risk"},
    {company:"StreamMedia",stage:"Prospecting",value:92000,daysInStage:10,owner:"Marcus Johnson",nextAction:"Content audit",risk:"on-track"},
    {company:"PackLogix",stage:"Negotiation",value:265000,daysInStage:33,owner:"Emily Rodriguez",nextAction:"Executive escalation",risk:"stalled"},
    {company:"InsureTech",stage:"Proposal",value:380000,daysInStage:13,owner:"David Kim",nextAction:"Reference call setup",risk:"on-track"},
    {company:"AquaPure",stage:"Qualified",value:142000,daysInStage:9,owner:"Sarah Chen",nextAction:"ROI workshop",risk:"on-track"},
    {company:"SpaceLink",stage:"Prospecting",value:78000,daysInStage:7,owner:"Emily Rodriguez",nextAction:"Initial discovery",risk:"on-track"},
    {company:"DevTools Pro",stage:"Negotiation",value:315000,daysInStage:11,owner:"Marcus Johnson",nextAction:"Partnership terms",risk:"on-track"},
    {company:"EcoMaterials",stage:"Proposal",value:198000,daysInStage:26,owner:"David Kim",nextAction:"Re-engage champion",risk:"stalled"},
    {company:"NetSecure",stage:"Closed",value:275000,daysInStage:1,owner:"Sarah Chen",nextAction:"Onboarding kickoff",risk:"on-track"},
    {company:"WaveEnergy",stage:"Qualified",value:205000,daysInStage:12,owner:"Emily Rodriguez",nextAction:"Technical POC",risk:"on-track"}
  ],
  stageages:[
    {stage:"Prospecting",avgDays:21},
    {stage:"Qualified",avgDays:12},
    {stage:"Proposal",avgDays:14},
    {stage:"Negotiation",avgDays:17},
    {stage:"Closed",avgDays:1}
  ],
  trend:[
    {week:"W1",value:2800000},{week:"W2",value:2950000},{week:"W3",value:3100000},
    {week:"W4",value:2900000},{week:"W5",value:3200000},{week:"W6",value:3350000},
    {week:"W7",value:3150000},{week:"W8",value:3400000},{week:"W9",value:3550000},
    {week:"W10",value:3300000},{week:"W11",value:3650000},{week:"W12",value:3800000}
  ],
  risks:[
    {status:"On Track",count:27,color:"#00E5A0"},
    {status:"At Risk",count:12,color:"#F59E0B"},
    {status:"Stalled",count:8,color:"#EF4444"},
    {status:"Lost",count:0,color:"#6B7280"}
  ],
  stalled:[
    {company:"CloudBase",value:275000,lastActivity:"2026-03-12",daysStalled:31,owner:"Marcus Johnson",action:"Executive re-engagement campaign"},
    {company:"InnoTech",value:72000,lastActivity:"2026-03-15",daysStalled:28,owner:"David Kim",action:"Budget re-qualification call"},
    {company:"AgriTech Co",value:88000,lastActivity:"2026-03-08",daysStalled:35,owner:"Marcus Johnson",action:"Partner-assisted warm intro"},
    {company:"BioGen Labs",value:68000,lastActivity:"2026-03-01",daysStalled:42,owner:"Sarah Chen",action:"Re-qualify or close-lost"},
    {company:"LogiFlow",value:290000,lastActivity:"2026-03-14",daysStalled:29,owner:"David Kim",action:"Escalate to VP of Sales"},
    {company:"AutoDrive",value:135000,lastActivity:"2026-03-12",daysStalled:31,owner:"Emily Rodriguez",action:"New stakeholder outreach"},
    {company:"PackLogix",value:265000,lastActivity:"2026-03-10",daysStalled:33,owner:"Emily Rodriguez",action:"Competitive displacement play"},
    {company:"EcoMaterials",value:198000,lastActivity:"2026-03-17",daysStalled:26,owner:"David Kim",action:"Champion realignment session"}
  ]
};
</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg-primary:#0A0E17;--bg-card:#111827;--bg-card-hover:#1a2332;
  --border-subtle:rgba(255,255,255,0.06);--border-card:rgba(255,255,255,0.08);
  --text-primary:#F9FAFB;--text-secondary:#9CA3AF;--text-muted:#6B7280;
  --accent-green:#00E5A0;--accent-cyan:#00B4D8;--accent-violet:#7B61FF;
  --accent-amber:#F59E0B;--accent-red:#EF4444;
  --font-heading:'Space Grotesk',sans-serif;--font-body:'Inter',sans-serif;
  --radius-sm:8px;--radius-md:12px;--radius-lg:16px;
  --shadow-card:0 4px 24px rgba(0,0,0,0.3);
  --glass-bg:rgba(17,24,39,0.7);--glass-border:rgba(255,255,255,0.08);
}
body{
  font-family:var(--font-body);background:var(--bg-primary);color:var(--text-primary);
  min-height:100vh;overflow-x:hidden;
}
/* Navbar */
.navbar{
  position:sticky;top:0;z-index:100;
  background:var(--glass-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--glass-border);padding:0 32px;height:64px;
  display:flex;align-items:center;justify-content:space-between;
}
.navbar-brand{font-family:var(--font-heading);font-size:20px;font-weight:700;
  background:linear-gradient(135deg,var(--accent-green),var(--accent-cyan));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.navbar-subtitle{color:var(--text-secondary);font-size:13px;margin-left:12px}
.navbar-right{display:flex;align-items:center;gap:16px}
.navbar-status{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)}
.navbar-dot{width:8px;height:8px;border-radius:50%;background:var(--accent-green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
/* Container */
.container{max-width:1440px;margin:0 auto;padding:24px 32px}
/* Header */
.page-header{margin-bottom:28px}
.page-title{font-family:var(--font-heading);font-size:28px;font-weight:700;margin-bottom:4px}
.page-desc{color:var(--text-secondary);font-size:14px}
/* Tabs */
.tabs{display:flex;gap:4px;background:var(--bg-card);border-radius:var(--radius-md);
  padding:4px;margin-bottom:28px;border:1px solid var(--border-card);width:fit-content}
.tab{padding:10px 20px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;
  cursor:pointer;transition:all .2s;color:var(--text-secondary);border:none;background:none;
  font-family:var(--font-body)}
.tab:hover{color:var(--text-primary);background:rgba(255,255,255,0.04)}
.tab.active{background:var(--accent-green);color:var(--bg-primary);font-weight:600}
/* KPI Grid */
.kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-bottom:28px}
@media(max-width:1200px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){.kpi-grid{grid-template-columns:repeat(2,1fr)}}
.kpi-card{
  background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-md);
  padding:20px;transition:all .25s;position:relative;overflow:hidden;
}
.kpi-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--accent-green),var(--accent-cyan));opacity:0;transition:opacity .25s;
}
.kpi-card:hover{border-color:rgba(0,229,160,0.2);transform:translateY(-2px);box-shadow:var(--shadow-card)}
.kpi-card:hover::before{opacity:1}
.kpi-label{font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;font-weight:500}
.kpi-value{font-family:var(--font-heading);font-size:26px;font-weight:700;margin-bottom:6px}
.kpi-trend{font-size:12px;display:flex;align-items:center;gap:4px}
.kpi-trend.up{color:var(--accent-green)}
.kpi-trend.down{color:var(--accent-red)}
/* Charts Grid */
.charts-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:28px}
@media(max-width:900px){.charts-grid{grid-template-columns:1fr}}
.chart-card{
  background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-lg);
  padding:24px;transition:all .25s;
}
.chart-card:hover{border-color:rgba(0,229,160,0.15);box-shadow:var(--shadow-card)}
.chart-card.full-width{grid-column:1/-1}
.chart-title{font-family:var(--font-heading);font-size:16px;font-weight:600;margin-bottom:4px}
.chart-subtitle{font-size:12px;color:var(--text-muted);margin-bottom:16px}
.chart-container{position:relative;width:100%;height:280px}
.chart-container canvas{width:100%!important;height:100%!important}
/* Tables */
.table-card{
  background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-lg);
  padding:24px;margin-bottom:20px;overflow-x:auto;
}
.table-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.table-title{font-family:var(--font-heading);font-size:16px;font-weight:600}
.table-count{font-size:12px;color:var(--text-muted);background:rgba(255,255,255,0.05);
  padding:4px 10px;border-radius:20px}
table{width:100%;border-collapse:collapse}
thead th{
  text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;
  color:var(--text-muted);padding:12px 16px;border-bottom:1px solid var(--border-subtle);
  font-weight:600;white-space:nowrap;
}
tbody td{
  padding:14px 16px;border-bottom:1px solid var(--border-subtle);font-size:13px;
  color:var(--text-secondary);white-space:nowrap;
}
tbody tr{transition:background .15s}
tbody tr:hover{background:var(--bg-card-hover)}
tbody tr:last-child td{border-bottom:none}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
.badge-on-track{background:rgba(0,229,160,0.12);color:var(--accent-green)}
.badge-at-risk{background:rgba(245,158,11,0.12);color:var(--accent-amber)}
.badge-stalled{background:rgba(239,68,68,0.12);color:var(--accent-red)}
.badge-closed{background:rgba(123,97,255,0.12);color:var(--accent-violet)}
.value-cell{font-family:var(--font-heading);font-weight:600;color:var(--text-primary)}
/* Tab Panels */
.tab-panel{display:none}
.tab-panel.active{display:block}
/* Search & Filters */
.filter-bar{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.filter-input{
  background:rgba(255,255,255,0.04);border:1px solid var(--border-card);border-radius:var(--radius-sm);
  padding:8px 14px;color:var(--text-primary);font-size:13px;font-family:var(--font-body);
  outline:none;transition:border-color .2s;min-width:200px;
}
.filter-input:focus{border-color:var(--accent-green)}
.filter-select{
  background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-sm);
  padding:8px 14px;color:var(--text-primary);font-size:13px;font-family:var(--font-body);
  outline:none;cursor:pointer;
}
/* Scrollbar */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.2)}
/* Stage indicator */
.stage-indicator{display:flex;align-items:center;gap:8px}
.stage-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.stage-prospecting{background:#6B7280}
.stage-qualified{background:var(--accent-cyan)}
.stage-proposal{background:var(--accent-violet)}
.stage-negotiation{background:var(--accent-amber)}
.stage-closed{background:var(--accent-green)}
/* Funnel */
.funnel-container{display:flex;flex-direction:column;gap:8px;padding:8px 0}
.funnel-row{display:flex;align-items:center;gap:12px}
.funnel-label{width:100px;font-size:12px;color:var(--text-secondary);text-align:right;flex-shrink:0}
.funnel-bar-wrap{flex:1;height:36px;background:rgba(255,255,255,0.03);border-radius:6px;overflow:hidden;position:relative}
.funnel-bar{height:100%;border-radius:6px;display:flex;align-items:center;justify-content:flex-end;padding-right:12px;
  transition:width .8s cubic-bezier(.4,0,.2,1);min-width:60px}
.funnel-bar span{font-size:12px;font-weight:600;color:var(--bg-primary)}
.funnel-value{font-size:13px;font-weight:600;color:var(--text-primary);width:80px;text-align:right}
/* Rep cards */
.rep-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
@media(max-width:900px){.rep-grid{grid-template-columns:1fr}}
.rep-card{background:var(--bg-card);border:1px solid var(--border-card);border-radius:var(--radius-md);padding:20px;transition:all .25s}
.rep-card:hover{border-color:rgba(0,229,160,0.15);box-shadow:var(--shadow-card)}
.rep-name{font-family:var(--font-heading);font-size:16px;font-weight:600;margin-bottom:12px}
.rep-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.rep-stat-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px}
.rep-stat-value{font-family:var(--font-heading);font-size:18px;font-weight:700;margin-top:2px}
.rep-bar{height:6px;background:rgba(255,255,255,0.06);border-radius:3px;margin-top:8px;overflow:hidden}
.rep-bar-fill{height:100%;border-radius:3px;transition:width .6s ease}
/* Activity timeline */
.activity-list{display:flex;flex-direction:column;gap:12px}
.activity-item{display:flex;gap:12px;padding:12px;border-radius:var(--radius-sm);
  background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle);transition:all .15s}
.activity-item:hover{background:rgba(255,255,255,0.04)}
.activity-icon{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;flex-shrink:0;font-size:14px}
.activity-icon.move{background:rgba(0,229,160,0.12);color:var(--accent-green)}
.activity-icon.risk{background:rgba(245,158,11,0.12);color:var(--accent-amber)}
.activity-icon.won{background:rgba(123,97,255,0.12);color:var(--accent-violet)}
.activity-icon.lost{background:rgba(239,68,68,0.12);color:var(--accent-red)}
.activity-content{flex:1}
.activity-title{font-size:13px;font-weight:500;margin-bottom:2px}
.activity-meta{font-size:11px;color:var(--text-muted)}
/* Animations */
@keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.animate-in{animation:fadeInUp .4s ease forwards;opacity:0}
</style>
</head>
<body>

<!-- Navbar -->
<nav class="navbar">
  <div style="display:flex;align-items:center">
    <span class="navbar-brand">UbiVibe</span>
    <span class="navbar-subtitle">Pipeline Review</span>
  </div>
  <div class="navbar-right">
    <div class="navbar-status"><span class="navbar-dot"></span> Live Data</div>
  </div>
</nav>

<!-- Main Content -->
<div class="container">
  <div class="page-header animate-in" style="animation-delay:.05s">
    <h1 class="page-title">Pipeline Review</h1>
    <p class="page-desc">Real-time pipeline health, stage analysis, and deal risk insights</p>
  </div>

  <!-- Tabs -->
  <div class="tabs animate-in" style="animation-delay:.1s">
    <button class="tab active" data-tab="overview">Overview</button>
    <button class="tab" data-tab="by-stage">By Stage</button>
    <button class="tab" data-tab="by-rep">By Rep</button>
    <button class="tab" data-tab="risk-analysis">Risk Analysis</button>
    <button class="tab" data-tab="activity">Activity</button>
  </div>

  <!-- ==================== OVERVIEW TAB ==================== -->
  <div class="tab-panel active" id="panel-overview">
    <!-- KPI Grid -->
    <div class="kpi-grid animate-in" style="animation-delay:.15s">
      <div class="kpi-card">
        <div class="kpi-label">Total Pipeline</div>
        <div class="kpi-value" id="kpi-total-pipeline">--</div>
        <div class="kpi-trend" id="kpi-trend-total-pipeline"></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Deals at Risk</div>
        <div class="kpi-value" id="kpi-deals-at-risk">--</div>
        <div class="kpi-trend" id="kpi-trend-deals-at-risk"></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg Stage Age</div>
        <div class="kpi-value" id="kpi-avg-stage-age">--</div>
        <div class="kpi-trend" id="kpi-trend-avg-stage-age"></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Win Rate</div>
        <div class="kpi-value" id="kpi-win-rate">--</div>
        <div class="kpi-trend" id="kpi-trend-win-rate"></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pipeline Coverage</div>
        <div class="kpi-value" id="kpi-pipeline-coverage">--</div>
        <div class="kpi-trend" id="kpi-trend-pipeline-coverage"></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Stalled Deals</div>
        <div class="kpi-value" id="kpi-stalled-deals">--</div>
        <div class="kpi-trend" id="kpi-trend-stalled-deals"></div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid animate-in" style="animation-delay:.2s">
      <div class="chart-card">
        <div class="chart-title">Pipeline by Stage</div>
        <div class="chart-subtitle">Deal count and value through the funnel</div>
        <div class="chart-container"><canvas id="chart-pipeline-stage"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Deal Age by Stage</div>
        <div class="chart-subtitle">Average days deals spend in each stage</div>
        <div class="chart-container"><canvas id="chart-stage-age"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Pipeline Trend</div>
        <div class="chart-subtitle">Total pipeline value over the past 12 weeks</div>
        <div class="chart-container"><canvas id="chart-pipeline-trend"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Risk Distribution</div>
        <div class="chart-subtitle">Current deal health breakdown</div>
        <div class="chart-container"><canvas id="chart-risk-dist"></canvas></div>
      </div>
    </div>

    <!-- Pipeline Deals Table -->
    <div class="table-card animate-in" style="animation-delay:.25s">
      <div class="table-header">
        <div class="table-title">All Pipeline Deals</div>
        <div class="table-count" id="deal-count">--</div>
      </div>
      <div class="filter-bar">
        <input class="filter-input" id="deal-search" type="text" placeholder="Search company or owner..."/>
        <select class="filter-select" id="stage-filter">
          <option value="">All Stages</option>
          <option value="Prospecting">Prospecting</option>
          <option value="Qualified">Qualified</option>
          <option value="Proposal">Proposal</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Closed">Closed</option>
        </select>
        <select class="filter-select" id="risk-filter">
          <option value="">All Risks</option>
          <option value="on-track">On Track</option>
          <option value="at-risk">At Risk</option>
          <option value="stalled">Stalled</option>
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th>Company</th><th>Stage</th><th>Value</th><th>Days in Stage</th>
            <th>Owner</th><th>Next Action</th><th>Risk</th>
          </tr>
        </thead>
        <tbody id="deals-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- ==================== BY STAGE TAB ==================== -->
  <div class="tab-panel" id="panel-by-stage">
    <div class="chart-card animate-in" style="margin-bottom:20px">
      <div class="chart-title">Stage Funnel</div>
      <div class="chart-subtitle">Pipeline value and deal count by stage</div>
      <div class="funnel-container" id="stage-funnel"></div>
    </div>
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Value by Stage</div>
        <div class="chart-subtitle">Total pipeline value at each stage</div>
        <div class="chart-container"><canvas id="chart-value-stage"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Stage Velocity</div>
        <div class="chart-subtitle">Average days to advance through each stage</div>
        <div class="chart-container"><canvas id="chart-velocity"></canvas></div>
      </div>
    </div>
    <div class="table-card" style="margin-top:20px">
      <div class="table-header">
        <div class="table-title">Stage Summary</div>
      </div>
      <table>
        <thead><tr><th>Stage</th><th>Deals</th><th>Total Value</th><th>Avg Value</th><th>Avg Days</th><th>Conversion</th></tr></thead>
        <tbody id="stage-summary-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- ==================== BY REP TAB ==================== -->
  <div class="tab-panel" id="panel-by-rep">
    <div class="rep-grid" id="rep-grid"></div>
  </div>

  <!-- ==================== RISK ANALYSIS TAB ==================== -->
  <div class="tab-panel" id="panel-risk-analysis">
    <div class="charts-grid" style="margin-bottom:20px">
      <div class="chart-card">
        <div class="chart-title">Risk by Value</div>
        <div class="chart-subtitle">Pipeline value at risk by category</div>
        <div class="chart-container"><canvas id="chart-risk-value"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Risk by Stage</div>
        <div class="chart-subtitle">Which stages carry the most risk</div>
        <div class="chart-container"><canvas id="chart-risk-stage"></canvas></div>
      </div>
    </div>
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">Stalled Deals Requiring Action</div>
        <div class="table-count" id="stalled-count">--</div>
      </div>
      <table>
        <thead>
          <tr><th>Company</th><th>Value</th><th>Last Activity</th><th>Days Stalled</th><th>Owner</th><th>Recommended Action</th></tr>
        </thead>
        <tbody id="stalled-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- ==================== ACTIVITY TAB ==================== -->
  <div class="tab-panel" id="panel-activity">
    <div class="chart-card" style="margin-bottom:20px">
      <div class="chart-title">Recent Pipeline Activity</div>
      <div class="chart-subtitle">Stage movements, risk changes, and deal outcomes</div>
      <div class="activity-list" id="activity-list"></div>
    </div>
  </div>
</div>

<script>
(function(){
  // ===== vibeLoadData helper =====
  async function vibeLoadData(table,params){
    var url=window.__SUPABASE_URL__+'/rest/v1/'+table+'?team_id=eq.'+params.team_id;
    var res=await fetch(url,{headers:{'apikey':window.__SUPABASE_ANON_KEY__,'Authorization':'Bearer '+window.__SUPABASE_ANON_KEY__}});
    if(!res.ok) throw new Error('fetch failed');
    return res.json();
  }

  // ===== Tab switching =====
  var tabs=document.querySelectorAll('.tab');
  tabs.forEach(function(t){
    t.addEventListener('click',function(){
      tabs.forEach(function(x){x.classList.remove('active')});
      t.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.remove('active')});
      document.getElementById('panel-'+t.getAttribute('data-tab')).classList.add('active');
    });
  });

  // ===== KPI rendering =====
  var kpis=(window.__VIBE_SAMPLE__||{}).kpis||[];
  kpis.forEach(function(k){
    var el=document.getElementById('kpi-'+k.id);
    if(el) el.textContent=k.value;
    var trendEl=document.getElementById('kpi-trend-'+k.id);
    if(trendEl){
      trendEl.className='kpi-trend '+(k.direction==='up'?'up':'down');
      trendEl.innerHTML=(k.direction==='up'?'&#9650;':'&#9660;')+' '+k.trend;
    }
  });

  // ===== Helper functions =====
  function formatCurrency(v){
    if(v>=1000000) return '$'+(v/1000000).toFixed(1)+'M';
    if(v>=1000) return '$'+(v/1000).toFixed(0)+'K';
    return '$'+v;
  }
  function getBadgeClass(risk){
    if(risk==='on-track') return 'badge-on-track';
    if(risk==='at-risk') return 'badge-at-risk';
    if(risk==='stalled') return 'badge-stalled';
    return 'badge-closed';
  }
  function getBadgeLabel(risk){
    if(risk==='on-track') return 'On Track';
    if(risk==='at-risk') return 'At Risk';
    if(risk==='stalled') return 'Stalled';
    return risk;
  }
  function getStageDotClass(stage){
    var s=stage.toLowerCase();
    if(s==='prospecting') return 'stage-prospecting';
    if(s==='qualified') return 'stage-qualified';
    if(s==='proposal') return 'stage-proposal';
    if(s==='negotiation') return 'stage-negotiation';
    return 'stage-closed';
  }

  // ===== Chart defaults =====
  Chart.defaults.color='#9CA3AF';
  Chart.defaults.borderColor='rgba(255,255,255,0.06)';
  Chart.defaults.font.family='Inter';

  // ===== CHART 1: Pipeline by Stage (horizontal bar) =====
  (async function(){
    var rows=[];
    try{rows=await vibeLoadData('pipeline_by_stage',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!rows.length){
      var deals=(window.__VIBE_SAMPLE__||{}).deals||[];
      var stageMap={};
      ['Prospecting','Qualified','Proposal','Negotiation','Closed'].forEach(function(s){stageMap[s]={count:0,value:0}});
      deals.forEach(function(d){if(stageMap[d.stage]){stageMap[d.stage].count++;stageMap[d.stage].value+=d.value}});
      rows=Object.keys(stageMap).map(function(s){return{stage:s,count:stageMap[s].count,value:stageMap[s].value}});
    }
    new Chart(document.getElementById('chart-pipeline-stage'),{
      type:'bar',
      data:{
        labels:rows.map(function(r){return r.stage}),
        datasets:[{
          label:'Deal Count',data:rows.map(function(r){return r.count}),
          backgroundColor:['#6B7280','#00B4D8','#7B61FF','#F59E0B','#00E5A0'],
          borderRadius:6,barPercentage:0.7
        }]
      },
      options:{
        indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{
          label:function(ctx){return ctx.parsed.x+' deals ('+formatCurrency(rows[ctx.dataIndex].value)+')'}
        }}},
        scales:{x:{grid:{display:false},ticks:{stepSize:5}},y:{grid:{display:false}}}
      }
    });
  })();

  // ===== CHART 2: Deal Age by Stage =====
  (async function(){
    var rows=[];
    try{rows=await vibeLoadData('stage_ages',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).stageages||[];
    new Chart(document.getElementById('chart-stage-age'),{
      type:'bar',
      data:{
        labels:rows.map(function(r){return r.stage}),
        datasets:[{
          label:'Avg Days',data:rows.map(function(r){return r.avgDays}),
          backgroundColor:['#6B7280','#00B4D8','#7B61FF','#F59E0B','#00E5A0'],
          borderRadius:6,barPercentage:0.6
        }]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{
          label:function(ctx){return ctx.parsed.y+' days avg'}
        }}},
        scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:function(v){return v+'d'}}}}
      }
    });
  })();

  // ===== CHART 3: Pipeline Trend (line) =====
  (async function(){
    var rows=[];
    try{rows=await vibeLoadData('pipeline_trend',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).trend||[];
    new Chart(document.getElementById('chart-pipeline-trend'),{
      type:'line',
      data:{
        labels:rows.map(function(r){return r.week}),
        datasets:[{
          label:'Pipeline Value',data:rows.map(function(r){return r.value}),
          borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.08)',
          fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#00E5A0',
          pointBorderColor:'#0A0E17',pointBorderWidth:2,pointHoverRadius:6
        }]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{
          label:function(ctx){return formatCurrency(ctx.parsed.y)}
        }}},
        scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:function(v){return formatCurrency(v)}}}}
      }
    });
  })();

  // ===== CHART 4: Risk Distribution (doughnut) =====
  (async function(){
    var rows=[];
    try{rows=await vibeLoadData('risk_distribution',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).risks||[];
    new Chart(document.getElementById('chart-risk-dist'),{
      type:'doughnut',
      data:{
        labels:rows.map(function(r){return r.status}),
        datasets:[{
          data:rows.map(function(r){return r.count}),
          backgroundColor:rows.map(function(r){return r.color}),
          borderWidth:0,hoverOffset:8
        }]
      },
      options:{
        responsive:true,maintainAspectRatio:false,cutout:'65%',
        plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',font:{size:12}}}}
      }
    });
  })();

  // ===== Deals Table Rendering =====
  var allDeals=(window.__VIBE_SAMPLE__||{}).deals||[];
  function renderDeals(deals){
    var tbody=document.getElementById('deals-tbody');
    document.getElementById('deal-count').textContent=deals.length+' deals';
    tbody.innerHTML=deals.map(function(d){
      return '<tr>'+
        '<td style="font-weight:500;color:var(--text-primary)">'+d.company+'</td>'+
        '<td><div class="stage-indicator"><span class="stage-dot '+getStageDotClass(d.stage)+'"></span>'+d.stage+'</div></td>'+
        '<td class="value-cell">'+formatCurrency(d.value)+'</td>'+
        '<td>'+(d.daysInStage>20?'<span style="color:var(--accent-amber)">'+d.daysInStage+'d</span>':d.daysInStage+'d')+'</td>'+
        '<td>'+d.owner+'</td>'+
        '<td style="max-width:200px;white-space:normal">'+d.nextAction+'</td>'+
        '<td><span class="badge '+getBadgeClass(d.risk)+'">'+getBadgeLabel(d.risk)+'</span></td>'+
      '</tr>';
    }).join('');
  }
  renderDeals(allDeals);

  // ===== Deals Filtering =====
  function filterDeals(){
    var search=(document.getElementById('deal-search').value||'').toLowerCase();
    var stageF=document.getElementById('stage-filter').value;
    var riskF=document.getElementById('risk-filter').value;
    var filtered=allDeals.filter(function(d){
      var matchSearch=!search||d.company.toLowerCase().indexOf(search)>-1||d.owner.toLowerCase().indexOf(search)>-1;
      var matchStage=!stageF||d.stage===stageF;
      var matchRisk=!riskF||d.risk===riskF;
      return matchSearch&&matchStage&&matchRisk;
    });
    renderDeals(filtered);
  }
  document.getElementById('deal-search').addEventListener('input',filterDeals);
  document.getElementById('stage-filter').addEventListener('change',filterDeals);
  document.getElementById('risk-filter').addEventListener('change',filterDeals);

  // ===== BY STAGE: Funnel =====
  (function(){
    var deals=(window.__VIBE_SAMPLE__||{}).deals||[];
    var stages=['Prospecting','Qualified','Proposal','Negotiation','Closed'];
    var stageData=stages.map(function(s){
      var sd=deals.filter(function(d){return d.stage===s});
      return{stage:s,count:sd.length,value:sd.reduce(function(a,d){return a+d.value},0)};
    });
    var maxVal=Math.max.apply(null,stageData.map(function(s){return s.value}));
    var colors=['#6B7280','#00B4D8','#7B61FF','#F59E0B','#00E5A0'];
    var funnel=document.getElementById('stage-funnel');
    funnel.innerHTML=stageData.map(function(s,i){
      var pct=maxVal>0?Math.max((s.value/maxVal)*100,15):15;
      return '<div class="funnel-row">'+
        '<div class="funnel-label">'+s.stage+'</div>'+
        '<div class="funnel-bar-wrap"><div class="funnel-bar" style="width:'+pct+'%;background:'+colors[i]+'"><span>'+s.count+'</span></div></div>'+
        '<div class="funnel-value">'+formatCurrency(s.value)+'</div></div>';
    }).join('');
  })();

  // ===== BY STAGE: Value chart & Velocity chart =====
  (function(){
    var deals=(window.__VIBE_SAMPLE__||{}).deals||[];
    var stages=['Prospecting','Qualified','Proposal','Negotiation','Closed'];
    var colors=['#6B7280','#00B4D8','#7B61FF','#F59E0B','#00E5A0'];
    var stageVals=stages.map(function(s){return deals.filter(function(d){return d.stage===s}).reduce(function(a,d){return a+d.value},0)});
    new Chart(document.getElementById('chart-value-stage'),{
      type:'bar',data:{labels:stages,datasets:[{data:stageVals,backgroundColor:colors,borderRadius:6,barPercentage:0.6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:function(v){return formatCurrency(v)}}}}}
    });
    var sa=(window.__VIBE_SAMPLE__||{}).stageages||[];
    new Chart(document.getElementById('chart-velocity'),{
      type:'bar',data:{labels:sa.map(function(r){return r.stage}),datasets:[{data:sa.map(function(r){return r.avgDays}),backgroundColor:colors,borderRadius:6,barPercentage:0.6}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:function(v){return v+'d'}}}}}
    });
  })();

  // ===== BY STAGE: Summary table =====
  (function(){
    var deals=(window.__VIBE_SAMPLE__||{}).deals||[];
    var stages=['Prospecting','Qualified','Proposal','Negotiation','Closed'];
    var tbody=document.getElementById('stage-summary-tbody');
    var conversionRates=[68,72,55,78,100];
    tbody.innerHTML=stages.map(function(s,i){
      var sd=deals.filter(function(d){return d.stage===s});
      var totalVal=sd.reduce(function(a,d){return a+d.value},0);
      var avgVal=sd.length>0?totalVal/sd.length:0;
      var avgDays=sd.length>0?Math.round(sd.reduce(function(a,d){return a+d.daysInStage},0)/sd.length):0;
      return '<tr><td><div class="stage-indicator"><span class="stage-dot '+getStageDotClass(s)+'"></span>'+s+'</div></td>'+
        '<td>'+sd.length+'</td><td class="value-cell">'+formatCurrency(totalVal)+'</td>'+
        '<td>'+formatCurrency(avgVal)+'</td><td>'+avgDays+'d</td>'+
        '<td>'+conversionRates[i]+'%</td></tr>';
    }).join('');
  })();

  // ===== BY REP =====
  (function(){
    var deals=(window.__VIBE_SAMPLE__||{}).deals||[];
    var repMap={};
    deals.forEach(function(d){
      if(!repMap[d.owner]) repMap[d.owner]={deals:0,value:0,atRisk:0,stalled:0};
      repMap[d.owner].deals++;
      repMap[d.owner].value+=d.value;
      if(d.risk==='at-risk') repMap[d.owner].atRisk++;
      if(d.risk==='stalled') repMap[d.owner].stalled++;
    });
    var totalPipeline=deals.reduce(function(a,d){return a+d.value},0);
    var grid=document.getElementById('rep-grid');
    var repColors=['#00E5A0','#00B4D8','#7B61FF','#F59E0B'];
    var idx=0;
    grid.innerHTML=Object.keys(repMap).map(function(rep){
      var r=repMap[rep];
      var pct=totalPipeline>0?((r.value/totalPipeline)*100).toFixed(1):0;
      var color=repColors[idx%repColors.length];
      idx++;
      return '<div class="rep-card">'+
        '<div class="rep-name">'+rep+'</div>'+
        '<div class="rep-stats">'+
          '<div><div class="rep-stat-label">Deals</div><div class="rep-stat-value">'+r.deals+'</div></div>'+
          '<div><div class="rep-stat-label">Pipeline</div><div class="rep-stat-value">'+formatCurrency(r.value)+'</div></div>'+
          '<div><div class="rep-stat-label">At Risk</div><div class="rep-stat-value" style="color:var(--accent-amber)">'+r.atRisk+'</div></div>'+
        '</div>'+
        '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">'+pct+'% of total pipeline</div>'+
        '<div class="rep-bar"><div class="rep-bar-fill" style="width:'+pct+'%;background:'+color+'"></div></div>'+
      '</div>';
    }).join('');
  })();

  // ===== RISK ANALYSIS: Charts =====
  (function(){
    var deals=(window.__VIBE_SAMPLE__||{}).deals||[];
    var riskGroups={'on-track':{label:'On Track',color:'#00E5A0',value:0},'at-risk':{label:'At Risk',color:'#F59E0B',value:0},'stalled':{label:'Stalled',color:'#EF4444',value:0}};
    deals.forEach(function(d){if(riskGroups[d.risk]) riskGroups[d.risk].value+=d.value});
    var rKeys=Object.keys(riskGroups);
    new Chart(document.getElementById('chart-risk-value'),{
      type:'doughnut',
      data:{labels:rKeys.map(function(k){return riskGroups[k].label}),datasets:[{data:rKeys.map(function(k){return riskGroups[k].value}),backgroundColor:rKeys.map(function(k){return riskGroups[k].color}),borderWidth:0,hoverOffset:8}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',font:{size:12}}}}}
    });
    var stages=['Prospecting','Qualified','Proposal','Negotiation'];
    var riskByStage=stages.map(function(s){
      var sd=deals.filter(function(d){return d.stage===s});
      return{onTrack:sd.filter(function(d){return d.risk==='on-track'}).length,atRisk:sd.filter(function(d){return d.risk==='at-risk'}).length,stalled:sd.filter(function(d){return d.risk==='stalled'}).length};
    });
    new Chart(document.getElementById('chart-risk-stage'),{
      type:'bar',
      data:{labels:stages,datasets:[
        {label:'On Track',data:riskByStage.map(function(r){return r.onTrack}),backgroundColor:'#00E5A0',borderRadius:4},
        {label:'At Risk',data:riskByStage.map(function(r){return r.atRisk}),backgroundColor:'#F59E0B',borderRadius:4},
        {label:'Stalled',data:riskByStage.map(function(r){return r.stalled}),backgroundColor:'#EF4444',borderRadius:4}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true,pointStyle:'circle',font:{size:12}}}},
        scales:{x:{grid:{display:false},stacked:true},y:{grid:{color:'rgba(255,255,255,0.04)'},stacked:true}}}
    });
  })();

  // ===== RISK ANALYSIS: Stalled table =====
  (function(){
    var stalled=(window.__VIBE_SAMPLE__||{}).stalled||[];
    document.getElementById('stalled-count').textContent=stalled.length+' deals';
    var tbody=document.getElementById('stalled-tbody');
    tbody.innerHTML=stalled.map(function(d){
      return '<tr>'+
        '<td style="font-weight:500;color:var(--text-primary)">'+d.company+'</td>'+
        '<td class="value-cell">'+formatCurrency(d.value)+'</td>'+
        '<td>'+d.lastActivity+'</td>'+
        '<td><span style="color:var(--accent-red);font-weight:600">'+d.daysStalled+'d</span></td>'+
        '<td>'+d.owner+'</td>'+
        '<td style="max-width:220px;white-space:normal;color:var(--accent-amber)">'+d.action+'</td>'+
      '</tr>';
    }).join('');
  })();

  // ===== ACTIVITY TAB =====
  (function(){
    var activities=[
      {type:'move',icon:'&#8593;',title:'NexGen AI moved to Proposal',meta:'Sarah Chen - 2 hours ago',detail:'From Qualified to Proposal'},
      {type:'won',icon:'&#9733;',title:'MedTech Solutions - Closed Won',meta:'Marcus Johnson - 5 hours ago',detail:'$310K deal closed'},
      {type:'risk',icon:'&#9888;',title:'TechFlow Inc flagged At Risk',meta:'System - 8 hours ago',detail:'22 days in Proposal stage'},
      {type:'move',icon:'&#8593;',title:'PayStream moved to Negotiation',meta:'David Kim - 1 day ago',detail:'From Proposal to Negotiation'},
      {type:'won',icon:'&#9733;',title:'NanoMed - Closed Won',meta:'David Kim - 1 day ago',detail:'$185K deal closed'},
      {type:'risk',icon:'&#9888;',title:'CloudBase marked Stalled',meta:'System - 1 day ago',detail:'31 days in Negotiation - no activity'},
      {type:'move',icon:'&#8593;',title:'CyberShield moved to Proposal',meta:'David Kim - 2 days ago',detail:'Fast-tracked from Qualified'},
      {type:'lost',icon:'&#10005;',title:'OldCo Inc - Closed Lost',meta:'Emily Rodriguez - 2 days ago',detail:'Lost to competitor - pricing'},
      {type:'move',icon:'&#8593;',title:'DigiBank moved to Proposal',meta:'Sarah Chen - 2 days ago',detail:'Strong champion identified'},
      {type:'risk',icon:'&#9888;',title:'BuildRight flagged At Risk',meta:'System - 3 days ago',detail:'25 days in Negotiation'},
      {type:'won',icon:'&#9733;',title:'HealthBridge - Closed Won',meta:'Emily Rodriguez - 3 days ago',detail:'$220K deal closed'},
      {type:'move',icon:'&#8593;',title:'UrbanTech moved to Negotiation',meta:'Marcus Johnson - 3 days ago',detail:'Proposal accepted, terms next'},
      {type:'won',icon:'&#9733;',title:'NetSecure - Closed Won',meta:'Sarah Chen - 4 days ago',detail:'$275K deal closed'},
      {type:'risk',icon:'&#9888;',title:'Quantum Data flagged At Risk',meta:'System - 4 days ago',detail:'18 days in Negotiation, legal delays'},
      {type:'move',icon:'&#8593;',title:'PharmaCore moved to Proposal',meta:'Sarah Chen - 5 days ago',detail:'Compliance pre-check passed'}
    ];
    var list=document.getElementById('activity-list');
    list.innerHTML=activities.map(function(a){
      return '<div class="activity-item">'+
        '<div class="activity-icon '+a.type+'">'+a.icon+'</div>'+
        '<div class="activity-content">'+
          '<div class="activity-title">'+a.title+'</div>'+
          '<div class="activity-meta">'+a.meta+' &middot; '+a.detail+'</div>'+
        '</div></div>';
    }).join('');
  })();

})();
</script>
</body>
</html>
$$ WHERE skill_name = 'pipeline-review';
