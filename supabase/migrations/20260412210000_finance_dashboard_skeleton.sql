UPDATE skill_registry SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Finance Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<script>
window.__SUPABASE_URL__='';
window.__SUPABASE_ANON_KEY__='';
window.__VIBE_TEAM_ID__='';
window.__VIBE_SAMPLE__={
  kpis:[
    {id:'revenue',label:'Revenue',value:'$4.8M',trend:'+12.3%',direction:'up'},
    {id:'gross-margin',label:'Gross Margin',value:'68.2%',trend:'+2.1%',direction:'up'},
    {id:'burn-rate',label:'Burn Rate',value:'$460K/mo',trend:'-8.4%',direction:'down'},
    {id:'runway',label:'Runway',value:'32 months',trend:'+4 mo',direction:'up'},
    {id:'budget-util',label:'Budget Utilization',value:'74%',trend:'+3.2%',direction:'up'},
    {id:'ebitda',label:'EBITDA',value:'$1.2M',trend:'+18.6%',direction:'up'}
  ],
  revenue:{
    labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    actual:[320,345,380,410,395,420,440,465,490,510,480,520],
    budget:[300,320,340,360,380,400,420,440,460,480,500,520]
  },
  expenses:[
    {category:'Headcount',amount:1920000,pct:40,color:'#00E5A0'},
    {category:'R&D',amount:960000,pct:20,color:'#00B4D8'},
    {category:'Sales & Marketing',amount:720000,pct:15,color:'#7B61FF'},
    {category:'Operations',amount:480000,pct:10,color:'#F59E0B'},
    {category:'G&A',amount:720000,pct:15,color:'#EF4444'}
  ],
  cashflow:{
    labels:['Jul','Aug','Sep','Oct','Nov','Dec'],
    operating:[280,310,295,340,320,360],
    investing:[-120,-95,-140,-110,-130,-100],
    financing:[-50,-60,-45,-70,-55,-65]
  },
  departments:[
    {name:'Engineering',budget:1800,actual:1420,pct:78.9},
    {name:'Sales',budget:1200,actual:980,pct:81.7},
    {name:'Marketing',budget:800,actual:540,pct:67.5},
    {name:'Operations',budget:600,actual:430,pct:71.7},
    {name:'HR & Admin',budget:400,actual:280,pct:70.0},
    {name:'Finance',budget:300,actual:210,pct:70.0}
  ],
  budgetVsActual:[
    {department:'Engineering',budget:1800,actual:1420,variance:-380,pctUsed:78.9,status:'On Track'},
    {department:'Sales',budget:1200,actual:980,variance:-220,pctUsed:81.7,status:'On Track'},
    {department:'Marketing',budget:800,actual:540,variance:-260,pctUsed:67.5,status:'Under'},
    {department:'Operations',budget:600,actual:430,variance:-170,pctUsed:71.7,status:'On Track'},
    {department:'HR & Admin',budget:400,actual:280,variance:-120,pctUsed:70.0,status:'Under'},
    {department:'Finance',budget:300,actual:210,variance:-90,pctUsed:70.0,status:'Under'}
  ],
  transactions:[
    {date:'2026-04-12',description:'AWS Infrastructure',category:'R&D',amount:-28450,balance:2841550,status:'Cleared'},
    {date:'2026-04-11',description:'Payroll - Engineering',category:'Headcount',amount:-186000,balance:2870000,status:'Cleared'},
    {date:'2026-04-11',description:'Client Payment - Acme Corp',category:'Revenue',amount:145000,balance:3056000,status:'Cleared'},
    {date:'2026-04-10',description:'Google Ads',category:'Marketing',amount:-12800,balance:2911000,status:'Cleared'},
    {date:'2026-04-10',description:'Office Lease Q2',category:'G&A',amount:-45000,balance:2923800,status:'Cleared'},
    {date:'2026-04-09',description:'Salesforce License',category:'Sales',amount:-8400,balance:2968800,status:'Cleared'},
    {date:'2026-04-09',description:'Client Payment - Beta Inc',category:'Revenue',amount:92000,balance:2977200,status:'Cleared'},
    {date:'2026-04-08',description:'Payroll - Sales',category:'Headcount',amount:-124000,balance:2885200,status:'Cleared'},
    {date:'2026-04-08',description:'Legal Retainer',category:'G&A',amount:-15000,balance:3009200,status:'Cleared'},
    {date:'2026-04-07',description:'Client Payment - Gamma Ltd',category:'Revenue',amount:68000,balance:3024200,status:'Pending'},
    {date:'2026-04-07',description:'Datadog Monitoring',category:'R&D',amount:-6200,balance:2956200,status:'Cleared'},
    {date:'2026-04-06',description:'Travel - Sales Offsite',category:'Sales',amount:-18500,balance:2962400,status:'Cleared'},
    {date:'2026-04-05',description:'Benefits & Insurance',category:'Headcount',amount:-42000,balance:2980900,status:'Cleared'},
    {date:'2026-04-05',description:'Client Payment - Delta Co',category:'Revenue',amount:115000,balance:3022900,status:'Pending'},
    {date:'2026-04-04',description:'HubSpot CRM',category:'Marketing',amount:-4200,balance:2907900,status:'Cleared'}
  ]
};
</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg-primary:#0A0E17;--bg-card:#111827;--bg-card-hover:#1a2332;
  --border:#1F2937;--border-accent:#2D3748;
  --text-primary:#F9FAFB;--text-secondary:#9CA3AF;--text-muted:#6B7280;
  --vibe-green:#00E5A0;--vibe-cyan:#00B4D8;--vibe-violet:#7B61FF;
  --warning:#F59E0B;--danger:#EF4444;--success:#10B981;
  --font-heading:'Space Grotesk',sans-serif;--font-body:'Inter',sans-serif;
  --radius:12px;--radius-sm:8px;--radius-lg:16px;
}
html{font-size:14px}
body{font-family:var(--font-body);background:var(--bg-primary);color:var(--text-primary);min-height:100vh;overflow-x:hidden}
h1,h2,h3,h4{font-family:var(--font-heading);font-weight:600;letter-spacing:-0.02em}

/* Navigation */
.nav-header{display:flex;align-items:center;justify-content:space-between;padding:16px 32px;border-bottom:1px solid var(--border);backdrop-filter:blur(20px);background:rgba(10,14,23,0.85);position:sticky;top:0;z-index:100}
.nav-brand{display:flex;align-items:center;gap:12px}
.nav-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--vibe-green),var(--vibe-cyan));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:var(--bg-primary)}
.nav-title{font-family:var(--font-heading);font-size:18px;font-weight:600;color:var(--text-primary)}
.nav-subtitle{font-size:12px;color:var(--text-muted);margin-top:1px}
.nav-actions{display:flex;align-items:center;gap:8px}
.nav-btn{padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);background:transparent;color:var(--text-secondary);font-family:var(--font-body);font-size:13px;cursor:pointer;transition:all 0.2s}
.nav-btn:hover{border-color:var(--vibe-green);color:var(--vibe-green)}
.nav-btn-primary{background:var(--vibe-green);color:var(--bg-primary);border-color:var(--vibe-green);font-weight:500}
.nav-btn-primary:hover{background:#00cc8e;box-shadow:0 0 20px rgba(0,229,160,0.3)}

/* Tabs */
.tabs-container{display:flex;gap:4px;padding:12px 32px;border-bottom:1px solid var(--border);background:var(--bg-primary);overflow-x:auto}
.tab{padding:10px 20px;border-radius:var(--radius-sm);font-family:var(--font-body);font-size:13px;font-weight:500;color:var(--text-muted);cursor:pointer;border:none;background:transparent;white-space:nowrap;transition:all 0.2s}
.tab:hover{color:var(--text-secondary);background:var(--bg-card)}
.tab.active{color:var(--vibe-green);background:rgba(0,229,160,0.08);border:1px solid rgba(0,229,160,0.2)}

/* Main layout */
.main-content{padding:24px 32px;max-width:1440px;margin:0 auto}
.section-title{font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.section-title .badge{font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(0,229,160,0.1);color:var(--vibe-green);font-weight:500}

/* KPI Grid */
.kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-bottom:32px}
.kpi-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;transition:all 0.3s;position:relative;overflow:hidden}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--vibe-green),var(--vibe-cyan));opacity:0;transition:opacity 0.3s}
.kpi-card:hover{border-color:var(--border-accent);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3)}
.kpi-card:hover::before{opacity:1}
.kpi-label{font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
.kpi-value{font-family:var(--font-heading);font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:6px}
.kpi-trend{font-size:12px;font-weight:500;display:flex;align-items:center;gap:4px}
.kpi-trend.up{color:var(--success)}
.kpi-trend.down{color:var(--danger)}
.kpi-trend.down.good{color:var(--success)}

/* Chart grid */
.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px}
.chart-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;transition:all 0.3s}
.chart-card:hover{border-color:var(--border-accent)}
.chart-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.chart-title{font-family:var(--font-heading);font-size:15px;font-weight:600;color:var(--text-primary)}
.chart-subtitle{font-size:12px;color:var(--text-muted);margin-top:2px}
.chart-actions{display:flex;gap:4px}
.chart-action-btn{width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all 0.2s}
.chart-action-btn:hover{border-color:var(--vibe-green);color:var(--vibe-green)}
.chart-wrap{position:relative;height:280px}

/* Tables */
.table-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:32px}
.table-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border)}
.table-title{font-family:var(--font-heading);font-size:15px;font-weight:600}
.table-count{font-size:12px;color:var(--text-muted)}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
thead{background:rgba(17,24,39,0.8)}
th{padding:12px 20px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:14px 20px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border);white-space:nowrap}
tr:hover td{background:var(--bg-card-hover);color:var(--text-primary)}
.status-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500}
.status-on-track{background:rgba(16,185,129,0.1);color:var(--success)}
.status-under{background:rgba(0,180,216,0.1);color:var(--vibe-cyan)}
.status-over{background:rgba(239,68,68,0.1);color:var(--danger)}
.status-cleared{background:rgba(16,185,129,0.1);color:var(--success)}
.status-pending{background:rgba(245,158,11,0.1);color:var(--warning)}
.amount-positive{color:var(--success)}
.amount-negative{color:var(--danger)}
.variance-positive{color:var(--success)}
.variance-negative{color:var(--danger)}

/* Tab content */
.tab-content{display:none}
.tab-content.active{display:block}

/* Responsive */
@media(max-width:1200px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){
  .kpi-grid{grid-template-columns:repeat(2,1fr)}
  .charts-grid{grid-template-columns:1fr}
  .nav-header{padding:12px 16px}
  .main-content{padding:16px}
  .tabs-container{padding:8px 16px}
}

/* Scrollbar */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:var(--bg-primary)}
::-webkit-scrollbar-thumb{background:var(--border-accent);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--text-muted)}

/* Pulse animation for live indicator */
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
.live-dot{width:6px;height:6px;border-radius:50%;background:var(--vibe-green);animation:pulse 2s ease-in-out infinite;display:inline-block}
</style>
</head>
<body>

<!-- Navigation -->
<header class="nav-header">
  <div class="nav-brand">
    <div class="nav-logo">V</div>
    <div>
      <div class="nav-title">Finance Dashboard</div>
      <div class="nav-subtitle">Real-time financial overview</div>
    </div>
  </div>
  <div class="nav-actions">
    <span class="live-dot"></span>
    <button class="nav-btn">Export PDF</button>
    <button class="nav-btn">Settings</button>
    <button class="nav-btn nav-btn-primary">+ New Report</button>
  </div>
</header>

<!-- Tabs -->
<nav class="tabs-container">
  <button class="tab active" data-tab="overview" onclick="switchTab('overview')">Overview</button>
  <button class="tab" data-tab="budget" onclick="switchTab('budget')">Budget vs Actual</button>
  <button class="tab" data-tab="cashflow" onclick="switchTab('cashflow')">Cash Flow</button>
  <button class="tab" data-tab="pnl" onclick="switchTab('pnl')">P&amp;L</button>
  <button class="tab" data-tab="compliance" onclick="switchTab('compliance')">Compliance</button>
</nav>

<!-- Main Content -->
<main class="main-content">

<!-- === OVERVIEW TAB === -->
<div class="tab-content active" id="tab-overview">

  <!-- KPI Cards -->
  <div class="section-title">Key Metrics <span class="badge">Q2 2026</span></div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Revenue</div>
      <div class="kpi-value" id="kpi-revenue">--</div>
      <div class="kpi-trend up" id="kpi-revenue-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Gross Margin</div>
      <div class="kpi-value" id="kpi-gross-margin">--</div>
      <div class="kpi-trend up" id="kpi-gross-margin-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Burn Rate</div>
      <div class="kpi-value" id="kpi-burn-rate">--</div>
      <div class="kpi-trend down good" id="kpi-burn-rate-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Runway</div>
      <div class="kpi-value" id="kpi-runway">--</div>
      <div class="kpi-trend up" id="kpi-runway-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Budget Utilization</div>
      <div class="kpi-value" id="kpi-budget-util">--</div>
      <div class="kpi-trend up" id="kpi-budget-util-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">EBITDA</div>
      <div class="kpi-value" id="kpi-ebitda">--</div>
      <div class="kpi-trend up" id="kpi-ebitda-trend"></div>
    </div>
  </div>

  <!-- Charts Row 1 -->
  <div class="section-title">Financial Performance</div>
  <div class="charts-grid">
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">Revenue vs Budget</div>
          <div class="chart-subtitle">Monthly comparison, FY 2026</div>
        </div>
        <div class="chart-actions">
          <button class="chart-action-btn" title="Expand">&#x26F6;</button>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="chart-revenue"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">Expense Breakdown</div>
          <div class="chart-subtitle">Current quarter allocation</div>
        </div>
        <div class="chart-actions">
          <button class="chart-action-btn" title="Expand">&#x26F6;</button>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="chart-expenses"></canvas></div>
    </div>
  </div>

  <!-- Charts Row 2 -->
  <div class="charts-grid">
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">Cash Flow Analysis</div>
          <div class="chart-subtitle">Operating, investing &amp; financing activities</div>
        </div>
        <div class="chart-actions">
          <button class="chart-action-btn" title="Expand">&#x26F6;</button>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="chart-cashflow"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">Department Budget Utilization</div>
          <div class="chart-subtitle">Percentage of allocated budget consumed</div>
        </div>
        <div class="chart-actions">
          <button class="chart-action-btn" title="Expand">&#x26F6;</button>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="chart-departments"></canvas></div>
    </div>
  </div>

  <!-- Budget vs Actual Table -->
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">Budget vs Actual by Department</div>
      <div class="table-count" id="budget-table-count"></div>
    </div>
    <div class="table-wrap">
      <table id="budget-table">
        <thead>
          <tr>
            <th>Department</th>
            <th>Budget ($K)</th>
            <th>Actual ($K)</th>
            <th>Variance ($K)</th>
            <th>% Used</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="budget-table-body"></tbody>
      </table>
    </div>
  </div>

  <!-- Transactions Table -->
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">Recent Transactions</div>
      <div class="table-count" id="txn-table-count"></div>
    </div>
    <div class="table-wrap">
      <table id="txn-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="txn-table-body"></tbody>
      </table>
    </div>
  </div>

</div><!-- end overview tab -->

<!-- === BUDGET VS ACTUAL TAB === -->
<div class="tab-content" id="tab-budget">
  <div class="section-title">Budget vs Actual <span class="badge">Detailed View</span></div>
  <div class="charts-grid">
    <div class="chart-card" style="grid-column:span 2">
      <div class="chart-header">
        <div>
          <div class="chart-title">Budget Variance by Department</div>
          <div class="chart-subtitle">Budget allocated vs actual spend — positive variance = under budget</div>
        </div>
      </div>
      <div class="chart-wrap" style="height:340px"><canvas id="chart-budget-detail"></canvas></div>
    </div>
  </div>
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">Monthly Budget Tracking</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Department</th><th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>Q1 Total</th><th>Full Year Budget</th><th>Remaining</th></tr>
        </thead>
        <tbody id="monthly-budget-body"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- === CASH FLOW TAB === -->
<div class="tab-content" id="tab-cashflow">
  <div class="section-title">Cash Flow <span class="badge">6-Month View</span></div>
  <div class="charts-grid">
    <div class="chart-card" style="grid-column:span 2">
      <div class="chart-header">
        <div>
          <div class="chart-title">Net Cash Flow Trend</div>
          <div class="chart-subtitle">Net cash position after all activities</div>
        </div>
      </div>
      <div class="chart-wrap" style="height:340px"><canvas id="chart-netcash"></canvas></div>
    </div>
  </div>
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">Cash Flow Summary</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Activity</th><th>Jul</th><th>Aug</th><th>Sep</th><th>Oct</th><th>Nov</th><th>Dec</th><th>Total</th></tr>
        </thead>
        <tbody id="cashflow-summary-body"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- === P&L TAB === -->
<div class="tab-content" id="tab-pnl">
  <div class="section-title">Profit &amp; Loss <span class="badge">FY 2026</span></div>
  <div class="charts-grid">
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">Revenue vs Expenses</div>
          <div class="chart-subtitle">Monthly P&amp;L trend</div>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="chart-pnl-trend"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">Margin Trend</div>
          <div class="chart-subtitle">Gross and net margin %</div>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="chart-margin-trend"></canvas></div>
    </div>
  </div>
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">P&amp;L Statement</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Line Item</th><th>Q1 Actual</th><th>Q2 Forecast</th><th>YTD</th><th>Full Year Budget</th><th>Variance</th></tr>
        </thead>
        <tbody id="pnl-body"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- === COMPLIANCE TAB === -->
<div class="tab-content" id="tab-compliance">
  <div class="section-title">Compliance &amp; Controls <span class="badge">ISO 27001</span></div>
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
    <div class="kpi-card">
      <div class="kpi-label">Controls Passed</div>
      <div class="kpi-value" style="color:var(--success)">94%</div>
      <div class="kpi-trend up">+2% from last audit</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Open Findings</div>
      <div class="kpi-value" style="color:var(--warning)">3</div>
      <div class="kpi-trend down good">-2 from last quarter</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Next Audit</div>
      <div class="kpi-value" style="font-size:20px">Jun 15</div>
      <div class="kpi-trend" style="color:var(--text-muted)">64 days remaining</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">SOX Readiness</div>
      <div class="kpi-value" style="color:var(--vibe-green)">87%</div>
      <div class="kpi-trend up">+5% this quarter</div>
    </div>
  </div>
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">Open Audit Findings</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Finding</th><th>Severity</th><th>Category</th><th>Owner</th><th>Due Date</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Segregation of duties gap in AP workflow</td><td><span class="status-badge status-over">High</span></td><td>Internal Controls</td><td>J. Martinez</td><td>2026-05-01</td><td><span class="status-badge status-pending">In Progress</span></td></tr>
          <tr><td>Missing documentation for manual JEs > $50K</td><td><span class="status-badge" style="background:rgba(245,158,11,0.1);color:var(--warning)">Medium</span></td><td>Documentation</td><td>S. Chen</td><td>2026-05-15</td><td><span class="status-badge status-pending">In Progress</span></td></tr>
          <tr><td>Vendor master data review overdue</td><td><span class="status-badge status-under">Low</span></td><td>Data Integrity</td><td>A. Patel</td><td>2026-06-01</td><td><span class="status-badge" style="background:rgba(107,114,128,0.1);color:var(--text-muted)">Not Started</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">ISO 27001 Control Summary</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Domain</th><th>Total Controls</th><th>Passed</th><th>Failed</th><th>N/A</th><th>Compliance %</th></tr>
        </thead>
        <tbody>
          <tr><td>A.5 Information Security Policies</td><td>7</td><td>7</td><td>0</td><td>0</td><td><span style="color:var(--success)">100%</span></td></tr>
          <tr><td>A.6 Organization of InfoSec</td><td>5</td><td>5</td><td>0</td><td>0</td><td><span style="color:var(--success)">100%</span></td></tr>
          <tr><td>A.8 Asset Management</td><td>10</td><td>9</td><td>1</td><td>0</td><td><span style="color:var(--warning)">90%</span></td></tr>
          <tr><td>A.9 Access Control</td><td>14</td><td>13</td><td>1</td><td>0</td><td><span style="color:var(--warning)">93%</span></td></tr>
          <tr><td>A.12 Operations Security</td><td>7</td><td>6</td><td>1</td><td>0</td><td><span style="color:var(--warning)">86%</span></td></tr>
          <tr><td>A.14 System Acquisition</td><td>6</td><td>6</td><td>0</td><td>0</td><td><span style="color:var(--success)">100%</span></td></tr>
          <tr><td>A.18 Compliance</td><td>8</td><td>8</td><td>0</td><td>0</td><td><span style="color:var(--success)">100%</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

</main>

<script>
/* === Tab Switching === */
function switchTab(tabId){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active')});
  document.querySelectorAll('.tab-content').forEach(function(c){c.classList.remove('active')});
  document.querySelector('[data-tab="'+tabId+'"]').classList.add('active');
  document.getElementById('tab-'+tabId).classList.add('active');
}

/* === vibeLoadData helper === */
async function vibeLoadData(table,params){
  var url=window.__SUPABASE_URL__+'/rest/v1/'+table+'?team_id=eq.'+params.team_id;
  var resp=await fetch(url,{headers:{'apikey':window.__SUPABASE_ANON_KEY__,'Authorization':'Bearer '+window.__SUPABASE_ANON_KEY__}});
  if(!resp.ok) throw new Error('Failed to load');
  return resp.json();
}

/* === Format helpers === */
function formatCurrency(val){
  if(Math.abs(val)>=1000000) return (val<0?'-':'')+'$'+(Math.abs(val)/1000000).toFixed(1)+'M';
  if(Math.abs(val)>=1000) return (val<0?'-':'')+'$'+(Math.abs(val)/1000).toFixed(0)+'K';
  return (val<0?'-':'')+'$'+Math.abs(val).toLocaleString();
}

/* === Chart.js defaults === */
Chart.defaults.color='#9CA3AF';
Chart.defaults.borderColor='#1F2937';
Chart.defaults.font.family='Inter';
Chart.defaults.plugins.legend.labels.usePointStyle=true;
Chart.defaults.plugins.legend.labels.pointStyleWidth=8;
Chart.defaults.plugins.legend.labels.padding=16;

/* === Render KPIs === */
(function renderKPIs(){
  var kpis=(window.__VIBE_SAMPLE__||{}).kpis||[];
  kpis.forEach(function(k){
    var el=document.getElementById('kpi-'+k.id);
    if(el) el.textContent=k.value;
    var trendEl=document.getElementById('kpi-'+k.id+'-trend');
    if(trendEl){
      var arrow=k.direction==='up'?'\u2191':'\u2193';
      trendEl.textContent=arrow+' '+k.trend;
    }
  });
})();

/* === Chart 1: Revenue vs Budget === */
(async function(){
  var data=[];
  try{data=await vibeLoadData('finance_revenue',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  var sample=(window.__VIBE_SAMPLE__||{}).revenue||{labels:[],actual:[],budget:[]};
  if(!data.length) data=null;
  var labels=data?data.map(function(d){return d.month}):sample.labels;
  var actual=data?data.map(function(d){return d.actual}):sample.actual;
  var budget=data?data.map(function(d){return d.budget}):sample.budget;
  new Chart(document.getElementById('chart-revenue'),{
    type:'line',
    data:{
      labels:labels,
      datasets:[
        {label:'Actual Revenue',data:actual,borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.1)',fill:true,tension:0.4,pointRadius:4,pointHoverRadius:6,borderWidth:2.5},
        {label:'Budget',data:budget,borderColor:'#7B61FF',backgroundColor:'transparent',borderDash:[6,4],tension:0.4,pointRadius:3,pointHoverRadius:5,borderWidth:2}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:'index'},scales:{y:{grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return '$'+v+'K'}}},x:{grid:{display:false}}},plugins:{tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': $'+ctx.parsed.y+'K'}}}}}
  });
})();

/* === Chart 2: Expense Breakdown === */
(async function(){
  var data=[];
  try{data=await vibeLoadData('finance_expenses',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  var sample=(window.__VIBE_SAMPLE__||{}).expenses||[];
  if(!data.length) data=sample;
  new Chart(document.getElementById('chart-expenses'),{
    type:'doughnut',
    data:{
      labels:data.map(function(d){return d.category}),
      datasets:[{
        data:data.map(function(d){return d.amount}),
        backgroundColor:data.map(function(d){return d.color||'#00E5A0'}),
        borderColor:'#111827',
        borderWidth:3,
        hoverOffset:8
      }]
    },
    options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'right',labels:{padding:12,font:{size:12}}},tooltip:{callbacks:{label:function(ctx){return ctx.label+': $'+(ctx.parsed/1000).toFixed(0)+'K ('+data[ctx.dataIndex].pct+'%)'}}}}}
  });
})();

/* === Chart 3: Cash Flow === */
(async function(){
  var data=[];
  try{data=await vibeLoadData('finance_cashflow',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  var sample=(window.__VIBE_SAMPLE__||{}).cashflow||{labels:[],operating:[],investing:[],financing:[]};
  if(!data.length) data=null;
  var labels=data?data.map(function(d){return d.month}):sample.labels;
  var operating=data?data.map(function(d){return d.operating}):sample.operating;
  var investing=data?data.map(function(d){return d.investing}):sample.investing;
  var financing=data?data.map(function(d){return d.financing}):sample.financing;
  new Chart(document.getElementById('chart-cashflow'),{
    type:'bar',
    data:{
      labels:labels,
      datasets:[
        {label:'Operating',data:operating,backgroundColor:'#00E5A0',borderRadius:4,barPercentage:0.7},
        {label:'Investing',data:investing,backgroundColor:'#00B4D8',borderRadius:4,barPercentage:0.7},
        {label:'Financing',data:financing,backgroundColor:'#7B61FF',borderRadius:4,barPercentage:0.7}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:'index'},scales:{y:{grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return '$'+v+'K'}},stacked:false},x:{grid:{display:false},stacked:false}},plugins:{tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': $'+ctx.parsed.y+'K'}}}}}
  });
})();

/* === Chart 4: Department Budget Utilization === */
(async function(){
  var data=[];
  try{data=await vibeLoadData('finance_departments',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  var sample=(window.__VIBE_SAMPLE__||{}).departments||[];
  if(!data.length) data=sample;
  new Chart(document.getElementById('chart-departments'),{
    type:'bar',
    data:{
      labels:data.map(function(d){return d.name}),
      datasets:[{
        label:'% Utilized',
        data:data.map(function(d){return d.pct}),
        backgroundColor:data.map(function(d){return d.pct>85?'#EF4444':d.pct>70?'#F59E0B':'#00E5A0'}),
        borderRadius:6,
        barPercentage:0.6
      }]
    },
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',scales:{x:{grid:{color:'rgba(31,41,55,0.5)'},max:100,ticks:{callback:function(v){return v+'%'}}},y:{grid:{display:false}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ctx.parsed.x.toFixed(1)+'% of budget used'}}}}}
  });
})();

/* === Budget Detail Chart (Budget tab) === */
(async function(){
  var data=[];
  try{data=await vibeLoadData('finance_departments',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  var sample=(window.__VIBE_SAMPLE__||{}).departments||[];
  if(!data.length) data=sample;
  new Chart(document.getElementById('chart-budget-detail'),{
    type:'bar',
    data:{
      labels:data.map(function(d){return d.name}),
      datasets:[
        {label:'Budget ($K)',data:data.map(function(d){return d.budget}),backgroundColor:'rgba(123,97,255,0.3)',borderColor:'#7B61FF',borderWidth:2,borderRadius:4,barPercentage:0.5},
        {label:'Actual ($K)',data:data.map(function(d){return d.actual}),backgroundColor:'rgba(0,229,160,0.3)',borderColor:'#00E5A0',borderWidth:2,borderRadius:4,barPercentage:0.5}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return '$'+v+'K'}}},x:{grid:{display:false}}},plugins:{tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': $'+ctx.parsed.y+'K'}}}}}
  });
})();

/* === Net Cash Flow Chart (Cash Flow tab) === */
(async function(){
  var data=[];
  try{data=await vibeLoadData('finance_cashflow',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  var sample=(window.__VIBE_SAMPLE__||{}).cashflow||{labels:[],operating:[],investing:[],financing:[]};
  if(!data.length) data=null;
  var labels=data?data.map(function(d){return d.month}):sample.labels;
  var operating=data?data.map(function(d){return d.operating}):sample.operating;
  var investing=data?data.map(function(d){return d.investing}):sample.investing;
  var financing=data?data.map(function(d){return d.financing}):sample.financing;
  var net=labels.map(function(_,i){return operating[i]+investing[i]+financing[i]});
  new Chart(document.getElementById('chart-netcash'),{
    type:'line',
    data:{
      labels:labels,
      datasets:[
        {label:'Net Cash Flow',data:net,borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.15)',fill:true,tension:0.4,pointRadius:5,pointHoverRadius:7,borderWidth:3},
        {label:'Operating',data:operating,borderColor:'#00B4D8',borderDash:[4,4],tension:0.4,pointRadius:3,borderWidth:1.5},
        {label:'Investing',data:investing,borderColor:'#7B61FF',borderDash:[4,4],tension:0.4,pointRadius:3,borderWidth:1.5},
        {label:'Financing',data:financing,borderColor:'#F59E0B',borderDash:[4,4],tension:0.4,pointRadius:3,borderWidth:1.5}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:'index'},scales:{y:{grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return '$'+v+'K'}}},x:{grid:{display:false}}},plugins:{tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': $'+ctx.parsed.y+'K'}}}}}
  });
})();

/* === P&L Charts === */
(async function(){
  var data=[];
  try{data=await vibeLoadData('finance_pnl',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  var rev=(window.__VIBE_SAMPLE__||{}).revenue||{labels:[],actual:[],budget:[]};
  var months=rev.labels;
  var expenses=months.map(function(_,i){return rev.actual[i]*0.68});
  new Chart(document.getElementById('chart-pnl-trend'),{
    type:'bar',
    data:{
      labels:months,
      datasets:[
        {label:'Revenue ($K)',data:rev.actual,backgroundColor:'rgba(0,229,160,0.7)',borderRadius:4,barPercentage:0.6},
        {label:'Expenses ($K)',data:expenses,backgroundColor:'rgba(239,68,68,0.5)',borderRadius:4,barPercentage:0.6}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return '$'+v+'K'}}},x:{grid:{display:false}}},plugins:{tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': $'+ctx.parsed.y.toFixed(0)+'K'}}}}}
  });
})();

(async function(){
  var data=[];
  try{data=await vibeLoadData('finance_margins',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  var months=(window.__VIBE_SAMPLE__||{}).revenue.labels||[];
  var grossMargin=[65,66,67,68,67,68,69,70,69,70,68,69];
  var netMargin=[18,19,20,22,21,23,24,25,24,26,22,24];
  new Chart(document.getElementById('chart-margin-trend'),{
    type:'line',
    data:{
      labels:months,
      datasets:[
        {label:'Gross Margin %',data:grossMargin,borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.1)',fill:true,tension:0.4,borderWidth:2.5},
        {label:'Net Margin %',data:netMargin,borderColor:'#00B4D8',backgroundColor:'rgba(0,180,216,0.1)',fill:true,tension:0.4,borderWidth:2.5}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{grid:{color:'rgba(31,41,55,0.5)'},ticks:{callback:function(v){return v+'%'}}},x:{grid:{display:false}}},plugins:{tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+ctx.parsed.y+'%'}}}}}
  });
})();

/* === Render Tables === */
(function renderBudgetTable(){
  var rows=(window.__VIBE_SAMPLE__||{}).budgetVsActual||[];
  var body=document.getElementById('budget-table-body');
  var ct=document.getElementById('budget-table-count');
  if(ct) ct.textContent=rows.length+' departments';
  rows.forEach(function(r){
    var tr=document.createElement('tr');
    var statusClass=r.status==='On Track'?'status-on-track':r.status==='Under'?'status-under':'status-over';
    var varianceClass=r.variance<0?'variance-positive':'variance-negative';
    tr.innerHTML='<td style="font-weight:500;color:var(--text-primary)">'+r.department+'</td>'
      +'<td>$'+r.budget.toLocaleString()+'K</td>'
      +'<td>$'+r.actual.toLocaleString()+'K</td>'
      +'<td class="'+varianceClass+'">'+formatCurrency(r.variance*1000)+'</td>'
      +'<td>'+r.pctUsed.toFixed(1)+'%</td>'
      +'<td><span class="status-badge '+statusClass+'">'+r.status+'</span></td>';
    body.appendChild(tr);
  });
})();

(function renderTxnTable(){
  var rows=(window.__VIBE_SAMPLE__||{}).transactions||[];
  var body=document.getElementById('txn-table-body');
  var ct=document.getElementById('txn-table-count');
  if(ct) ct.textContent=rows.length+' transactions';
  rows.forEach(function(r){
    var tr=document.createElement('tr');
    var amtClass=r.amount>=0?'amount-positive':'amount-negative';
    var statusClass=r.status==='Cleared'?'status-cleared':'status-pending';
    tr.innerHTML='<td>'+r.date+'</td>'
      +'<td style="font-weight:500;color:var(--text-primary)">'+r.description+'</td>'
      +'<td>'+r.category+'</td>'
      +'<td class="'+amtClass+'">'+formatCurrency(r.amount)+'</td>'
      +'<td>'+formatCurrency(r.balance)+'</td>'
      +'<td><span class="status-badge '+statusClass+'">'+r.status+'</span></td>';
    body.appendChild(tr);
  });
})();

/* === Render Monthly Budget Table (Budget tab) === */
(function renderMonthlyBudget(){
  var depts=(window.__VIBE_SAMPLE__||{}).departments||[];
  var body=document.getElementById('monthly-budget-body');
  depts.forEach(function(d){
    var tr=document.createElement('tr');
    var m1=Math.round(d.actual*0.3);var m2=Math.round(d.actual*0.32);var m3=Math.round(d.actual*0.38);var m4=Math.round(d.budget*0.09);
    var q1=m1+m2+m3;var remaining=d.budget-q1-m4;
    tr.innerHTML='<td style="font-weight:500;color:var(--text-primary)">'+d.name+'</td>'
      +'<td>$'+m1+'K</td><td>$'+m2+'K</td><td>$'+m3+'K</td><td>$'+m4+'K</td>'
      +'<td style="font-weight:600">$'+q1+'K</td>'
      +'<td>$'+d.budget+'K</td>'
      +'<td style="color:var(--success)">$'+remaining+'K</td>';
    body.appendChild(tr);
  });
})();

/* === Render Cash Flow Summary Table (Cash Flow tab) === */
(function renderCashFlowSummary(){
  var cf=(window.__VIBE_SAMPLE__||{}).cashflow||{labels:[],operating:[],investing:[],financing:[]};
  var body=document.getElementById('cashflow-summary-body');
  var activities=[
    {name:'Operating',data:cf.operating,color:'var(--success)'},
    {name:'Investing',data:cf.investing,color:'var(--vibe-cyan)'},
    {name:'Financing',data:cf.financing,color:'var(--vibe-violet)'}
  ];
  activities.forEach(function(a){
    var tr=document.createElement('tr');
    var total=a.data.reduce(function(s,v){return s+v},0);
    var cells='<td style="font-weight:500;color:'+a.color+'">'+a.name+'</td>';
    a.data.forEach(function(v){cells+='<td class="'+(v>=0?'amount-positive':'amount-negative')+'">$'+v+'K</td>'});
    cells+='<td style="font-weight:600;color:'+a.color+'">$'+total+'K</td>';
    tr.innerHTML=cells;
    body.appendChild(tr);
  });
  var netTr=document.createElement('tr');
  netTr.style.borderTop='2px solid var(--border-accent)';
  var netCells='<td style="font-weight:700;color:var(--text-primary)">Net Cash Flow</td>';
  var netTotal=0;
  cf.labels.forEach(function(_,i){
    var net=cf.operating[i]+cf.investing[i]+cf.financing[i];
    netTotal+=net;
    netCells+='<td style="font-weight:600" class="'+(net>=0?'amount-positive':'amount-negative')+'">$'+net+'K</td>';
  });
  netCells+='<td style="font-weight:700;color:var(--vibe-green)">$'+netTotal+'K</td>';
  netTr.innerHTML=netCells;
  body.appendChild(netTr);
})();

/* === Render P&L Table === */
(function renderPnL(){
  var body=document.getElementById('pnl-body');
  var items=[
    {line:'Revenue',q1:'$1,045K',q2:'$1,210K',ytd:'$2,255K',fy:'$4,800K',var:'+$55K',bold:true,color:'var(--text-primary)'},
    {line:'COGS',q1:'($334K)',q2:'($387K)',ytd:'($721K)',fy:'($1,536K)',var:'-$18K',bold:false,color:'var(--danger)'},
    {line:'Gross Profit',q1:'$711K',q2:'$823K',ytd:'$1,534K',fy:'$3,264K',var:'+$37K',bold:true,color:'var(--success)'},
    {line:'Operating Expenses',q1:'($520K)',q2:'($580K)',ytd:'($1,100K)',fy:'($2,400K)',var:'+$20K',bold:false,color:'var(--danger)'},
    {line:'   Headcount',q1:'($290K)',q2:'($310K)',ytd:'($600K)',fy:'($1,300K)',var:'+$12K',bold:false,color:'var(--text-muted)'},
    {line:'   R&D',q1:'($98K)',q2:'($110K)',ytd:'($208K)',fy:'($440K)',var:'-$8K',bold:false,color:'var(--text-muted)'},
    {line:'   Sales & Marketing',q1:'($72K)',q2:'($88K)',ytd:'($160K)',fy:'($360K)',var:'+$10K',bold:false,color:'var(--text-muted)'},
    {line:'   G&A',q1:'($60K)',q2:'($72K)',ytd:'($132K)',fy:'($300K)',var:'+$6K',bold:false,color:'var(--text-muted)'},
    {line:'EBITDA',q1:'$191K',q2:'$243K',ytd:'$434K',fy:'$864K',var:'+$17K',bold:true,color:'var(--vibe-green)'},
    {line:'D&A',q1:'($25K)',q2:'($25K)',ytd:'($50K)',fy:'($100K)',var:'$0',bold:false,color:'var(--text-muted)'},
    {line:'Net Income',q1:'$166K',q2:'$218K',ytd:'$384K',fy:'$764K',var:'+$17K',bold:true,color:'var(--vibe-green)'}
  ];
  items.forEach(function(r){
    var tr=document.createElement('tr');
    if(r.bold) tr.style.fontWeight='600';
    var varColor=r.var.startsWith('+')?'var(--success)':r.var.startsWith('-')?'var(--danger)':'var(--text-muted)';
    tr.innerHTML='<td style="color:'+r.color+'">'+r.line+'</td>'
      +'<td>'+r.q1+'</td><td>'+r.q2+'</td>'
      +'<td style="font-weight:600">'+r.ytd+'</td>'
      +'<td>'+r.fy+'</td>'
      +'<td style="color:'+varColor+'">'+r.var+'</td>';
    body.appendChild(tr);
  });
})();
</script>

</body>
</html>$$
WHERE skill_name = 'finance-dashboard';
