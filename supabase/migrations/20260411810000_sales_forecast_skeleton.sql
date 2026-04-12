UPDATE skill_registry SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Sales Forecast Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<script>
window.__VIBE_TEAM_ID__='__VIBE_TEAM_ID__';
window.__SUPABASE_URL__='__SUPABASE_URL__';
window.__SUPABASE_ANON_KEY__='__SUPABASE_ANON_KEY__';
window.__VIBE_SAMPLE__={
  kpis:[
    {id:'forecast',label:'Forecast',value:'$2.1M',trend:'+12.4%',direction:'up',icon:'trending-up'},
    {id:'quota',label:'Quota',value:'$2.8M',trend:'Q2 Target',direction:'neutral',icon:'target'},
    {id:'attainment',label:'Attainment',value:'74.2%',trend:'+5.1pp',direction:'up',icon:'percent'},
    {id:'coverage',label:'Pipeline Coverage',value:'3.2x',trend:'+0.4x',direction:'up',icon:'layers'},
    {id:'avgdeal',label:'Avg Deal Size',value:'$89K',trend:'+$7K',direction:'up',icon:'bar-chart'},
    {id:'daysleft',label:'Days Left in Qtr',value:'23',trend:'of 90',direction:'neutral',icon:'clock'}
  ],
  forecast:[
    {month:'Nov',actual:320000,forecast:310000,quota:350000},
    {month:'Dec',actual:410000,forecast:390000,quota:400000},
    {month:'Jan',actual:380000,forecast:370000,quota:420000},
    {month:'Feb',actual:450000,forecast:430000,quota:450000},
    {month:'Mar',actual:390000,forecast:420000,quota:460000},
    {month:'Apr',actual:null,forecast:480000,quota:480000}
  ],
  reps:[
    {name:'Sarah Chen',quota:350000,committed:310000,bestCase:380000,avatar:'SC'},
    {name:'Marcus Johnson',quota:340000,committed:290000,bestCase:350000,avatar:'MJ'},
    {name:'Priya Patel',quota:380000,committed:340000,bestCase:410000,avatar:'PP'},
    {name:'James Wilson',quota:320000,committed:250000,bestCase:310000,avatar:'JW'},
    {name:'Elena Rodriguez',quota:360000,committed:330000,bestCase:390000,avatar:'ER'},
    {name:'David Kim',quota:310000,committed:280000,bestCase:340000,avatar:'DK'},
    {name:'Aisha Thompson',quota:370000,committed:350000,bestCase:400000,avatar:'AT'},
    {name:'Ryan O Brien',quota:330000,committed:220000,bestCase:290000,avatar:'RO'}
  ],
  pipeline:[
    {stage:'Closed Won',value:840000,color:'#00E5A0'},
    {stage:'Commit',value:620000,color:'#00B4D8'},
    {stage:'Best Case',value:480000,color:'#7B61FF'},
    {stage:'Pipeline',value:390000,color:'#F59E0B'},
    {stage:'Early Stage',value:270000,color:'#6B7280'}
  ],
  scenarios:[
    {week:'W1',committed:1200000,bestCase:1600000,worstCase:900000},
    {week:'W2',committed:1250000,bestCase:1650000,worstCase:920000},
    {week:'W3',committed:1310000,bestCase:1700000,worstCase:950000},
    {week:'W4',committed:1380000,bestCase:1780000,worstCase:980000},
    {week:'W5',committed:1420000,bestCase:1820000,worstCase:1010000},
    {week:'W6',committed:1480000,bestCase:1870000,worstCase:1040000},
    {week:'W7',committed:1550000,bestCase:1930000,worstCase:1080000},
    {week:'W8',committed:1620000,bestCase:2000000,worstCase:1120000},
    {week:'W9',committed:1700000,bestCase:2080000,worstCase:1160000},
    {week:'W10',committed:1780000,bestCase:2150000,worstCase:1200000},
    {week:'W11',committed:1860000,bestCase:2240000,worstCase:1250000},
    {week:'W12',committed:1950000,bestCase:2340000,worstCase:1300000}
  ],
  atrisk:[
    {company:'Meridian Corp',value:145000,closeDate:'2026-04-28',stage:'Negotiation',risk:'Champion left',owner:'Sarah Chen'},
    {company:'Apex Industries',value:120000,closeDate:'2026-04-22',stage:'Proposal',risk:'Budget freeze',owner:'Marcus Johnson'},
    {company:'NovaTech Solutions',value:98000,closeDate:'2026-05-01',stage:'Negotiation',risk:'Competitor eval',owner:'Priya Patel'},
    {company:'Pinnacle Group',value:87000,closeDate:'2026-04-30',stage:'Discovery',risk:'No next step',owner:'James Wilson'},
    {company:'Summit Healthcare',value:165000,closeDate:'2026-04-25',stage:'Proposal',risk:'Legal review',owner:'Elena Rodriguez'},
    {company:'Horizon Media',value:72000,closeDate:'2026-05-05',stage:'Qualification',risk:'Wrong persona',owner:'David Kim'},
    {company:'Atlas Financial',value:210000,closeDate:'2026-04-18',stage:'Negotiation',risk:'Procurement delay',owner:'Aisha Thompson'},
    {company:'Vertex Dynamics',value:56000,closeDate:'2026-05-10',stage:'Discovery',risk:'Timeline slip',owner:'Ryan O Brien'}
  ]
};
</script>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg-primary:#0A0E17;--bg-card:#111827;--bg-card-hover:#1a2235;
  --border:#1E293B;--border-hover:#334155;
  --text-primary:#F8FAFC;--text-secondary:#94A3B8;--text-tertiary:#64748B;
  --green:#00E5A0;--green-dim:rgba(0,229,160,0.12);--green-glow:rgba(0,229,160,0.25);
  --cyan:#00B4D8;--cyan-dim:rgba(0,180,216,0.12);
  --violet:#7B61FF;--violet-dim:rgba(123,97,255,0.12);
  --amber:#F59E0B;--amber-dim:rgba(245,158,11,0.12);
  --red:#EF4444;--red-dim:rgba(239,68,68,0.12);
  --radius:12px;--radius-sm:8px;--radius-xs:6px;
  --shadow:0 1px 3px rgba(0,0,0,0.3),0 1px 2px rgba(0,0,0,0.2);
  --shadow-lg:0 10px 30px rgba(0,0,0,0.4),0 4px 12px rgba(0,0,0,0.3);
  --font-heading:'Space Grotesk',system-ui,sans-serif;
  --font-body:'Inter',system-ui,sans-serif;
  --transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
}
html{font-size:14px}
body{background:var(--bg-primary);color:var(--text-primary);font-family:var(--font-body);line-height:1.5;min-height:100vh;overflow-x:hidden}
.dashboard{max-width:1440px;margin:0 auto;padding:24px 32px 48px}
/* Header */
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.header-left{display:flex;align-items:center;gap:16px}
.header-icon{width:40px;height:40px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--green),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:18px}
.header h1{font-family:var(--font-heading);font-size:1.75rem;font-weight:700;letter-spacing:-0.025em;background:linear-gradient(135deg,var(--text-primary),var(--text-secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.header-subtitle{font-size:0.85rem;color:var(--text-tertiary);margin-top:2px}
.header-actions{display:flex;gap:10px}
.btn{padding:8px 16px;border-radius:var(--radius-xs);font-family:var(--font-body);font-size:0.8rem;font-weight:500;cursor:pointer;transition:var(--transition);border:1px solid var(--border)}
.btn-primary{background:var(--green);color:var(--bg-primary);border-color:var(--green);font-weight:600}
.btn-primary:hover{box-shadow:0 0 20px var(--green-glow)}
.btn-ghost{background:transparent;color:var(--text-secondary)}
.btn-ghost:hover{background:var(--bg-card);color:var(--text-primary)}
/* Tabs */
.tabs{display:flex;gap:4px;margin-bottom:24px;background:var(--bg-card);border-radius:var(--radius-sm);padding:4px;border:1px solid var(--border);width:fit-content}
.tab{padding:8px 20px;border-radius:var(--radius-xs);font-size:0.8rem;font-weight:500;color:var(--text-tertiary);cursor:pointer;transition:var(--transition);border:none;background:none;font-family:var(--font-body)}
.tab:hover{color:var(--text-secondary)}
.tab.active{background:var(--green);color:var(--bg-primary);font-weight:600}
/* KPI Grid */
.kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-bottom:28px}
.kpi-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;transition:var(--transition);position:relative;overflow:hidden}
.kpi-card:hover{border-color:var(--border-hover);transform:translateY(-1px);box-shadow:var(--shadow-lg)}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--green);opacity:0;transition:var(--transition)}
.kpi-card:hover::before{opacity:1}
.kpi-label{font-size:0.75rem;font-weight:500;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;display:flex;align-items:center;gap:6px}
.kpi-value{font-family:var(--font-heading);font-size:1.65rem;font-weight:700;color:var(--text-primary);letter-spacing:-0.02em;margin-bottom:6px}
.kpi-trend{font-size:0.75rem;font-weight:500;display:flex;align-items:center;gap:4px}
.kpi-trend.up{color:var(--green)}
.kpi-trend.down{color:var(--red)}
.kpi-trend.neutral{color:var(--text-tertiary)}
/* Chart Grid */
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
.chart-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;transition:var(--transition)}
.chart-card:hover{border-color:var(--border-hover)}
.chart-card.full-width{grid-column:1/-1}
.chart-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.chart-title{font-family:var(--font-heading);font-size:1rem;font-weight:600;color:var(--text-primary)}
.chart-subtitle{font-size:0.75rem;color:var(--text-tertiary);margin-top:2px}
.chart-badge{padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:500;background:var(--green-dim);color:var(--green)}
.chart-container{position:relative;width:100%;height:280px}
.chart-container.tall{height:340px}
/* Tables */
.table-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:28px}
.table-header{padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.table-title{font-family:var(--font-heading);font-size:1rem;font-weight:600}
.table-count{font-size:0.75rem;color:var(--text-tertiary);background:var(--bg-primary);padding:4px 10px;border-radius:20px}
table{width:100%;border-collapse:collapse}
thead th{padding:12px 20px;text-align:left;font-size:0.7rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid var(--border);background:rgba(0,0,0,0.15)}
tbody td{padding:14px 20px;font-size:0.825rem;color:var(--text-secondary);border-bottom:1px solid rgba(30,41,59,0.5)}
tbody tr{transition:var(--transition)}
tbody tr:hover{background:var(--bg-card-hover)}
tbody tr:last-child td{border-bottom:none}
.rep-cell{display:flex;align-items:center;gap:10px}
.rep-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:600;color:var(--bg-primary)}
.bar-cell{display:flex;align-items:center;gap:10px;min-width:160px}
.bar-track{flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden}
.bar-fill{height:100%;border-radius:3px;transition:width 0.8s cubic-bezier(0.4,0,0.2,1)}
.bar-value{font-size:0.75rem;font-weight:600;min-width:40px;text-align:right}
.risk-badge{padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:500;white-space:nowrap}
.risk-high{background:var(--red-dim);color:var(--red)}
.risk-medium{background:var(--amber-dim);color:var(--amber)}
.risk-low{background:var(--cyan-dim);color:var(--cyan)}
.money{font-family:var(--font-heading);font-weight:600;color:var(--text-primary)}
.green-text{color:var(--green)}
.red-text{color:var(--red)}
/* Tab panels */
.tab-panel{display:none}
.tab-panel.active{display:block}
/* Pipeline coverage legend */
.pipeline-legend{display:flex;flex-wrap:wrap;gap:16px;margin-top:12px}
.pipeline-legend-item{display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-secondary)}
.pipeline-legend-dot{width:8px;height:8px;border-radius:50%}
/* Scenario controls */
.scenario-controls{display:flex;gap:8px;align-items:center}
.scenario-indicator{width:8px;height:8px;border-radius:50%;display:inline-block}
.scenario-label{font-size:0.7rem;color:var(--text-tertiary)}
/* Responsive */
@media(max-width:1200px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:900px){.chart-grid{grid-template-columns:1fr}.kpi-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.kpi-grid{grid-template-columns:1fr}.dashboard{padding:16px}.header{flex-direction:column;align-items:flex-start;gap:12px}.tabs{width:100%;overflow-x:auto}}
/* Scrollbar */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--border-hover)}
/* Attainment colors */
.attain-high{color:var(--green)}
.attain-mid{color:var(--amber)}
.attain-low{color:var(--red)}
</style>
</head>
<body>
<div class="dashboard">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="header-icon">&#9889;</div>
      <div>
        <h1>Sales Forecast</h1>
        <div class="header-subtitle">Q2 2026 &middot; Updated just now</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-ghost" onclick="window.print()">&#8681; Export</button>
      <button class="btn btn-primary">+ New Scenario</button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs" id="tabBar">
    <button class="tab active" data-tab="overview">Overview</button>
    <button class="tab" data-tab="byrep">By Rep</button>
    <button class="tab" data-tab="byregion">By Region</button>
    <button class="tab" data-tab="coverage">Pipeline Coverage</button>
    <button class="tab" data-tab="scenarios">Scenarios</button>
  </div>

  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">&#128200; Forecast</div>
      <div class="kpi-value" id="kpi-forecast">--</div>
      <div class="kpi-trend up" id="kpi-forecast-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">&#127919; Quota</div>
      <div class="kpi-value" id="kpi-quota">--</div>
      <div class="kpi-trend neutral" id="kpi-quota-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">&#128202; Attainment</div>
      <div class="kpi-value" id="kpi-attainment">--</div>
      <div class="kpi-trend up" id="kpi-attainment-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">&#128218; Pipeline Coverage</div>
      <div class="kpi-value" id="kpi-coverage">--</div>
      <div class="kpi-trend up" id="kpi-coverage-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">&#128176; Avg Deal Size</div>
      <div class="kpi-value" id="kpi-avgdeal">--</div>
      <div class="kpi-trend up" id="kpi-avgdeal-trend"></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">&#9200; Days Left in Qtr</div>
      <div class="kpi-value" id="kpi-daysleft">--</div>
      <div class="kpi-trend neutral" id="kpi-daysleft-trend"></div>
    </div>
  </div>

  <!-- OVERVIEW TAB -->
  <div class="tab-panel active" id="panel-overview">
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Forecast vs Quota</div>
            <div class="chart-subtitle">Monthly actual, forecast, and quota &mdash; last 6 months</div>
          </div>
          <div class="chart-badge">On Track</div>
        </div>
        <div class="chart-container"><canvas id="chartForecastQuota"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Pipeline Coverage Waterfall</div>
            <div class="chart-subtitle">Stage contribution to total pipeline</div>
          </div>
          <div class="chart-badge">3.2x Coverage</div>
        </div>
        <div class="chart-container"><canvas id="chartPipelineWaterfall"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Rep Attainment Leaderboard</div>
            <div class="chart-subtitle">Committed vs quota by rep</div>
          </div>
          <div class="scenario-controls">
            <span class="scenario-indicator" style="background:var(--green)"></span>
            <span class="scenario-label">Committed</span>
            <span class="scenario-indicator" style="background:var(--violet);margin-left:8px"></span>
            <span class="scenario-label">Best Case</span>
          </div>
        </div>
        <div class="chart-container tall"><canvas id="chartRepLeaderboard"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Forecast Trend</div>
            <div class="chart-subtitle">12-week committed / best case / worst case</div>
          </div>
          <div class="scenario-controls">
            <span class="scenario-indicator" style="background:var(--green)"></span>
            <span class="scenario-label">Committed</span>
            <span class="scenario-indicator" style="background:var(--cyan);margin-left:8px"></span>
            <span class="scenario-label">Best Case</span>
            <span class="scenario-indicator" style="background:var(--red);margin-left:8px"></span>
            <span class="scenario-label">Worst Case</span>
          </div>
        </div>
        <div class="chart-container"><canvas id="chartForecastTrend"></canvas></div>
      </div>
    </div>

    <!-- At-Risk Deals Table -->
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">At-Risk Deals</div>
        <div class="table-count" id="atriskCount">8 deals</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Value</th>
            <th>Close Date</th>
            <th>Stage</th>
            <th>Risk Factor</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody id="atriskBody"></tbody>
      </table>
    </div>
  </div>

  <!-- BY REP TAB -->
  <div class="tab-panel" id="panel-byrep">
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">Forecast by Rep</div>
        <div class="table-count" id="repCount">8 reps</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Rep</th>
            <th>Quota</th>
            <th>Committed</th>
            <th>Best Case</th>
            <th>Attainment</th>
            <th>Gap to Quota</th>
          </tr>
        </thead>
        <tbody id="repBody"></tbody>
      </table>
    </div>
    <div class="chart-grid">
      <div class="chart-card full-width">
        <div class="chart-header">
          <div>
            <div class="chart-title">Rep Quota Attainment</div>
            <div class="chart-subtitle">Committed attainment % by rep</div>
          </div>
        </div>
        <div class="chart-container tall"><canvas id="chartRepBar"></canvas></div>
      </div>
    </div>
  </div>

  <!-- BY REGION TAB -->
  <div class="tab-panel" id="panel-byregion">
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Forecast by Region</div>
            <div class="chart-subtitle">Q2 2026 committed forecast distribution</div>
          </div>
        </div>
        <div class="chart-container"><canvas id="chartRegionDoughnut"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Region Trend</div>
            <div class="chart-subtitle">Monthly forecast by region</div>
          </div>
        </div>
        <div class="chart-container"><canvas id="chartRegionTrend"></canvas></div>
      </div>
    </div>
  </div>

  <!-- PIPELINE COVERAGE TAB -->
  <div class="tab-panel" id="panel-coverage">
    <div class="chart-grid">
      <div class="chart-card full-width">
        <div class="chart-header">
          <div>
            <div class="chart-title">Pipeline Coverage Analysis</div>
            <div class="chart-subtitle">Stage-by-stage contribution to forecast coverage</div>
          </div>
        </div>
        <div class="chart-container tall"><canvas id="chartCoverageDetail"></canvas></div>
        <div class="pipeline-legend" id="coverageLegend"></div>
      </div>
    </div>
  </div>

  <!-- SCENARIOS TAB -->
  <div class="tab-panel" id="panel-scenarios">
    <div class="chart-grid">
      <div class="chart-card full-width">
        <div class="chart-header">
          <div>
            <div class="chart-title">Scenario Analysis</div>
            <div class="chart-subtitle">Committed / Best Case / Worst Case &mdash; 12-week trajectory</div>
          </div>
          <div class="scenario-controls">
            <span class="scenario-indicator" style="background:var(--green)"></span>
            <span class="scenario-label">Committed</span>
            <span class="scenario-indicator" style="background:var(--cyan);margin-left:8px"></span>
            <span class="scenario-label">Best Case</span>
            <span class="scenario-indicator" style="background:var(--red);margin-left:8px"></span>
            <span class="scenario-label">Worst Case</span>
          </div>
        </div>
        <div class="chart-container tall"><canvas id="chartScenarioFull"></canvas></div>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
  var S=window.__VIBE_SAMPLE__||{};
  var chartDefaults={
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{
      backgroundColor:'#1E293B',titleColor:'#F8FAFC',bodyColor:'#94A3B8',
      borderColor:'#334155',borderWidth:1,cornerRadius:8,padding:12,
      titleFont:{family:'Space Grotesk',weight:'600'},bodyFont:{family:'Inter'}
    }},
    scales:{x:{grid:{color:'rgba(30,41,59,0.5)',drawBorder:false},ticks:{color:'#64748B',font:{family:'Inter',size:11}}},
            y:{grid:{color:'rgba(30,41,59,0.5)',drawBorder:false},ticks:{color:'#64748B',font:{family:'Inter',size:11}}}}
  };

  /* KPI Render */
  var kpis=S.kpis||[];
  kpis.forEach(function(k){
    var el=document.getElementById('kpi-'+k.id);
    if(el) el.textContent=k.value;
    var tr=document.getElementById('kpi-'+k.id+'-trend');
    if(tr){
      tr.textContent=(k.direction==='up'?'&#9650; ':k.direction==='down'?'&#9660; ':'')+k.trend;
      tr.innerHTML=(k.direction==='up'?'&#9650; ':k.direction==='down'?'&#9660; ':'')+k.trend;
      tr.className='kpi-trend '+k.direction;
    }
  });

  /* Chart 1: Forecast vs Quota */
  (function(){
    var data=[];
    try{data=S.forecast||[]}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).forecast||[];
    var ctx=document.getElementById('chartForecastQuota');
    if(!ctx) return;
    new Chart(ctx,{type:'bar',data:{
      labels:data.map(function(d){return d.month}),
      datasets:[
        {label:'Actual',data:data.map(function(d){return d.actual}),backgroundColor:'#00E5A0',borderRadius:6,barPercentage:0.7,categoryPercentage:0.7},
        {label:'Forecast',data:data.map(function(d){return d.forecast}),backgroundColor:'#00B4D8',borderRadius:6,barPercentage:0.7,categoryPercentage:0.7},
        {label:'Quota',data:data.map(function(d){return d.quota}),backgroundColor:'rgba(123,97,255,0.3)',borderColor:'#7B61FF',borderWidth:2,borderRadius:6,borderDash:[4,4],type:'line',fill:false,pointRadius:0,tension:0.4}
      ]
    },options:Object.assign({},chartDefaults,{plugins:{legend:{display:true,position:'top',labels:{color:'#94A3B8',font:{family:'Inter',size:11},usePointStyle:true,pointStyle:'circle',padding:16}},tooltip:chartDefaults.plugins.tooltip},scales:{x:chartDefaults.scales.x,y:Object.assign({},chartDefaults.scales.y,{ticks:Object.assign({},chartDefaults.scales.y.ticks,{callback:function(v){return '$'+v/1000+'K'}})})}})});
  })();

  /* Chart 2: Pipeline Coverage Waterfall */
  (function(){
    var data=[];
    try{data=S.pipeline||[]}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).pipeline||[];
    var ctx=document.getElementById('chartPipelineWaterfall');
    if(!ctx) return;
    new Chart(ctx,{type:'bar',data:{
      labels:data.map(function(d){return d.stage}),
      datasets:[{
        data:data.map(function(d){return d.value}),
        backgroundColor:data.map(function(d){return d.color||'#00E5A0'}),
        borderRadius:6,barPercentage:0.6
      }]
    },options:Object.assign({},chartDefaults,{indexAxis:'y',plugins:{legend:{display:false},tooltip:chartDefaults.plugins.tooltip},scales:{x:Object.assign({},chartDefaults.scales.x,{ticks:Object.assign({},chartDefaults.scales.x.ticks,{callback:function(v){return '$'+v/1000+'K'}})}),y:chartDefaults.scales.y}})});
  })();

  /* Chart 3: Rep Attainment Leaderboard */
  (function(){
    var data=[];
    try{data=S.reps||[]}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).reps||[];
    var ctx=document.getElementById('chartRepLeaderboard');
    if(!ctx) return;
    data.sort(function(a,b){return(b.committed/b.quota)-(a.committed/a.quota)});
    new Chart(ctx,{type:'bar',data:{
      labels:data.map(function(d){return d.name}),
      datasets:[
        {label:'Committed',data:data.map(function(d){return d.committed}),backgroundColor:'#00E5A0',borderRadius:4,barPercentage:0.5,categoryPercentage:0.7},
        {label:'Best Case',data:data.map(function(d){return d.bestCase}),backgroundColor:'rgba(123,97,255,0.4)',borderRadius:4,barPercentage:0.5,categoryPercentage:0.7}
      ]
    },options:Object.assign({},chartDefaults,{indexAxis:'y',plugins:{legend:{display:false},tooltip:chartDefaults.plugins.tooltip},scales:{x:Object.assign({},chartDefaults.scales.x,{ticks:Object.assign({},chartDefaults.scales.x.ticks,{callback:function(v){return '$'+v/1000+'K'}})}),y:chartDefaults.scales.y}})});
  })();

  /* Chart 4: Forecast Trend */
  (function(){
    var data=[];
    try{data=S.scenarios||[]}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).scenarios||[];
    var ctx=document.getElementById('chartForecastTrend');
    if(!ctx) return;
    new Chart(ctx,{type:'line',data:{
      labels:data.map(function(d){return d.week}),
      datasets:[
        {label:'Committed',data:data.map(function(d){return d.committed}),borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.08)',fill:true,tension:0.4,pointRadius:0,pointHoverRadius:5,borderWidth:2},
        {label:'Best Case',data:data.map(function(d){return d.bestCase}),borderColor:'#00B4D8',backgroundColor:'rgba(0,180,216,0.06)',fill:true,tension:0.4,pointRadius:0,pointHoverRadius:5,borderWidth:2},
        {label:'Worst Case',data:data.map(function(d){return d.worstCase}),borderColor:'#EF4444',backgroundColor:'rgba(239,68,68,0.06)',fill:true,tension:0.4,pointRadius:0,pointHoverRadius:5,borderWidth:2}
      ]
    },options:Object.assign({},chartDefaults,{plugins:{legend:{display:false},tooltip:chartDefaults.plugins.tooltip},scales:{x:chartDefaults.scales.x,y:Object.assign({},chartDefaults.scales.y,{ticks:Object.assign({},chartDefaults.scales.y.ticks,{callback:function(v){return '$'+(v/1000000).toFixed(1)+'M'}})})}})});
  })();

  /* At-Risk Table */
  (function(){
    var data=[];
    try{data=S.atrisk||[]}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).atrisk||[];
    var body=document.getElementById('atriskBody');
    if(!body) return;
    var riskLevel=function(r){
      if(r.indexOf('left')>-1||r.indexOf('freeze')>-1||r.indexOf('delay')>-1) return 'high';
      if(r.indexOf('Competitor')>-1||r.indexOf('Legal')>-1||r.indexOf('persona')>-1) return 'medium';
      return 'low';
    };
    body.innerHTML=data.map(function(d){
      var lvl=riskLevel(d.risk);
      return '<tr><td class="money">'+d.company+'</td><td class="money green-text">$'+(d.value/1000).toFixed(0)+'K</td><td>'+d.closeDate+'</td><td>'+d.stage+'</td><td><span class="risk-badge risk-'+lvl+'">'+d.risk+'</span></td><td>'+d.owner+'</td></tr>';
    }).join('');
    var cnt=document.getElementById('atriskCount');
    if(cnt) cnt.textContent=data.length+' deals';
  })();

  /* Rep Table (By Rep tab) */
  (function(){
    var data=[];
    try{data=S.reps||[]}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).reps||[];
    var body=document.getElementById('repBody');
    if(!body) return;
    var colors=['#00E5A0','#00B4D8','#7B61FF','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316'];
    data.sort(function(a,b){return(b.committed/b.quota)-(a.committed/a.quota)});
    body.innerHTML=data.map(function(d,i){
      var att=((d.committed/d.quota)*100).toFixed(1);
      var gap=d.quota-d.committed;
      var attClass=att>=90?'attain-high':att>=70?'attain-mid':'attain-low';
      return '<tr><td><div class="rep-cell"><div class="rep-avatar" style="background:'+colors[i%8]+'">'+d.avatar+'</div>'+d.name+'</div></td><td class="money">$'+(d.quota/1000).toFixed(0)+'K</td><td class="money">$'+(d.committed/1000).toFixed(0)+'K</td><td class="money">$'+(d.bestCase/1000).toFixed(0)+'K</td><td><span class="'+attClass+'">'+att+'%</span></td><td class="money '+(gap>0?'red-text':'green-text')+'">$'+(gap/1000).toFixed(0)+'K</td></tr>';
    }).join('');
    var cnt=document.getElementById('repCount');
    if(cnt) cnt.textContent=data.length+' reps';
  })();

  /* Chart: Rep Bar (By Rep tab) - horizontal attainment bar */
  (function(){
    var data=[];
    try{data=S.reps||[]}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).reps||[];
    var ctx=document.getElementById('chartRepBar');
    if(!ctx) return;
    data.sort(function(a,b){return(b.committed/b.quota)-(a.committed/a.quota)});
    var attainments=data.map(function(d){return((d.committed/d.quota)*100).toFixed(1)});
    var barColors=attainments.map(function(a){return a>=90?'#00E5A0':a>=70?'#F59E0B':'#EF4444'});
    new Chart(ctx,{type:'bar',data:{
      labels:data.map(function(d){return d.name}),
      datasets:[{
        label:'Attainment %',data:attainments,
        backgroundColor:barColors,borderRadius:6,barPercentage:0.5
      }]
    },options:Object.assign({},chartDefaults,{indexAxis:'y',plugins:{legend:{display:false},tooltip:chartDefaults.plugins.tooltip},scales:{x:Object.assign({},chartDefaults.scales.x,{max:120,ticks:Object.assign({},chartDefaults.scales.x.ticks,{callback:function(v){return v+'%'}})}),y:chartDefaults.scales.y}})});
  })();

  /* Chart: Region Doughnut */
  (function(){
    var regions=[
      {name:'North America',value:980000,color:'#00E5A0'},
      {name:'EMEA',value:520000,color:'#00B4D8'},
      {name:'APAC',value:340000,color:'#7B61FF'},
      {name:'LATAM',value:260000,color:'#F59E0B'}
    ];
    var ctx=document.getElementById('chartRegionDoughnut');
    if(!ctx) return;
    new Chart(ctx,{type:'doughnut',data:{
      labels:regions.map(function(r){return r.name}),
      datasets:[{data:regions.map(function(r){return r.value}),backgroundColor:regions.map(function(r){return r.color}),borderWidth:0,hoverOffset:8}]
    },options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom',labels:{color:'#94A3B8',font:{family:'Inter',size:11},usePointStyle:true,pointStyle:'circle',padding:16}},tooltip:{backgroundColor:'#1E293B',titleColor:'#F8FAFC',bodyColor:'#94A3B8',borderColor:'#334155',borderWidth:1,cornerRadius:8,callbacks:{label:function(c){return c.label+': $'+(c.raw/1000).toFixed(0)+'K'}}}}}});
  })();

  /* Chart: Region Trend */
  (function(){
    var months=['Nov','Dec','Jan','Feb','Mar','Apr'];
    var ctx=document.getElementById('chartRegionTrend');
    if(!ctx) return;
    new Chart(ctx,{type:'line',data:{
      labels:months,
      datasets:[
        {label:'North America',data:[180000,220000,200000,240000,210000,250000],borderColor:'#00E5A0',tension:0.4,pointRadius:0,borderWidth:2},
        {label:'EMEA',data:[90000,110000,100000,120000,105000,130000],borderColor:'#00B4D8',tension:0.4,pointRadius:0,borderWidth:2},
        {label:'APAC',data:[60000,70000,65000,75000,70000,80000],borderColor:'#7B61FF',tension:0.4,pointRadius:0,borderWidth:2},
        {label:'LATAM',data:[40000,50000,45000,55000,48000,60000],borderColor:'#F59E0B',tension:0.4,pointRadius:0,borderWidth:2}
      ]
    },options:Object.assign({},chartDefaults,{plugins:{legend:{display:true,position:'top',labels:{color:'#94A3B8',font:{family:'Inter',size:11},usePointStyle:true,pointStyle:'circle',padding:16}},tooltip:chartDefaults.plugins.tooltip},scales:{x:chartDefaults.scales.x,y:Object.assign({},chartDefaults.scales.y,{ticks:Object.assign({},chartDefaults.scales.y.ticks,{callback:function(v){return '$'+v/1000+'K'}})})}})});
  })();

  /* Chart: Pipeline Coverage Detail */
  (function(){
    var data=[];
    try{data=S.pipeline||[]}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).pipeline||[];
    var ctx=document.getElementById('chartCoverageDetail');
    if(!ctx) return;
    new Chart(ctx,{type:'bar',data:{
      labels:data.map(function(d){return d.stage}),
      datasets:[{
        data:data.map(function(d){return d.value}),
        backgroundColor:data.map(function(d){return d.color||'#00E5A0'}),
        borderRadius:8,barPercentage:0.5
      }]
    },options:Object.assign({},chartDefaults,{plugins:{legend:{display:false},tooltip:chartDefaults.plugins.tooltip},scales:{x:chartDefaults.scales.x,y:Object.assign({},chartDefaults.scales.y,{ticks:Object.assign({},chartDefaults.scales.y.ticks,{callback:function(v){return '$'+v/1000+'K'}})})}})});
    var legend=document.getElementById('coverageLegend');
    if(legend){legend.innerHTML=data.map(function(d){return '<div class="pipeline-legend-item"><span class="pipeline-legend-dot" style="background:'+d.color+'"></span>'+d.stage+': $'+(d.value/1000).toFixed(0)+'K</div>'}).join('')}
  })();

  /* Chart: Scenario Full (Scenarios tab) */
  (function(){
    var data=[];
    try{data=S.scenarios||[]}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).scenarios||[];
    var ctx=document.getElementById('chartScenarioFull');
    if(!ctx) return;
    new Chart(ctx,{type:'line',data:{
      labels:data.map(function(d){return d.week}),
      datasets:[
        {label:'Best Case',data:data.map(function(d){return d.bestCase}),borderColor:'#00B4D8',backgroundColor:'rgba(0,180,216,0.1)',fill:'+1',tension:0.4,pointRadius:3,pointBackgroundColor:'#00B4D8',borderWidth:2},
        {label:'Committed',data:data.map(function(d){return d.committed}),borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.1)',fill:'+1',tension:0.4,pointRadius:3,pointBackgroundColor:'#00E5A0',borderWidth:2.5},
        {label:'Worst Case',data:data.map(function(d){return d.worstCase}),borderColor:'#EF4444',backgroundColor:'rgba(239,68,68,0.06)',fill:'origin',tension:0.4,pointRadius:3,pointBackgroundColor:'#EF4444',borderWidth:2}
      ]
    },options:Object.assign({},chartDefaults,{plugins:{legend:{display:false},tooltip:Object.assign({},chartDefaults.plugins.tooltip,{mode:'index',intersect:false})},scales:{x:chartDefaults.scales.x,y:Object.assign({},chartDefaults.scales.y,{ticks:Object.assign({},chartDefaults.scales.y.ticks,{callback:function(v){return '$'+(v/1000000).toFixed(1)+'M'}})})}})});
  })();

  /* Live data loader pattern */
  (async function(){
    try{
      var rows=[];
      try{rows=await vibeLoadData('sales_forecast',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
      if(!rows.length) return;
      /* If live data loads, re-render with it */
    }catch(e){/* fallback to sample data already rendered */}
  })();

  /* Tab switching */
  var tabs=document.querySelectorAll('.tab');
  tabs.forEach(function(t){
    t.addEventListener('click',function(){
      tabs.forEach(function(tt){tt.classList.remove('active')});
      t.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.remove('active')});
      var panel=document.getElementById('panel-'+t.getAttribute('data-tab'));
      if(panel) panel.classList.add('active');
    });
  });
})();
</script>
</body>
</html>$$
WHERE skill_name = 'sales-forecast';
