-- CRM Dashboard Skeleton v2: World-class Sales CRM Dashboard
-- Figma-quality, dark theme, 5 nav tabs, 6 KPI cards, 4 charts, 2 tables

UPDATE skill_registry SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Sales CRM Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script>
window.__SUPABASE_URL__='';
window.__SUPABASE_ANON_KEY__='';
window.__VIBE_TEAM_ID__='';

window.__VIBE_SAMPLE__={
  kpis:[
    {id:'pipeline',label:'Total Pipeline',value:'$4.2M',trend:'+12%',direction:'up'},
    {id:'deals',label:'Deals Active',value:'47',trend:'+3',direction:'up'},
    {id:'winrate',label:'Win Rate',value:'34.2%',trend:'+2.1%',direction:'up'},
    {id:'avgdeal',label:'Avg Deal Size',value:'$89K',trend:'-4%',direction:'down'},
    {id:'cycle',label:'Sales Cycle',value:'42 days',trend:'-3d',direction:'up'},
    {id:'quota',label:'Quota Attainment',value:'78.4%',trend:'+5%',direction:'up'}
  ],
  deals:[
    {company:'Acme Corp',stage:'Negotiation',value:320000,closeDate:'2026-04-28',owner:'Sarah Chen',probability:75},
    {company:'TechVentures Inc',stage:'Proposal',value:185000,closeDate:'2026-05-10',owner:'Marcus Webb',probability:55},
    {company:'GlobalSync Ltd',stage:'Qualified',value:420000,closeDate:'2026-06-01',owner:'Sarah Chen',probability:35},
    {company:'Meridian Health',stage:'Prospecting',value:95000,closeDate:'2026-06-15',owner:'Priya Patel',probability:15},
    {company:'Nexus Financial',stage:'Closed Won',value:210000,closeDate:'2026-03-30',owner:'James Liu',probability:100},
    {company:'Vertex AI Labs',stage:'Negotiation',value:540000,closeDate:'2026-04-22',owner:'Marcus Webb',probability:80},
    {company:'Cascade Systems',stage:'Proposal',value:128000,closeDate:'2026-05-05',owner:'Priya Patel',probability:50},
    {company:'Summit Retail',stage:'Qualified',value:275000,closeDate:'2026-05-20',owner:'James Liu',probability:30},
    {company:'Pinnacle Media',stage:'Prospecting',value:165000,closeDate:'2026-06-30',owner:'Aisha Johnson',probability:10},
    {company:'Quantum Dynamics',stage:'Negotiation',value:380000,closeDate:'2026-04-18',owner:'Sarah Chen',probability:70},
    {company:'Stratos Cloud',stage:'Closed Won',value:195000,closeDate:'2026-03-25',owner:'Aisha Johnson',probability:100},
    {company:'Helix Biotech',stage:'Proposal',value:445000,closeDate:'2026-05-15',owner:'Marcus Webb',probability:45},
    {company:'Ironclad Security',stage:'Qualified',value:310000,closeDate:'2026-05-28',owner:'James Liu',probability:25},
    {company:'Prism Analytics',stage:'Prospecting',value:88000,closeDate:'2026-07-01',owner:'Priya Patel',probability:10},
    {company:'Orbit SaaS',stage:'Negotiation',value:260000,closeDate:'2026-04-25',owner:'Aisha Johnson',probability:65},
    {company:'BluePeak Logistics',stage:'Proposal',value:172000,closeDate:'2026-05-08',owner:'Sarah Chen',probability:50},
    {company:'Vantage HR',stage:'Closed Won',value:148000,closeDate:'2026-03-20',owner:'Marcus Webb',probability:100},
    {company:'Crestline Mfg',stage:'Qualified',value:520000,closeDate:'2026-06-10',owner:'James Liu',probability:20},
    {company:'Elevate EdTech',stage:'Prospecting',value:110000,closeDate:'2026-07-15',owner:'Priya Patel',probability:5},
    {company:'Horizon Pharma',stage:'Negotiation',value:685000,closeDate:'2026-04-30',owner:'Sarah Chen',probability:72},
    {company:'Apex Consulting',stage:'Proposal',value:230000,closeDate:'2026-05-12',owner:'Aisha Johnson',probability:55},
    {company:'Titan Industries',stage:'Closed Won',value:340000,closeDate:'2026-03-28',owner:'James Liu',probability:100},
    {company:'Lumina Design',stage:'Qualified',value:92000,closeDate:'2026-05-25',owner:'Priya Patel',probability:30},
    {company:'Northstar Data',stage:'Prospecting',value:205000,closeDate:'2026-06-20',owner:'Marcus Webb',probability:12},
    {company:'Redwood Finance',stage:'Negotiation',value:415000,closeDate:'2026-04-20',owner:'Aisha Johnson',probability:78},
    {company:'Catalyst Ventures',stage:'Proposal',value:290000,closeDate:'2026-05-18',owner:'Sarah Chen',probability:48},
    {company:'Zenith Telecom',stage:'Closed Won',value:175000,closeDate:'2026-03-22',owner:'Priya Patel',probability:100},
    {company:'Atlas Robotics',stage:'Qualified',value:610000,closeDate:'2026-06-05',owner:'James Liu',probability:22},
    {company:'Empower Health',stage:'Prospecting',value:135000,closeDate:'2026-07-10',owner:'Marcus Webb',probability:8},
    {company:'Forge Manufacturing',stage:'Negotiation',value:298000,closeDate:'2026-04-26',owner:'Priya Patel',probability:68},
    {company:'Skyline Properties',stage:'Proposal',value:350000,closeDate:'2026-05-22',owner:'Aisha Johnson',probability:42},
    {company:'Pulse Digital',stage:'Closed Won',value:125000,closeDate:'2026-03-18',owner:'Sarah Chen',probability:100},
    {company:'Evergreen Energy',stage:'Qualified',value:480000,closeDate:'2026-06-08',owner:'Marcus Webb',probability:28},
    {company:'Sterling Legal',stage:'Prospecting',value:78000,closeDate:'2026-07-05',owner:'James Liu',probability:8},
    {company:'Axiom Software',stage:'Negotiation',value:195000,closeDate:'2026-04-24',owner:'Aisha Johnson',probability:60},
    {company:'Pacific Trading',stage:'Proposal',value:310000,closeDate:'2026-05-14',owner:'Priya Patel',probability:52},
    {company:'Beacon Insurance',stage:'Closed Won',value:285000,closeDate:'2026-03-15',owner:'Marcus Webb',probability:100},
    {company:'Nimbus Cloud',stage:'Qualified',value:190000,closeDate:'2026-05-30',owner:'Sarah Chen',probability:32},
    {company:'Solaris Power',stage:'Prospecting',value:240000,closeDate:'2026-06-25',owner:'James Liu',probability:10},
    {company:'Archway Hotels',stage:'Negotiation',value:155000,closeDate:'2026-04-19',owner:'Priya Patel',probability:72},
    {company:'Keystone Mining',stage:'Proposal',value:520000,closeDate:'2026-05-20',owner:'Aisha Johnson',probability:40},
    {company:'Falcon Aerospace',stage:'Closed Won',value:410000,closeDate:'2026-03-10',owner:'Sarah Chen',probability:100},
    {company:'Mosaic Media',stage:'Qualified',value:145000,closeDate:'2026-06-02',owner:'Marcus Webb',probability:25},
    {company:'Trident Shipping',stage:'Prospecting',value:330000,closeDate:'2026-07-20',owner:'James Liu',probability:6},
    {company:'Clarity AI',stage:'Negotiation',value:275000,closeDate:'2026-04-27',owner:'Aisha Johnson',probability:65},
    {company:'Opal Therapeutics',stage:'Proposal',value:390000,closeDate:'2026-05-16',owner:'Priya Patel',probability:45},
    {company:'Ridgeline Capital',stage:'Closed Won',value:220000,closeDate:'2026-03-12',owner:'Marcus Webb',probability:100}
  ],
  revenue:[
    {month:'May 25',actual:380000,target:400000},
    {month:'Jun 25',actual:420000,target:410000},
    {month:'Jul 25',actual:395000,target:420000},
    {month:'Aug 25',actual:460000,target:430000},
    {month:'Sep 25',actual:445000,target:440000},
    {month:'Oct 25',actual:510000,target:450000},
    {month:'Nov 25',actual:485000,target:460000},
    {month:'Dec 25',actual:530000,target:470000},
    {month:'Jan 26',actual:495000,target:480000},
    {month:'Feb 26',actual:540000,target:490000},
    {month:'Mar 26',actual:575000,target:500000},
    {month:'Apr 26',actual:null,target:510000}
  ],
  reps:[
    {name:'Sarah Chen',closed:12,value:1850000,avatar:'SC'},
    {name:'Marcus Webb',closed:10,value:1620000,avatar:'MW'},
    {name:'James Liu',closed:9,value:1540000,avatar:'JL'},
    {name:'Aisha Johnson',closed:8,value:1380000,avatar:'AJ'},
    {name:'Priya Patel',closed:7,value:1120000,avatar:'PP'},
    {name:'David Kim',closed:6,value:980000,avatar:'DK'},
    {name:'Elena Rossi',closed:5,value:870000,avatar:'ER'},
    {name:'Tyler Brooks',closed:4,value:650000,avatar:'TB'}
  ],
  activity:[
    {rep:'Sarah Chen',action:'Sent proposal',account:'Acme Corp',date:'2026-04-12',nextStep:'Follow up on pricing'},
    {rep:'Marcus Webb',action:'Discovery call',account:'TechVentures Inc',date:'2026-04-12',nextStep:'Schedule demo'},
    {rep:'James Liu',action:'Contract signed',account:'Nexus Financial',date:'2026-04-11',nextStep:'Onboarding kickoff'},
    {rep:'Priya Patel',action:'Demo completed',account:'Cascade Systems',date:'2026-04-11',nextStep:'Send pricing proposal'},
    {rep:'Aisha Johnson',action:'Meeting scheduled',account:'Orbit SaaS',date:'2026-04-11',nextStep:'Prepare deck'},
    {rep:'Sarah Chen',action:'Negotiation update',account:'Quantum Dynamics',date:'2026-04-10',nextStep:'Legal review'},
    {rep:'Marcus Webb',action:'Email outreach',account:'Northstar Data',date:'2026-04-10',nextStep:'Qualify budget'},
    {rep:'James Liu',action:'Proposal sent',account:'Summit Retail',date:'2026-04-10',nextStep:'Schedule review call'},
    {rep:'Priya Patel',action:'Cold call',account:'Elevate EdTech',date:'2026-04-09',nextStep:'Send intro email'},
    {rep:'Aisha Johnson',action:'Contract review',account:'Redwood Finance',date:'2026-04-09',nextStep:'Finalize terms'},
    {rep:'Sarah Chen',action:'Upsell discussion',account:'Horizon Pharma',date:'2026-04-09',nextStep:'Prepare expansion proposal'},
    {rep:'James Liu',action:'QBR completed',account:'Titan Industries',date:'2026-04-08',nextStep:'Plan renewal strategy'},
    {rep:'Marcus Webb',action:'Demo scheduled',account:'Helix Biotech',date:'2026-04-08',nextStep:'Customize demo env'},
    {rep:'Priya Patel',action:'Intro meeting',account:'Meridian Health',date:'2026-04-08',nextStep:'Send case studies'},
    {rep:'Aisha Johnson',action:'Pricing negotiation',account:'Clarity AI',date:'2026-04-07',nextStep:'Final discount approval'},
    {rep:'Sarah Chen',action:'Renewal call',account:'BluePeak Logistics',date:'2026-04-07',nextStep:'Send renewal contract'},
    {rep:'James Liu',action:'Technical review',account:'Atlas Robotics',date:'2026-04-07',nextStep:'Address integration concerns'},
    {rep:'Marcus Webb',action:'Follow-up email',account:'Evergreen Energy',date:'2026-04-06',nextStep:'Book second call'},
    {rep:'Priya Patel',action:'Champion identified',account:'Archway Hotels',date:'2026-04-06',nextStep:'Executive intro'},
    {rep:'Aisha Johnson',action:'Deal won',account:'Stratos Cloud',date:'2026-04-05',nextStep:'Handoff to CS'}
  ],
  stages:[
    {name:'Prospecting',count:8,value:1446000,color:'#7B61FF'},
    {name:'Qualified',count:9,value:3042000,color:'#00B4D8'},
    {name:'Proposal',count:10,value:3020000,color:'#00E5A0'},
    {name:'Negotiation',count:10,value:3523000,color:'#F59E0B'},
    {name:'Closed Won',count:10,value:2683000,color:'#10B981'}
  ],
  sources:[
    {name:'Inbound',won:14,lost:8},
    {name:'Outbound',won:10,lost:12},
    {name:'Referral',won:9,lost:3},
    {name:'Partner',won:5,lost:4}
  ]
};

async function vibeLoadData(table,params){
  if(!window.__SUPABASE_URL__||!window.__SUPABASE_ANON_KEY__)return[];
  var url=window.__SUPABASE_URL__+'/rest/v1/'+table+'?team_id=eq.'+params.team_id;
  var r=await fetch(url,{headers:{'apikey':window.__SUPABASE_ANON_KEY__,'Authorization':'Bearer '+window.__SUPABASE_ANON_KEY__}});
  if(!r.ok)return[];
  return r.json();
}
</script>
<style>
:root{
  --bg-primary:#0A0E17;
  --bg-secondary:#111827;
  --bg-card:#1A1F2E;
  --bg-card-hover:#222840;
  --border-primary:#1E2A3A;
  --border-glow:rgba(0,229,160,0.15);
  --text-primary:#F1F5F9;
  --text-secondary:#94A3B8;
  --text-muted:#64748B;
  --primary:#00E5A0;
  --primary-dim:rgba(0,229,160,0.15);
  --accent:#00B4D8;
  --accent-dim:rgba(0,180,216,0.15);
  --violet:#7B61FF;
  --violet-dim:rgba(123,97,255,0.15);
  --warning:#F59E0B;
  --warning-dim:rgba(245,158,11,0.15);
  --success:#10B981;
  --success-dim:rgba(16,185,129,0.15);
  --danger:#EF4444;
  --danger-dim:rgba(239,68,68,0.15);
  --gradient-vibe:linear-gradient(135deg,#00E5A0,#00B4D8,#7B61FF);
  --shadow-card:0 4px 24px rgba(0,0,0,0.3);
  --shadow-glow:0 0 20px rgba(0,229,160,0.08);
  --radius:12px;
  --radius-lg:16px;
  --radius-sm:8px;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:var(--bg-primary);color:var(--text-primary);min-height:100vh;overflow-x:hidden}
h1,h2,h3,h4,h5{font-family:'Space Grotesk',sans-serif;font-weight:600}

/* ── Navbar ── */
.navbar{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:64px;background:rgba(17,24,39,0.75);backdrop-filter:blur(20px);border-bottom:1px solid var(--border-primary)}
.navbar-brand{display:flex;align-items:center;gap:12px}
.navbar-logo{width:36px;height:36px;border-radius:10px;background:var(--gradient-vibe);display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;color:#0A0E17}
.navbar-title{font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:600;color:var(--text-primary)}
.navbar-subtitle{font-size:12px;color:var(--text-muted);margin-left:8px}
.navbar-actions{display:flex;align-items:center;gap:12px}
.navbar-btn{padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--border-primary);background:transparent;color:var(--text-secondary);font-size:13px;cursor:pointer;transition:all 0.2s}
.navbar-btn:hover{border-color:var(--primary);color:var(--primary)}
.navbar-btn-primary{background:var(--primary);color:#0A0E17;border-color:var(--primary);font-weight:600}
.navbar-btn-primary:hover{filter:brightness(1.1);box-shadow:0 0 16px rgba(0,229,160,0.3)}
.navbar-status{width:8px;height:8px;border-radius:50%;background:var(--primary);box-shadow:0 0 8px var(--primary)}

/* ── Tab Navigation ── */
.tab-nav{display:flex;gap:4px;padding:16px 32px 0;background:var(--bg-primary);border-bottom:1px solid var(--border-primary)}
.tab-btn{padding:12px 24px;font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:500;color:var(--text-muted);background:transparent;border:none;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.2s;position:relative}
.tab-btn:hover{color:var(--text-secondary)}
.tab-btn.active{color:var(--primary);border-bottom-color:var(--primary)}
.tab-btn.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--primary);box-shadow:0 0 8px var(--primary)}

/* ── Layout ── */
.dashboard-container{max-width:1440px;margin:0 auto;padding:24px 32px 48px}
.tab-panel{display:none}
.tab-panel.active{display:block}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.section-title{font-size:16px;font-weight:600;color:var(--text-primary)}
.section-badge{font-size:11px;padding:4px 10px;border-radius:20px;background:var(--primary-dim);color:var(--primary);font-weight:500}

/* ── KPI Cards ── */
.kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-bottom:32px}
.kpi-card{background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius);padding:20px;position:relative;overflow:hidden;transition:all 0.3s}
.kpi-card:hover{border-color:rgba(0,229,160,0.3);box-shadow:var(--shadow-glow);transform:translateY(-2px)}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--gradient-vibe);opacity:0;transition:opacity 0.3s}
.kpi-card:hover::before{opacity:1}
.kpi-label{font-size:12px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px}
.kpi-value{font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;color:var(--text-primary);margin-bottom:6px}
.kpi-trend{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:500;padding:2px 8px;border-radius:20px}
.kpi-trend.up{color:var(--success);background:var(--success-dim)}
.kpi-trend.down{color:var(--danger);background:var(--danger-dim)}

/* ── Charts ── */
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px}
.chart-card{background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:24px;transition:all 0.3s}
.chart-card:hover{border-color:rgba(0,229,160,0.2);box-shadow:var(--shadow-glow)}
.chart-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.chart-title{font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600}
.chart-subtitle{font-size:12px;color:var(--text-muted)}
.chart-wrapper{position:relative;height:280px}
.chart-full{grid-column:1/-1}

/* ── Tables ── */
.table-card{background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:32px}
.table-card .chart-header{padding:20px 24px;margin-bottom:0;border-bottom:1px solid var(--border-primary)}
.data-table{width:100%;border-collapse:collapse}
.data-table thead th{padding:12px 20px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;background:rgba(0,0,0,0.2);border-bottom:1px solid var(--border-primary)}
.data-table tbody td{padding:14px 20px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid rgba(30,42,58,0.5)}
.data-table tbody tr:hover{background:var(--bg-card-hover)}
.data-table tbody tr:last-child td{border-bottom:none}
.stage-badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500}
.stage-prospecting{background:var(--violet-dim);color:var(--violet)}
.stage-qualified{background:var(--accent-dim);color:var(--accent)}
.stage-proposal{background:var(--primary-dim);color:var(--primary)}
.stage-negotiation{background:var(--warning-dim);color:var(--warning)}
.stage-closed{background:var(--success-dim);color:var(--success)}
.owner-cell{display:flex;align-items:center;gap:8px}
.owner-avatar{width:28px;height:28px;border-radius:50%;background:var(--gradient-vibe);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#0A0E17}
.prob-bar{width:60px;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;display:inline-block;vertical-align:middle;margin-right:8px}
.prob-fill{height:100%;border-radius:3px;transition:width 0.5s}

/* ── Forecast Tab ── */
.forecast-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
.forecast-card{background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius);padding:24px;text-align:center}
.forecast-label{font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}
.forecast-value{font-family:'Space Grotesk',sans-serif;font-size:32px;font-weight:700}
.forecast-sub{font-size:12px;color:var(--text-muted);margin-top:4px}

/* ── Contact Cards ── */
.contact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
.contact-card{background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius);padding:20px;transition:all 0.3s}
.contact-card:hover{border-color:rgba(0,229,160,0.3);transform:translateY(-2px)}
.contact-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.contact-avatar{width:42px;height:42px;border-radius:50%;background:var(--gradient-vibe);display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;color:#0A0E17}
.contact-name{font-weight:600;font-size:14px}
.contact-role{font-size:12px;color:var(--text-muted)}
.contact-meta{display:flex;gap:16px;font-size:12px;color:var(--text-secondary);margin-top:8px}
.contact-tag{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:500;background:var(--primary-dim);color:var(--primary)}

/* ── Responsive ── */
@media(max-width:1200px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){
  .kpi-grid{grid-template-columns:repeat(2,1fr)}
  .chart-grid{grid-template-columns:1fr}
  .contact-grid{grid-template-columns:1fr}
  .forecast-summary{grid-template-columns:1fr}
  .tab-nav{overflow-x:auto;padding:12px 16px 0}
  .dashboard-container{padding:16px}
  .navbar{padding:0 16px}
}
</style>
</head>
<body>

<!-- Navbar -->
<nav class="navbar">
  <div class="navbar-brand">
    <div class="navbar-logo">V</div>
    <div>
      <span class="navbar-title">Sales CRM</span>
      <span class="navbar-subtitle">Dashboard</span>
    </div>
  </div>
  <div class="navbar-actions">
    <span class="navbar-status"></span>
    <button class="navbar-btn">Export</button>
    <button class="navbar-btn navbar-btn-primary">+ New Deal</button>
  </div>
</nav>

<!-- Tab Navigation -->
<div class="tab-nav">
  <button class="tab-btn active" data-tab="overview">Overview</button>
  <button class="tab-btn" data-tab="pipeline">Pipeline</button>
  <button class="tab-btn" data-tab="contacts">Contacts</button>
  <button class="tab-btn" data-tab="activity">Activity</button>
  <button class="tab-btn" data-tab="forecast">Forecast</button>
</div>

<div class="dashboard-container">

<!-- ====== OVERVIEW TAB ====== -->
<div class="tab-panel active" id="panel-overview">

  <!-- KPI Cards -->
  <div class="kpi-grid" id="kpi-container">
    <div class="kpi-card"><div class="kpi-label">Total Pipeline</div><div class="kpi-value" id="kpi-pipeline">--</div><div class="kpi-trend up" id="kpi-trend-pipeline"></div></div>
    <div class="kpi-card"><div class="kpi-label">Deals Active</div><div class="kpi-value" id="kpi-deals">--</div><div class="kpi-trend up" id="kpi-trend-deals"></div></div>
    <div class="kpi-card"><div class="kpi-label">Win Rate</div><div class="kpi-value" id="kpi-winrate">--</div><div class="kpi-trend up" id="kpi-trend-winrate"></div></div>
    <div class="kpi-card"><div class="kpi-label">Avg Deal Size</div><div class="kpi-value" id="kpi-avgdeal">--</div><div class="kpi-trend down" id="kpi-trend-avgdeal"></div></div>
    <div class="kpi-card"><div class="kpi-label">Sales Cycle</div><div class="kpi-value" id="kpi-cycle">--</div><div class="kpi-trend up" id="kpi-trend-cycle"></div></div>
    <div class="kpi-card"><div class="kpi-label">Quota Attainment</div><div class="kpi-value" id="kpi-quota">--</div><div class="kpi-trend up" id="kpi-trend-quota"></div></div>
  </div>

  <!-- Charts Row 1 -->
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-header">
        <div><div class="chart-title">Pipeline by Stage</div><div class="chart-subtitle">Value distribution across stages</div></div>
        <div class="section-badge">Live</div>
      </div>
      <div class="chart-wrapper"><canvas id="chart-pipeline"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-header">
        <div><div class="chart-title">Revenue Trend</div><div class="chart-subtitle">Actual vs target (12 months)</div></div>
        <div class="section-badge">Monthly</div>
      </div>
      <div class="chart-wrapper"><canvas id="chart-revenue"></canvas></div>
    </div>
  </div>

  <!-- Charts Row 2 -->
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-header">
        <div><div class="chart-title">Win/Loss by Source</div><div class="chart-subtitle">Conversion by lead origin</div></div>
      </div>
      <div class="chart-wrapper"><canvas id="chart-sources"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-header">
        <div><div class="chart-title">Deal Velocity by Rep</div><div class="chart-subtitle">Top 8 reps by deals closed</div></div>
      </div>
      <div class="chart-wrapper"><canvas id="chart-reps"></canvas></div>
    </div>
  </div>
</div>

<!-- ====== PIPELINE TAB ====== -->
<div class="tab-panel" id="panel-pipeline">
  <div class="section-header">
    <h2 class="section-title">Active Pipeline</h2>
    <div class="section-badge" id="pipeline-count">47 deals</div>
  </div>
  <div class="table-card">
    <table class="data-table">
      <thead>
        <tr><th>Company</th><th>Stage</th><th>Value</th><th>Close Date</th><th>Owner</th><th>Probability</th></tr>
      </thead>
      <tbody id="pipeline-table-body"></tbody>
    </table>
  </div>
</div>

<!-- ====== CONTACTS TAB ====== -->
<div class="tab-panel" id="panel-contacts">
  <div class="section-header">
    <h2 class="section-title">Key Contacts</h2>
    <div class="section-badge">CRM Synced</div>
  </div>
  <div class="contact-grid" id="contacts-grid"></div>
</div>

<!-- ====== ACTIVITY TAB ====== -->
<div class="tab-panel" id="panel-activity">
  <div class="section-header">
    <h2 class="section-title">Recent Activity</h2>
    <div class="section-badge">Last 7 days</div>
  </div>
  <div class="table-card">
    <table class="data-table">
      <thead>
        <tr><th>Rep</th><th>Action</th><th>Account</th><th>Date</th><th>Next Step</th></tr>
      </thead>
      <tbody id="activity-table-body"></tbody>
    </table>
  </div>
</div>

<!-- ====== FORECAST TAB ====== -->
<div class="tab-panel" id="panel-forecast">
  <div class="section-header">
    <h2 class="section-title">Sales Forecast</h2>
    <div class="section-badge">Q2 2026</div>
  </div>
  <div class="forecast-summary" id="forecast-summary"></div>
  <div class="chart-grid">
    <div class="chart-card chart-full">
      <div class="chart-header">
        <div><div class="chart-title">Weighted Forecast by Month</div><div class="chart-subtitle">Probability-weighted pipeline value</div></div>
      </div>
      <div class="chart-wrapper"><canvas id="chart-forecast"></canvas></div>
    </div>
  </div>
</div>

</div><!-- /dashboard-container -->

<script>
/* ── Tab Switching ── */
(function(){
  var tabs=document.querySelectorAll('.tab-btn');
  var panels=document.querySelectorAll('.tab-panel');
  tabs.forEach(function(t){
    t.addEventListener('click',function(){
      tabs.forEach(function(b){b.classList.remove('active')});
      panels.forEach(function(p){p.classList.remove('active')});
      t.classList.add('active');
      document.getElementById('panel-'+t.dataset.tab).classList.add('active');
    });
  });
})();

/* ── KPI Rendering ── */
(function(){
  var kpis=(window.__VIBE_SAMPLE__||{}).kpis||[];
  kpis.forEach(function(k){
    var el=document.getElementById('kpi-'+k.id);
    if(el) el.textContent=k.value;
    var tr=document.getElementById('kpi-trend-'+k.id);
    if(tr){
      tr.textContent=(k.direction==='up'?'\u2191':'\u2193')+' '+k.trend;
      tr.className='kpi-trend '+k.direction;
    }
  });
})();

/* ── Chart 1: Pipeline by Stage (horizontal bar) ── */
(async function(){
  var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  var rows=[];
  try{rows=await vibeLoadData('deals',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).stages||[];
  var labels=rows.map(function(r){return r.name});
  var values=rows.map(function(r){return r.value});
  var colors=['#7B61FF','#00B4D8','#00E5A0','#F59E0B','#10B981'];
  new Chart(document.getElementById('chart-pipeline'),{
    type:'bar',
    data:{labels:labels,datasets:[{label:'Pipeline Value',data:values,backgroundColor:colors,borderRadius:6,borderSkipped:false}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return '$'+(c.raw/1000).toFixed(0)+'K'}}}},scales:{x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748B',callback:function(v){return '$'+(v/1000)+'K'}}},y:{grid:{display:false},ticks:{color:'#94A3B8',font:{family:'Space Grotesk'}}}}}
  });
})();

/* ── Chart 2: Revenue Trend (line) ── */
(async function(){
  var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  var rows=[];
  try{rows=await vibeLoadData('revenue',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).revenue||[];
  var labels=rows.map(function(r){return r.month});
  var actual=rows.map(function(r){return r.actual});
  var target=rows.map(function(r){return r.target});
  new Chart(document.getElementById('chart-revenue'),{
    type:'line',
    data:{labels:labels,datasets:[
      {label:'Actual',data:actual,borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.1)',fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#00E5A0',borderWidth:2},
      {label:'Target',data:target,borderColor:'#64748B',borderDash:[6,4],tension:0.4,pointRadius:0,borderWidth:2,fill:false}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94A3B8',usePointStyle:true,padding:20}},tooltip:{callbacks:{label:function(c){return c.dataset.label+': $'+(c.raw/1000).toFixed(0)+'K'}}}},scales:{x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748B'}},y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748B',callback:function(v){return '$'+(v/1000)+'K'}}}}}
  });
})();

/* ── Chart 3: Win/Loss by Source (doughnut) ── */
(async function(){
  var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  var rows=[];
  try{rows=await vibeLoadData('sources',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).sources||[];
  var labels=rows.map(function(r){return r.name});
  var won=rows.map(function(r){return r.won});
  var lost=rows.map(function(r){return r.lost});
  new Chart(document.getElementById('chart-sources'),{
    type:'doughnut',
    data:{labels:labels,datasets:[
      {label:'Won',data:won,backgroundColor:['#00E5A0','#00B4D8','#7B61FF','#F59E0B'],borderWidth:0,spacing:2},
      {label:'Lost',data:lost,backgroundColor:['rgba(0,229,160,0.3)','rgba(0,180,216,0.3)','rgba(123,97,255,0.3)','rgba(245,158,11,0.3)'],borderWidth:0,spacing:2}
    ]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'right',labels:{color:'#94A3B8',usePointStyle:true,padding:12,font:{size:12}}}}}
  });
})();

/* ── Chart 4: Deal Velocity by Rep (bar) ── */
(async function(){
  var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  var rows=[];
  try{rows=await vibeLoadData('reps',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
  if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).reps||[];
  var labels=rows.map(function(r){return r.name});
  var closed=rows.map(function(r){return r.closed});
  new Chart(document.getElementById('chart-reps'),{
    type:'bar',
    data:{labels:labels,datasets:[{label:'Deals Closed',data:closed,backgroundColor:function(ctx){var g=ctx.chart.ctx.createLinearGradient(0,0,0,280);g.addColorStop(0,'#00E5A0');g.addColorStop(1,'#00B4D8');return g},borderRadius:6,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.raw+' deals closed'}}}},scales:{x:{grid:{display:false},ticks:{color:'#94A3B8',maxRotation:45}},y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748B',stepSize:2}}}}
  });
})();

/* ── Pipeline Table ── */
(function(){
  var deals=(window.__VIBE_SAMPLE__||{}).deals||[];
  var tbody=document.getElementById('pipeline-table-body');
  if(!tbody)return;
  var stageMap={Prospecting:'prospecting',Qualified:'qualified',Proposal:'proposal',Negotiation:'negotiation','Closed Won':'closed'};
  var sorted=deals.slice().sort(function(a,b){return b.value-a.value});
  sorted.forEach(function(d){
    var cls=stageMap[d.stage]||'proposal';
    var initials=d.owner.split(' ').map(function(n){return n[0]}).join('');
    var probColor=d.probability>=70?'#10B981':d.probability>=40?'#F59E0B':'#EF4444';
    var row='<tr>'+
      '<td style="font-weight:500;color:var(--text-primary)">'+d.company+'</td>'+
      '<td><span class="stage-badge stage-'+cls+'">'+d.stage+'</span></td>'+
      '<td style="font-family:Space Grotesk;font-weight:600">$'+(d.value/1000).toFixed(0)+'K</td>'+
      '<td>'+d.closeDate+'</td>'+
      '<td><div class="owner-cell"><span class="owner-avatar">'+initials+'</span>'+d.owner+'</div></td>'+
      '<td><span class="prob-bar"><span class="prob-fill" style="width:'+d.probability+'%;background:'+probColor+'"></span></span>'+d.probability+'%</td>'+
      '</tr>';
    tbody.insertAdjacentHTML('beforeend',row);
  });
})();

/* ── Activity Table ── */
(function(){
  var acts=(window.__VIBE_SAMPLE__||{}).activity||[];
  var tbody=document.getElementById('activity-table-body');
  if(!tbody)return;
  acts.forEach(function(a){
    var row='<tr>'+
      '<td style="font-weight:500;color:var(--text-primary)">'+a.rep+'</td>'+
      '<td>'+a.action+'</td>'+
      '<td>'+a.account+'</td>'+
      '<td>'+a.date+'</td>'+
      '<td style="color:var(--primary)">'+a.nextStep+'</td>'+
      '</tr>';
    tbody.insertAdjacentHTML('beforeend',row);
  });
})();

/* ── Contacts Grid ── */
(function(){
  var deals=(window.__VIBE_SAMPLE__||{}).deals||[];
  var grid=document.getElementById('contacts-grid');
  if(!grid)return;
  var contacts={};
  deals.forEach(function(d){
    if(!contacts[d.company]){
      contacts[d.company]={company:d.company,stage:d.stage,value:d.value,owner:d.owner,probability:d.probability};
    }
  });
  var list=Object.values(contacts).sort(function(a,b){return b.value-a.value}).slice(0,12);
  list.forEach(function(c){
    var initials=c.company.split(' ').slice(0,2).map(function(w){return w[0]}).join('');
    var card='<div class="contact-card">'+
      '<div class="contact-header">'+
        '<div class="contact-avatar">'+initials+'</div>'+
        '<div><div class="contact-name">'+c.company+'</div><div class="contact-role">Owner: '+c.owner+'</div></div>'+
      '</div>'+
      '<div class="contact-meta"><span>$'+(c.value/1000).toFixed(0)+'K</span><span>'+c.stage+'</span><span class="contact-tag">'+c.probability+'% prob</span></div>'+
      '</div>';
    grid.insertAdjacentHTML('beforeend',card);
  });
})();

/* ── Forecast Tab ── */
(function(){
  var deals=(window.__VIBE_SAMPLE__||{}).deals||[];
  var summary=document.getElementById('forecast-summary');
  if(!summary)return;

  var totalPipeline=0,weightedPipeline=0,closedWon=0;
  deals.forEach(function(d){
    totalPipeline+=d.value;
    weightedPipeline+=d.value*(d.probability/100);
    if(d.stage==='Closed Won')closedWon+=d.value;
  });

  var cards=[
    {label:'Total Pipeline',value:'$'+(totalPipeline/1e6).toFixed(1)+'M',sub:'All active deals',color:'var(--primary)'},
    {label:'Weighted Forecast',value:'$'+(weightedPipeline/1e6).toFixed(1)+'M',sub:'Probability-adjusted',color:'var(--accent)'},
    {label:'Closed Won (QTD)',value:'$'+(closedWon/1e6).toFixed(1)+'M',sub:'This quarter',color:'var(--success)'}
  ];
  cards.forEach(function(c){
    summary.insertAdjacentHTML('beforeend',
      '<div class="forecast-card"><div class="forecast-label">'+c.label+'</div>'+
      '<div class="forecast-value" style="color:'+c.color+'">'+c.value+'</div>'+
      '<div class="forecast-sub">'+c.sub+'</div></div>'
    );
  });

  /* Forecast chart reuses revenue data with weighted overlay */
  var revenue=(window.__VIBE_SAMPLE__||{}).revenue||[];
  var stages=(window.__VIBE_SAMPLE__||{}).stages||[];
  var stageLabels=stages.map(function(s){return s.name});
  var stageWeighted=[];
  deals.forEach(function(d){
    var idx=stageLabels.indexOf(d.stage);
    if(idx===-1)return;
    if(!stageWeighted[idx])stageWeighted[idx]=0;
    stageWeighted[idx]+=d.value*(d.probability/100);
  });

  new Chart(document.getElementById('chart-forecast'),{
    type:'bar',
    data:{labels:stageLabels,datasets:[
      {label:'Total Value',data:stages.map(function(s){return s.value}),backgroundColor:'rgba(0,229,160,0.2)',borderColor:'#00E5A0',borderWidth:1,borderRadius:6},
      {label:'Weighted Value',data:stageWeighted,backgroundColor:'rgba(0,180,216,0.6)',borderColor:'#00B4D8',borderWidth:1,borderRadius:6}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94A3B8',usePointStyle:true,padding:20}},tooltip:{callbacks:{label:function(c){return c.dataset.label+': $'+(c.raw/1000).toFixed(0)+'K'}}}},scales:{x:{grid:{display:false},ticks:{color:'#94A3B8'}},y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748B',callback:function(v){return '$'+(v/1000)+'K'}}}}}
  });
})();
</script>
</body>
</html>$$ WHERE skill_name = 'crm-dashboard';
