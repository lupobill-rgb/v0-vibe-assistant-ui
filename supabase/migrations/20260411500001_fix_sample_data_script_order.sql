-- Fix: Move sample data to <head> so it loads before chart scripts execute.
-- When vibeLoadData returns empty (no data source connected), charts and KPIs
-- populate from realistic hardcoded sample data. Zero LLM calls.

UPDATE skill_registry
SET html_skeleton = $$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{BRAND_COMPANY}} — Executive Dashboard</title>
  <meta name="description" content="Executive summary dashboard for {{BRAND_COMPANY}} — KPIs, revenue, department scorecards, and strategic initiatives.">
  <script>window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";</script>
  <script>window.__VIBE_TEAM_ID__="__TEAM_ID__";</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui'],display:['Syne','system-ui']}}}}</script>
  <style>
    :root{--bg:{{BRAND_BG}};--text:{{BRAND_TEXT}};--primary:{{BRAND_PRIMARY}};--surface:{{BRAND_SURFACE}};--border:{{BRAND_BORDER}}}
    body{background:var(--bg);color:var(--text);margin:0;font-family:'Inter',system-ui,sans-serif}
    .nav-item.active{background:color-mix(in srgb,var(--primary) 10%,transparent);color:var(--primary);border-left:2px solid var(--primary)}
    .kpi-trend-up{color:#10b981}.kpi-trend-down{color:#ef4444}
    .status-on-track{background:#10b98120;color:#10b981}.status-at-risk{background:#f59e0b20;color:#f59e0b}.status-behind{background:#ef444420;color:#ef4444}.status-complete{background:#3b82f620;color:#3b82f6}
    .progress-bar{background:var(--border);border-radius:9999px;height:8px;overflow:hidden}
    .progress-fill{height:100%;border-radius:9999px;transition:width 0.6s ease}
  </style>
  <!-- Sample data loaded in head so it's available before chart scripts execute -->
  <script>
  window.__VIBE_SAMPLE__ = {
    metrics: [
      {month:'Jan',revenue:980000,arr:980000,growth_rate:8.2,burn_rate:420000,segment:'Enterprise',category:'Enterprise'},
      {month:'Feb',revenue:1020000,arr:1020000,growth_rate:9.1,burn_rate:435000,segment:'Enterprise',category:'Enterprise'},
      {month:'Mar',revenue:1100000,arr:1100000,growth_rate:10.5,burn_rate:440000,segment:'Mid-Market',category:'Mid-Market'},
      {month:'Apr',revenue:1080000,arr:1080000,growth_rate:9.8,burn_rate:450000,segment:'Mid-Market',category:'Mid-Market'},
      {month:'May',revenue:1150000,arr:1150000,growth_rate:11.2,burn_rate:455000,segment:'Enterprise',category:'Enterprise'},
      {month:'Jun',revenue:1200000,arr:1200000,growth_rate:12.0,burn_rate:460000,segment:'SMB',category:'SMB'},
      {month:'Jul',revenue:1180000,arr:1180000,growth_rate:11.5,burn_rate:465000,segment:'SMB',category:'SMB'},
      {month:'Aug',revenue:1250000,arr:1250000,growth_rate:13.1,burn_rate:470000,segment:'Enterprise',category:'Enterprise'},
      {month:'Sep',revenue:1320000,arr:1320000,growth_rate:14.2,burn_rate:475000,segment:'Mid-Market',category:'Mid-Market'},
      {month:'Oct',revenue:1380000,arr:1380000,growth_rate:15.0,burn_rate:480000,segment:'Enterprise',category:'Enterprise'},
      {month:'Nov',revenue:1420000,arr:1420000,growth_rate:15.8,burn_rate:485000,segment:'Mid-Market',category:'Mid-Market'},
      {month:'Dec',revenue:1500000,arr:1500000,growth_rate:16.5,burn_rate:490000,segment:'SMB',category:'SMB'}
    ],
    departments: [
      {department:'Sales',target:2400000,actual:2650000,satisfaction:82},
      {department:'Marketing',target:800000,actual:720000,satisfaction:78},
      {department:'Product',target:1200000,actual:1150000,satisfaction:85},
      {department:'Engineering',target:900000,actual:880000,satisfaction:80},
      {department:'Finance',target:500000,actual:510000,satisfaction:76},
      {department:'HR',target:300000,actual:290000,satisfaction:88}
    ],
    initiatives: [
      {name:'Series B Fundraise',initiative:'Series B Fundraise',owner:'CEO',department:'Executive',progress:85,status:'on-track',target_date:'2026-06-30'},
      {name:'Enterprise Sales Motion',initiative:'Enterprise Sales Motion',owner:'VP Sales',department:'Sales',progress:62,status:'on-track',target_date:'2026-09-30'},
      {name:'SOC 2 Certification',initiative:'SOC 2 Certification',owner:'CTO',department:'Engineering',progress:45,status:'at-risk',target_date:'2026-08-15'},
      {name:'APAC Market Entry',initiative:'APAC Market Entry',owner:'VP Growth',department:'Marketing',progress:30,status:'on-track',target_date:'2026-12-31'},
      {name:'Product-Led Growth',initiative:'Product-Led Growth',owner:'VP Product',department:'Product',progress:55,status:'on-track',target_date:'2026-07-31'},
      {name:'Reduce Churn to <2%',initiative:'Reduce Churn to <2%',owner:'VP CS',department:'Support',progress:70,status:'at-risk',target_date:'2026-06-30'},
      {name:'Hire 25 Engineers',initiative:'Hire 25 Engineers',owner:'VP Eng',department:'Engineering',progress:48,status:'behind',target_date:'2026-09-30'},
      {name:'Rebrand Launch',initiative:'Rebrand Launch',owner:'CMO',department:'Marketing',progress:90,status:'on-track',target_date:'2026-05-15'}
    ],
    health: [
      {department:'Sales',satisfaction:82,enps:82,score:82},
      {department:'Marketing',satisfaction:78,enps:78,score:78},
      {department:'Product',satisfaction:85,enps:85,score:85},
      {department:'Engineering',satisfaction:80,enps:80,score:80},
      {department:'Finance',satisfaction:76,enps:76,score:76},
      {department:'HR',satisfaction:88,enps:88,score:88},
      {department:'Support',satisfaction:74,enps:74,score:74}
    ]
  };
  </script>
</head>
<body>
  <div class="grid grid-cols-[256px_1fr] min-h-screen">
    <aside class="bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
      <div class="p-6 border-b border-[var(--border)]">
        <h1 class="font-display text-lg font-bold text-[var(--primary)]">{{BRAND_COMPANY}}</h1>
        <p class="text-xs opacity-60 mt-1">Executive Dashboard</p>
      </div>
      <nav class="flex-1 p-4 space-y-1">
        <a href="#" class="nav-item active flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all" data-section="view-overview" onclick="switchView(event,'view-overview')">📊 Overview</a>
        <a href="#" class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium opacity-70 hover:opacity-100 transition-all" data-section="view-departments" onclick="switchView(event,'view-departments')">🏢 Departments</a>
        <a href="#" class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium opacity-70 hover:opacity-100 transition-all" data-section="view-initiatives" onclick="switchView(event,'view-initiatives')">🎯 Initiatives</a>
        <a href="#" class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium opacity-70 hover:opacity-100 transition-all" data-section="view-health" onclick="switchView(event,'view-health')">💚 Team Health</a>
      </nav>
      <div class="p-4 border-t border-[var(--border)]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--bg)] text-xs font-bold">E</div>
          <div><div class="text-sm font-medium">Executive</div><div class="text-xs opacity-60">{{BRAND_TEAM}}</div></div>
        </div>
      </div>
    </aside>
    <main class="overflow-y-auto">
      <nav style="position:sticky;top:0;z-index:50;background:var(--surface);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 40px;display:flex;align-items:center;justify-content:space-between;height:64px;font-family:'Inter',sans-serif;">
        <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem;color:var(--primary);">{{BRAND_COMPANY}}</span>
        <div style="display:flex;gap:28px;">
          <a href="#" data-section="view-overview" onclick="switchView(event,'view-overview')" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Overview</a>
          <a href="#" data-section="view-departments" onclick="switchView(event,'view-departments')" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Departments</a>
          <a href="#" data-section="view-initiatives" onclick="switchView(event,'view-initiatives')" style="color:var(--text);opacity:0.7;text-decoration:none;font-size:0.95rem;font-weight:500;">Initiatives</a>
        </div>
        <a href="#" style="background:var(--primary);color:var(--bg);padding:9px 22px;border-radius:8px;font-weight:600;font-size:0.9rem;text-decoration:none;">Export</a>
      </nav>

      <!-- SECTION: Overview -->
      <section id="view-overview" class="p-8 space-y-8">
        <div class="grid grid-cols-4 gap-6">
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[120px]" data-kpi="revenue">
            <div class="text-sm opacity-60 mb-1">Revenue (ARR)</div>
            <div class="font-display text-3xl font-bold" id="kpi-revenue">--</div>
            <span class="absolute top-4 right-4 text-sm kpi-trend-up" id="kpi-revenue-trend"></span>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[120px]" data-kpi="growth">
            <div class="text-sm opacity-60 mb-1">Growth Rate</div>
            <div class="font-display text-3xl font-bold" id="kpi-growth">--</div>
            <span class="absolute top-4 right-4 text-sm kpi-trend-up" id="kpi-growth-trend"></span>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[120px]" data-kpi="burn">
            <div class="text-sm opacity-60 mb-1">Burn Rate</div>
            <div class="font-display text-3xl font-bold" id="kpi-burn">--</div>
            <span class="absolute top-4 right-4 text-sm" id="kpi-burn-trend"></span>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden min-h-[120px]" data-kpi="runway">
            <div class="text-sm opacity-60 mb-1">Runway</div>
            <div class="font-display text-3xl font-bold" id="kpi-runway">--</div>
            <span class="absolute top-4 right-4 text-sm" id="kpi-runway-trend"></span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-6">
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 class="font-display text-lg font-semibold mb-4">Revenue Trend</h3>
            <canvas id="chart-revenue" height="200" style="height:200px !important; max-height:200px;"></canvas>
            <script>
            (async function(){
              var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
              var rows=await vibeLoadData('gtm_metrics',{team_id:window.__VIBE_TEAM_ID__});
              if(!rows.length) rows=window.__VIBE_SAMPLE__.metrics;
              var labels=rows.map(function(r){return r.month||r.period||''});
              var values=rows.map(function(r){return r.revenue||r.arr||0});
              new Chart(document.getElementById('chart-revenue'),{
                type:'line',
                data:{labels:labels,datasets:[{label:'Revenue',data:values,borderColor:primary,backgroundColor:primary+'20',fill:true,tension:0.3}]},
                options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(148,163,184,0.1)'}},x:{grid:{display:false}}}}
              });
            })();
            </script>
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 class="font-display text-lg font-semibold mb-4">Revenue by Segment</h3>
            <canvas id="chart-segments" height="200" style="height:200px !important; max-height:200px;"></canvas>
            <script>
            (async function(){
              var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
              var rows=await vibeLoadData('gtm_metrics',{team_id:window.__VIBE_TEAM_ID__});
              if(!rows.length) rows=window.__VIBE_SAMPLE__.metrics;
              var segments={};rows.forEach(function(r){var s=r.segment||r.category||'Other';segments[s]=(segments[s]||0)+(r.revenue||0)});
              var labels=Object.keys(segments);var values=Object.values(segments);
              new Chart(document.getElementById('chart-segments'),{
                type:'doughnut',
                data:{labels:labels,datasets:[{data:values,backgroundColor:[primary,'#00B4D8','#7B61FF','#10b981','#f59e0b','#ef4444']}]},
                options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}
              });
            })();
            </script>
          </div>
        </div>
      </section>

      <!-- SECTION: Departments -->
      <section id="view-departments" style="display:none" class="p-8 space-y-8">
        <h2 class="font-display text-2xl font-bold">Department Scorecards</h2>
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <canvas id="chart-depts" height="200" style="height:200px !important; max-height:200px;"></canvas>
          <script>
          setTimeout(function(){(async function(){
            var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
            var rows=await vibeLoadData('gtm_metrics',{team_id:window.__VIBE_TEAM_ID__});
            if(!rows.length) rows=window.__VIBE_SAMPLE__.departments;
            var labels=rows.map(function(r){return r.department||r.team||''});
            var targets=rows.map(function(r){return r.target||r.quota||0});
            var actuals=rows.map(function(r){return r.actual||r.revenue||0});
            new Chart(document.getElementById('chart-depts'),{
              type:'bar',
              data:{labels:labels,datasets:[{label:'Target',data:targets,backgroundColor:'rgba(148,163,184,0.3)'},{label:'Actual',data:actuals,backgroundColor:primary}]},
              options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{grid:{color:'rgba(148,163,184,0.1)'}},x:{grid:{display:false}}}}
            });
          })()},100);
          </script>
        </div>
      </section>

      <!-- SECTION: Initiatives -->
      <section id="view-initiatives" style="display:none" class="p-8 space-y-8">
        <h2 class="font-display text-2xl font-bold">Strategic Initiatives</h2>
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <canvas id="chart-okrs" height="200" style="height:200px !important; max-height:200px;"></canvas>
          <script>
          setTimeout(function(){(async function(){
            var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
            var rows=await vibeLoadData('budget_allocations',{team_id:window.__VIBE_TEAM_ID__});
            if(!rows.length) rows=window.__VIBE_SAMPLE__.initiatives;
            var labels=rows.map(function(r){return r.name||r.initiative||r.category||''});
            var values=rows.map(function(r){return r.progress||r.completion||0});
            new Chart(document.getElementById('chart-okrs'),{
              type:'bar',
              data:{labels:labels,datasets:[{label:'Progress %',data:values,backgroundColor:primary}]},
              options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{max:100,grid:{color:'rgba(148,163,184,0.1)'}},y:{grid:{display:false}}}}
            });
          })()},100);
          </script>
        </div>
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 overflow-x-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display text-lg font-semibold">Initiative Tracker</h3>
            <button onclick="exportCSV()" class="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--primary)] text-[var(--bg)] hover:opacity-90 transition">Export CSV</button>
          </div>
          <table class="w-full text-sm">
            <thead><tr class="text-left">
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60 sticky top-0 bg-[var(--surface)]">Initiative</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Owner</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Department</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Progress</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Status</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Target Date</th>
            </tr></thead>
            <tbody id="initiatives-table-body"></tbody>
          </table>
        </div>
      </section>

      <!-- SECTION: Team Health -->
      <section id="view-health" style="display:none" class="p-8 space-y-8">
        <h2 class="font-display text-2xl font-bold">Team Health</h2>
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <canvas id="chart-health" height="200" style="height:200px !important; max-height:200px;"></canvas>
          <script>
          setTimeout(function(){(async function(){
            var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
            var rows=await vibeLoadData('gtm_metrics',{team_id:window.__VIBE_TEAM_ID__});
            if(!rows.length) rows=window.__VIBE_SAMPLE__.health;
            var labels=rows.map(function(r){return r.department||r.team||''});
            var scores=rows.map(function(r){return r.satisfaction||r.enps||r.score||0});
            new Chart(document.getElementById('chart-health'),{
              type:'bar',
              data:{labels:labels,datasets:[{label:'Satisfaction',data:scores,backgroundColor:labels.map(function(_,i){return i%2===0?primary:'#00B4D8'})}]},
              options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,grid:{color:'rgba(148,163,184,0.1)'}},x:{grid:{display:false}}}}
            });
          })()},100);
          </script>
        </div>
      </section>
    </main>
  </div>

  <!-- switchView navigation -->
  <script>
  function switchView(evt,viewId){
    if(evt)evt.preventDefault();
    document.querySelectorAll('[id^="view-"]').forEach(function(s){s.style.display='none'});
    document.getElementById(viewId).style.display='block';
    document.querySelectorAll('.nav-item').forEach(function(n){
      n.classList.remove('active');
      if(n.dataset.section===viewId)n.classList.add('active');
    });
    var canvases=document.getElementById(viewId).querySelectorAll('canvas');
    canvases.forEach(function(c){var chart=Chart.getChart(c);if(chart)chart.resize()});
  }
  </script>

  <!-- vibeLoadData -->
  <script>
  async function vibeLoadData(table,filters){
    filters=filters||{};
    var url=window.__VIBE_SUPABASE_URL__;var key=window.__VIBE_SUPABASE_ANON_KEY__;
    if(!url||!key){return[];}
    var token=key;
    try{var ref=url.split('//')[1].split('.')[0];var s=JSON.parse(localStorage.getItem('sb-'+ref+'-auth-token')||'{}');if(s.access_token)token=s.access_token;}catch(e){}
    var ep=url+'/rest/v1/'+table+'?select=*';
    Object.entries(filters).forEach(function(kv){if(kv[1])ep+='&'+kv[0]+'=eq.'+kv[1]});
    try{var r=await fetch(ep,{headers:{'apikey':key,'Authorization':'Bearer '+token}});if(!r.ok){return[];}return await r.json();}
    catch(e){return[];}
  }
  </script>

  <!-- KPI + Table population -->
  <script>
  (async function(){
    var rows=await vibeLoadData('gtm_metrics',{team_id:window.__VIBE_TEAM_ID__});
    if(!rows.length) rows=window.__VIBE_SAMPLE__.metrics;
    var totalRevenue=rows.reduce(function(s,r){return s+(r.revenue||r.arr||0)},0);
    document.getElementById('kpi-revenue').textContent='$'+(totalRevenue/1000000).toFixed(1)+'M';
    document.getElementById('kpi-revenue-trend').textContent='▲ '+rows[rows.length-1].growth_rate.toFixed(1)+'%';
    var growthVals=rows.map(function(r){return r.growth_rate||0});
    var avgGrowth=growthVals.reduce(function(a,b){return a+b},0)/growthVals.length;
    document.getElementById('kpi-growth').textContent=avgGrowth.toFixed(1)+'%';
    document.getElementById('kpi-growth-trend').textContent='▲ MoM';
    var avgBurn=rows.reduce(function(s,r){return s+(r.burn_rate||0)},0)/rows.length;
    document.getElementById('kpi-burn').textContent='$'+(avgBurn/1000).toFixed(0)+'K';
    document.getElementById('kpi-burn-trend').textContent='monthly';
    var runway=avgBurn>0?Math.round((totalRevenue/12)/avgBurn*12):0;
    document.getElementById('kpi-runway').textContent=runway+' mo';
    if(runway<12){document.getElementById('kpi-runway').classList.add('kpi-trend-down');document.getElementById('kpi-runway-trend').textContent='▼ Low';}
    else{document.getElementById('kpi-runway-trend').textContent='▲ Healthy';}

    // Populate initiatives table
    var initRows=await vibeLoadData('budget_allocations',{team_id:window.__VIBE_TEAM_ID__});
    if(!initRows.length) initRows=window.__VIBE_SAMPLE__.initiatives;
    var tbody=document.getElementById('initiatives-table-body');
    tbody.innerHTML=initRows.map(function(r){
      var statusClass=r.status==='on-track'?'status-on-track':r.status==='at-risk'?'status-at-risk':r.status==='behind'?'status-behind':'status-complete';
      var pct=r.progress||0;
      return '<tr class="border-t border-[var(--border)] hover:bg-[var(--border)] transition">'
        +'<td class="py-3 pr-4 font-medium">'+(r.name||r.initiative||'')+'</td>'
        +'<td class="py-3 pr-4 opacity-80">'+(r.owner||'')+'</td>'
        +'<td class="py-3 pr-4 opacity-80">'+(r.department||'')+'</td>'
        +'<td class="py-3 pr-4"><div class="flex items-center gap-2"><div class="progress-bar w-24"><div class="progress-fill" style="width:'+pct+'%;background:var(--primary)"></div></div><span class="text-xs opacity-60">'+pct+'%</span></div></td>'
        +'<td class="py-3 pr-4"><span class="rounded-full px-3 py-1 text-xs font-medium '+statusClass+'">'+(r.status||'').replace('-',' ')+'</span></td>'
        +'<td class="py-3 opacity-60 text-xs">'+(r.target_date||'')+'</td>'
        +'</tr>';
    }).join('');
  })();
  </script>

  <!-- CSV Export -->
  <script>
  function exportCSV(){
    var data=window.__VIBE_SAMPLE__.initiatives;
    var headers=['Initiative','Owner','Department','Progress','Status','Target Date'];
    var rows=[headers.join(',')].concat(data.map(function(r){
      return [r.name,r.owner,r.department,r.progress,r.status,r.target_date].join(',');
    }));
    var csv=rows.join('\n');
    var blob=new Blob([csv],{type:'text/csv'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download='executive-dashboard-export.csv';a.click();
  }
  </script>
</body>
</html>$$
WHERE skill_name IN ('executive-command-dashboard', 'executive-dashboard');

NOTIFY pgrst, 'reload schema';
