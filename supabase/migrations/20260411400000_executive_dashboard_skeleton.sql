-- Migration: Populate html_skeleton for executive-command-dashboard.
-- This enables deterministic template execution — zero LLM calls on match.

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
    .loading-skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--border) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  </style>
</head>
<body>
  <div class="grid grid-cols-[256px_1fr] min-h-screen">
    <!-- Sidebar -->
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

    <!-- Main content -->
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
        <!-- KPI Cards -->
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
        <!-- Charts Row -->
        <div class="grid grid-cols-2 gap-6">
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 class="font-display text-lg font-semibold mb-4">Revenue Trend</h3>
            <canvas id="chart-revenue" height="200" style="height:200px !important; max-height:200px;"></canvas>
            <script>
            (async function(){
              var primary=getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
              var rows=await vibeLoadData('gtm_metrics',{team_id:window.__VIBE_TEAM_ID__});
              var labels=rows.map(function(r){return r.month||r.period||r.date||''});
              var values=rows.map(function(r){return r.revenue||r.arr||r.value||0});
              if(!rows.length){document.getElementById('chart-revenue').parentElement.innerHTML+='<div style="text-align:center;padding:40px;opacity:0.5">No data yet. Connect your data source to populate this dashboard.</div>';return}
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
              var segments={};rows.forEach(function(r){var s=r.segment||r.category||'Other';segments[s]=(segments[s]||0)+(r.revenue||r.value||0)});
              var labels=Object.keys(segments);var values=Object.values(segments);
              if(!labels.length){document.getElementById('chart-segments').parentElement.innerHTML+='<div style="text-align:center;padding:40px;opacity:0.5">No data yet. Connect your data source.</div>';return}
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
            var depts={};rows.forEach(function(r){var d=r.department||r.team||'General';if(!depts[d])depts[d]={target:0,actual:0};depts[d].target+=(r.target||r.quota||0);depts[d].actual+=(r.actual||r.revenue||r.value||0)});
            var labels=Object.keys(depts);var targets=labels.map(function(d){return depts[d].target});var actuals=labels.map(function(d){return depts[d].actual});
            if(!labels.length){document.getElementById('chart-depts').parentElement.innerHTML+='<div style="text-align:center;padding:40px;opacity:0.5">No department data yet.</div>';return}
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
            var labels=rows.map(function(r){return r.category||r.initiative||r.name||''});
            var values=rows.map(function(r){return r.progress||r.completion||r.amount||0});
            if(!rows.length){document.getElementById('chart-okrs').parentElement.innerHTML+='<div style="text-align:center;padding:40px;opacity:0.5">No initiative data yet.</div>';return}
            new Chart(document.getElementById('chart-okrs'),{
              type:'bar',
              data:{labels:labels,datasets:[{label:'Progress %',data:values,backgroundColor:primary}]},
              options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{max:100,grid:{color:'rgba(148,163,184,0.1)'}},y:{grid:{display:false}}}}
            });
          })()},100);
          </script>
        </div>
        <!-- Initiatives Table -->
        <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="text-left">
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60 sticky top-0 bg-[var(--surface)]">Initiative</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Owner</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Department</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Progress</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Status</th>
              <th class="pb-3 text-xs uppercase tracking-wider opacity-60">Target Date</th>
            </tr></thead>
            <tbody id="initiatives-table-body">
              <tr><td colspan="6" class="py-8 text-center opacity-50" data-empty-state>No data yet. Connect your data source to populate this dashboard.</td></tr>
            </tbody>
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
            var depts={};rows.forEach(function(r){var d=r.department||r.team||'General';if(!depts[d])depts[d]=[];depts[d].push(r.satisfaction||r.enps||r.score||0)});
            var labels=Object.keys(depts);var avgs=labels.map(function(d){var arr=depts[d];return arr.reduce(function(a,b){return a+b},0)/arr.length});
            if(!labels.length){document.getElementById('chart-health').parentElement.innerHTML+='<div style="text-align:center;padding:40px;opacity:0.5">No team health data yet.</div>';return}
            new Chart(document.getElementById('chart-health'),{
              type:'bar',
              data:{labels:labels,datasets:[{label:'Satisfaction',data:avgs,backgroundColor:labels.map(function(_,i){return i%2===0?primary:'#00B4D8'})}]},
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
    if(!url||!key){console.error('[vibeLoadData] missing URL or key');return[];}
    var token=key;
    try{var ref=url.split('//')[1].split('.')[0];var s=JSON.parse(localStorage.getItem('sb-'+ref+'-auth-token')||'{}');if(s.access_token)token=s.access_token;}catch(e){}
    var ep=url+'/rest/v1/'+table+'?select=*';
    Object.entries(filters).forEach(function(kv){if(kv[1])ep+='&'+kv[0]+'=eq.'+kv[1]});
    try{var r=await fetch(ep,{headers:{'apikey':key,'Authorization':'Bearer '+token}});if(!r.ok){console.error('[vibeLoadData]',r.status);return[];}return await r.json();}
    catch(e){console.error('[vibeLoadData]',e);return[];}
  }
  </script>

  <!-- KPI population -->
  <script>
  (async function(){
    var rows=await vibeLoadData('gtm_metrics',{team_id:window.__VIBE_TEAM_ID__});
    if(!rows.length)return;
    var totalRevenue=rows.reduce(function(s,r){return s+(r.revenue||r.arr||0)},0);
    var el=document.getElementById('kpi-revenue');if(el)el.textContent='$'+totalRevenue.toLocaleString();
    var growthVals=rows.filter(function(r){return r.growth_rate!=null}).map(function(r){return r.growth_rate});
    var avgGrowth=growthVals.length?growthVals.reduce(function(a,b){return a+b},0)/growthVals.length:0;
    var gEl=document.getElementById('kpi-growth');if(gEl)gEl.textContent=avgGrowth.toFixed(1)+'%';
    var burnVals=rows.filter(function(r){return r.burn_rate!=null}).map(function(r){return r.burn_rate});
    var avgBurn=burnVals.length?burnVals.reduce(function(a,b){return a+b},0)/burnVals.length:0;
    var bEl=document.getElementById('kpi-burn');if(bEl)bEl.textContent='$'+Math.round(avgBurn).toLocaleString();
    var runway=avgBurn>0?Math.round(totalRevenue/avgBurn):0;
    var rEl=document.getElementById('kpi-runway');if(rEl)rEl.textContent=runway+' mo';
    if(runway<12){rEl.classList.add('kpi-trend-down')}
  })();
  </script>
</body>
</html>$$
WHERE skill_name = 'executive-command-dashboard' AND plugin_name = 'executive';

-- Also update executive-dashboard (from our migration) if it exists
UPDATE skill_registry
SET html_skeleton = (SELECT html_skeleton FROM skill_registry WHERE skill_name = 'executive-command-dashboard' AND plugin_name = 'executive' LIMIT 1)
WHERE skill_name = 'executive-dashboard' AND plugin_name = 'executive' AND html_skeleton IS NULL;

NOTIFY pgrst, 'reload schema';
