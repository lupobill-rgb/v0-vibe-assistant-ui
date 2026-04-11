-- Migration: Populate html_skeleton for pharma-phase1-dashboard.
-- Phase 1 First-in-Human Safety Dashboard — FDA 21 CFR Part 11, CDISC SDTM, ICH E6.

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT 'pharma','pharma-phase1-dashboard','pharma',
  'Phase 1 First-in-Human safety dashboard — dose escalation, PK/PD, adverse events, 21 CFR Part 11 audit trail.',
  'Phase 1 FIH Safety Dashboard', true
WHERE NOT EXISTS (SELECT 1 FROM skill_registry WHERE skill_name='pharma-phase1-dashboard');

UPDATE skill_registry
SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{BRAND_COMPANY}} — Phase 1 FIH Safety Dashboard</title>
  <meta name="description" content="Phase 1 First-in-Human safety dashboard — dose escalation, PK/PD, adverse events, and 21 CFR Part 11 audit trail for {{BRAND_COMPANY}}.">
  <script>window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";</script>
  <script>window.__VIBE_TEAM_ID__="__TEAM_ID__";</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Space Grotesk','system-ui']}}}}</script>
  <style>
    :root{--bg:#0A0E17;--text:#E2E8F0;--primary:#00E5A0;--accent:#00B4D8;--violet:#7B61FF;--surface:rgba(255,255,255,0.04);--border:rgba(255,255,255,0.08)}
    body{background:var(--bg);color:var(--text);margin:0;font-family:'Inter',system-ui,sans-serif}
    .font-display{font-family:'Space Grotesk',system-ui,sans-serif}
    .nav-tab{padding:10px 20px;border-radius:10px;font-size:0.875rem;font-weight:500;cursor:pointer;transition:all 0.2s;color:rgba(226,232,240,0.6);background:transparent;border:none}
    .nav-tab:hover{color:var(--text);background:rgba(255,255,255,0.04)}
    .nav-tab.active{color:var(--primary);background:rgba(0,229,160,0.1);font-weight:600}
    .kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;transition:border-color 0.2s}
    .kpi-card:hover{border-color:rgba(0,229,160,0.25)}
    .badge{padding:2px 10px;border-radius:9999px;font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
    .badge-open{background:rgba(0,229,160,0.15);color:#00E5A0}
    .badge-complete{background:rgba(0,180,216,0.15);color:#00B4D8}
    .badge-pending{background:rgba(245,158,11,0.15);color:#F59E0B}
    .badge-alert{background:rgba(239,68,68,0.15);color:#ef4444}
    .badge-g1{background:rgba(16,185,129,0.15);color:#10b981}.badge-g2{background:rgba(245,158,11,0.15);color:#f59e0b}
    .badge-g3{background:rgba(249,115,22,0.15);color:#f97316}.badge-g4{background:rgba(239,68,68,0.15);color:#ef4444}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;opacity:0.5;padding:12px 16px;border-bottom:1px solid var(--border)}
    td{padding:12px 16px;font-size:0.875rem;border-bottom:1px solid var(--border)}
    .glass-nav{background:rgba(10,14,23,0.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
    .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px}
    .audit-row{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)}
    .audit-row:last-child{border-bottom:none}
    .audit-dot{width:10px;height:10px;border-radius:50%;margin-top:5px;flex-shrink:0}
  </style>
  <script>
  window.__VIBE_SAMPLE__ = {
    cohorts: [
      {id:'C-001',dose:'5 mg',nEnrolled:7,dlt:0,status:'Complete',nextReview:'-'},
      {id:'C-002',dose:'10 mg',nEnrolled:7,dlt:0,status:'Complete',nextReview:'-'},
      {id:'C-003',dose:'20 mg',nEnrolled:7,dlt:1,status:'Enrolling',nextReview:'2026-04-25'},
      {id:'C-004',dose:'40 mg',nEnrolled:7,dlt:1,status:'Pending',nextReview:'2026-05-10'}
    ],
    adverseEvents: [
      {subjectId:'S-003',cohort:'5 mg',event:'Headache',grade:1,onsetDay:2,resolved:'Yes',causality:'Unlikely'},
      {subjectId:'S-005',cohort:'5 mg',event:'Fatigue',grade:1,onsetDay:3,resolved:'Yes',causality:'Possible'},
      {subjectId:'S-009',cohort:'10 mg',event:'Nausea',grade:1,onsetDay:1,resolved:'Yes',causality:'Probable'},
      {subjectId:'S-011',cohort:'10 mg',event:'Dizziness',grade:2,onsetDay:4,resolved:'Yes',causality:'Possible'},
      {subjectId:'S-012',cohort:'10 mg',event:'Headache',grade:1,onsetDay:2,resolved:'Yes',causality:'Unlikely'},
      {subjectId:'S-015',cohort:'20 mg',event:'Nausea',grade:2,onsetDay:1,resolved:'Yes',causality:'Probable'},
      {subjectId:'S-017',cohort:'20 mg',event:'Vomiting',grade:2,onsetDay:3,resolved:'Yes',causality:'Probable'},
      {subjectId:'S-018',cohort:'20 mg',event:'ALT Elevation',grade:3,onsetDay:7,resolved:'No',causality:'Probable'},
      {subjectId:'S-019',cohort:'20 mg',event:'Fatigue',grade:1,onsetDay:2,resolved:'Yes',causality:'Possible'},
      {subjectId:'S-023',cohort:'40 mg',event:'Nausea',grade:2,onsetDay:1,resolved:'Yes',causality:'Probable'},
      {subjectId:'S-025',cohort:'40 mg',event:'Neutropenia',grade:3,onsetDay:5,resolved:'No',causality:'Definite'},
      {subjectId:'S-027',cohort:'40 mg',event:'Diarrhea',grade:1,onsetDay:3,resolved:'Yes',causality:'Possible'}
    ],
    pkData: {
      timepoints: [0, 0.5, 1, 2, 4, 8, 12, 24],
      cohort5mg:  [0, 12.4, 28.1, 45.3, 38.2, 18.7, 8.4, 1.2],
      cohort10mg: [0, 25.8, 61.3, 98.7, 82.1, 41.5, 19.2, 3.1],
      cohort20mg: [0, 54.2, 132.8, 210.4, 175.6, 88.3, 42.1, 7.8]
    },
    enrollment: {
      weeks: ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12','W13','W14','W15','W16'],
      actual:   [2,4,7,7,9,11,14,14,16,19,21,21,24,26,28,28],
      target:   [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32]
    },
    waterfall: [
      {subject:'S-001',dose:'5 mg',response:-8},{subject:'S-002',dose:'5 mg',response:-12},{subject:'S-003',dose:'5 mg',response:5},
      {subject:'S-004',dose:'5 mg',response:-3},{subject:'S-005',dose:'5 mg',response:-15},{subject:'S-006',dose:'5 mg',response:-7},{subject:'S-007',dose:'5 mg',response:-10},
      {subject:'S-008',dose:'10 mg',response:-22},{subject:'S-009',dose:'10 mg',response:-18},{subject:'S-010',dose:'10 mg',response:-28},
      {subject:'S-011',dose:'10 mg',response:3},{subject:'S-012',dose:'10 mg',response:-25},{subject:'S-013',dose:'10 mg',response:-14},{subject:'S-014',dose:'10 mg',response:-20},
      {subject:'S-015',dose:'20 mg',response:-35},{subject:'S-016',dose:'20 mg',response:-42},{subject:'S-017',dose:'20 mg',response:-30},
      {subject:'S-018',dose:'20 mg',response:-18},{subject:'S-019',dose:'20 mg',response:-48},{subject:'S-020',dose:'20 mg',response:-38},{subject:'S-021',dose:'20 mg',response:-25},
      {subject:'S-022',dose:'40 mg',response:-55},{subject:'S-023',dose:'40 mg',response:-40},{subject:'S-024',dose:'40 mg',response:-62},
      {subject:'S-025',dose:'40 mg',response:-35},{subject:'S-026',dose:'40 mg',response:-50},{subject:'S-027',dose:'40 mg',response:-45},{subject:'S-028',dose:'40 mg',response:-58}
    ],
    auditLog: [
      {ts:'2026-04-11 09:14:22',user:'Dr. Chen',action:'Cohort C-004 dose level approved (40 mg)','type':'approval'},
      {ts:'2026-04-10 16:42:10',user:'J. Martinez (CRA)',action:'Protocol deviation PD-003 logged — missed visit window S-019','type':'deviation'},
      {ts:'2026-04-10 11:08:55',user:'System',action:'Electronic signature verified — DSMB review packet signed by 3/3 members','type':'signature'},
      {ts:'2026-04-09 14:23:17',user:'Dr. Patel',action:'SAE report filed — S-025 Grade 3 Neutropenia','type':'safety'},
      {ts:'2026-04-09 08:55:03',user:'K. Okonkwo (DM)',action:'Database lock Cohort C-002 — all queries resolved','type':'data'},
      {ts:'2026-04-08 17:30:44',user:'System',action:'Randomization seed validated — IWRS check passed','type':'system'},
      {ts:'2026-04-08 10:12:38',user:'Dr. Chen',action:'DLT assessment C-003 — 1 DLT (ALT elevation Grade 3) per protocol §6.2','type':'safety'},
      {ts:'2026-04-07 15:48:21',user:'A. Novak (QA)',action:'Audit trail export generated — 21 CFR Part 11 compliance verified','type':'audit'},
      {ts:'2026-04-07 09:05:12',user:'System',action:'EDC data reconciliation complete — 0 discrepancies','type':'data'},
      {ts:'2026-04-06 14:33:09',user:'Dr. Patel',action:'Informed consent v2.1 approved by IRB — updated in TMF','type':'regulatory'}
    ]
  };
  </script>
</head>
<body>
  <!-- Top Nav -->
  <nav class="glass-nav sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:linear-gradient(135deg,#00E5A0,#00B4D8);">
        <span class="text-sm font-bold text-[#0A0E17]">P1</span>
      </div>
      <span class="font-display text-lg font-semibold">Phase 1 FIH Safety</span>
      <span class="badge badge-open ml-2">Active</span>
    </div>
    <div class="flex items-center gap-1 bg-[rgba(255,255,255,0.04)] rounded-xl p-1">
      <button class="nav-tab active" data-tab="view-overview" onclick="switchTab(this,'view-overview')">Overview</button>
      <button class="nav-tab" data-tab="view-dose" onclick="switchTab(this,'view-dose')">Dose Escalation</button>
      <button class="nav-tab" data-tab="view-pkpd" onclick="switchTab(this,'view-pkpd')">PK/PD</button>
      <button class="nav-tab" data-tab="view-ae" onclick="switchTab(this,'view-ae')">Adverse Events</button>
      <button class="nav-tab" data-tab="view-audit" onclick="switchTab(this,'view-audit')">Audit Trail</button>
    </div>
    <div class="text-xs opacity-40 font-mono">21 CFR Part 11 · ICH E6 · CDISC SDTM</div>
  </nav>

  <main class="max-w-[1400px] mx-auto px-8 py-8">
    <!-- ============ OVERVIEW ============ -->
    <section id="view-overview">
      <!-- KPI Cards -->
      <div class="grid grid-cols-6 gap-4 mb-8">
        <div class="kpi-card"><div class="text-xs opacity-50 uppercase tracking-wider mb-2">Cohorts Active</div><div class="font-display text-3xl font-bold" style="color:#00E5A0;">4</div><div class="text-xs opacity-40 mt-1">of 4 planned</div></div>
        <div class="kpi-card"><div class="text-xs opacity-50 uppercase tracking-wider mb-2">Subjects Enrolled</div><div class="font-display text-3xl font-bold" style="color:#00B4D8;">28</div><div class="text-xs opacity-40 mt-1">target: 32</div></div>
        <div class="kpi-card"><div class="text-xs opacity-50 uppercase tracking-wider mb-2">DLTs Observed</div><div class="font-display text-3xl font-bold" style="color:#F59E0B;">2</div><div class="text-xs opacity-40 mt-1">across all cohorts</div></div>
        <div class="kpi-card"><div class="text-xs opacity-50 uppercase tracking-wider mb-2">MTD Status</div><div class="font-display text-xl font-bold mt-1" style="color:#7B61FF;">Not Reached</div><div class="text-xs opacity-40 mt-1">escalation continues</div></div>
        <div class="kpi-card"><div class="text-xs opacity-50 uppercase tracking-wider mb-2">Protocol Deviations</div><div class="font-display text-3xl font-bold" style="color:#ef4444;">3</div><div class="text-xs opacity-40 mt-1">1 major / 2 minor</div></div>
        <div class="kpi-card"><div class="text-xs opacity-50 uppercase tracking-wider mb-2">Days to Next Cohort</div><div class="font-display text-3xl font-bold">12</div><div class="text-xs opacity-40 mt-1">C-004 review 2026-04-25</div></div>
      </div>
      <!-- Overview Charts Row -->
      <div class="grid grid-cols-2 gap-6 mb-8">
        <div class="chart-card"><h3 class="font-display text-base font-semibold mb-4">Enrollment vs Target</h3><canvas id="chart-enrollment" height="220"></canvas></div>
        <div class="chart-card"><h3 class="font-display text-base font-semibold mb-4">AE Severity by Cohort</h3><canvas id="chart-ae-severity" height="220"></canvas></div>
      </div>
      <!-- Dose Escalation Summary Table -->
      <div class="chart-card">
        <h3 class="font-display text-base font-semibold mb-4">Dose Escalation Summary</h3>
        <table><thead><tr><th>Cohort</th><th>Dose Level</th><th>N Enrolled</th><th>DLTs</th><th>Status</th><th>Next Review</th></tr></thead>
        <tbody id="dose-table-body"></tbody></table>
      </div>
    </section>

    <!-- ============ DOSE ESCALATION ============ -->
    <section id="view-dose" style="display:none">
      <div class="grid grid-cols-2 gap-6 mb-8">
        <div class="chart-card"><h3 class="font-display text-base font-semibold mb-4">Dose Response Waterfall</h3><canvas id="chart-waterfall" height="300"></canvas></div>
        <div class="chart-card"><h3 class="font-display text-base font-semibold mb-4">Enrollment Timeline</h3><canvas id="chart-enrollment2" height="300"></canvas></div>
      </div>
      <div class="chart-card">
        <h3 class="font-display text-base font-semibold mb-4">Cohort Detail</h3>
        <table><thead><tr><th>Cohort</th><th>Dose</th><th>N</th><th>DLTs</th><th>DLT Rate</th><th>Median Response %</th><th>Status</th></tr></thead>
        <tbody id="dose-detail-body"></tbody></table>
      </div>
    </section>

    <!-- ============ PK/PD ============ -->
    <section id="view-pkpd" style="display:none">
      <div class="chart-card mb-8"><h3 class="font-display text-base font-semibold mb-4">Plasma Concentration–Time (Semi-Log)</h3><canvas id="chart-pk" height="350"></canvas></div>
      <div class="grid grid-cols-3 gap-4">
        <div class="kpi-card"><div class="text-xs opacity-50 uppercase tracking-wider mb-2">Cmax (20 mg)</div><div class="font-display text-2xl font-bold" style="color:#00E5A0;">210.4 ng/mL</div></div>
        <div class="kpi-card"><div class="text-xs opacity-50 uppercase tracking-wider mb-2">Tmax (20 mg)</div><div class="font-display text-2xl font-bold" style="color:#00B4D8;">2.0 h</div></div>
        <div class="kpi-card"><div class="text-xs opacity-50 uppercase tracking-wider mb-2">T½ (est.)</div><div class="font-display text-2xl font-bold" style="color:#7B61FF;">~6.2 h</div></div>
      </div>
    </section>

    <!-- ============ ADVERSE EVENTS ============ -->
    <section id="view-ae" style="display:none">
      <div class="chart-card mb-8">
        <h3 class="font-display text-base font-semibold mb-4">Adverse Event Log</h3>
        <table><thead><tr><th>Subject ID</th><th>Cohort</th><th>Event</th><th>Grade</th><th>Onset Day</th><th>Resolved</th><th>Causality</th></tr></thead>
        <tbody id="ae-table-body"></tbody></table>
      </div>
      <div class="chart-card"><h3 class="font-display text-base font-semibold mb-4">AE Severity Distribution</h3><canvas id="chart-ae-dist" height="250"></canvas></div>
    </section>

    <!-- ============ AUDIT TRAIL ============ -->
    <section id="view-audit" style="display:none">
      <div class="chart-card">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-display text-base font-semibold">21 CFR Part 11 Audit Trail</h3>
          <span class="badge badge-complete">Compliant</span>
        </div>
        <div id="audit-log-container"></div>
      </div>
    </section>
  </main>

  <!-- Tab Switcher -->
  <script>
  function switchTab(btn,viewId){
    document.querySelectorAll('.nav-tab').forEach(function(t){t.classList.remove('active')});
    btn.classList.add('active');
    document.querySelectorAll('main > section').forEach(function(s){s.style.display='none'});
    var el=document.getElementById(viewId);if(el)el.style.display='';
    var canvases=el?el.querySelectorAll('canvas'):[];
    canvases.forEach(function(c){try{var ch=Chart.getChart(c);if(ch)ch.resize()}catch(e){}});
  }
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

  <!-- Charts Init -->
  <script>
  document.addEventListener('DOMContentLoaded', async function(){
    var S=window.__VIBE_SAMPLE__||{};
    var gridColor='rgba(255,255,255,0.06)';
    var tickColor='rgba(226,232,240,0.4)';
    var baseOpts={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tickColor,font:{family:'Inter',size:11}}}},scales:{x:{grid:{color:gridColor},ticks:{color:tickColor,font:{family:'Inter',size:10}}},y:{grid:{color:gridColor},ticks:{color:tickColor,font:{family:'Inter',size:10}}}}};

    /* -- Enrollment vs Target -- */
    var enrollRows=[];
    try{enrollRows=await vibeLoadData('enrollment_timeline',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!enrollRows.length) enrollRows=[];
    var enr=S.enrollment||{};
    new Chart(document.getElementById('chart-enrollment'),{type:'line',data:{labels:enr.weeks||[],datasets:[
      {label:'Actual',data:enr.actual||[],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.1)',fill:true,tension:0.3,pointRadius:3},
      {label:'Target',data:enr.target||[],borderColor:'rgba(226,232,240,0.3)',borderDash:[6,4],fill:false,tension:0.3,pointRadius:0}
    ]},options:Object.assign({},baseOpts)});

    /* -- AE Severity by Cohort (stacked bar) -- */
    var aeRows=[];
    try{aeRows=await vibeLoadData('adverse_events',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!aeRows.length) aeRows=(S.adverseEvents||[]);
    var cohortLabels=['5 mg','10 mg','20 mg','40 mg'];
    var gradeData={g1:[0,0,0,0],g2:[0,0,0,0],g3:[0,0,0,0],g4:[0,0,0,0]};
    aeRows.forEach(function(ae){var ci=cohortLabels.indexOf(ae.cohort);if(ci>=0){var g='g'+ae.grade;if(gradeData[g])gradeData[g][ci]++}});
    new Chart(document.getElementById('chart-ae-severity'),{type:'bar',data:{labels:cohortLabels,datasets:[
      {label:'Grade 1',data:gradeData.g1,backgroundColor:'#10b981'},
      {label:'Grade 2',data:gradeData.g2,backgroundColor:'#F59E0B'},
      {label:'Grade 3',data:gradeData.g3,backgroundColor:'#f97316'},
      {label:'Grade 4',data:gradeData.g4,backgroundColor:'#ef4444'}
    ]},options:Object.assign({},baseOpts,{scales:{x:{stacked:true,grid:{color:gridColor},ticks:{color:tickColor}},y:{stacked:true,grid:{color:gridColor},ticks:{color:tickColor}}}})});

    /* -- Waterfall -- */
    var wfRows=[];
    try{wfRows=await vibeLoadData('dose_waterfall',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!wfRows.length) wfRows=(S.waterfall||[]);
    wfRows.sort(function(a,b){return a.response-b.response});
    var doseColorMap={'5 mg':'#00E5A0','10 mg':'#00B4D8','20 mg':'#7B61FF','40 mg':'#F59E0B'};
    new Chart(document.getElementById('chart-waterfall'),{type:'bar',data:{labels:wfRows.map(function(w){return w.subject}),datasets:[{
      label:'% Change from Baseline',data:wfRows.map(function(w){return w.response}),
      backgroundColor:wfRows.map(function(w){return doseColorMap[w.dose]||'#94a3b8'}),borderRadius:2
    }]},options:Object.assign({},baseOpts,{indexAxis:'x',plugins:{legend:{display:false}},scales:{y:{grid:{color:gridColor},ticks:{color:tickColor,callback:function(v){return v+'%'}}},x:{grid:{display:false},ticks:{color:tickColor,font:{size:8},maxRotation:90}}}})});

    /* -- Enrollment Timeline (duplicate for dose tab) -- */
    new Chart(document.getElementById('chart-enrollment2'),{type:'line',data:{labels:enr.weeks||[],datasets:[
      {label:'Actual',data:enr.actual||[],borderColor:'#00B4D8',backgroundColor:'rgba(0,180,216,0.1)',fill:true,tension:0.3,pointRadius:3},
      {label:'Target',data:enr.target||[],borderColor:'rgba(226,232,240,0.3)',borderDash:[6,4],fill:false,tension:0.3,pointRadius:0}
    ]},options:Object.assign({},baseOpts)});

    /* -- PK Concentration-Time (semi-log) -- */
    var pkRows=[];
    try{pkRows=await vibeLoadData('pk_concentrations',{team_id:window.__VIBE_TEAM_ID__})}catch(e){}
    if(!pkRows.length) pkRows=[];
    var pk=S.pkData||{};
    new Chart(document.getElementById('chart-pk'),{type:'line',data:{labels:(pk.timepoints||[]).map(function(t){return t+'h'}),datasets:[
      {label:'5 mg',data:pk.cohort5mg||[],borderColor:'#00E5A0',backgroundColor:'transparent',tension:0.3,pointRadius:4,pointBackgroundColor:'#00E5A0'},
      {label:'10 mg',data:pk.cohort10mg||[],borderColor:'#00B4D8',backgroundColor:'transparent',tension:0.3,pointRadius:4,pointBackgroundColor:'#00B4D8'},
      {label:'20 mg',data:pk.cohort20mg||[],borderColor:'#7B61FF',backgroundColor:'transparent',tension:0.3,pointRadius:4,pointBackgroundColor:'#7B61FF'}
    ]},options:Object.assign({},baseOpts,{scales:{x:{grid:{color:gridColor},ticks:{color:tickColor},title:{display:true,text:'Time (hours)',color:tickColor}},y:{type:'logarithmic',grid:{color:gridColor},ticks:{color:tickColor,callback:function(v){return v}},title:{display:true,text:'Concentration (ng/mL)',color:tickColor},min:0.5}}})});

    /* -- AE Distribution (bar in AE tab) -- */
    var gradeCounts=[0,0,0,0];
    aeRows.forEach(function(ae){if(ae.grade>=1&&ae.grade<=4)gradeCounts[ae.grade-1]++});
    new Chart(document.getElementById('chart-ae-dist'),{type:'bar',data:{labels:['Grade 1','Grade 2','Grade 3','Grade 4'],datasets:[{
      data:gradeCounts,backgroundColor:['#10b981','#F59E0B','#f97316','#ef4444'],borderRadius:8
    }]},options:Object.assign({},baseOpts,{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:tickColor}},y:{grid:{color:gridColor},ticks:{color:tickColor}}}})});

    /* -- Populate Dose Tables -- */
    var cohorts=(S.cohorts||[]);
    var dtb=document.getElementById('dose-table-body');
    if(dtb) cohorts.forEach(function(c){
      var statusBadge=c.status==='Complete'?'badge-complete':c.status==='Enrolling'?'badge-open':'badge-pending';
      dtb.innerHTML+='<tr><td class="font-mono text-xs opacity-70">'+c.id+'</td><td class="font-semibold">'+c.dose+'</td><td>'+c.nEnrolled+'</td><td>'+(c.dlt>0?'<span style="color:#F59E0B;font-weight:600;">'+c.dlt+'</span>':c.dlt)+'</td><td><span class="badge '+statusBadge+'">'+c.status+'</span></td><td class="font-mono text-xs opacity-60">'+c.nextReview+'</td></tr>';
    });
    var ddb=document.getElementById('dose-detail-body');
    if(ddb) cohorts.forEach(function(c){
      var dltRate=((c.dlt/c.nEnrolled)*100).toFixed(0)+'%';
      var wfForCohort=(S.waterfall||[]).filter(function(w){return w.dose===c.dose});
      var medResp='-';
      if(wfForCohort.length){var sorted=wfForCohort.map(function(w){return w.response}).sort(function(a,b){return a-b});medResp=sorted[Math.floor(sorted.length/2)]+'%'}
      var statusBadge=c.status==='Complete'?'badge-complete':c.status==='Enrolling'?'badge-open':'badge-pending';
      ddb.innerHTML+='<tr><td class="font-mono text-xs opacity-70">'+c.id+'</td><td class="font-semibold">'+c.dose+'</td><td>'+c.nEnrolled+'</td><td>'+c.dlt+'</td><td>'+dltRate+'</td><td class="font-mono">'+medResp+'</td><td><span class="badge '+statusBadge+'">'+c.status+'</span></td></tr>';
    });

    /* -- Populate AE Table -- */
    var aeTb=document.getElementById('ae-table-body');
    if(aeTb) aeRows.forEach(function(ae){
      var gb='badge-g'+(ae.grade||1);
      aeTb.innerHTML+='<tr><td class="font-mono text-xs opacity-70">'+ae.subjectId+'</td><td>'+ae.cohort+'</td><td>'+ae.event+'</td><td><span class="badge '+gb+'">Grade '+ae.grade+'</span></td><td class="font-mono">Day '+ae.onsetDay+'</td><td>'+(ae.resolved==='Yes'?'<span style="color:#10b981;">Yes</span>':'<span style="color:#ef4444;">No</span>')+'</td><td class="text-xs opacity-70">'+ae.causality+'</td></tr>';
    });

    /* -- Populate Audit Log -- */
    var auditC=document.getElementById('audit-log-container');
    var typeColors={approval:'#00E5A0',deviation:'#F59E0B',signature:'#00B4D8',safety:'#ef4444',data:'#7B61FF',system:'#94a3b8',audit:'#00E5A0',regulatory:'#00B4D8'};
    if(auditC)(S.auditLog||[]).forEach(function(a){
      var dot=typeColors[a.type]||'#94a3b8';
      auditC.innerHTML+='<div class="audit-row"><div class="audit-dot" style="background:'+dot+';"></div><div class="flex-1"><div class="text-sm">'+a.action+'</div><div class="text-xs opacity-40 mt-1">'+a.user+' · '+a.ts+'</div></div></div>';
    });
  });
  </script>
</body>
</html>$$,
    updated_at = now()
WHERE skill_name = 'pharma-phase1-dashboard';

NOTIFY pgrst, 'reload schema';
