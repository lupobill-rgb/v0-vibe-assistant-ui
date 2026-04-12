-- CRM Dashboard skeleton v2: Chart.js charts + try/catch vibeLoadData
-- Replaces raw canvas with new Chart() for all 4 chart panels

UPDATE skill_registry
SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Sales CRM Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script>
window.__VIBE_SAMPLE__ = {
  kpis: [
    {id:"total_pipeline",label:"Total Pipeline",value:"$4.2M",trend:"+12.3%",direction:"up"},
    {id:"deals",label:"Active Deals",value:"47",trend:"+5",direction:"up"},
    {id:"win_rate",label:"Win Rate",value:"34.2%",trend:"+2.1%",direction:"up"},
    {id:"avg_deal",label:"Avg Deal Size",value:"$89K",trend:"-$3K",direction:"down"},
    {id:"sales_cycle",label:"Sales Cycle",value:"42d",trend:"-4d",direction:"up"},
    {id:"quota",label:"Quota Attainment",value:"78.4%",trend:"+6.2%",direction:"up"}
  ],
  deals: [
    {id:1,company:"Acme Corp",contact:"Sarah Chen",stage:"Negotiation",value:320000,close_date:"2026-04-28",owner:"Marcus Rivera",probability:75,days_in_stage:8},
    {id:2,company:"TechFlow Inc",contact:"James Wu",stage:"Proposal",value:185000,close_date:"2026-05-10",owner:"Elena Vasquez",probability:55,days_in_stage:12},
    {id:3,company:"DataBridge AI",contact:"Priya Patel",stage:"Qualified",value:420000,close_date:"2026-06-15",owner:"Marcus Rivera",probability:35,days_in_stage:5},
    {id:4,company:"Nexus Systems",contact:"Tom Bradley",stage:"Prospecting",value:95000,close_date:"2026-07-01",owner:"Jordan Kim",probability:15,days_in_stage:3},
    {id:5,company:"CloudScale",contact:"Lisa Nguyen",stage:"Closed",value:275000,close_date:"2026-04-05",owner:"Elena Vasquez",probability:100,days_in_stage:0},
    {id:6,company:"Meridian Health",contact:"Dr. Rachel Foster",stage:"Negotiation",value:510000,close_date:"2026-04-22",owner:"Alex Thompson",probability:80,days_in_stage:14},
    {id:7,company:"Pinnacle Finance",contact:"David Okafor",stage:"Proposal",value:165000,close_date:"2026-05-18",owner:"Jordan Kim",probability:50,days_in_stage:7},
    {id:8,company:"Vertex Robotics",contact:"Mei Lin Zhang",stage:"Qualified",value:290000,close_date:"2026-06-20",owner:"Marcus Rivera",probability:30,days_in_stage:9},
    {id:9,company:"Harbor Logistics",contact:"Mike Sullivan",stage:"Prospecting",value:78000,close_date:"2026-07-15",owner:"Sophia Martinez",probability:10,days_in_stage:2},
    {id:10,company:"Orbit Media",contact:"Anna Kowalski",stage:"Proposal",value:142000,close_date:"2026-05-05",owner:"Alex Thompson",probability:60,days_in_stage:11},
    {id:11,company:"Sterling Pharma",contact:"Dr. Hassan Ali",stage:"Negotiation",value:680000,close_date:"2026-04-30",owner:"Elena Vasquez",probability:70,days_in_stage:18},
    {id:12,company:"Quantum Analytics",contact:"Chris Park",stage:"Qualified",value:195000,close_date:"2026-06-10",owner:"Jordan Kim",probability:40,days_in_stage:6},
    {id:13,company:"BrightPath Ed",contact:"Monica Torres",stage:"Prospecting",value:55000,close_date:"2026-08-01",owner:"Sophia Martinez",probability:12,days_in_stage:1},
    {id:14,company:"Ironclad Security",contact:"Ben Lawson",stage:"Closed",value:340000,close_date:"2026-03-28",owner:"Marcus Rivera",probability:100,days_in_stage:0},
    {id:15,company:"Atlas Manufacturing",contact:"Karen Webb",stage:"Proposal",value:225000,close_date:"2026-05-22",owner:"Alex Thompson",probability:45,days_in_stage:15},
    {id:16,company:"Vantage Energy",contact:"Robert Stein",stage:"Negotiation",value:415000,close_date:"2026-04-25",owner:"Elena Vasquez",probability:65,days_in_stage:10},
    {id:17,company:"Cascade Software",contact:"Amy Nakamura",stage:"Qualified",value:130000,close_date:"2026-06-28",owner:"Jordan Kim",probability:25,days_in_stage:4},
    {id:18,company:"Horizon Telecom",contact:"Greg Palmer",stage:"Prospecting",value:88000,close_date:"2026-07-20",owner:"Sophia Martinez",probability:8,days_in_stage:5},
    {id:19,company:"Ember Creative",contact:"Zoe Richards",stage:"Closed",value:198000,close_date:"2026-04-02",owner:"Alex Thompson",probability:100,days_in_stage:0},
    {id:20,company:"NovaTech Solutions",contact:"Ryan Chu",stage:"Proposal",value:310000,close_date:"2026-05-12",owner:"Marcus Rivera",probability:55,days_in_stage:9},
    {id:21,company:"Sapphire Health",contact:"Dr. Nina Kapoor",stage:"Negotiation",value:470000,close_date:"2026-04-20",owner:"Elena Vasquez",probability:72,days_in_stage:16},
    {id:22,company:"Redline Auto",contact:"Derek Fowler",stage:"Qualified",value:115000,close_date:"2026-06-05",owner:"Jordan Kim",probability:28,days_in_stage:8},
    {id:23,company:"Apex Consulting",contact:"Tanya Moore",stage:"Prospecting",value:62000,close_date:"2026-08-10",owner:"Sophia Martinez",probability:10,days_in_stage:3},
    {id:24,company:"Cobalt Industries",contact:"Steven Grant",stage:"Proposal",value:248000,close_date:"2026-05-28",owner:"Alex Thompson",probability:48,days_in_stage:13},
    {id:25,company:"Zenith Corp",contact:"Julia Hayes",stage:"Closed",value:390000,close_date:"2026-03-15",owner:"Marcus Rivera",probability:100,days_in_stage:0},
    {id:26,company:"Lighthouse Media",contact:"Paul Vernon",stage:"Negotiation",value:175000,close_date:"2026-04-18",owner:"Jordan Kim",probability:68,days_in_stage:11},
    {id:27,company:"Prism Analytics",contact:"Laura Chen",stage:"Qualified",value:205000,close_date:"2026-06-22",owner:"Elena Vasquez",probability:32,days_in_stage:7},
    {id:28,company:"Summit Retail",contact:"Jack Morrison",stage:"Prospecting",value:72000,close_date:"2026-07-25",owner:"Sophia Martinez",probability:14,days_in_stage:4},
    {id:29,company:"Titanium Tech",contact:"Sarah Blackwell",stage:"Proposal",value:335000,close_date:"2026-05-15",owner:"Marcus Rivera",probability:52,days_in_stage:10},
    {id:30,company:"Forge Dynamics",contact:"Alan Cooper",stage:"Closed",value:445000,close_date:"2026-04-08",owner:"Elena Vasquez",probability:100,days_in_stage:0},
    {id:31,company:"Velocity Labs",contact:"Diana Reyes",stage:"Negotiation",value:260000,close_date:"2026-04-26",owner:"Alex Thompson",probability:74,days_in_stage:9},
    {id:32,company:"Nimbus Cloud",contact:"Kevin Frost",stage:"Qualified",value:180000,close_date:"2026-06-18",owner:"Jordan Kim",probability:38,days_in_stage:6},
    {id:33,company:"Basalt Mining",contact:"Roger Thompson",stage:"Prospecting",value:105000,close_date:"2026-07-30",owner:"Sophia Martinez",probability:11,days_in_stage:2},
    {id:34,company:"Echo Systems",contact:"Michelle Park",stage:"Proposal",value:198000,close_date:"2026-05-08",owner:"Alex Thompson",probability:58,days_in_stage:14},
    {id:35,company:"Aether Biotech",contact:"Dr. Samuel Green",stage:"Negotiation",value:550000,close_date:"2026-04-24",owner:"Marcus Rivera",probability:78,days_in_stage:12},
    {id:36,company:"Ridgeline Partners",contact:"Catherine Holt",stage:"Qualified",value:145000,close_date:"2026-06-12",owner:"Elena Vasquez",probability:33,days_in_stage:5},
    {id:37,company:"Onyx Security",contact:"Travis Lee",stage:"Closed",value:310000,close_date:"2026-04-01",owner:"Jordan Kim",probability:100,days_in_stage:0},
    {id:38,company:"Polaris Ventures",contact:"Natalie Brooks",stage:"Prospecting",value:82000,close_date:"2026-08-05",owner:"Sophia Martinez",probability:9,days_in_stage:1},
    {id:39,company:"Crestview Hotels",contact:"George Martin",stage:"Proposal",value:270000,close_date:"2026-05-20",owner:"Marcus Rivera",probability:50,days_in_stage:8},
    {id:40,company:"Flux Energy",contact:"Rebecca Tran",stage:"Negotiation",value:385000,close_date:"2026-04-22",owner:"Elena Vasquez",probability:69,days_in_stage:13},
    {id:41,company:"Marble Arch Capital",contact:"Ian Stewart",stage:"Qualified",value:220000,close_date:"2026-06-25",owner:"Alex Thompson",probability:36,days_in_stage:7},
    {id:42,company:"Lunar Dynamics",contact:"Sophie Anderson",stage:"Prospecting",value:68000,close_date:"2026-07-18",owner:"Jordan Kim",probability:13,days_in_stage:3},
    {id:43,company:"Beacon Health",contact:"Dr. William Fox",stage:"Closed",value:425000,close_date:"2026-03-22",owner:"Alex Thompson",probability:100,days_in_stage:0},
    {id:44,company:"Spire Technologies",contact:"Angela Liu",stage:"Proposal",value:155000,close_date:"2026-05-25",owner:"Elena Vasquez",probability:47,days_in_stage:11},
    {id:45,company:"Cardinal Logistics",contact:"Brian Walsh",stage:"Negotiation",value:295000,close_date:"2026-04-19",owner:"Marcus Rivera",probability:71,days_in_stage:15},
    {id:46,company:"Evergreen Solutions",contact:"Heather Knox",stage:"Qualified",value:170000,close_date:"2026-06-08",owner:"Sophia Martinez",probability:29,days_in_stage:8},
    {id:47,company:"Stratosphere AI",contact:"Daniel Kim",stage:"Prospecting",value:92000,close_date:"2026-07-22",owner:"Jordan Kim",probability:7,days_in_stage:2}
  ],
  revenue: [
    {month:"May 25",actual:380000,target:400000},
    {month:"Jun 25",actual:420000,target:420000},
    {month:"Jul 25",actual:395000,target:440000},
    {month:"Aug 25",actual:465000,target:460000},
    {month:"Sep 25",actual:510000,target:480000},
    {month:"Oct 25",actual:485000,target:500000},
    {month:"Nov 25",actual:530000,target:520000},
    {month:"Dec 25",actual:490000,target:540000},
    {month:"Jan 26",actual:555000,target:560000},
    {month:"Feb 26",actual:580000,target:580000},
    {month:"Mar 26",actual:620000,target:600000},
    {month:"Apr 26",actual:590000,target:620000}
  ],
  reps: [
    {name:"Marcus Rivera",deals_closed:12,attainment:94,revenue:1420000},
    {name:"Elena Vasquez",deals_closed:11,attainment:89,revenue:1285000},
    {name:"Alex Thompson",deals_closed:10,attainment:82,revenue:1105000},
    {name:"Jordan Kim",deals_closed:8,attainment:76,revenue:920000},
    {name:"Sophia Martinez",deals_closed:7,attainment:68,revenue:780000},
    {name:"Tyler Brooks",deals_closed:6,attainment:61,revenue:695000},
    {name:"Rachel Kim",deals_closed:5,attainment:54,revenue:610000},
    {name:"Derek Olson",deals_closed:4,attainment:47,revenue:520000}
  ],
  activity: [
    {rep:"Marcus Rivera",action:"Closed deal",account:"Zenith Corp",date:"2026-04-12",next_step:"Onboarding kickoff"},
    {rep:"Elena Vasquez",action:"Sent proposal",account:"Sterling Pharma",date:"2026-04-12",next_step:"Follow up in 3 days"},
    {rep:"Alex Thompson",action:"Discovery call",account:"Cobalt Industries",date:"2026-04-12",next_step:"Send custom demo"},
    {rep:"Jordan Kim",action:"Demo completed",account:"Lighthouse Media",date:"2026-04-11",next_step:"Send pricing"},
    {rep:"Sophia Martinez",action:"Meeting scheduled",account:"Summit Retail",date:"2026-04-11",next_step:"Prepare deck"},
    {rep:"Marcus Rivera",action:"Contract sent",account:"Aether Biotech",date:"2026-04-11",next_step:"Legal review"},
    {rep:"Elena Vasquez",action:"Negotiation update",account:"Sapphire Health",date:"2026-04-11",next_step:"Revised terms"},
    {rep:"Alex Thompson",action:"Follow-up email",account:"Crestview Hotels",date:"2026-04-10",next_step:"Schedule call"},
    {rep:"Jordan Kim",action:"Qualified lead",account:"Quantum Analytics",date:"2026-04-10",next_step:"Book discovery"},
    {rep:"Tyler Brooks",action:"Cold outreach",account:"Pinnacle Group",date:"2026-04-10",next_step:"Await response"},
    {rep:"Rachel Kim",action:"Renewal check-in",account:"Forge Dynamics",date:"2026-04-10",next_step:"Send renewal quote"},
    {rep:"Marcus Rivera",action:"Upsell pitch",account:"Ironclad Security",date:"2026-04-09",next_step:"ROI analysis"},
    {rep:"Elena Vasquez",action:"Technical review",account:"Vantage Energy",date:"2026-04-09",next_step:"Architecture call"},
    {rep:"Sophia Martinez",action:"Initial contact",account:"BrightPath Ed",date:"2026-04-09",next_step:"Needs assessment"},
    {rep:"Derek Olson",action:"Proposal revised",account:"Apex Consulting",date:"2026-04-09",next_step:"Stakeholder review"},
    {rep:"Alex Thompson",action:"Deal won",account:"Ember Creative",date:"2026-04-08",next_step:"Implementation"},
    {rep:"Jordan Kim",action:"Pricing discussion",account:"Cascade Software",date:"2026-04-08",next_step:"Custom quote"},
    {rep:"Tyler Brooks",action:"Reference call",account:"Harbor Logistics",date:"2026-04-08",next_step:"Send case study"},
    {rep:"Rachel Kim",action:"QBR prep",account:"CloudScale",date:"2026-04-07",next_step:"Schedule QBR"},
    {rep:"Marcus Rivera",action:"Executive intro",account:"NovaTech Solutions",date:"2026-04-07",next_step:"VP meeting"}
  ],
  pipeline_stages: [
    {stage:"Prospecting",count:8,value:700000,color:"#7B61FF"},
    {stage:"Qualified",count:10,value:2070000,color:"#00B4D8"},
    {stage:"Proposal",count:12,value:2733000,color:"#F59E0B"},
    {stage:"Negotiation",count:10,value:4060000,color:"#00E5A0"},
    {stage:"Closed",count:7,value:2383000,color:"#10B981"}
  ],
  sources: [
    {source:"Inbound",won:14,lost:8},
    {source:"Outbound",won:9,lost:12},
    {source:"Referral",won:11,lost:4},
    {source:"Partner",won:6,lost:5}
  ]
};
</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg-primary:#0A0E17;--bg-secondary:#111827;--bg-card:#151C2C;--bg-card-hover:#1A2236;
  --border:#1E293B;--border-hover:#2D3A52;
  --text-primary:#F1F5F9;--text-secondary:#94A3B8;--text-muted:#64748B;
  --green:#00E5A0;--cyan:#00B4D8;--violet:#7B61FF;--amber:#F59E0B;--red:#EF4444;--emerald:#10B981;
  --gradient-vibe:linear-gradient(135deg,#00E5A0 0%,#00B4D8 50%,#7B61FF 100%);
  --shadow-card:0 1px 3px rgba(0,0,0,.3),0 1px 2px rgba(0,0,0,.2);
  --shadow-card-hover:0 10px 25px rgba(0,0,0,.4),0 4px 10px rgba(0,0,0,.3);
  --radius:12px;--radius-sm:8px;--radius-xs:6px;
  --font-heading:'Space Grotesk',system-ui,sans-serif;
  --font-body:'Inter',system-ui,sans-serif;
  --sidebar-width:260px;
}
html{font-size:14px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{font-family:var(--font-body);background:var(--bg-primary);color:var(--text-primary);min-height:100vh;display:flex;overflow-x:hidden}

/* ── Sidebar ── */
.sidebar{width:var(--sidebar-width);background:var(--bg-primary);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50}
.sidebar-brand{padding:24px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border)}
.sidebar-brand-icon{width:36px;height:36px;border-radius:10px;background:var(--gradient-vibe);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#0A0E17;font-family:var(--font-heading)}
.sidebar-brand-text{font-family:var(--font-heading);font-size:18px;font-weight:700;background:var(--gradient-vibe);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sidebar-nav{flex:1;padding:16px 12px;overflow-y:auto}
.nav-section{margin-bottom:24px}
.nav-section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);padding:0 12px;margin-bottom:8px}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);color:var(--text-secondary);cursor:pointer;transition:all .2s ease;font-size:13px;font-weight:500;position:relative;overflow:hidden}
.nav-item:hover{background:var(--bg-card);color:var(--text-primary)}
.nav-item.active{background:linear-gradient(135deg,rgba(0,229,160,.12) 0%,rgba(0,180,216,.08) 100%);color:var(--green);border:1px solid rgba(0,229,160,.2)}
.nav-item.active::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--gradient-vibe);border-radius:0 2px 2px 0}
.nav-item svg{width:18px;height:18px;flex-shrink:0}
.sidebar-footer{padding:16px;border-top:1px solid var(--border)}
.sidebar-user{display:flex;align-items:center;gap:10px;padding:8px}
.sidebar-avatar{width:32px;height:32px;border-radius:8px;background:var(--gradient-vibe);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:#0A0E17}
.sidebar-user-info{flex:1;min-width:0}
.sidebar-user-name{font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar-user-role{font-size:11px;color:var(--text-muted)}

/* ── Main ── */
.main{margin-left:var(--sidebar-width);flex:1;min-height:100vh;display:flex;flex-direction:column}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 32px;border-bottom:1px solid var(--border);background:rgba(10,14,23,.8);backdrop-filter:blur(12px);position:sticky;top:0;z-index:40}
.topbar-left{display:flex;align-items:center;gap:16px}
.topbar-title{font-family:var(--font-heading);font-size:22px;font-weight:700}
.topbar-badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;background:rgba(0,229,160,.12);color:var(--green);border:1px solid rgba(0,229,160,.2)}
.topbar-right{display:flex;align-items:center;gap:12px}
.topbar-btn{padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);background:transparent;color:var(--text-secondary);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;font-family:var(--font-body)}
.topbar-btn:hover{background:var(--bg-card);color:var(--text-primary);border-color:var(--border-hover)}
.topbar-btn-primary{background:var(--green);color:#0A0E17;border-color:var(--green);font-weight:600}
.topbar-btn-primary:hover{background:#00CC8E;box-shadow:0 0 20px rgba(0,229,160,.3)}

/* ── Tabs ── */
.tabs-bar{display:flex;gap:4px;padding:0 32px;border-bottom:1px solid var(--border);background:var(--bg-primary)}
.tab-btn{padding:12px 20px;font-size:13px;font-weight:500;color:var(--text-muted);background:transparent;border:none;cursor:pointer;position:relative;transition:color .2s;font-family:var(--font-body)}
.tab-btn:hover{color:var(--text-secondary)}
.tab-btn.active{color:var(--green);font-weight:600}
.tab-btn.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--gradient-vibe);border-radius:2px 2px 0 0}

/* ── Content ── */
.content{flex:1;padding:24px 32px;overflow-y:auto}
.tab-panel{display:none;animation:fadeIn .3s ease}
.tab-panel.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* ── KPI Cards ── */
.kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-bottom:28px}
.kpi-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;position:relative;overflow:hidden;transition:all .25s ease;cursor:default}
.kpi-card:hover{background:var(--bg-card-hover);border-color:var(--border-hover);box-shadow:var(--shadow-card-hover);transform:translateY(-2px)}
.kpi-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:3px 0 0 3px}
.kpi-card:nth-child(1)::before{background:var(--green)}
.kpi-card:nth-child(2)::before{background:var(--cyan)}
.kpi-card:nth-child(3)::before{background:var(--violet)}
.kpi-card:nth-child(4)::before{background:var(--amber)}
.kpi-card:nth-child(5)::before{background:var(--red)}
.kpi-card:nth-child(6)::before{background:var(--emerald)}
.kpi-label{font-size:12px;color:var(--text-muted);font-weight:500;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px}
.kpi-value{font-family:var(--font-heading);font-size:26px;font-weight:700;color:var(--text-primary);margin-bottom:6px;line-height:1.1}
.kpi-trend{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:2px 8px;border-radius:20px}
.kpi-trend.up{color:var(--green);background:rgba(0,229,160,.1)}
.kpi-trend.down{color:var(--red);background:rgba(239,68,68,.1)}
.kpi-trend svg{width:12px;height:12px}

/* ── Charts ── */
.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
.chart-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;transition:all .25s}
.chart-card:hover{border-color:var(--border-hover);box-shadow:var(--shadow-card-hover)}
.chart-title{font-family:var(--font-heading);font-size:15px;font-weight:600;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between}
.chart-title-badge{font-size:11px;font-weight:500;color:var(--text-muted);background:var(--bg-secondary);padding:4px 10px;border-radius:20px}

/* Chart containers */
.chart-canvas-container{position:relative;height:280px}
.chart-canvas-container canvas{width:100%!important;height:100%!important}

/* ── Tables ── */
.table-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:24px}
.table-header{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--border)}
.table-title{font-family:var(--font-heading);font-size:15px;font-weight:600}
.table-count{font-size:12px;color:var(--text-muted);background:var(--bg-secondary);padding:4px 10px;border-radius:20px}
.table-search{display:flex;align-items:center;gap:8px}
.table-search input{background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:7px 12px 7px 32px;color:var(--text-primary);font-size:12px;outline:none;width:200px;transition:border-color .2s;font-family:var(--font-body)}
.table-search input:focus{border-color:var(--green)}
.table-scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse}
thead{background:var(--bg-secondary)}
th{padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted);text-align:left;white-space:nowrap;border-bottom:1px solid var(--border)}
td{padding:12px 16px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border);white-space:nowrap}
tr:hover td{background:rgba(255,255,255,.02)}
.stage-badge{display:inline-flex;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
.stage-badge.Prospecting{background:rgba(123,97,255,.15);color:var(--violet)}
.stage-badge.Qualified{background:rgba(0,180,216,.15);color:var(--cyan)}
.stage-badge.Proposal{background:rgba(245,158,11,.15);color:var(--amber)}
.stage-badge.Negotiation{background:rgba(0,229,160,.15);color:var(--green)}
.stage-badge.Closed{background:rgba(16,185,129,.15);color:var(--emerald)}
.prob-pill{display:inline-flex;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600}
.prob-high{background:rgba(0,229,160,.12);color:var(--green)}
.prob-med{background:rgba(245,158,11,.12);color:var(--amber)}
.prob-low{background:rgba(239,68,68,.12);color:var(--red)}
.value-cell{font-family:var(--font-heading);font-weight:600;color:var(--text-primary)}

/* ── Forecast Tab ── */
.forecast-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.forecast-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px}
.forecast-card:hover{border-color:var(--border-hover);box-shadow:var(--shadow-card-hover)}
.forecast-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.forecast-amount{font-family:var(--font-heading);font-size:32px;font-weight:700}
.forecast-label{font-size:13px;color:var(--text-muted);margin-top:4px}
.forecast-bar{height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden;margin-top:16px}
.forecast-bar-fill{height:100%;border-radius:4px;transition:width 1s ease}

/* ── Responsive ── */
@media(max-width:1400px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:1024px){
  .sidebar{display:none}.main{margin-left:0}
  .kpi-grid{grid-template-columns:repeat(2,1fr)}
  .charts-grid,.forecast-grid{grid-template-columns:1fr}
  .content{padding:16px}
}
@media(max-width:640px){.kpi-grid{grid-template-columns:1fr}.topbar{padding:12px 16px}}
</style>
</head>
<body>

<!-- ── Sidebar ── -->
<aside class="sidebar">
  <div class="sidebar-brand">
    <div class="sidebar-brand-icon">V</div>
    <div class="sidebar-brand-text">VIBE CRM</div>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section">
      <div class="nav-section-title">Main</div>
      <div class="nav-item active" data-tab="overview">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        Overview
      </div>
      <div class="nav-item" data-tab="pipeline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        Pipeline
      </div>
      <div class="nav-item" data-tab="contacts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        Contacts
      </div>
      <div class="nav-item" data-tab="activity">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Activity
      </div>
      <div class="nav-item" data-tab="forecast">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
        Forecast
      </div>
    </div>
    <div class="nav-section">
      <div class="nav-section-title">Settings</div>
      <div class="nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        Settings
      </div>
    </div>
  </nav>
  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="sidebar-avatar">JD</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">Jane Doe</div>
        <div class="sidebar-user-role">Sales Director</div>
      </div>
    </div>
  </div>
</aside>

<!-- ── Main ── -->
<div class="main">
  <div class="topbar">
    <div class="topbar-left">
      <h1 class="topbar-title">Sales CRM</h1>
      <span class="topbar-badge">Live</span>
    </div>
    <div class="topbar-right">
      <button class="topbar-btn">Export</button>
      <button class="topbar-btn topbar-btn-primary">+ New Deal</button>
    </div>
  </div>

  <div class="tabs-bar">
    <button class="tab-btn active" data-tab="overview">Overview</button>
    <button class="tab-btn" data-tab="pipeline">Pipeline</button>
    <button class="tab-btn" data-tab="contacts">Contacts</button>
    <button class="tab-btn" data-tab="activity">Activity</button>
    <button class="tab-btn" data-tab="forecast">Forecast</button>
  </div>

  <div class="content">

    <!-- ═══ OVERVIEW TAB ═══ -->
    <div class="tab-panel active" id="tab-overview">
      <div class="kpi-grid" id="kpi-container"></div>
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-title">Pipeline by Stage <span class="chart-title-badge">5 stages</span></div>
          <div class="chart-canvas-container"><canvas id="pipelineChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Revenue Trend <span class="chart-title-badge">12 months</span></div>
          <div class="chart-canvas-container"><canvas id="revenueChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Win/Loss by Source <span class="chart-title-badge">4 channels</span></div>
          <div class="chart-canvas-container"><canvas id="sourceChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Deal Velocity by Rep <span class="chart-title-badge">Top 8</span></div>
          <div class="chart-canvas-container"><canvas id="repChart"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ═══ PIPELINE TAB ═══ -->
    <div class="tab-panel" id="tab-pipeline">
      <div class="table-card">
        <div class="table-header">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="table-title">Pipeline Deals</span>
            <span class="table-count" id="pipeline-count">47 deals</span>
          </div>
          <div class="table-search" style="position:relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="pipeline-search" placeholder="Search deals..."/>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Company</th><th>Contact</th><th>Stage</th><th>Value</th><th>Close Date</th><th>Owner</th><th>Probability</th><th>Days in Stage</th></tr></thead>
            <tbody id="pipeline-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ CONTACTS TAB ═══ -->
    <div class="tab-panel" id="tab-contacts">
      <div class="table-card">
        <div class="table-header">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="table-title">Contacts</span>
            <span class="table-count" id="contacts-count">47 contacts</span>
          </div>
          <div class="table-search" style="position:relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="contacts-search" placeholder="Search contacts..."/>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Contact</th><th>Company</th><th>Deal Stage</th><th>Deal Value</th><th>Owner</th><th>Close Date</th></tr></thead>
            <tbody id="contacts-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ ACTIVITY TAB ═══ -->
    <div class="tab-panel" id="tab-activity">
      <div class="table-card">
        <div class="table-header">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="table-title">Recent Activity</span>
            <span class="table-count" id="activity-count">20 entries</span>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Rep</th><th>Action</th><th>Account</th><th>Date</th><th>Next Step</th></tr></thead>
            <tbody id="activity-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ FORECAST TAB ═══ -->
    <div class="tab-panel" id="tab-forecast">
      <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px" id="forecast-kpis"></div>
      <div class="forecast-grid" id="forecast-grid"></div>
    </div>

  </div>
</div>

<script>
(function(){
  // ── Chart.js global defaults for dark theme ──
  Chart.defaults.color = '#94A3B8';
  Chart.defaults.borderColor = '#1E293B';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
  Chart.defaults.plugins.tooltip.backgroundColor = '#1A2236';
  Chart.defaults.plugins.tooltip.borderColor = '#2D3A52';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleFont = {family:"'Space Grotesk',system-ui,sans-serif",weight:'600'};
  Chart.defaults.plugins.tooltip.bodyFont = {family:"'Inter',system-ui,sans-serif"};
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;

  // ── Data loader with try/catch ──
  async function loadData(table, fallbackKey) {
    var rows=[];
    try{rows=await vibeLoadData(table,{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!rows.length) rows=(window.__VIBE_SAMPLE__||{})[fallbackKey]||[];
    return rows;
  }

  // ── Helpers ──
  function fmt$(v) {
    if (v >= 1000000) return '$' + (v/1000000).toFixed(1) + 'M';
    if (v >= 1000) return '$' + (v/1000).toFixed(0) + 'K';
    return '$' + v;
  }
  function fmtDate(d) {
    var p = d.split('-'); return p[1] + '/' + p[2] + '/' + p[0].slice(2);
  }
  function probClass(p) { return p >= 65 ? 'prob-high' : p >= 35 ? 'prob-med' : 'prob-low'; }

  // ── Tab switching ──
  var tabBtns = document.querySelectorAll('.tab-btn');
  var navItems = document.querySelectorAll('.nav-item[data-tab]');
  var panels = document.querySelectorAll('.tab-panel');

  function switchTab(tabId) {
    tabBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.tab === tabId); });
    navItems.forEach(function(n) { n.classList.toggle('active', n.dataset.tab === tabId); });
    panels.forEach(function(p) { p.classList.toggle('active', p.id === 'tab-' + tabId); });
  }
  tabBtns.forEach(function(b) { b.addEventListener('click', function() { switchTab(b.dataset.tab); }); });
  navItems.forEach(function(n) { n.addEventListener('click', function() { switchTab(n.dataset.tab); }); });

  // ── KPI Cards ──
  async function renderKPIs() {
    var kpis=[];
    try{kpis=await vibeLoadData('kpis',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!kpis.length) kpis=(window.__VIBE_SAMPLE__||{}).kpis||[];
    var container = document.getElementById('kpi-container');
    container.innerHTML = '';
    kpis.forEach(function(k) {
      var dir = k.direction || 'up';
      var arrow = dir === 'up'
        ? '<svg viewBox="0 0 12 12"><path d="M6 2v8M6 2L2 6M6 2l4 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
        : '<svg viewBox="0 0 12 12"><path d="M6 10V2M6 10l-4-4M6 10l4-4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
      var card = document.createElement('div');
      card.className = 'kpi-card';
      card.innerHTML = '<div class="kpi-label">' + (k.label || '--') + '</div>'
        + '<div class="kpi-value">' + (k.value || '--') + '</div>'
        + '<span class="kpi-trend ' + dir + '">' + arrow + ' ' + (k.trend || '') + '</span>';
      container.appendChild(card);
    });
  }

  // ── Chart 1: Pipeline by Stage (Horizontal Bar) ──
  async function renderPipelineChart() {
    var stages=[];
    try{stages=await vibeLoadData('pipeline_stages',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!stages.length) stages=(window.__VIBE_SAMPLE__||{}).pipeline_stages||[];
    var ctx = document.getElementById('pipelineChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stages.map(function(s){return s.stage}),
        datasets: [{
          label: 'Pipeline Value',
          data: stages.map(function(s){return s.value}),
          backgroundColor: stages.map(function(s){return s.color}),
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 28
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {display:false},
          tooltip: {
            callbacks: {
              label: function(c){return fmt$(c.raw)}
            }
          }
        },
        scales: {
          x: {
            grid: {color:'#1E293B'},
            ticks: {callback:function(v){return fmt$(v)},color:'#64748B',font:{size:11}}
          },
          y: {
            grid: {display:false},
            ticks: {color:'#94A3B8',font:{size:12,weight:'500'}}
          }
        }
      }
    });
  }

  // ── Chart 2: Revenue Trend (Line) ──
  async function renderRevenueChart() {
    var data=[];
    try{data=await vibeLoadData('revenue',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!data.length) data=(window.__VIBE_SAMPLE__||{}).revenue||[];
    var ctx = document.getElementById('revenueChart').getContext('2d');
    var gradient = ctx.createLinearGradient(0,0,0,280);
    gradient.addColorStop(0,'rgba(0,229,160,0.25)');
    gradient.addColorStop(1,'rgba(0,229,160,0)');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(function(d){return d.month}),
        datasets: [
          {
            label: 'Actual',
            data: data.map(function(d){return d.actual}),
            borderColor: '#00E5A0',
            backgroundColor: gradient,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#00E5A0',
            pointBorderColor: '#0A0E17',
            pointBorderWidth: 2,
            borderWidth: 2.5
          },
          {
            label: 'Target',
            data: data.map(function(d){return d.target}),
            borderColor: '#64748B',
            borderDash: [6,4],
            fill: false,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#64748B',
            pointBorderColor: '#0A0E17',
            pointBorderWidth: 2,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {mode:'index',intersect:false},
        plugins: {
          legend: {position:'top',align:'end',labels:{boxWidth:12,padding:16}},
          tooltip: {
            callbacks: {
              label: function(c){return c.dataset.label+': '+fmt$(c.raw)}
            }
          }
        },
        scales: {
          x: {grid:{display:false},ticks:{color:'#64748B',font:{size:11},maxRotation:45}},
          y: {grid:{color:'#1E293B'},ticks:{callback:function(v){return fmt$(v)},color:'#64748B',font:{size:11}}}
        }
      }
    });
  }

  // ── Chart 3: Win/Loss by Source (Doughnut) ──
  async function renderSourceChart() {
    var sources=[];
    try{sources=await vibeLoadData('sources',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!sources.length) sources=(window.__VIBE_SAMPLE__||{}).sources||[];
    var colors = ['#00E5A0','#00B4D8','#7B61FF','#F59E0B'];
    var ctx = document.getElementById('sourceChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: sources.map(function(s){return s.source}),
        datasets: [{
          data: sources.map(function(s){return s.won+s.lost}),
          backgroundColor: colors,
          borderColor: '#151C2C',
          borderWidth: 3,
          hoverBorderColor: '#2D3A52',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {position:'right',labels:{padding:16,font:{size:12}}},
          tooltip: {
            callbacks: {
              label: function(c){
                var s=sources[c.dataIndex];
                var winPct=Math.round((s.won/(s.won+s.lost))*100);
                return s.source+': '+s.won+'W / '+s.lost+'L ('+winPct+'% win)';
              }
            }
          }
        }
      }
    });
  }

  // ── Chart 4: Deal Velocity by Rep (Bar) ──
  async function renderRepChart() {
    var reps=[];
    try{reps=await vibeLoadData('reps',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!reps.length) reps=(window.__VIBE_SAMPLE__||{}).reps||[];
    var barColors = reps.map(function(r){
      return r.attainment >= 80 ? '#00E5A0' : r.attainment >= 60 ? '#00B4D8' : '#F59E0B';
    });
    var ctx = document.getElementById('repChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: reps.map(function(r){return r.name}),
        datasets: [{
          label: 'Deals Closed',
          data: reps.map(function(r){return r.deals_closed}),
          backgroundColor: barColors,
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 24
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {display:false},
          tooltip: {
            callbacks: {
              afterLabel: function(c){
                var r=reps[c.dataIndex];
                return 'Attainment: '+r.attainment+'%\nRevenue: '+fmt$(r.revenue);
              }
            }
          }
        },
        scales: {
          x: {grid:{display:false},ticks:{color:'#94A3B8',font:{size:11},maxRotation:45}},
          y: {grid:{color:'#1E293B'},ticks:{color:'#64748B',font:{size:11},stepSize:2},beginAtZero:true}
        }
      }
    });
  }

  // ── Pipeline Table ──
  async function renderPipelineTable(filter) {
    var deals=[];
    try{deals=await vibeLoadData('deals',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!deals.length) deals=(window.__VIBE_SAMPLE__||{}).deals||[];
    var tbody = document.getElementById('pipeline-tbody');
    tbody.innerHTML = '';
    var f = (filter || '').toLowerCase();
    var filtered = deals.filter(function(d) {
      if (!f) return true;
      return (d.company + d.contact + d.stage + d.owner).toLowerCase().indexOf(f) >= 0;
    });
    document.getElementById('pipeline-count').textContent = filtered.length + ' deals';
    filtered.forEach(function(d) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td style="font-weight:600;color:var(--text-primary)">' + d.company + '</td>'
        + '<td>' + d.contact + '</td>'
        + '<td><span class="stage-badge ' + d.stage + '">' + d.stage + '</span></td>'
        + '<td class="value-cell">' + fmt$(d.value) + '</td>'
        + '<td>' + fmtDate(d.close_date) + '</td>'
        + '<td>' + d.owner + '</td>'
        + '<td><span class="prob-pill ' + probClass(d.probability) + '">' + d.probability + '%</span></td>'
        + '<td>' + d.days_in_stage + 'd</td>';
      tbody.appendChild(tr);
    });
  }

  // ── Contacts Table ──
  async function renderContactsTable(filter) {
    var deals=[];
    try{deals=await vibeLoadData('deals',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!deals.length) deals=(window.__VIBE_SAMPLE__||{}).deals||[];
    var tbody = document.getElementById('contacts-tbody');
    tbody.innerHTML = '';
    var f = (filter || '').toLowerCase();
    var filtered = deals.filter(function(d) {
      if (!f) return true;
      return (d.contact + d.company + d.owner).toLowerCase().indexOf(f) >= 0;
    });
    document.getElementById('contacts-count').textContent = filtered.length + ' contacts';
    filtered.forEach(function(d) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td style="font-weight:600;color:var(--text-primary)">' + d.contact + '</td>'
        + '<td>' + d.company + '</td>'
        + '<td><span class="stage-badge ' + d.stage + '">' + d.stage + '</span></td>'
        + '<td class="value-cell">' + fmt$(d.value) + '</td>'
        + '<td>' + d.owner + '</td>'
        + '<td>' + fmtDate(d.close_date) + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ── Activity Table ──
  async function renderActivityTable() {
    var activity=[];
    try{activity=await vibeLoadData('activity',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!activity.length) activity=(window.__VIBE_SAMPLE__||{}).activity||[];
    var tbody = document.getElementById('activity-tbody');
    tbody.innerHTML = '';
    document.getElementById('activity-count').textContent = activity.length + ' entries';
    activity.forEach(function(a) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td style="font-weight:600;color:var(--text-primary)">' + a.rep + '</td>'
        + '<td>' + a.action + '</td>'
        + '<td>' + a.account + '</td>'
        + '<td>' + fmtDate(a.date) + '</td>'
        + '<td style="color:var(--cyan)">' + a.next_step + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ── Forecast Tab ──
  async function renderForecast() {
    var deals=[];
    try{deals=await vibeLoadData('deals',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!deals.length) deals=(window.__VIBE_SAMPLE__||{}).deals||[];
    var stages=[];
    try{stages=await vibeLoadData('pipeline_stages',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!stages.length) stages=(window.__VIBE_SAMPLE__||{}).pipeline_stages||[];
    var reps=[];
    try{reps=await vibeLoadData('reps',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!reps.length) reps=(window.__VIBE_SAMPLE__||{}).reps||[];

    // Forecast KPIs
    var totalPipeline = deals.reduce(function(a, d) { return a + d.value; }, 0);
    var weightedPipeline = deals.reduce(function(a, d) { return a + d.value * (d.probability / 100); }, 0);
    var closedValue = deals.filter(function(d) { return d.stage === 'Closed'; }).reduce(function(a, d) { return a + d.value; }, 0);
    var quota = 8000000;
    var attainment = Math.round((closedValue / quota) * 100);

    var fKpis = document.getElementById('forecast-kpis');
    fKpis.innerHTML = '';
    var forecastCards = [
      {label:'Total Pipeline',value:fmt$(totalPipeline),color:'var(--green)'},
      {label:'Weighted Forecast',value:fmt$(weightedPipeline),color:'var(--cyan)'},
      {label:'Closed Won',value:fmt$(closedValue),color:'var(--emerald)'},
      {label:'Quota Attainment',value:attainment+'%',color:'var(--violet)'}
    ];
    forecastCards.forEach(function(c) {
      var card = document.createElement('div');
      card.className = 'kpi-card';
      card.innerHTML = '<div class="kpi-label">' + c.label + '</div><div class="kpi-value" style="color:' + c.color + '">' + c.value + '</div>';
      card.style.borderLeft = '3px solid ' + c.color;
      fKpis.appendChild(card);
    });

    // Forecast by stage
    var grid = document.getElementById('forecast-grid');
    grid.innerHTML = '';
    stages.forEach(function(s) {
      var pct = Math.round((s.value / totalPipeline) * 100);
      var card = document.createElement('div');
      card.className = 'forecast-card';
      card.innerHTML = '<div class="forecast-header"><div><div class="forecast-amount" style="color:' + s.color + '">' + fmt$(s.value) + '</div>'
        + '<div class="forecast-label">' + s.stage + ' — ' + s.count + ' deals</div></div>'
        + '<span style="font-size:24px;font-weight:700;color:var(--text-muted)">' + pct + '%</span></div>'
        + '<div class="forecast-bar"><div class="forecast-bar-fill" style="width:' + pct + '%;background:' + s.color + '"></div></div>';
      grid.appendChild(card);
    });

    // Rep forecast card
    var repCard = document.createElement('div');
    repCard.className = 'forecast-card';
    repCard.style.gridColumn = '1/-1';
    var repHTML = '<div class="chart-title" style="margin-bottom:16px">Rep Forecast <span class="chart-title-badge">' + reps.length + ' reps</span></div>';
    repHTML += '<div style="display:flex;flex-direction:column;gap:10px">';
    reps.forEach(function(r) {
      var barColor = r.attainment >= 80 ? 'var(--green)' : r.attainment >= 60 ? 'var(--cyan)' : 'var(--amber)';
      repHTML += '<div style="display:flex;align-items:center;gap:12px">'
        + '<span style="width:120px;font-size:12px;font-weight:500;color:var(--text-secondary);text-align:right;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + r.name + '</span>'
        + '<div style="flex:1;height:28px;background:var(--bg-secondary);border-radius:6px;overflow:hidden;position:relative">'
        + '<div style="height:100%;width:' + r.attainment + '%;background:' + barColor + ';border-radius:6px;display:flex;align-items:center;padding:0 10px">'
        + '<span style="font-size:11px;font-weight:600;color:#0A0E17;white-space:nowrap">' + fmt$(r.revenue) + '</span></div></div>'
        + '<span style="width:60px;font-size:12px;font-weight:600;color:var(--text-primary);text-align:right">' + r.attainment + '%</span></div>';
    });
    repHTML += '</div>';
    repCard.innerHTML = repHTML;
    grid.appendChild(repCard);
  }

  // ── Search handlers ──
  var pipelineSearchEl = document.getElementById('pipeline-search');
  var contactsSearchEl = document.getElementById('contacts-search');
  var pipelineTimer, contactsTimer;
  pipelineSearchEl.addEventListener('input', function() {
    clearTimeout(pipelineTimer);
    pipelineTimer = setTimeout(function() { renderPipelineTable(pipelineSearchEl.value); }, 200);
  });
  contactsSearchEl.addEventListener('input', function() {
    clearTimeout(contactsTimer);
    contactsTimer = setTimeout(function() { renderContactsTable(contactsSearchEl.value); }, 200);
  });

  // ── Init ──
  renderKPIs();
  renderPipelineChart();
  renderRevenueChart();
  renderSourceChart();
  renderRepChart();
  renderPipelineTable();
  renderContactsTable();
  renderActivityTable();
  renderForecast();
})();
</script>
</body>
</html>$$
WHERE skill_name = 'crm-dashboard';
