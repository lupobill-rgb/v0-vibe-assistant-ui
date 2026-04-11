-- Migration: Populate html_skeleton for pharma-analytics-dashboard.
-- Deterministic template execution — zero LLM calls on skill match.

UPDATE skill_registry
SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{BRAND_COMPANY}} — Pharma Analytics</title>
  <meta name="description" content="Pharmaceutical analytics dashboard for {{BRAND_COMPANY}} — clinical trials, pharmacovigilance, market access, and compliance tracking.">
  <script>window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";</script>
  <script>window.__VIBE_TEAM_ID__="__TEAM_ID__";</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Space Grotesk','system-ui']}}}}</script>
  <style>
    :root{--bg:{{BRAND_BG}};--text:{{BRAND_TEXT}};--primary:{{BRAND_PRIMARY}};--surface:{{BRAND_SURFACE}};--border:{{BRAND_BORDER}}}
    body{background:var(--bg);color:var(--text);margin:0;font-family:'Inter',system-ui,sans-serif}
    .nav-item.active{background:color-mix(in srgb,var(--primary) 10%,transparent);color:var(--primary);border-left:2px solid var(--primary)}
    .kpi-trend-up{color:#10b981}.kpi-trend-down{color:#ef4444}
    .badge-enrolling{background:#10b98120;color:#10b981;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-active{background:#3b82f620;color:#3b82f6;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-on-hold{background:#f59e0b20;color:#f59e0b;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-screening{background:#00B4D820;color:#00B4D8;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-serious{background:#ef444420;color:#ef4444;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-moderate{background:#f59e0b20;color:#f59e0b;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-mild{background:#10b98120;color:#10b981;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-escalated{background:#ef444420;color:#ef4444;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-under-review{background:#f59e0b20;color:#f59e0b;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-reported{background:#3b82f620;color:#3b82f6;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .badge-resolved{background:#10b98120;color:#10b981;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600}
    .progress-bar-track{background:rgba(148,163,184,0.15);border-radius:9999px;height:8px;overflow:hidden}
    .progress-bar-fill{height:100%;border-radius:9999px;transition:width 0.6s ease}
    .loading-skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--border) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .compliance-item{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid var(--border)}
    .compliance-item:last-child{border-bottom:none}
    .compliance-check{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
    .compliance-pass{background:#10b98120;color:#10b981}
    .compliance-warn{background:#f59e0b20;color:#f59e0b}
    .compliance-fail{background:#ef444420;color:#ef4444}
    .compliance-pending{background:rgba(148,163,184,0.15);color:rgba(148,163,184,0.6)}
    .market-bar{height:32px;border-radius:8px;transition:width 0.8s ease}
  </style>
  <script>
  window.__VIBE_SAMPLE__ = {
    trials: [
      {id:'TRL-2024-001',drug:'Nexavirin',phase:'Phase 3',sites:12,enrolled:1847,target:2000,status:'Enrolling'},
      {id:'TRL-2024-002',drug:'Cortaflex',phase:'Phase 2',sites:8,enrolled:623,target:800,status:'Enrolling'},
      {id:'TRL-2024-003',drug:'Immunova',phase:'Phase 1',sites:4,enrolled:89,target:120,status:'Active'},
      {id:'TRL-2024-004',drug:'Oncolytix',phase:'Phase 3',sites:15,enrolled:2105,target:2500,status:'Enrolling'},
      {id:'TRL-2024-005',drug:'Neurazine',phase:'Phase 2',sites:6,enrolled:412,target:600,status:'On Hold'},
      {id:'TRL-2024-006',drug:'Cardiosync',phase:'Phase 4',sites:22,enrolled:3200,target:3500,status:'Active'},
      {id:'TRL-2024-007',drug:'Hemavex',phase:'Phase 1',sites:3,enrolled:45,target:80,status:'Screening'},
      {id:'TRL-2024-008',drug:'Renavita',phase:'Phase 2',sites:9,enrolled:526,target:700,status:'Enrolling'}
    ],
    enrollmentByPhase: [
      {phase:'Phase 1',count:134},
      {phase:'Phase 2',count:1561},
      {phase:'Phase 3',count:3952},
      {phase:'Phase 4',count:3200}
    ],
    adverseEvents: [
      {month:'May 2025',count:18},{month:'Jun 2025',count:22},{month:'Jul 2025',count:15},
      {month:'Aug 2025',count:28},{month:'Sep 2025',count:12},{month:'Oct 2025',count:19},
      {month:'Nov 2025',count:14},{month:'Dec 2025',count:21},{month:'Jan 2026',count:9},
      {month:'Feb 2026',count:16},{month:'Mar 2026',count:11},{month:'Apr 2026',count:8}
    ],
    sitePerformance: [
      {label:'Top (>90%)',count:15},{label:'Good (70-90%)',count:28},{label:'Average (50-70%)',count:25},
      {label:'Below (<50%)',count:12},{label:'At Risk',count:6},{label:'New',count:3}
    ],
    marketAccess: [
      {region:'North America',coverage:87},{region:'Europe',coverage:72},{region:'Asia Pacific',coverage:58},
      {region:'Latin America',coverage:41},{region:'Middle East & Africa',coverage:29}
    ],
    adverseEventList: [
      {id:'AE-10421',drug:'Nexavirin',severity:'Moderate',site:'Mayo Clinic',date:'2026-04-08',status:'Under Review'},
      {id:'AE-10420',drug:'Oncolytix',severity:'Serious',site:'Johns Hopkins',date:'2026-04-07',status:'Reported'},
      {id:'AE-10419',drug:'Cortaflex',severity:'Mild',site:'Cleveland Clinic',date:'2026-04-06',status:'Resolved'},
      {id:'AE-10418',drug:'Immunova',severity:'Moderate',site:'Mass General',date:'2026-04-05',status:'Under Review'},
      {id:'AE-10417',drug:'Nexavirin',severity:'Mild',site:'UCSF Medical',date:'2026-04-04',status:'Resolved'},
      {id:'AE-10416',drug:'Cardiosync',severity:'Serious',site:'Cedars-Sinai',date:'2026-04-03',status:'Escalated'},
      {id:'AE-10415',drug:'Neurazine',severity:'Moderate',site:'Duke Medicine',date:'2026-04-02',status:'Reported'},
      {id:'AE-10414',drug:'Hemavex',severity:'Mild',site:'Stanford Health',date:'2026-04-01',status:'Resolved'}
    ]
  };
  </script>
</head>
<body>
  <div class="grid grid-cols-[256px_1fr] min-h-screen">
    <!-- Sidebar -->
    <aside class="bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
      <div class="p-6 border-b border-[var(--border)]">
        <h1 class="font-display text-lg font-bold text-[var(--primary)]">{{BRAND_COMPANY}}</h1>
        <p class="text-xs opacity-60 mt-1">Pharma Analytics</p>
      </div>
      <nav class="flex-1 p-4 space-y-1">
        <a href="#" class="nav-item active flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all" data-section="view-overview" onclick="switchView(event,'view-overview')">📊 Overview</a>
        <a href="#" class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium opacity-70 hover:opacity-100 transition-all" data-section="view-trials" onclick="switchView(event,'view-trials')">🧪 Clinical Trials</a>
        <a href="#" class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium opacity-70 hover:opacity-100 transition-all" data-section="view-pharmacovigilance" onclick="switchView(event,'view-pharmacovigilance')">⚠️ Pharmacovigilance</a>
        <a href="#" class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium opacity-70 hover:opacity-100 transition-all" data-section="view-market-access" onclick="switchView(event,'view-market-access')">🏥 Market Access</a>
        <a href="#" class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium opacity-70 hover:opacity-100 transition-all" data-section="view-compliance" onclick="switchView(event,'view-compliance')">📋 Compliance</a>
      </nav>
      <div class="p-4 border-t border-[var(--border)]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--bg)] text-xs font-bold">P</div>
          <div><div class="text-sm font-medium">Pharma Ops</div><div class="text-xs opacity-60">{{BRAND_TEAM}}</div></div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="overflow-y-auto">
      <!-- Top sticky nav bar -->
      <nav style="position:sticky;top:0;z-index:50;background:var(--surface);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 40px;display:flex;align-items:center;justify-content:space-between;height:64px;font-family:'Inter',sans-serif;">
        <span style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.1rem;color:var(--primary);">{{BRAND_COMPANY}}</span>
        <div style="display:flex;gap:28px;">
          <a href="#" class="nav-item" data-section="view-overview" onclick="switchView(event,'view-overview')" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Overview</a>
          <a href="#" class="nav-item" data-section="view-trials" onclick="switchView(event,'view-trials')" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Clinical Trials</a>
          <a href="#" class="nav-item" data-section="view-pharmacovigilance" onclick="switchView(event,'view-pharmacovigilance')" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Pharmacovigilance</a>
          <a href="#" class="nav-item" data-section="view-market-access" onclick="switchView(event,'view-market-access')" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Market Access</a>
          <a href="#" class="nav-item" data-section="view-compliance" onclick="switchView(event,'view-compliance')" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Compliance</a>
        </div>
        <a href="#" style="background:var(--primary);color:var(--bg);padding:9px 22px;border-radius:8px;font-weight:600;font-size:0.9rem;text-decoration:none;">Export</a>
      </nav>

      <!-- ============================================ -->
      <!-- SECTION: Overview                            -->
      <!-- ============================================ -->
      <section id="view-overview" class="p-8 space-y-8">
        <!-- KPI Cards — 3x2 grid -->
        <div class="grid grid-cols-3 xl:grid-cols-6 gap-6">
          <!-- KPI 1: Active Trials -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[130px]">
            <div class="text-sm opacity-60 mb-1">Active Trials</div>
            <div class="font-display text-3xl font-bold" style="color:var(--primary);">24</div>
            <span class="absolute top-4 right-4 text-xs kpi-trend-up font-semibold">↑ 3 from Q4</span>
            <div class="mt-2 text-xs opacity-50">Across 4 therapeutic areas</div>
          </div>
          <!-- KPI 2: Enrolled Patients -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[130px]">
            <div class="text-sm opacity-60 mb-1">Enrolled Patients</div>
            <div class="font-display text-3xl font-bold">8,847</div>
            <span class="absolute top-4 right-4 text-xs kpi-trend-up font-semibold">↑ 12.4%</span>
            <div class="mt-2 text-xs opacity-50">Target: 10,300 total</div>
          </div>
          <!-- KPI 3: Adverse Events (30d) -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[130px]">
            <div class="text-sm opacity-60 mb-1">Adverse Events (30d)</div>
            <div class="font-display text-3xl font-bold">143</div>
            <span class="absolute top-4 right-4 text-xs kpi-trend-up font-semibold">↓ 8.2%</span>
            <div class="mt-2 text-xs opacity-50">12 serious, 131 non-serious</div>
          </div>
          <!-- KPI 4: FDA Submissions Pending -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[130px]">
            <div class="text-sm opacity-60 mb-1">FDA Submissions Pending</div>
            <div class="font-display text-3xl font-bold" style="color:#7B61FF;">7</div>
            <span class="absolute top-4 right-4 text-xs opacity-50 font-semibold">3 NDA, 4 IND</span>
            <div class="mt-2 text-xs opacity-50">Next review: May 2026</div>
          </div>
          <!-- KPI 5: Trial Completion Rate -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[130px]">
            <div class="text-sm opacity-60 mb-1">Trial Completion Rate</div>
            <div class="font-display text-3xl font-bold">67.3%</div>
            <span class="absolute top-4 right-4 text-xs kpi-trend-up font-semibold">↑ 2.1pp</span>
            <div class="mt-2 text-xs opacity-50">vs. industry avg 62%</div>
          </div>
          <!-- KPI 6: Sites Active -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[130px]">
            <div class="text-sm opacity-60 mb-1">Sites Active</div>
            <div class="font-display text-3xl font-bold" style="color:#00B4D8;">89</div>
            <span class="absolute top-4 right-4 text-xs kpi-trend-up font-semibold">↑ 5</span>
            <div class="mt-2 text-xs opacity-50">14 countries, 6 regions</div>
          </div>
        </div>

        <!-- Charts — 2x2 grid -->
        <div class="grid grid-cols-2 gap-6">
          <!-- Chart 1: Trial Enrollment by Phase -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 class="font-display text-lg font-semibold mb-4">Trial Enrollment by Phase</h3>
            <canvas id="chart-enrollment" height="220" style="height:220px !important; max-height:220px;"></canvas>
            <script>
            (async function(){
              var rows=[];try{rows=await vibeLoadData('clinical_trials',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
              if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).enrollmentByPhase||[];
              var labels=rows.map(function(r){return r.phase||r.label||''});
              var values=rows.map(function(r){return r.count||r.enrolled||r.value||0});
              try{
                new Chart(document.getElementById('chart-enrollment'),{
                  type:'bar',
                  data:{labels:labels,datasets:[{label:'Patients Enrolled',data:values,backgroundColor:['#00E5A0','#00B4D8','#7B61FF','#F59E0B'],borderRadius:8,barThickness:40}]},
                  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a1f2e',titleColor:'#fff',bodyColor:'#fff',cornerRadius:8,padding:12}},scales:{y:{grid:{color:'rgba(148,163,184,0.08)'},ticks:{color:'rgba(148,163,184,0.6)'}},x:{grid:{display:false},ticks:{color:'rgba(148,163,184,0.6)'}}}}
                });
              }catch(e){console.error('[chart-enrollment]',e)}
            })();
            </script>
          </div>

          <!-- Chart 2: Adverse Event Trend -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 class="font-display text-lg font-semibold mb-4">Adverse Event Trend (12 Months)</h3>
            <canvas id="chart-ae-trend" height="220" style="height:220px !important; max-height:220px;"></canvas>
            <script>
            (async function(){
              var rows=[];try{rows=await vibeLoadData('adverse_events',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
              if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).adverseEvents||[];
              var labels=rows.map(function(r){return r.month||r.date||r.period||''});
              var values=rows.map(function(r){return r.count||r.total||r.value||0});
              try{
                new Chart(document.getElementById('chart-ae-trend'),{
                  type:'line',
                  data:{labels:labels,datasets:[{label:'Adverse Events',data:values,borderColor:'#F59E0B',backgroundColor:'rgba(245,158,11,0.1)',fill:true,tension:0.4,pointBackgroundColor:'#F59E0B',pointBorderColor:'#F59E0B',pointRadius:4,pointHoverRadius:7}]},
                  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a1f2e',titleColor:'#fff',bodyColor:'#fff',cornerRadius:8,padding:12}},scales:{y:{grid:{color:'rgba(148,163,184,0.08)'},ticks:{color:'rgba(148,163,184,0.6)'}},x:{grid:{display:false},ticks:{color:'rgba(148,163,184,0.6)',maxRotation:45}}}}
                });
              }catch(e){console.error('[chart-ae-trend]',e)}
            })();
            </script>
          </div>

          <!-- Chart 3: Site Performance Distribution -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 class="font-display text-lg font-semibold mb-4">Site Performance Distribution</h3>
            <canvas id="chart-site-perf" height="220" style="height:220px !important; max-height:220px;"></canvas>
            <script>
            (async function(){
              var rows=[];try{rows=await vibeLoadData('site_performance',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
              if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).sitePerformance||[];
              var labels=rows.map(function(r){return r.label||r.tier||r.category||''});
              var values=rows.map(function(r){return r.count||r.sites||r.value||0});
              try{
                new Chart(document.getElementById('chart-site-perf'),{
                  type:'doughnut',
                  data:{labels:labels,datasets:[{data:values,backgroundColor:['#00E5A0','#00B4D8','#7B61FF','#F59E0B','#ef4444','#94a3b8'],borderWidth:0,hoverOffset:8}]},
                  options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{color:'rgba(148,163,184,0.8)',padding:16,usePointStyle:true,pointStyleWidth:8}},tooltip:{backgroundColor:'#1a1f2e',titleColor:'#fff',bodyColor:'#fff',cornerRadius:8,padding:12}}}
                });
              }catch(e){console.error('[chart-site-perf]',e)}
            })();
            </script>
          </div>

          <!-- Chart 4: Market Access Coverage -->
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 class="font-display text-lg font-semibold mb-4">Market Access Coverage by Region</h3>
            <canvas id="chart-market-access" height="220" style="height:220px !important; max-height:220px;"></canvas>
            <script>
            (async function(){
              var rows=[];try{rows=await vibeLoadData('market_access',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
              if(!rows.length) rows=(window.__VIBE_SAMPLE__||{}).marketAccess||[];
              var labels=rows.map(function(r){return r.region||r.market||r.label||''});
              var values=rows.map(function(r){return r.coverage||r.percent||r.value||0});
              try{
                new Chart(document.getElementById('chart-market-access'),{
                  type:'bar',
                  data:{labels:labels,datasets:[{label:'Coverage %',data:values,backgroundColor:['#00E5A0','#00B4D8','#7B61FF','#F59E0B','#94a3b8'],borderRadius:6,barThickness:24}]},
                  options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a1f2e',titleColor:'#fff',bodyColor:'#fff',cornerRadius:8,padding:12,callbacks:{label:function(ctx){return ctx.parsed.x+'% coverage'}}}},scales:{x:{max:100,grid:{color:'rgba(148,163,184,0.08)'},ticks:{color:'rgba(148,163,184,0.6)',callback:function(v){return v+'%'}}},y:{grid:{display:false},ticks:{color:'rgba(148,163,184,0.6)'}}}}
                });
              }catch(e){console.error('[chart-market-access]',e)}
            })();
            </script>
          </div>
        </div>

        <!-- Recent Activity Summary -->
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 class="font-display text-lg font-semibold mb-4">Recent Activity</h3>
          <div class="space-y-3">
            <div class="flex items-center gap-4 p-3 rounded-xl" style="background:rgba(0,229,160,0.05);">
              <div class="w-2 h-2 rounded-full" style="background:#00E5A0;"></div>
              <div class="flex-1 text-sm">Nexavirin Phase 3 enrollment reached 92.4% of target — 153 patients remaining</div>
              <div class="text-xs opacity-50">2h ago</div>
            </div>
            <div class="flex items-center gap-4 p-3 rounded-xl" style="background:rgba(245,158,11,0.05);">
              <div class="w-2 h-2 rounded-full" style="background:#F59E0B;"></div>
              <div class="flex-1 text-sm">Serious adverse event reported for Oncolytix at Johns Hopkins — under review</div>
              <div class="text-xs opacity-50">5h ago</div>
            </div>
            <div class="flex items-center gap-4 p-3 rounded-xl" style="background:rgba(0,180,216,0.05);">
              <div class="w-2 h-2 rounded-full" style="background:#00B4D8;"></div>
              <div class="flex-1 text-sm">FDA accepted IND submission for Hemavex — Phase 2 planning initiated</div>
              <div class="text-xs opacity-50">1d ago</div>
            </div>
            <div class="flex items-center gap-4 p-3 rounded-xl" style="background:rgba(123,97,255,0.05);">
              <div class="w-2 h-2 rounded-full" style="background:#7B61FF;"></div>
              <div class="flex-1 text-sm">Cardiosync Phase 4 post-market surveillance: 3,200 of 3,500 patients enrolled</div>
              <div class="text-xs opacity-50">1d ago</div>
            </div>
            <div class="flex items-center gap-4 p-3 rounded-xl" style="background:rgba(0,229,160,0.05);">
              <div class="w-2 h-2 rounded-full" style="background:#00E5A0;"></div>
              <div class="flex-1 text-sm">EMA granted market access approval for Cortaflex in 3 additional EU markets</div>
              <div class="text-xs opacity-50">2d ago</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============================================ -->
      <!-- SECTION: Clinical Trials                     -->
      <!-- ============================================ -->
      <section id="view-trials" style="display:none" class="p-8 space-y-8">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-2xl font-bold">Clinical Trials Pipeline</h2>
          <div class="flex items-center gap-3">
            <span class="text-sm opacity-60">8 active trials across 4 phases</span>
          </div>
        </div>

        <!-- Trial Summary Cards -->
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <div class="text-xs opacity-60 mb-1">Phase 1</div>
            <div class="font-display text-2xl font-bold" style="color:#00E5A0;">2</div>
            <div class="text-xs opacity-50 mt-1">134 patients</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <div class="text-xs opacity-60 mb-1">Phase 2</div>
            <div class="font-display text-2xl font-bold" style="color:#00B4D8;">3</div>
            <div class="text-xs opacity-50 mt-1">1,561 patients</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <div class="text-xs opacity-60 mb-1">Phase 3</div>
            <div class="font-display text-2xl font-bold" style="color:#7B61FF;">2</div>
            <div class="text-xs opacity-50 mt-1">3,952 patients</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <div class="text-xs opacity-60 mb-1">Phase 4</div>
            <div class="font-display text-2xl font-bold" style="color:#F59E0B;">1</div>
            <div class="text-xs opacity-50 mt-1">3,200 patients</div>
          </div>
        </div>

        <!-- Trials Table -->
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left">
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Trial ID</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Drug</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Phase</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Sites</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Enrolled</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Target</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold pl-4" style="min-width:180px;">Progress</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody id="trials-table-body"></tbody>
          </table>
        </div>
      </section>

      <!-- ============================================ -->
      <!-- SECTION: Pharmacovigilance                   -->
      <!-- ============================================ -->
      <section id="view-pharmacovigilance" style="display:none" class="p-8 space-y-8">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-2xl font-bold">Pharmacovigilance — Adverse Events</h2>
          <div class="flex items-center gap-3">
            <span class="text-sm opacity-60">Last 30 days: 143 events reported</span>
          </div>
        </div>

        <!-- AE Summary Cards -->
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div class="text-xs opacity-60 mb-1">Total Events (30d)</div>
            <div class="font-display text-2xl font-bold">143</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div class="text-xs opacity-60 mb-1">Serious</div>
            <div class="font-display text-2xl font-bold" style="color:#ef4444;">12</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div class="text-xs opacity-60 mb-1">Under Review</div>
            <div class="font-display text-2xl font-bold" style="color:#F59E0B;">38</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div class="text-xs opacity-60 mb-1">Resolved</div>
            <div class="font-display text-2xl font-bold" style="color:#10b981;">93</div>
          </div>
        </div>

        <!-- AE Table -->
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 overflow-x-auto">
          <h3 class="font-display text-lg font-semibold mb-4">Recent Adverse Events</h3>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left">
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Event ID</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Drug</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Severity</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Site</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Date</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody id="ae-table-body"></tbody>
          </table>
        </div>

        <!-- AE Signal Detection Panel -->
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 class="font-display text-lg font-semibold mb-4">Signal Detection Summary</h3>
          <div class="grid grid-cols-3 gap-6">
            <div class="p-4 rounded-xl" style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);">
              <div class="text-sm font-semibold" style="color:#ef4444;">High Priority Signals</div>
              <div class="font-display text-2xl font-bold mt-2">3</div>
              <div class="text-xs opacity-60 mt-1">Nexavirin hepatotoxicity cluster, Oncolytix cardiac events, Cardiosync renal</div>
            </div>
            <div class="p-4 rounded-xl" style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);">
              <div class="text-sm font-semibold" style="color:#F59E0B;">Under Investigation</div>
              <div class="font-display text-2xl font-bold mt-2">7</div>
              <div class="text-xs opacity-60 mt-1">Reviewing disproportionality analysis across 4 compounds</div>
            </div>
            <div class="p-4 rounded-xl" style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);">
              <div class="text-sm font-semibold" style="color:#10b981;">Cleared Signals</div>
              <div class="font-display text-2xl font-bold mt-2">14</div>
              <div class="text-xs opacity-60 mt-1">No safety concerns identified after full evaluation</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============================================ -->
      <!-- SECTION: Market Access                       -->
      <!-- ============================================ -->
      <section id="view-market-access" style="display:none" class="p-8 space-y-8">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-2xl font-bold">Market Access Coverage</h2>
          <div class="flex items-center gap-3">
            <span class="text-sm opacity-60">Global coverage across 5 regions</span>
          </div>
        </div>

        <!-- Global Coverage KPI -->
        <div class="grid grid-cols-3 gap-6">
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <div class="text-sm opacity-60 mb-1">Global Average Coverage</div>
            <div class="font-display text-3xl font-bold" style="color:var(--primary);">57.4%</div>
            <div class="text-xs opacity-50 mt-2">Weighted by market size</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <div class="text-sm opacity-60 mb-1">Markets with Approval</div>
            <div class="font-display text-3xl font-bold" style="color:#00B4D8;">42</div>
            <div class="text-xs opacity-50 mt-2">Out of 78 target markets</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <div class="text-sm opacity-60 mb-1">Pending Applications</div>
            <div class="font-display text-3xl font-bold" style="color:#7B61FF;">18</div>
            <div class="text-xs opacity-50 mt-2">Expected decisions by Q3 2026</div>
          </div>
        </div>

        <!-- Regional Coverage Bars -->
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
          <h3 class="font-display text-lg font-semibold mb-2">Regional Coverage Breakdown</h3>
          <div id="market-access-bars" class="space-y-5"></div>
        </div>

        <!-- Market Access by Drug -->
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 overflow-x-auto">
          <h3 class="font-display text-lg font-semibold mb-4">Drug-Level Market Access Status</h3>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left">
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Drug</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Phase</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">FDA</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">EMA</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">PMDA</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">NMPA</th>
                <th class="pb-4 text-xs uppercase tracking-wider opacity-60 font-semibold">Health Canada</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-t border-[var(--border)]">
                <td class="py-3 font-medium">Cardiosync</td><td class="py-3">Phase 4</td>
                <td class="py-3"><span class="badge-enrolling">Approved</span></td>
                <td class="py-3"><span class="badge-enrolling">Approved</span></td>
                <td class="py-3"><span class="badge-active">Under Review</span></td>
                <td class="py-3"><span class="badge-on-hold">Pending</span></td>
                <td class="py-3"><span class="badge-enrolling">Approved</span></td>
              </tr>
              <tr class="border-t border-[var(--border)]">
                <td class="py-3 font-medium">Nexavirin</td><td class="py-3">Phase 3</td>
                <td class="py-3"><span class="badge-active">Under Review</span></td>
                <td class="py-3"><span class="badge-on-hold">Pending</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-on-hold">Pending</span></td>
              </tr>
              <tr class="border-t border-[var(--border)]">
                <td class="py-3 font-medium">Oncolytix</td><td class="py-3">Phase 3</td>
                <td class="py-3"><span class="badge-active">Under Review</span></td>
                <td class="py-3"><span class="badge-active">Under Review</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
              </tr>
              <tr class="border-t border-[var(--border)]">
                <td class="py-3 font-medium">Cortaflex</td><td class="py-3">Phase 2</td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
              </tr>
              <tr class="border-t border-[var(--border)]">
                <td class="py-3 font-medium">Renavita</td><td class="py-3">Phase 2</td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
                <td class="py-3"><span class="badge-screening">Not Filed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ============================================ -->
      <!-- SECTION: Compliance                          -->
      <!-- ============================================ -->
      <section id="view-compliance" style="display:none" class="p-8 space-y-8">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-2xl font-bold">Regulatory Compliance</h2>
          <div class="flex items-center gap-3">
            <span class="text-sm opacity-60">Last audit: March 2026</span>
          </div>
        </div>

        <!-- Compliance Score Overview -->
        <div class="grid grid-cols-4 gap-6">
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center">
            <div class="text-sm opacity-60 mb-2">Overall Score</div>
            <div class="font-display text-4xl font-bold" style="color:#00E5A0;">94%</div>
            <div class="text-xs opacity-50 mt-2">Target: 95%</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center">
            <div class="text-sm opacity-60 mb-2">GCP Compliance</div>
            <div class="font-display text-4xl font-bold" style="color:#00B4D8;">97%</div>
            <div class="text-xs opacity-50 mt-2">Good Clinical Practice</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center">
            <div class="text-sm opacity-60 mb-2">GMP Compliance</div>
            <div class="font-display text-4xl font-bold" style="color:#7B61FF;">91%</div>
            <div class="text-xs opacity-50 mt-2">Good Manufacturing</div>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center">
            <div class="text-sm opacity-60 mb-2">Pharmacovigilance</div>
            <div class="font-display text-4xl font-bold" style="color:#F59E0B;">88%</div>
            <div class="text-xs opacity-50 mt-2">Signal reporting SLA</div>
          </div>
        </div>

        <!-- Regulatory Milestones Checklist -->
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 class="font-display text-lg font-semibold mb-4">Regulatory Milestones — 2026</h3>
          <div class="divide-y divide-[var(--border)]">
            <div class="compliance-item">
              <div class="compliance-check compliance-pass">✓</div>
              <div class="flex-1">
                <div class="text-sm font-medium">Annual DSUR Submission — Nexavirin</div>
                <div class="text-xs opacity-50 mt-1">Development Safety Update Report submitted to FDA and EMA</div>
              </div>
              <div class="text-xs opacity-50">Completed Jan 15</div>
            </div>
            <div class="compliance-item">
              <div class="compliance-check compliance-pass">✓</div>
              <div class="flex-1">
                <div class="text-sm font-medium">GCP Audit — All Phase 3 Sites</div>
                <div class="text-xs opacity-50 mt-1">27 sites audited, 2 minor findings resolved</div>
              </div>
              <div class="text-xs opacity-50">Completed Feb 28</div>
            </div>
            <div class="compliance-item">
              <div class="compliance-check compliance-pass">✓</div>
              <div class="flex-1">
                <div class="text-sm font-medium">PBRER Submission — Cardiosync</div>
                <div class="text-xs opacity-50 mt-1">Periodic Benefit-Risk Evaluation Report accepted by EMA</div>
              </div>
              <div class="text-xs opacity-50">Completed Mar 10</div>
            </div>
            <div class="compliance-item">
              <div class="compliance-check compliance-warn">!</div>
              <div class="flex-1">
                <div class="text-sm font-medium">FDA Pre-NDA Meeting — Nexavirin</div>
                <div class="text-xs opacity-50 mt-1">Pre-submission meeting scheduled — briefing document in preparation</div>
              </div>
              <div class="text-xs" style="color:#F59E0B;">Due May 15</div>
            </div>
            <div class="compliance-item">
              <div class="compliance-check compliance-warn">!</div>
              <div class="flex-1">
                <div class="text-sm font-medium">REMS Assessment — Oncolytix</div>
                <div class="text-xs opacity-50 mt-1">Risk Evaluation and Mitigation Strategy review with CDER</div>
              </div>
              <div class="text-xs" style="color:#F59E0B;">Due Jun 30</div>
            </div>
            <div class="compliance-item">
              <div class="compliance-check compliance-pending">○</div>
              <div class="flex-1">
                <div class="text-sm font-medium">Annual IND Safety Report — Cortaflex</div>
                <div class="text-xs opacity-50 mt-1">Investigational New Drug annual safety reporting to FDA</div>
              </div>
              <div class="text-xs opacity-50">Due Aug 01</div>
            </div>
            <div class="compliance-item">
              <div class="compliance-check compliance-pending">○</div>
              <div class="flex-1">
                <div class="text-sm font-medium">EMA Variation Submission — Cardiosync Label Update</div>
                <div class="text-xs opacity-50 mt-1">Type II variation for new indication based on Phase 4 data</div>
              </div>
              <div class="text-xs opacity-50">Due Sep 15</div>
            </div>
            <div class="compliance-item">
              <div class="compliance-check compliance-pending">○</div>
              <div class="flex-1">
                <div class="text-sm font-medium">GMP Re-inspection — Manufacturing Site (DE)</div>
                <div class="text-xs opacity-50 mt-1">Biennial good manufacturing practice inspection by Regierungsprasidium</div>
              </div>
              <div class="text-xs opacity-50">Due Oct 01</div>
            </div>
            <div class="compliance-item">
              <div class="compliance-check compliance-pending">○</div>
              <div class="flex-1">
                <div class="text-sm font-medium">NDA Submission — Nexavirin</div>
                <div class="text-xs opacity-50 mt-1">New Drug Application target submission to FDA CDER</div>
              </div>
              <div class="text-xs opacity-50">Due Nov 30</div>
            </div>
            <div class="compliance-item">
              <div class="compliance-check compliance-fail">✗</div>
              <div class="flex-1">
                <div class="text-sm font-medium">SUSAR Reporting SLA Breach — Neurazine</div>
                <div class="text-xs opacity-50 mt-1">2 Suspected Unexpected Serious Adverse Reactions reported outside 15-day window — corrective action in progress</div>
              </div>
              <div class="text-xs" style="color:#ef4444;">Action Required</div>
            </div>
          </div>
        </div>

        <!-- Document Management Summary -->
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 class="font-display text-lg font-semibold mb-4">Document Management</h3>
          <div class="grid grid-cols-3 gap-6">
            <div class="p-4 rounded-xl" style="background:rgba(0,229,160,0.05);border:1px solid rgba(0,229,160,0.15);">
              <div class="text-sm font-semibold" style="color:#00E5A0;">Up to Date</div>
              <div class="font-display text-2xl font-bold mt-2">847</div>
              <div class="text-xs opacity-60 mt-1">SOPs, protocols, and regulatory documents current</div>
            </div>
            <div class="p-4 rounded-xl" style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);">
              <div class="text-sm font-semibold" style="color:#F59E0B;">Review Needed</div>
              <div class="font-display text-2xl font-bold mt-2">23</div>
              <div class="text-xs opacity-60 mt-1">Documents approaching review deadline within 30 days</div>
            </div>
            <div class="p-4 rounded-xl" style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);">
              <div class="text-sm font-semibold" style="color:#ef4444;">Overdue</div>
              <div class="font-display text-2xl font-bold mt-2">4</div>
              <div class="text-xs opacity-60 mt-1">Documents past review deadline — immediate action required</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <!-- switchView navigation -->
  <script>
  function switchView(evt,viewId){
    if(evt)evt.preventDefault();
    document.querySelectorAll('[id^="view-"]').forEach(function(s){s.style.display='none'});
    var el=document.getElementById(viewId);
    if(el)el.style.display='';
    document.querySelectorAll('.nav-item').forEach(function(n){
      n.classList.remove('active');
      n.style.opacity='0.7';
      if(n.dataset.section===viewId){n.classList.add('active');n.style.opacity='1';}
    });
    var canvases=document.getElementById(viewId)?document.getElementById(viewId).querySelectorAll('canvas'):[];
    canvases.forEach(function(c){try{var chart=Chart.getChart(c);if(chart)chart.resize()}catch(e){}});
  }
  document.addEventListener('DOMContentLoaded',function(){switchView(null,'view-overview')});
  </script>

  <!-- vibeLoadData -->
  <script>
  async function vibeLoadData(t,f){
    var url=window.__VIBE_SUPABASE_URL__+'/rest/v1/'+t+'?team_id=eq.'+f.team_id;
    var r=await fetch(url,{headers:{'apikey':window.__VIBE_SUPABASE_ANON_KEY__,'Authorization':'Bearer '+window.__VIBE_SUPABASE_ANON_KEY__}});
    if(!r.ok) throw new Error(r.status);
    return r.json();
  }
  </script>

  <!-- Populate Trials Table -->
  <script>
  (function(){
    var data=(window.__VIBE_SAMPLE__||{}).trials||[];
    var tbody=document.getElementById('trials-table-body');
    if(!tbody||!data.length)return;
    var statusMap={'Enrolling':'badge-enrolling','Active':'badge-active','On Hold':'badge-on-hold','Screening':'badge-screening'};
    data.forEach(function(t){
      var pct=Math.round((t.enrolled/t.target)*100);
      var barColor=pct>80?'#00E5A0':pct>50?'#00B4D8':pct>30?'#F59E0B':'#ef4444';
      var tr=document.createElement('tr');
      tr.className='border-t border-[var(--border)]';
      tr.innerHTML='<td class="py-3 font-mono text-xs opacity-70">'+t.id+'</td>'
        +'<td class="py-3 font-medium">'+t.drug+'</td>'
        +'<td class="py-3"><span style="color:#7B61FF;font-weight:600;">'+t.phase+'</span></td>'
        +'<td class="py-3 text-center">'+t.sites+'</td>'
        +'<td class="py-3 text-right font-mono">'+t.enrolled.toLocaleString()+'</td>'
        +'<td class="py-3 text-right font-mono opacity-60">'+t.target.toLocaleString()+'</td>'
        +'<td class="py-3 pl-4"><div class="flex items-center gap-2"><div class="progress-bar-track flex-1"><div class="progress-bar-fill" style="width:'+pct+'%;background:'+barColor+';"></div></div><span class="text-xs font-mono opacity-70 w-10 text-right">'+pct+'%</span></div></td>'
        +'<td class="py-3"><span class="'+(statusMap[t.status]||'badge-active')+'">'+t.status+'</span></td>';
      tbody.appendChild(tr);
    });
  })();
  </script>

  <!-- Populate AE Table -->
  <script>
  (function(){
    var data=(window.__VIBE_SAMPLE__||{}).adverseEventList||[];
    var tbody=document.getElementById('ae-table-body');
    if(!tbody||!data.length)return;
    var sevMap={'Serious':'badge-serious','Moderate':'badge-moderate','Mild':'badge-mild'};
    var statMap={'Escalated':'badge-escalated','Under Review':'badge-under-review','Reported':'badge-reported','Resolved':'badge-resolved'};
    data.forEach(function(ae){
      var tr=document.createElement('tr');
      tr.className='border-t border-[var(--border)]';
      tr.innerHTML='<td class="py-3 font-mono text-xs opacity-70">'+ae.id+'</td>'
        +'<td class="py-3 font-medium">'+ae.drug+'</td>'
        +'<td class="py-3"><span class="'+(sevMap[ae.severity]||'badge-moderate')+'">'+ae.severity+'</span></td>'
        +'<td class="py-3">'+ae.site+'</td>'
        +'<td class="py-3 font-mono text-xs opacity-70">'+ae.date+'</td>'
        +'<td class="py-3"><span class="'+(statMap[ae.status]||'badge-reported')+'">'+ae.status+'</span></td>';
      tbody.appendChild(tr);
    });
  })();
  </script>

  <!-- Populate Market Access Bars -->
  <script>
  (function(){
    var data=(window.__VIBE_SAMPLE__||{}).marketAccess||[];
    var container=document.getElementById('market-access-bars');
    if(!container||!data.length)return;
    var colors=['#00E5A0','#00B4D8','#7B61FF','#F59E0B','#94a3b8'];
    data.forEach(function(m,i){
      var div=document.createElement('div');
      div.innerHTML='<div class="flex items-center justify-between mb-2"><span class="text-sm font-medium">'+m.region+'</span><span class="text-sm font-mono font-semibold" style="color:'+colors[i%colors.length]+';">'+m.coverage+'%</span></div>'
        +'<div style="background:rgba(148,163,184,0.1);border-radius:8px;height:32px;overflow:hidden;"><div class="market-bar" style="width:'+m.coverage+'%;background:'+colors[i%colors.length]+';height:100%;"></div></div>';
      container.appendChild(div);
    });
  })();
  </script>
</body>
</html>$$,
    updated_at = now()
WHERE skill_name = 'pharma-analytics-dashboard';

NOTIFY pgrst, 'reload schema';
