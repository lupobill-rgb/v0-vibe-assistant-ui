-- Migration: Populate html_skeleton for pharma-phase3-dashboard.
-- Phase 3 Pivotal Trial Dashboard — FDA 21 CFR Part 11, CDISC SDTM, ICH E6, ISO 27001.

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT 'pharma','pharma-phase3-dashboard','pharma',
  'Phase 3 pivotal trial dashboard — Kaplan-Meier survival, CONSORT flow, forest plot subgroups, site performance, 21 CFR Part 11 audit trail.',
  'Phase 3 Pivotal Trial Dashboard', true
WHERE NOT EXISTS (SELECT 1 FROM skill_registry WHERE skill_name='pharma-phase3-dashboard');

UPDATE skill_registry
SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{BRAND_COMPANY}} — Phase 3 Pivotal Trial Dashboard</title>
  <meta name="description" content="Phase 3 pivotal trial dashboard — Kaplan-Meier survival curves, CONSORT flow, forest plot subgroup analysis, site performance, and 21 CFR Part 11 audit trail for {{BRAND_COMPANY}}.">
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
    .badge-pass{background:rgba(0,229,160,0.15);color:#00E5A0}
    .badge-fail{background:rgba(239,68,68,0.15);color:#ef4444}
    .badge-pending{background:rgba(245,158,11,0.15);color:#F59E0B}
    .badge-complete{background:rgba(0,180,216,0.15);color:#00B4D8}
    .badge-open{background:rgba(0,229,160,0.15);color:#00E5A0}
    .badge-resolved{background:rgba(0,180,216,0.15);color:#00B4D8}
    .badge-sig{background:rgba(123,97,255,0.15);color:#7B61FF}
    .badge-major{background:rgba(239,68,68,0.15);color:#ef4444}
    .badge-minor{background:rgba(245,158,11,0.15);color:#F59E0B}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;opacity:0.5;padding:12px 16px;border-bottom:1px solid var(--border)}
    td{padding:12px 16px;font-size:0.875rem;border-bottom:1px solid var(--border)}
    .glass-nav{background:rgba(10,14,23,0.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
    .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px}
    .audit-row{display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)}
    .audit-row:last-child{border-bottom:none}
    .audit-dot{width:10px;height:10px;border-radius:50%;margin-top:5px;flex-shrink:0}
    .iso-panel{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px}
    .progress-bar{height:8px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden}
    .progress-fill{height:100%;border-radius:4px;transition:width 0.4s ease}
    .forest-row{display:flex;align-items:center;gap:8px;padding:6px 0}
    .forest-label{width:180px;font-size:0.8rem;text-align:right;flex-shrink:0}
    .forest-bar-area{flex:1;position:relative;height:24px}
    .forest-ci{position:absolute;height:2px;top:50%;transform:translateY(-50%);background:var(--accent)}
    .forest-point{position:absolute;width:10px;height:10px;border-radius:50%;top:50%;transform:translate(-50%,-50%);background:var(--primary)}
    .forest-ref{position:absolute;width:1px;height:100%;top:0;background:rgba(255,255,255,0.2)}
  </style>
  <script>
  window.__VIBE_SAMPLE__ = {
    kpis: {
      subjectsEnrolled: 847,
      sitesActive: 34,
      primaryEndpointHR: 0.67,
      primaryEndpointP: '<0.001',
      gcpCompliance: 98.2,
      protocolDeviations: 12,
      estimatedCompletion: 'Q3 2026'
    },

    /* Kaplan-Meier survival: 24 monthly timepoints, treatment vs control */
    kaplanMeier: {
      months: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],
      treatment: [1.00,0.98,0.96,0.94,0.93,0.91,0.89,0.87,0.85,0.83,0.81,0.79,0.77,0.75,0.73,0.71,0.69,0.67,0.66,0.64,0.63,0.61,0.60,0.59,0.58],
      control:   [1.00,0.97,0.94,0.90,0.87,0.83,0.79,0.75,0.71,0.67,0.63,0.59,0.56,0.52,0.49,0.46,0.43,0.40,0.38,0.36,0.34,0.32,0.30,0.29,0.28],
      atRiskTreatment: [423,418,412,406,400,393,386,379,372,365,358,351,344,337,330,323,316,310,304,298,292,287,282,277,272],
      atRiskControl:    [424,416,407,396,385,373,360,347,334,321,308,295,282,270,258,247,236,226,216,207,199,191,183,176,170]
    },

    /* CONSORT flow diagram data */
    consort: {
      stages: ['Screened','Eligible','Enrolled','Randomized','Completed','Discontinued'],
      counts: [1240,920,847,847,798,49],
      reasons: {
        screenFail: 320,
        notEligible: 73,
        adverseEvent: 18,
        withdrawal: 14,
        lostFollowUp: 9,
        protocolViolation: 5,
        death: 3
      }
    },

    /* Forest plot: 8 subgroups with hazard ratios and 95% CI */
    forestPlot: [
      {subgroup:'Age < 65',       n:412, hr:0.64, ciLow:0.49, ciHigh:0.84, pValue:'0.001'},
      {subgroup:'Age ≥ 65',       n:435, hr:0.71, ciLow:0.55, ciHigh:0.92, pValue:'0.009'},
      {subgroup:'Male',           n:489, hr:0.65, ciLow:0.51, ciHigh:0.83, pValue:'<0.001'},
      {subgroup:'Female',         n:358, hr:0.70, ciLow:0.53, ciHigh:0.93, pValue:'0.014'},
      {subgroup:'White',          n:561, hr:0.66, ciLow:0.53, ciHigh:0.83, pValue:'<0.001'},
      {subgroup:'Non-White',      n:286, hr:0.69, ciLow:0.49, ciHigh:0.97, pValue:'0.034'},
      {subgroup:'Baseline Sev. Low',  n:398, hr:0.62, ciLow:0.46, ciHigh:0.83, pValue:'0.001'},
      {subgroup:'Baseline Sev. High', n:449, hr:0.72, ciLow:0.56, ciHigh:0.93, pValue:'0.011'}
    ],

    /* Site enrollment data: 34 sites */
    sites: (function(){
      var countries=['USA','USA','USA','USA','USA','USA','USA','USA','USA','USA','UK','UK','UK','Germany','Germany','Germany','France','France','Spain','Spain','Italy','Italy','Canada','Canada','Australia','Australia','Japan','Japan','South Korea','Brazil','Brazil','India','India','Mexico'];
      var cities=['Boston','Houston','Chicago','Seattle','Atlanta','Denver','Miami','Philadelphia','San Diego','New York','London','Manchester','Edinburgh','Berlin','Munich','Frankfurt','Paris','Lyon','Madrid','Barcelona','Rome','Milan','Toronto','Vancouver','Sydney','Melbourne','Tokyo','Osaka','Seoul','Sao Paulo','Rio de Janeiro','Mumbai','Delhi','Mexico City'];
      var result=[];
      for(var i=0;i<34;i++){
        var target=Math.floor(20+Math.random()*15);
        var enrolled=Math.floor(target*(0.7+Math.random()*0.45));
        if(enrolled>target)enrolled=target;
        var gcpStatuses=['Compliant','Compliant','Compliant','Compliant','Compliant','Minor Finding','Compliant','Compliant','Compliant','Compliant'];
        result.push({
          siteId:'SITE-'+String(i+1).padStart(3,'0'),
          city:cities[i],
          country:countries[i],
          enrolled:enrolled,
          target:target,
          pctComplete:Math.round((enrolled/target)*100),
          lastVisit:'2026-0'+(3+Math.floor(Math.random()*2))+'-'+String(Math.floor(1+Math.random()*28)).padStart(2,'0'),
          gcpStatus:gcpStatuses[i%10]
        });
      }
      return result;
    })(),

    /* Protocol deviations: 12 entries */
    protocolDeviations: [
      {devId:'PD-001',site:'SITE-007',category:'Eligibility',severity:'Major',date:'2026-01-14',status:'Resolved',description:'Subject enrolled outside age range per inclusion criteria IC-03'},
      {devId:'PD-002',site:'SITE-012',category:'Informed Consent',severity:'Major',date:'2026-01-22',status:'Resolved',description:'Consent form signed after first study procedure'},
      {devId:'PD-003',site:'SITE-003',category:'Visit Window',severity:'Minor',date:'2026-02-03',status:'Resolved',description:'Visit 4 conducted 5 days outside protocol window'},
      {devId:'PD-004',site:'SITE-019',category:'Lab Sample',severity:'Minor',date:'2026-02-10',status:'Resolved',description:'Blood sample processing delayed beyond 2-hour stability window'},
      {devId:'PD-005',site:'SITE-025',category:'Drug Accountability',severity:'Major',date:'2026-02-18',status:'Open',description:'IP dispensing log discrepancy at site pharmacy'},
      {devId:'PD-006',site:'SITE-001',category:'Visit Window',severity:'Minor',date:'2026-02-25',status:'Resolved',description:'Visit 6 ECG not performed within 30-min pre-dose window'},
      {devId:'PD-007',site:'SITE-008',category:'Eligibility',severity:'Major',date:'2026-03-04',status:'Open',description:'Prohibited concomitant medication not documented at screening'},
      {devId:'PD-008',site:'SITE-014',category:'Safety Reporting',severity:'Major',date:'2026-03-09',status:'Open',description:'SAE reported 48 hours beyond 24-hour reporting window'},
      {devId:'PD-009',site:'SITE-022',category:'Randomization',severity:'Minor',date:'2026-03-15',status:'Resolved',description:'IVRS call delayed resulting in temporary unblinding risk'},
      {devId:'PD-010',site:'SITE-006',category:'Lab Sample',severity:'Minor',date:'2026-03-20',status:'Resolved',description:'PK sample collected outside ±5 min nominal timepoint'},
      {devId:'PD-011',site:'SITE-031',category:'Drug Accountability',severity:'Minor',date:'2026-03-28',status:'Resolved',description:'Temperature excursion documented for IP storage unit'},
      {devId:'PD-012',site:'SITE-017',category:'Informed Consent',severity:'Major',date:'2026-04-02',status:'Open',description:'Updated ICF not re-consented within protocol-mandated 14-day window'}
    ],

    /* Enrollment velocity: top 10 sites (actual vs target per month) */
    enrollmentVelocity: {
      siteLabels: ['SITE-001','SITE-003','SITE-005','SITE-009','SITE-012','SITE-014','SITE-018','SITE-022','SITE-027','SITE-031'],
      actual:  [28,26,25,24,23,22,21,20,19,18],
      target:  [25,25,25,25,25,25,25,25,25,25]
    },

    /* 21 CFR Part 11 audit log */
    auditLog: [
      {ts:'2026-04-11 08:12:03 UTC',user:'Dr. Sarah Chen (PI)',action:'Electronic signature — Approved SAE narrative for SUBJ-412',type:'signature',sig:'SHA-256: 9f3a…e7c1 | Meaning: I have reviewed and approve this document'},
      {ts:'2026-04-11 07:45:22 UTC',user:'James Wu (CRA)',action:'Site monitoring visit report uploaded — SITE-007 interim visit',type:'monitoring',sig:'SHA-256: 4b2d…a8f3'},
      {ts:'2026-04-10 16:30:11 UTC',user:'System (EDC)',action:'Data lock applied — Visit 8 CRF pages for SITE-014',type:'data',sig:''},
      {ts:'2026-04-10 14:18:45 UTC',user:'Dr. Maria Lopez (Medical Monitor)',action:'Unblinded safety review — DSMB interim analysis package approved',type:'safety',sig:'SHA-256: 7e1c…b4d9 | Meaning: Medical review complete, no safety signal identified'},
      {ts:'2026-04-10 11:02:33 UTC',user:'Robert Kim (Biostatistician)',action:'Interim analysis dataset locked — 70% information fraction',type:'statistical',sig:'SHA-256: 2f8a…c5e6'},
      {ts:'2026-04-09 17:45:00 UTC',user:'System (IVRS)',action:'Randomization sequence verified — Block 34 released for SITE-022',type:'system',sig:''},
      {ts:'2026-04-09 15:20:18 UTC',user:'Lisa Park (QA)',action:'CAPA initiated — Protocol deviation PD-008 corrective action plan',type:'audit',sig:'SHA-256: 3d5f…91a2'},
      {ts:'2026-04-09 09:30:42 UTC',user:'Dr. Ahmed Hassan (Sponsor Medical Officer)',action:'Electronic signature — Protocol Amendment 3 approval',type:'signature',sig:'SHA-256: 8c4b…d7e3 | Meaning: I approve this protocol amendment'},
      {ts:'2026-04-08 14:15:27 UTC',user:'Emily Taylor (Data Manager)',action:'Query resolution batch — 47 open queries resolved across 12 sites',type:'data',sig:''},
      {ts:'2026-04-08 10:45:09 UTC',user:'System (Safety DB)',action:'MedDRA coding update — 3 new preferred terms mapped for AE reconciliation',type:'system',sig:''},
      {ts:'2026-04-07 16:30:55 UTC',user:'Dr. Sarah Chen (PI)',action:'Electronic signature — Annual IND safety report reviewed',type:'signature',sig:'SHA-256: 6a9e…f2b8 | Meaning: I have reviewed this safety report'},
      {ts:'2026-04-07 11:00:33 UTC',user:'Regulatory Affairs',action:'Submission package prepared — FDA annual report IND 123456',type:'regulatory',sig:'SHA-256: 1d7c…e4a5'}
    ],

    /* ICH E6 GCP compliance breakdown by domain */
    gcpDomains: [
      {domain:'IRB/IEC Oversight',score:100,maxScore:100,status:'Pass',findings:0},
      {domain:'Informed Consent',score:96,maxScore:100,status:'Pass',findings:2},
      {domain:'Investigator Qualification',score:100,maxScore:100,status:'Pass',findings:0},
      {domain:'Trial Management',score:98,maxScore:100,status:'Pass',findings:1},
      {domain:'Drug Accountability',score:94,maxScore:100,status:'Pass',findings:3},
      {domain:'Safety Reporting',score:96,maxScore:100,status:'Pass',findings:2},
      {domain:'Data Management',score:100,maxScore:100,status:'Pass',findings:0},
      {domain:'Quality Assurance',score:98,maxScore:100,status:'Pass',findings:1},
      {domain:'Source Documentation',score:100,maxScore:100,status:'Pass',findings:0},
      {domain:'Monitoring',score:97,maxScore:100,status:'Pass',findings:1}
    ],

    /* ISO 27001 security controls */
    isoControls: {
      securityScore: 94,
      nonConformities: 3,
      totalControls: 114,
      implementedControls: 112,
      categories: [
        {name:'Information Security Policies',controls:2,implemented:2,status:'Pass'},
        {name:'Organization of Info Security',controls:7,implemented:7,status:'Pass'},
        {name:'Human Resource Security',controls:6,implemented:6,status:'Pass'},
        {name:'Asset Management',controls:10,implemented:10,status:'Pass'},
        {name:'Access Control',controls:14,implemented:14,status:'Pass'},
        {name:'Cryptography',controls:2,implemented:2,status:'Pass'},
        {name:'Physical Security',controls:15,implemented:14,status:'Partial'},
        {name:'Operations Security',controls:14,implemented:14,status:'Pass'},
        {name:'Communications Security',controls:7,implemented:7,status:'Pass'},
        {name:'System Acquisition & Dev',controls:13,implemented:13,status:'Pass'},
        {name:'Supplier Relationships',controls:5,implemented:5,status:'Pass'},
        {name:'Incident Management',controls:7,implemented:7,status:'Pass'},
        {name:'Business Continuity',controls:4,implemented:4,status:'Pass'},
        {name:'Compliance',controls:8,implemented:7,status:'Partial'}
      ]
    },

    /* CDISC SDTM domain compliance */
    cdiscDomains: [
      {domain:'DM',description:'Demographics',records:847,compliant:847,lastValidated:'2026-04-10',status:'Pass'},
      {domain:'AE',description:'Adverse Events',records:1284,compliant:1281,lastValidated:'2026-04-10',status:'Pass'},
      {domain:'CM',description:'Concomitant Medications',records:2156,compliant:2156,lastValidated:'2026-04-09',status:'Pass'},
      {domain:'DS',description:'Disposition',records:896,compliant:896,lastValidated:'2026-04-10',status:'Pass'},
      {domain:'EX',description:'Exposure',records:4235,compliant:4230,lastValidated:'2026-04-10',status:'Pass'},
      {domain:'LB',description:'Laboratory Tests',records:18420,compliant:18415,lastValidated:'2026-04-09',status:'Pass'},
      {domain:'MH',description:'Medical History',records:3108,compliant:3108,lastValidated:'2026-04-08',status:'Pass'},
      {domain:'VS',description:'Vital Signs',records:9680,compliant:9678,lastValidated:'2026-04-10',status:'Pass'},
      {domain:'EG',description:'ECG Results',records:4235,compliant:4235,lastValidated:'2026-04-09',status:'Pass'},
      {domain:'RS',description:'Disease Response',records:2541,compliant:2538,lastValidated:'2026-04-10',status:'Pass'}
    ]
  };
  </script>
</head>
<body>
  <!-- ===== GLASSMORPHISM NAV ===== -->
  <nav class="glass-nav sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:linear-gradient(135deg,#00E5A0,#00B4D8);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0E17" stroke-width="2.5" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </div>
      <span class="font-display font-semibold text-lg">Phase 3 Pivotal Trial</span>
      <span class="text-xs opacity-40 ml-2 font-mono">{{BRAND_COMPANY}}</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs opacity-40 font-mono">Last updated: 2026-04-11</span>
      <span class="badge badge-pass">LIVE</span>
    </div>
  </nav>

  <!-- ===== TAB BAR ===== -->
  <div class="px-6 pt-4 pb-2 flex gap-2 flex-wrap" id="tab-bar">
    <button class="nav-tab active" data-tab="overview">Overview</button>
    <button class="nav-tab" data-tab="survival">Survival Analysis</button>
    <button class="nav-tab" data-tab="subgroups">Subgroups</button>
    <button class="nav-tab" data-tab="sites">Site Performance</button>
    <button class="nav-tab" data-tab="audit">Audit Trail</button>
  </div>

  <!-- ===== TAB: OVERVIEW ===== -->
  <div id="tab-overview" class="tab-content px-6 py-6 space-y-6">
    <!-- KPI Row -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" id="kpi-grid">
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Subjects Enrolled</div>
        <div class="font-display text-2xl font-bold" id="kpi-enrolled" style="color:#00E5A0;">—</div>
        <div class="text-xs opacity-40 mt-1">of 900 target</div>
      </div>
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Sites Active</div>
        <div class="font-display text-2xl font-bold" id="kpi-sites" style="color:#00B4D8;">—</div>
        <div class="text-xs opacity-40 mt-1">across 14 countries</div>
      </div>
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Primary Endpoint</div>
        <div class="font-display text-2xl font-bold" id="kpi-hr" style="color:#00E5A0;">—</div>
        <div class="text-xs opacity-40 mt-1" id="kpi-p-value">p-value: —</div>
      </div>
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">GCP Compliance</div>
        <div class="font-display text-2xl font-bold" id="kpi-gcp" style="color:#00E5A0;">—</div>
        <div class="text-xs opacity-40 mt-1">ICH E6(R2)</div>
      </div>
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Protocol Deviations</div>
        <div class="font-display text-2xl font-bold" id="kpi-deviations" style="color:#F59E0B;">—</div>
        <div class="text-xs opacity-40 mt-1" id="kpi-dev-open">— open</div>
      </div>
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Est. Completion</div>
        <div class="font-display text-2xl font-bold" id="kpi-completion" style="color:#7B61FF;">—</div>
        <div class="text-xs opacity-40 mt-1">primary analysis</div>
      </div>
    </div>

    <!-- Overview Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- KM Survival Preview -->
      <div class="chart-card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display font-semibold text-base">Kaplan-Meier Survival</h3>
            <p class="text-xs opacity-40 mt-1">Overall survival: treatment vs control</p>
          </div>
          <span class="badge badge-pass">HR 0.67</span>
        </div>
        <canvas id="km-overview-chart" height="220"></canvas>
      </div>
      <!-- CONSORT Flow -->
      <div class="chart-card">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display font-semibold text-base">CONSORT Flow</h3>
            <p class="text-xs opacity-40 mt-1">Subject disposition through trial phases</p>
          </div>
          <span class="badge badge-complete">n=847</span>
        </div>
        <canvas id="consort-overview-chart" height="220"></canvas>
      </div>
    </div>

    <!-- CDISC Compliance Table -->
    <div class="chart-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display font-semibold text-base">CDISC SDTM Domain Compliance</h3>
          <p class="text-xs opacity-40 mt-1">Regulatory-grade data standards validation</p>
        </div>
        <span class="badge badge-pass">10/10 Domains</span>
      </div>
      <div class="overflow-x-auto">
        <table>
          <thead><tr><th>Domain</th><th>Description</th><th>Records</th><th>Compliant</th><th>Last Validated</th><th>Status</th></tr></thead>
          <tbody id="cdisc-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ===== TAB: SURVIVAL ANALYSIS ===== -->
  <div id="tab-survival" class="tab-content px-6 py-6 space-y-6" style="display:none;">
    <div class="chart-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display font-semibold text-lg">Kaplan-Meier Survival Curves</h3>
          <p class="text-xs opacity-40 mt-1">Overall survival: treatment (n=423) vs control (n=424) — 24 month follow-up</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1"><div class="w-3 h-0.5 rounded" style="background:#00E5A0;"></div><span class="text-xs opacity-60">Treatment</span></div>
          <div class="flex items-center gap-1"><div class="w-3 h-0.5 rounded" style="background:#00B4D8;"></div><span class="text-xs opacity-60">Control</span></div>
        </div>
      </div>
      <canvas id="km-full-chart" height="320"></canvas>
    </div>

    <!-- At-Risk Table -->
    <div class="chart-card">
      <div class="mb-4">
        <h3 class="font-display font-semibold text-base">Number At Risk</h3>
        <p class="text-xs opacity-40 mt-1">Subjects remaining at risk by timepoint</p>
      </div>
      <div class="overflow-x-auto">
        <table>
          <thead><tr><th>Month</th><th id="at-risk-header-months" colspan="25"></th></tr></thead>
          <tbody id="at-risk-table-body"></tbody>
        </table>
      </div>
    </div>

    <!-- Survival Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Hazard Ratio</div>
        <div class="font-display text-2xl font-bold" style="color:#00E5A0;">0.67</div>
        <div class="text-xs opacity-40 mt-1">95% CI: 0.56 – 0.80</div>
      </div>
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Median OS (Treatment)</div>
        <div class="font-display text-2xl font-bold" style="color:#00E5A0;">Not Reached</div>
        <div class="text-xs opacity-40 mt-1">24-month rate: 58%</div>
      </div>
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Median OS (Control)</div>
        <div class="font-display text-2xl font-bold" style="color:#00B4D8;">18.4 mo</div>
        <div class="text-xs opacity-40 mt-1">24-month rate: 28%</div>
      </div>
    </div>
  </div>

  <!-- ===== TAB: SUBGROUPS ===== -->
  <div id="tab-subgroups" class="tab-content px-6 py-6 space-y-6" style="display:none;">
    <div class="chart-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display font-semibold text-lg">Forest Plot — Subgroup Analysis</h3>
          <p class="text-xs opacity-40 mt-1">Hazard ratios with 95% confidence intervals by pre-specified subgroups</p>
        </div>
        <span class="text-xs opacity-40 font-mono">Favors treatment ← 1.0 → Favors control</span>
      </div>
      <canvas id="forest-chart" height="320"></canvas>
    </div>

    <!-- Subgroup Detail Table -->
    <div class="chart-card">
      <div class="mb-4">
        <h3 class="font-display font-semibold text-base">Subgroup Detail</h3>
      </div>
      <div class="overflow-x-auto">
        <table>
          <thead><tr><th>Subgroup</th><th>N</th><th>HR</th><th>95% CI</th><th>p-Value</th><th>Favors</th></tr></thead>
          <tbody id="subgroup-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ===== TAB: SITE PERFORMANCE ===== -->
  <div id="tab-sites" class="tab-content px-6 py-6 space-y-6" style="display:none;">
    <!-- Enrollment Velocity Chart -->
    <div class="chart-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display font-semibold text-lg">Site Enrollment Velocity</h3>
          <p class="text-xs opacity-40 mt-1">Actual vs target enrollment — top 10 sites</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1"><div class="w-3 h-3 rounded" style="background:#00E5A0;"></div><span class="text-xs opacity-60">Actual</span></div>
          <div class="flex items-center gap-1"><div class="w-3 h-3 rounded" style="background:rgba(255,255,255,0.15);"></div><span class="text-xs opacity-60">Target</span></div>
        </div>
      </div>
      <canvas id="velocity-chart" height="280"></canvas>
    </div>

    <!-- Site Performance Table -->
    <div class="chart-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display font-semibold text-base">All Sites</h3>
          <p class="text-xs opacity-40 mt-1">34 active investigational sites</p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table>
          <thead><tr><th>Site ID</th><th>Country</th><th>Enrolled</th><th>Target</th><th>% Complete</th><th>Last Visit</th><th>GCP Status</th></tr></thead>
          <tbody id="site-table-body"></tbody>
        </table>
      </div>
    </div>

    <!-- Protocol Deviations Table -->
    <div class="chart-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display font-semibold text-base">Protocol Deviations</h3>
          <p class="text-xs opacity-40 mt-1">12 deviations tracked — 4 open</p>
        </div>
        <span class="badge badge-pending">4 Open</span>
      </div>
      <div class="overflow-x-auto">
        <table>
          <thead><tr><th>Dev ID</th><th>Site</th><th>Category</th><th>Severity</th><th>Date</th><th>Status</th><th>Description</th></tr></thead>
          <tbody id="deviation-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ===== TAB: AUDIT TRAIL ===== -->
  <div id="tab-audit" class="tab-content px-6 py-6 space-y-6" style="display:none;">
    <!-- 21 CFR Part 11 Electronic Signature Log -->
    <div class="chart-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display font-semibold text-lg">21 CFR Part 11 — Electronic Signature Log</h3>
          <p class="text-xs opacity-40 mt-1">Tamper-evident audit trail with cryptographic signatures</p>
        </div>
        <span class="badge badge-sig">FDA COMPLIANT</span>
      </div>
      <div id="audit-log-container"></div>
    </div>

    <!-- ICH E6 GCP Compliance -->
    <div class="chart-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-display font-semibold text-base">ICH E6(R2) GCP Compliance</h3>
          <p class="text-xs opacity-40 mt-1">Compliance score breakdown by GCP domain</p>
        </div>
        <span class="badge badge-pass">98.2% Overall</span>
      </div>
      <div class="overflow-x-auto">
        <table>
          <thead><tr><th>Domain</th><th>Score</th><th>Max</th><th>%</th><th>Findings</th><th>Status</th></tr></thead>
          <tbody id="gcp-table-body"></tbody>
        </table>
      </div>
    </div>

    <!-- ISO 27001 Panel -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Security Score</div>
        <div class="font-display text-2xl font-bold" id="iso-score" style="color:#00E5A0;">—</div>
        <div class="text-xs opacity-40 mt-1">ISO 27001:2022</div>
      </div>
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Non-Conformities</div>
        <div class="font-display text-2xl font-bold" id="iso-nonconf" style="color:#F59E0B;">—</div>
        <div class="text-xs opacity-40 mt-1">active findings</div>
      </div>
      <div class="kpi-card">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">Controls Implemented</div>
        <div class="font-display text-2xl font-bold" id="iso-controls" style="color:#00B4D8;">—</div>
        <div class="text-xs opacity-40 mt-1">Annex A controls</div>
      </div>
    </div>

    <!-- ISO Controls Breakdown -->
    <div class="chart-card">
      <div class="mb-4">
        <h3 class="font-display font-semibold text-base">ISO 27001 Control Categories</h3>
        <p class="text-xs opacity-40 mt-1">Implementation status by category</p>
      </div>
      <div class="space-y-3" id="iso-controls-container"></div>
      <div class="mt-6 overflow-x-auto">
        <table>
          <thead><tr><th>Category</th><th>Controls</th><th>Implemented</th><th>%</th><th>Status</th></tr></thead>
          <tbody id="iso-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ===== FOOTER ===== -->
  <footer class="px-6 py-8 mt-8 border-t" style="border-color:var(--border);">
    <div class="flex items-center justify-between">
      <div class="text-xs opacity-30">Phase 3 Pivotal Trial Dashboard — FDA 21 CFR Part 11 | CDISC SDTM | ICH E6(R2) | ISO 27001</div>
      <div class="text-xs opacity-30 font-mono">Powered by UbiVibe</div>
    </div>
  </footer>

  <script>
  document.addEventListener('DOMContentLoaded', function(){
    /* ===== TAB SWITCHING ===== */
    var tabs=document.querySelectorAll('.nav-tab');
    tabs.forEach(function(tab){
      tab.addEventListener('click',function(){
        tabs.forEach(function(t){t.classList.remove('active');});
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(function(c){c.style.display='none';});
        var target=document.getElementById('tab-'+tab.getAttribute('data-tab'));
        if(target)target.style.display='block';
      });
    });

    /* ===== DATA LOADING ===== */
    var S;
    try { S = window.__VIBE_SAMPLE__ || {}; } catch(e){ S = {}; }

    var kpis;
    try { kpis = S.kpis || {}; } catch(e){ kpis = {}; }

    /* ===== KPI CARDS ===== */
    try {
      document.getElementById('kpi-enrolled').textContent = (kpis.subjectsEnrolled || 0).toLocaleString();
      document.getElementById('kpi-sites').textContent = kpis.sitesActive || 0;
      document.getElementById('kpi-hr').textContent = 'HR ' + (kpis.primaryEndpointHR || '—');
      document.getElementById('kpi-p-value').textContent = 'p ' + (kpis.primaryEndpointP || '—');
      document.getElementById('kpi-gcp').textContent = (kpis.gcpCompliance || 0) + '%';
      document.getElementById('kpi-deviations').textContent = kpis.protocolDeviations || 0;
      var openDevs = (S.protocolDeviations || []).filter(function(d){return d.status==='Open';}).length;
      document.getElementById('kpi-dev-open').textContent = openDevs + ' open';
      document.getElementById('kpi-completion').textContent = kpis.estimatedCompletion || '—';
    } catch(e){ console.warn('KPI render error:', e); }

    /* ===== KM OVERVIEW CHART ===== */
    try {
      var kmData = S.kaplanMeier || {};
      var kmOverviewCtx = document.getElementById('km-overview-chart');
      if(kmOverviewCtx) new Chart(kmOverviewCtx, {
        type: 'line',
        data: {
          labels: (kmData.months||[]).map(function(m){return 'Mo '+m;}),
          datasets: [
            {label:'Treatment',data:kmData.treatment||[],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.08)',fill:true,tension:0.3,pointRadius:0,borderWidth:2},
            {label:'Control',data:kmData.control||[],borderColor:'#00B4D8',backgroundColor:'rgba(0,180,216,0.08)',fill:true,tension:0.3,pointRadius:0,borderWidth:2}
          ]
        },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'rgba(226,232,240,0.4)',maxTicksLimit:7,font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}},y:{min:0,max:1,ticks:{color:'rgba(226,232,240,0.4)',callback:function(v){return Math.round(v*100)+'%';},font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}}}}
      });
    } catch(e){ console.warn('KM overview chart error:', e); }

    /* ===== CONSORT OVERVIEW CHART ===== */
    try {
      var consort = S.consort || {};
      var consortCtx = document.getElementById('consort-overview-chart');
      if(consortCtx) new Chart(consortCtx, {
        type: 'bar',
        data: {
          labels: consort.stages || [],
          datasets: [{
            label:'Subjects',
            data: consort.counts || [],
            backgroundColor: (consort.counts||[]).map(function(c,i){
              return i < 5 ? 'rgba(0,229,160,'+(0.3+i*0.12)+')' : 'rgba(239,68,68,0.5)';
            }),
            borderColor: (consort.counts||[]).map(function(c,i){
              return i < 5 ? '#00E5A0' : '#ef4444';
            }),
            borderWidth:1,
            borderRadius:8
          }]
        },
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'rgba(226,232,240,0.4)',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}},y:{ticks:{color:'rgba(226,232,240,0.5)',font:{size:11}},grid:{display:false}}}}
      });
    } catch(e){ console.warn('CONSORT chart error:', e); }

    /* ===== CDISC TABLE ===== */
    try {
      var cdiscTb = document.getElementById('cdisc-table-body');
      if(cdiscTb)(S.cdiscDomains||[]).forEach(function(d){
        cdiscTb.innerHTML += '<tr><td class="font-mono font-semibold" style="color:#00B4D8;">'+d.domain+'</td><td>'+d.description+'</td><td class="font-mono">'+d.records.toLocaleString()+'</td><td class="font-mono" style="color:#00E5A0;">'+d.compliant.toLocaleString()+'</td><td class="font-mono text-xs opacity-60">'+d.lastValidated+'</td><td><span class="badge badge-pass">'+d.status+'</span></td></tr>';
      });
    } catch(e){ console.warn('CDISC table error:', e); }

    /* ===== KM FULL CHART (Survival Tab) ===== */
    try {
      var kmFullCtx = document.getElementById('km-full-chart');
      if(kmFullCtx) new Chart(kmFullCtx, {
        type: 'line',
        data: {
          labels: (kmData.months||[]).map(function(m){return 'Month '+m;}),
          datasets: [
            {label:'Treatment (n=423)',data:kmData.treatment||[],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,0.06)',fill:true,tension:0.2,pointRadius:2,pointBackgroundColor:'#00E5A0',borderWidth:2.5},
            {label:'Control (n=424)',data:kmData.control||[],borderColor:'#00B4D8',backgroundColor:'rgba(0,180,216,0.06)',fill:true,tension:0.2,pointRadius:2,pointBackgroundColor:'#00B4D8',borderWidth:2.5}
          ]
        },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(226,232,240,0.6)',font:{size:11},usePointStyle:true,padding:20}}},scales:{x:{title:{display:true,text:'Months',color:'rgba(226,232,240,0.4)',font:{size:11}},ticks:{color:'rgba(226,232,240,0.4)',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}},y:{min:0,max:1,title:{display:true,text:'Survival Probability',color:'rgba(226,232,240,0.4)',font:{size:11}},ticks:{color:'rgba(226,232,240,0.4)',callback:function(v){return Math.round(v*100)+'%';},font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}}}}
      });
    } catch(e){ console.warn('KM full chart error:', e); }

    /* ===== AT-RISK TABLE ===== */
    try {
      var arTb = document.getElementById('at-risk-table-body');
      if(arTb){
        var headerRow = document.getElementById('at-risk-header-months');
        if(headerRow){
          headerRow.colSpan = (kmData.months||[]).length;
          var hdrHtml = '<tr><th></th>';
          (kmData.months||[]).forEach(function(m,i){
            if(i%3===0) hdrHtml += '<th class="font-mono text-center">'+m+'</th>';
          });
          hdrHtml += '</tr>';
          var thead = arTb.closest('table').querySelector('thead');
          if(thead) thead.innerHTML = hdrHtml;
        }
        var trtRow = '<tr><td class="font-semibold" style="color:#00E5A0;">Treatment</td>';
        var ctlRow = '<tr><td class="font-semibold" style="color:#00B4D8;">Control</td>';
        (kmData.months||[]).forEach(function(m,i){
          if(i%3===0){
            trtRow += '<td class="font-mono text-center text-xs">'+(kmData.atRiskTreatment||[])[i]+'</td>';
            ctlRow += '<td class="font-mono text-center text-xs">'+(kmData.atRiskControl||[])[i]+'</td>';
          }
        });
        trtRow += '</tr>'; ctlRow += '</tr>';
        arTb.innerHTML = trtRow + ctlRow;
      }
    } catch(e){ console.warn('At-risk table error:', e); }

    /* ===== FOREST PLOT CHART (Subgroups Tab) ===== */
    try {
      var forestCtx = document.getElementById('forest-chart');
      var fp = S.forestPlot || [];
      if(forestCtx && fp.length) {
        var fpLabels = fp.map(function(f){return f.subgroup + ' (n='+f.n+')';});
        var fpHR = fp.map(function(f){return f.hr;});
        var fpErrLow = fp.map(function(f){return f.hr - f.ciLow;});
        var fpErrHigh = fp.map(function(f){return f.ciHigh - f.hr;});

        new Chart(forestCtx, {
          type: 'bar',
          data: {
            labels: fpLabels,
            datasets: [{
              label: 'Hazard Ratio',
              data: fpHR,
              backgroundColor: fp.map(function(f){return f.hr < 1 ? 'rgba(0,229,160,0.6)' : 'rgba(239,68,68,0.6)';}),
              borderColor: fp.map(function(f){return f.hr < 1 ? '#00E5A0' : '#ef4444';}),
              borderWidth: 1,
              borderRadius: 4,
              error: {show:true, symmetric:false, lower:fpErrLow, upper:fpErrHigh}
            }]
          },
          plugins: [{
            id: 'refLine',
            afterDraw: function(chart){
              var yAxis = chart.scales.x;
              var xScale = chart.scales.y;
              if(!yAxis || !xScale) return;
              var ctx2 = chart.ctx;
              var xPos = xScale.getPixelForValue(1);
              ctx2.save();
              ctx2.beginPath();
              ctx2.moveTo(xPos, chart.chartArea.top);
              ctx2.lineTo(xPos, chart.chartArea.bottom);
              ctx2.strokeStyle = 'rgba(255,255,255,0.3)';
              ctx2.lineWidth = 1;
              ctx2.setLineDash([4,4]);
              ctx2.stroke();
              ctx2.restore();
            }
          },{
            id:'ciWhiskers',
            afterDraw:function(chart){
              var meta=chart.getDatasetMeta(0);
              var ctx2=chart.ctx;
              ctx2.save();
              meta.data.forEach(function(bar,i){
                var low=chart.scales.y.getPixelForValue(fp[i].ciLow);
                var high=chart.scales.y.getPixelForValue(fp[i].ciHigh);
                var cy=bar.y;
                ctx2.beginPath();
                ctx2.moveTo(low,cy);
                ctx2.lineTo(high,cy);
                ctx2.strokeStyle='rgba(226,232,240,0.5)';
                ctx2.lineWidth=1.5;
                ctx2.stroke();
                /* caps */
                ctx2.beginPath();ctx2.moveTo(low,cy-4);ctx2.lineTo(low,cy+4);ctx2.stroke();
                ctx2.beginPath();ctx2.moveTo(high,cy-4);ctx2.lineTo(high,cy+4);ctx2.stroke();
              });
              ctx2.restore();
            }
          }],
          options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){var f=fp[ctx.dataIndex];return 'HR: '+f.hr+' ('+f.ciLow+'–'+f.ciHigh+'), p='+f.pValue;}}}},scales:{y:{min:0.3,max:1.2,title:{display:true,text:'Hazard Ratio',color:'rgba(226,232,240,0.4)',font:{size:11}},ticks:{color:'rgba(226,232,240,0.4)',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}},x:{ticks:{color:'rgba(226,232,240,0.5)',font:{size:10}},grid:{display:false}}}}
        });
      }
    } catch(e){ console.warn('Forest plot error:', e); }

    /* ===== SUBGROUP TABLE ===== */
    try {
      var sgTb = document.getElementById('subgroup-table-body');
      if(sgTb)(S.forestPlot||[]).forEach(function(f){
        var favorBadge = f.hr < 1 ? '<span class="badge badge-pass">Treatment</span>' : '<span class="badge badge-fail">Control</span>';
        sgTb.innerHTML += '<tr><td class="font-semibold">'+f.subgroup+'</td><td class="font-mono">'+f.n+'</td><td class="font-mono font-semibold" style="color:#00E5A0;">'+f.hr+'</td><td class="font-mono text-xs opacity-60">'+f.ciLow+' – '+f.ciHigh+'</td><td class="font-mono text-xs">'+f.pValue+'</td><td>'+favorBadge+'</td></tr>';
      });
    } catch(e){ console.warn('Subgroup table error:', e); }

    /* ===== ENROLLMENT VELOCITY CHART ===== */
    try {
      var velData = S.enrollmentVelocity || {};
      var velCtx = document.getElementById('velocity-chart');
      if(velCtx) new Chart(velCtx, {
        type: 'bar',
        data: {
          labels: velData.siteLabels || [],
          datasets: [
            {label:'Actual',data:velData.actual||[],backgroundColor:'rgba(0,229,160,0.6)',borderColor:'#00E5A0',borderWidth:1,borderRadius:6},
            {label:'Target',data:velData.target||[],backgroundColor:'rgba(255,255,255,0.08)',borderColor:'rgba(255,255,255,0.15)',borderWidth:1,borderRadius:6}
          ]
        },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'rgba(226,232,240,0.6)',font:{size:11},usePointStyle:true,padding:20}}},scales:{x:{ticks:{color:'rgba(226,232,240,0.4)',font:{size:10}},grid:{display:false}},y:{title:{display:true,text:'Subjects Enrolled',color:'rgba(226,232,240,0.4)',font:{size:11}},ticks:{color:'rgba(226,232,240,0.4)',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}}}}
      });
    } catch(e){ console.warn('Velocity chart error:', e); }

    /* ===== SITE PERFORMANCE TABLE ===== */
    try {
      var siteTb = document.getElementById('site-table-body');
      if(siteTb)(S.sites||[]).forEach(function(s){
        var gcpBadge = s.gcpStatus === 'Compliant' ? 'badge-pass' : 'badge-pending';
        var pctColor = s.pctComplete >= 90 ? '#00E5A0' : s.pctComplete >= 70 ? '#F59E0B' : '#ef4444';
        siteTb.innerHTML += '<tr><td class="font-mono font-semibold" style="color:#00B4D8;">'+s.siteId+'</td><td>'+s.country+'</td><td class="font-mono">'+s.enrolled+'</td><td class="font-mono opacity-60">'+s.target+'</td><td class="font-mono" style="color:'+pctColor+';">'+s.pctComplete+'%</td><td class="font-mono text-xs opacity-60">'+s.lastVisit+'</td><td><span class="badge '+gcpBadge+'">'+s.gcpStatus+'</span></td></tr>';
      });
    } catch(e){ console.warn('Site table error:', e); }

    /* ===== PROTOCOL DEVIATIONS TABLE ===== */
    try {
      var devTb = document.getElementById('deviation-table-body');
      if(devTb)(S.protocolDeviations||[]).forEach(function(d){
        var sevBadge = d.severity === 'Major' ? 'badge-major' : 'badge-minor';
        var statusBadge = d.status === 'Open' ? 'badge-pending' : 'badge-resolved';
        devTb.innerHTML += '<tr><td class="font-mono font-semibold">'+d.devId+'</td><td class="font-mono" style="color:#00B4D8;">'+d.site+'</td><td>'+d.category+'</td><td><span class="badge '+sevBadge+'">'+d.severity+'</span></td><td class="font-mono text-xs opacity-60">'+d.date+'</td><td><span class="badge '+statusBadge+'">'+d.status+'</span></td><td class="text-xs opacity-60">'+d.description+'</td></tr>';
      });
    } catch(e){ console.warn('Deviation table error:', e); }

    /* ===== AUDIT LOG (21 CFR Part 11) ===== */
    try {
      var auditC = document.getElementById('audit-log-container');
      var typeColors = {signature:'#7B61FF',approval:'#00E5A0',data:'#00B4D8',system:'#94a3b8',audit:'#00E5A0',safety:'#ef4444',monitoring:'#F59E0B',regulatory:'#00B4D8',statistical:'#7B61FF'};
      if(auditC)(S.auditLog||[]).forEach(function(a){
        var dot = typeColors[a.type] || '#94a3b8';
        auditC.innerHTML += '<div class="audit-row"><div class="audit-dot" style="background:'+dot+';"></div><div style="flex:1;"><div class="text-sm">'+a.action+'</div>'+(a.sig?'<div class="text-xs opacity-60 mt-1 font-mono" style="color:#7B61FF;">'+a.sig+'</div>':'')+'<div class="text-xs opacity-40 mt-1">'+a.user+' · '+a.ts+'</div></div></div>';
      });
    } catch(e){ console.warn('Audit log error:', e); }

    /* ===== GCP COMPLIANCE TABLE ===== */
    try {
      var gcpTb = document.getElementById('gcp-table-body');
      if(gcpTb)(S.gcpDomains||[]).forEach(function(g){
        var pct = Math.round((g.score / g.maxScore) * 100);
        var statusBadge = g.status === 'Pass' ? 'badge-pass' : 'badge-pending';
        gcpTb.innerHTML += '<tr><td class="font-semibold">'+g.domain+'</td><td class="font-mono" style="color:#00E5A0;">'+g.score+'</td><td class="font-mono opacity-60">'+g.maxScore+'</td><td class="font-mono">'+pct+'%</td><td class="font-mono">'+(g.findings||0)+'</td><td><span class="badge '+statusBadge+'">'+g.status+'</span></td></tr>';
      });
    } catch(e){ console.warn('GCP table error:', e); }

    /* ===== ISO 27001 KPI CARDS ===== */
    try {
      var iso = S.isoControls || {};
      document.getElementById('iso-score').textContent = (iso.securityScore || 0) + '%';
      document.getElementById('iso-nonconf').textContent = iso.nonConformities || 0;
      document.getElementById('iso-controls').textContent = (iso.implementedControls || 0) + '/' + (iso.totalControls || 0);
    } catch(e){ console.warn('ISO KPI error:', e); }

    /* ===== ISO CONTROLS PROGRESS BARS ===== */
    try {
      var isoC = document.getElementById('iso-controls-container');
      if(isoC)(S.isoControls.categories||[]).forEach(function(cat){
        var pct = Math.round((cat.implemented / cat.controls) * 100);
        var barColor = cat.status === 'Pass' ? '#00E5A0' : '#F59E0B';
        isoC.innerHTML += '<div style="display:flex;align-items:center;gap:12px;"><div class="text-xs opacity-60" style="width:200px;flex-shrink:0;">'+cat.name+'</div><div class="progress-bar" style="flex:1;"><div class="progress-fill" style="width:'+pct+'%;background:'+barColor+';"></div></div><div class="text-xs font-mono opacity-60" style="width:48px;text-align:right;">'+cat.implemented+'/'+cat.controls+'</div></div>';
      });
    } catch(e){ console.warn('ISO controls error:', e); }

    /* ===== ISO DETAIL TABLE ===== */
    try {
      var isoTb = document.getElementById('iso-table-body');
      if(isoTb)(S.isoControls.categories||[]).forEach(function(cat){
        var pct = Math.round((cat.implemented / cat.controls) * 100);
        var statusBadge = cat.status === 'Pass' ? 'badge-pass' : 'badge-pending';
        isoTb.innerHTML += '<tr><td class="text-sm font-medium">'+cat.name+'</td><td class="font-mono">'+cat.controls+'</td><td class="font-mono" style="color:#00E5A0;">'+cat.implemented+'</td><td class="font-mono">'+pct+'%</td><td><span class="badge '+statusBadge+'">'+cat.status+'</span></td></tr>';
      });
    } catch(e){ console.warn('ISO table error:', e); }
  });
  </script>
</body>
</html>$$,
    updated_at = now()
WHERE skill_name = 'pharma-phase3-dashboard';

NOTIFY pgrst, 'reload schema';
