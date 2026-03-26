-- Append Chart.js loading requirements to dashboard-related skills.
-- This ensures the LLM receives Chart.js guidance even when department
-- skills are the primary context (via context-injector).

UPDATE skill_registry
SET content = content || E'\n\nCHART.JS LOADING (MANDATORY):\n1. Include Chart.js CDN in <head>: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n2. ALL chart initialization code MUST be inside an IIFE placed immediately after its <canvas>: (function(){ new Chart(...); })();\n3. Every <canvas> element must have a unique id attribute and explicit height: <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>\n4. Chart initialization must reference canvas by getElementById, never querySelector.\n5. If Chart.js fails to load, show a text fallback with the data in a table.\n6. NEVER use import statements for Chart.js — use the global Chart object from CDN.\n7. NEVER use type:"horizontalBar" — use type:"bar" with options.indexAxis:"y" instead.'
WHERE (content ILIKE '%chart%'
   OR content ILIKE '%dashboard%'
   OR content ILIKE '%KPI%'
   OR content ILIKE '%DASHBOARD INTERACTIVITY%')
  AND content NOT ILIKE '%CHART.JS LOADING (MANDATORY)%';
