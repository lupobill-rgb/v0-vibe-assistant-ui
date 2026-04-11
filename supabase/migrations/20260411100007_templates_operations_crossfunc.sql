-- Migration: Seed 5 golden templates into skill_registry.
-- Operations: Inventory Management, Incident Tracker.
-- Cross-Functional: Project Tracker, Customer 360, Revenue Operations.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Inventory Management Dashboard (operations plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'operations',
  'inventory-management',
  'operations',
  'Build an interactive inventory management dashboard with total SKUs, inventory value, stockout rate, avg turnover days, stock levels by category, and warehouse utilization. Use for inventory tracking, stock management, SKU analysis, warehouse monitoring, turnover optimization, reorder planning, supply chain visibility, and stockout prevention.',
  $$---
name: inventory-management
description: Build an interactive inventory management dashboard with total SKUs, inventory value, stockout rate, avg turnover days, stock levels by category, and warehouse utilization. Use for inventory tracking, stock management, SKU analysis, warehouse monitoring, turnover optimization, reorder planning, supply chain visibility, and stockout prevention.
argument-hint: "<warehouse, product line, or inventory scope>"
---

# /inventory-management - Inventory Management Dashboard

Build a self-contained interactive HTML dashboard for inventory management — total SKU tracking, inventory valuation, stockout risk analysis, turnover monitoring, and warehouse utilization.

## Usage

```
/inventory-management <description of warehouse or product catalog>
```

## Workflow

### 1. Understand the Inventory Context

Determine:
- **Catalog structure**: Categories, subcategories, SKU hierarchy
- **Warehouse model**: Single warehouse, multi-warehouse, zone-based
- **Metrics tracked**: On-hand quantity, reorder point, safety stock, lead time
- **Valuation method**: FIFO, LIFO, weighted average cost
- **Turnover targets**: Industry-specific ideal turnover days
- **Alert thresholds**: Stockout risk, overstock thresholds, reorder triggers

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify SKU columns, quantities, categories, supplier info, and cost data.

**If working from description:** Generate a realistic dataset with 50-100 SKUs across 5-8 categories, varied stock levels, and supplier assignments. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Inventory Management Dashboard       [Filters]       |
+------------+------------+------------+---------------+
| Total      | Inventory  | Stockout   | Avg Turnover  |
| SKUs       | Value      | Rate %     | Days          |
+------------------------------------------------------+
| Stock Levels by Category (bar)                       |
+------------------------+-----------------------------+
| Turnover Trend         | Stockout Risk               |
| (line)                 | (doughnut)                  |
+------------------------+-----------------------------+
| Warehouse Utilization (bar)                          |
+------------------------------------------------------+
| Inventory Detail Table (sortable)                    |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, stock levels by category bar chart, headline stockout alerts.

**Stock Levels** — Bar chart of on-hand quantities per category, reorder point overlay, safety stock comparison.

**Turnover** — Line chart of inventory turnover trend over time, category-level turnover comparison, slow-moving SKU identification.

**Alerts** — Doughnut of stockout risk distribution (Critical, Warning, Healthy), overstock alerts, reorder recommendations.

### 5. KPI Calculations

- **Total SKUs**: Count of distinct active SKU codes in the catalog
- **Inventory Value**: Sum of (on-hand quantity x unit cost) across all SKUs
- **Stockout Rate %**: (SKUs with zero on-hand / Total SKUs) x 100
- **Avg Turnover Days**: Mean of (365 / (COGS / Average Inventory Value)) across categories

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Stock levels by category — stacked or grouped showing on-hand vs reorder point |
| Line | Turnover trend — monthly turnover rate over 6-12 months |
| Doughnut | Stockout risk distribution — Critical (red), Warning (amber), Healthy (green) |
| Bar | Warehouse utilization — capacity used vs available per warehouse/zone |

### 7. Inventory Detail Table

| SKU | Product | Category | On Hand | Reorder Point | Value | Status | Supplier |
|-----|---------|----------|---------|---------------|-------|--------|----------|

Sortable by any column. Status values: In Stock, Low Stock, Out of Stock, Overstock. Color-code status: green (In Stock), yellow (Low Stock), red (Out of Stock), blue (Overstock).

### 8. Filters

- Category dropdown
- Status multi-select (In Stock, Low Stock, Out of Stock, Overstock)
- Warehouse / zone dropdown
- Supplier dropdown
- Value range slider

All filters update every chart, KPI, and table simultaneously.

CHART.JS LOADING (MANDATORY):
1. Include Chart.js CDN in <head>: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
2. ALL chart initialization code MUST be inside an IIFE placed immediately after its <canvas>: (function(){ new Chart(...); })();
3. Every <canvas> element must have a unique id attribute and explicit height: <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>
4. Chart initialization must reference canvas by getElementById, never querySelector.
5. If Chart.js fails to load, show a text fallback with the data in a table.
6. NEVER use import statements for Chart.js — use the global Chart object from CDN.
7. NEVER use type:"horizontalBar" — use type:"bar" with options.indexAxis:"y" instead.$$,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM skill_registry
  WHERE plugin_name = 'operations' AND skill_name = 'inventory-management'
);

-- ============================================================================
-- 2. Incident Tracker Dashboard (operations plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'operations',
  'incident-tracker',
  'operations',
  'Build an interactive incident and issue tracking dashboard with open incidents, MTTR, SLA breach count, weekly incident volume, severity distribution, and resolution time analysis. Use for incident management, issue tracking, outage monitoring, MTTR analysis, severity triage, resolution tracking, escalation management, and post-mortem reviews.',
  $$---
name: incident-tracker
description: Build an interactive incident and issue tracking dashboard with open incidents, MTTR, SLA breach count, weekly incident volume, severity distribution, and resolution time analysis. Use for incident management, issue tracking, outage monitoring, MTTR analysis, severity triage, resolution tracking, escalation management, and post-mortem reviews.
argument-hint: "<service, team, or incident scope>"
---

# /incident-tracker - Incident / Issue Tracking Dashboard

Build a self-contained interactive HTML dashboard for incident and issue tracking — open incident monitoring, mean-time-to-resolve analysis, SLA breach tracking, severity distribution, and resolution time trends.

## Usage

```
/incident-tracker <description of service or team scope>
```

## Workflow

### 1. Understand the Incident Context

Determine:
- **Severity taxonomy**: Critical (P1), High (P2), Medium (P3), Low (P4)
- **SLA targets**: P1 < 1hr, P2 < 4hr, P3 < 24hr, P4 < 72hr (typical)
- **Category model**: Infrastructure, Application, Security, Network, Database, Third-Party
- **Escalation path**: L1 -> L2 -> L3 -> Management
- **Resolution tracking**: Time to acknowledge, time to mitigate, time to resolve
- **Post-mortem cadence**: Required for P1/P2, optional for P3/P4

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify incident ID, severity, category, timestamps, assignee, and resolution data.

**If working from description:** Generate a realistic dataset with 40-80 incidents over 90 days, varied severities, categories, and resolution times. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Incident Tracker Dashboard           [Filters]       |
+------------+------------+------------+---------------+
| Open       | MTTR       | SLA        | Incidents     |
| Incidents  | (hours)    | Breaches   | This Week     |
+------------------------------------------------------+
| Incident Trend (line)                                |
+------------------------+-----------------------------+
| Severity Distribution  | MTTR by Category            |
| (doughnut)             | (bar)                       |
+------------------------+-----------------------------+
| Resolution Time Trend (line)                         |
+------------------------------------------------------+
| Incident Detail Table (sortable)                     |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, incident trend line chart, headline SLA breach count.

**By Severity** — Doughnut of severity distribution, incident counts per severity level, SLA compliance per severity.

**Resolution** — MTTR by category bar chart, resolution time trend line, top offending categories.

**SLA** — SLA breach tracking, compliance percentage, breach trend over time, at-risk incidents.

### 5. KPI Calculations

- **Open Incidents**: Count of incidents with status not in (Resolved, Closed)
- **MTTR (hours)**: Mean of (resolved_at - created_at) for all resolved incidents in the period
- **SLA Breach Count**: Count of incidents where resolution time exceeded SLA target for their severity
- **Incidents This Week**: Count of incidents created in the current calendar week

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line | Incident trend — daily/weekly incident count over 90 days, color-coded by severity |
| Doughnut | Severity distribution — P1 (red), P2 (orange), P3 (yellow), P4 (blue) segments |
| Bar | MTTR by category — average resolution hours per incident category |
| Line | Resolution time trend — rolling average MTTR over time, SLA target reference line |

### 7. Incident Detail Table

| ID | Title | Severity | Category | Status | Reporter | Assigned | Created | Resolved |
|----|-------|----------|----------|--------|----------|----------|---------|----------|

Sortable by any column. Status values: Open, Investigating, Mitigating, Resolved, Closed. Color-code severity: P1 (red), P2 (orange), P3 (yellow), P4 (blue). Highlight SLA-breached rows.

### 8. Filters

- Severity multi-select (P1, P2, P3, P4)
- Category dropdown
- Status multi-select (Open, Investigating, Mitigating, Resolved, Closed)
- Assignee dropdown
- Date range pickers
- SLA toggle (Breached only / All)

All filters update every chart, KPI, and table simultaneously.

CHART.JS LOADING (MANDATORY):
1. Include Chart.js CDN in <head>: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
2. ALL chart initialization code MUST be inside an IIFE placed immediately after its <canvas>: (function(){ new Chart(...); })();
3. Every <canvas> element must have a unique id attribute and explicit height: <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>
4. Chart initialization must reference canvas by getElementById, never querySelector.
5. If Chart.js fails to load, show a text fallback with the data in a table.
6. NEVER use import statements for Chart.js — use the global Chart object from CDN.
7. NEVER use type:"horizontalBar" — use type:"bar" with options.indexAxis:"y" instead.$$,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM skill_registry
  WHERE plugin_name = 'operations' AND skill_name = 'incident-tracker'
);

-- ============================================================================
-- 3. Project Tracker Dashboard (cross-functional plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'cross-functional',
  'project-tracker',
  'general',
  'Build an interactive project management dashboard with active projects, on-time delivery rate, blocked tasks, resource utilization, milestone timelines, and workload distribution. Use for project tracking, task management, milestone monitoring, progress reporting, workload balancing, deadline tracking, and status reviews.',
  $$---
name: project-tracker
description: Build an interactive project management dashboard with active projects, on-time delivery rate, blocked tasks, resource utilization, milestone timelines, and workload distribution. Use for project tracking, task management, milestone monitoring, progress reporting, workload balancing, deadline tracking, and status reviews.
argument-hint: "<team, department, or project portfolio>"
---

# /project-tracker - General Project Management Dashboard

Build a self-contained interactive HTML dashboard for project management — active project tracking, on-time delivery monitoring, blocked task identification, resource utilization analysis, and milestone timeline visualization.

## Usage

```
/project-tracker <description of team or project portfolio>
```

## Workflow

### 1. Understand the Project Context

Determine:
- **Project methodology**: Agile sprints, waterfall phases, hybrid
- **Status taxonomy**: Not Started, In Progress, On Hold, At Risk, Completed
- **Priority levels**: Critical, High, Medium, Low
- **Resource model**: Named team members, role-based, cross-functional pods
- **Milestone tracking**: Phase gates, deliverable milestones, release dates
- **Health indicators**: On track, at risk, behind schedule, blocked

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify project names, owners, statuses, dates, task counts, and resource assignments.

**If working from description:** Generate a realistic dataset with 10-20 projects, 4-8 team members, varied statuses, and milestone dates. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Project Tracker Dashboard            [Filters]       |
+------------+------------+------------+---------------+
| Active     | On-Time    | Blocked    | Resource      |
| Projects   | Delivery % | Tasks      | Utilization % |
+------------------------------------------------------+
| Projects by Status (doughnut)                        |
+------------------------+-----------------------------+
| Milestone Timeline     | Workload by Team Member     |
| (horizontal bar)       | (bar)                       |
+------------------------+-----------------------------+
| Completion Trend (line)                              |
+------------------------------------------------------+
| Project Detail Table (sortable)                      |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, projects by status doughnut, headline blocked-task count.

**Timeline** — Horizontal bar chart of milestone dates per project, Gantt-style start/end visualization, upcoming due dates.

**Workload** — Bar chart of tasks assigned per team member, utilization percentage, overloaded vs underloaded identification.

**Blocked** — List of blocked tasks with blockers described, escalation status, impact assessment on project timelines.

### 5. KPI Calculations

- **Active Projects**: Count of projects with status in (In Progress, At Risk)
- **On-Time Delivery %**: (Projects completed on or before due date / Total completed projects) x 100
- **Blocked Tasks**: Count of tasks with status = Blocked across all active projects
- **Resource Utilization %**: (Total assigned task hours / Total available hours) x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Doughnut | Projects by status — Not Started (gray), In Progress (blue), At Risk (orange), Completed (green), On Hold (yellow) |
| Horizontal bar | Milestone timeline — each project as a bar from start to due date, color by health |
| Bar | Workload by team member — task count per person, red line at capacity threshold |
| Line | Completion trend — cumulative projects completed over time vs plan |

### 7. Project Detail Table

| Project | Owner | Priority | Status | Start | Due | Progress % | Tasks Remaining |
|---------|-------|----------|--------|-------|-----|------------|----------------|

Sortable by any column. Color-code status: green (Completed), blue (In Progress), orange (At Risk), red (Blocked), gray (Not Started). Progress bar in the Progress % column.

### 8. Filters

- Status multi-select (Not Started, In Progress, On Hold, At Risk, Completed)
- Priority dropdown (Critical, High, Medium, Low)
- Owner dropdown
- Date range pickers
- Show blocked only toggle

All filters update every chart, KPI, and table simultaneously.

CHART.JS LOADING (MANDATORY):
1. Include Chart.js CDN in <head>: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
2. ALL chart initialization code MUST be inside an IIFE placed immediately after its <canvas>: (function(){ new Chart(...); })();
3. Every <canvas> element must have a unique id attribute and explicit height: <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>
4. Chart initialization must reference canvas by getElementById, never querySelector.
5. If Chart.js fails to load, show a text fallback with the data in a table.
6. NEVER use import statements for Chart.js — use the global Chart object from CDN.
7. NEVER use type:"horizontalBar" — use type:"bar" with options.indexAxis:"y" instead.$$,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM skill_registry
  WHERE plugin_name = 'cross-functional' AND skill_name = 'project-tracker'
);

-- ============================================================================
-- 4. Customer 360 Dashboard (cross-functional plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'cross-functional',
  'customer-360',
  'general',
  'Build an interactive cross-functional customer view dashboard with total accounts, avg health score, total ARR, at-risk revenue, revenue segmentation, health distribution, and touchpoint timeline. Use for customer 360 views, account health monitoring, ARR tracking, touchpoint analysis, renewal management, expansion planning, and customer intelligence.',
  $$---
name: customer-360
description: Build an interactive cross-functional customer view dashboard with total accounts, avg health score, total ARR, at-risk revenue, revenue segmentation, health distribution, and touchpoint timeline. Use for customer 360 views, account health monitoring, ARR tracking, touchpoint analysis, renewal management, expansion planning, and customer intelligence.
argument-hint: "<customer segment, portfolio, or account set>"
---

# /customer-360 - Cross-Functional Customer View Dashboard

Build a self-contained interactive HTML dashboard for a 360-degree customer view — total account tracking, health score monitoring, ARR analysis, touchpoint timelines, and expansion/contraction tracking across sales, support, and success functions.

## Usage

```
/customer-360 <description of customer segment or portfolio>
```

## Workflow

### 1. Understand the Customer Context

Determine:
- **Account segmentation**: Enterprise, Mid-Market, SMB, Strategic
- **Health score model**: Composite of usage, support tickets, NPS, engagement, payment history
- **Revenue metrics**: ARR, MRR, expansion, contraction, net revenue retention
- **Touchpoint sources**: Sales calls, support tickets, CSM check-ins, product usage, NPS surveys
- **Renewal tracking**: Renewal date, likelihood, risk factors
- **Cross-functional data**: Sales pipeline, support CSAT, product adoption, billing status

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify account names, ARR values, health scores, touchpoint records, and renewal dates.

**If working from description:** Generate a realistic dataset with 30-60 accounts across segments, varied health scores (0-100), ARR values, and touchpoint histories. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Customer 360 Dashboard               [Filters]       |
+------------+------------+------------+---------------+
| Total      | Avg Health | Total      | At-Risk       |
| Accounts   | Score      | ARR        | Revenue       |
+------------------------------------------------------+
| Revenue by Segment (doughnut)                        |
+------------------------+-----------------------------+
| Health Distribution    | Touchpoint Timeline         |
| (bar)                  | (line)                      |
+------------------------+-----------------------------+
| Expansion / Contraction (grouped bar)                |
+------------------------------------------------------+
| Account Detail Table (sortable)                      |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, revenue by segment doughnut, headline at-risk revenue callout.

**Health** — Bar chart of health score distribution (0-25 Critical, 26-50 At Risk, 51-75 Healthy, 76-100 Thriving), trends over time, key risk factors.

**Revenue** — Doughnut by segment, expansion vs contraction grouped bar, net revenue retention trend, cohort analysis.

**Touchpoints** — Line chart of touchpoint volume over time by type (Sales, Support, CSM), last-touch recency analysis, engagement scoring.

### 5. KPI Calculations

- **Total Accounts**: Count of active customer accounts
- **Avg Health Score**: Mean of composite health scores across all accounts (0-100 scale)
- **Total ARR**: Sum of annual recurring revenue across all active accounts
- **At-Risk Revenue**: Sum of ARR for accounts with health score below 50

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Doughnut | Revenue by segment — Enterprise (navy), Mid-Market (blue), SMB (light blue), Strategic (gold) |
| Bar | Health distribution — bucketed health scores, colored red/orange/green/blue by tier |
| Line | Touchpoint timeline — monthly touchpoint volume by type over 12 months |
| Grouped bar | Expansion/contraction — side-by-side bars showing expansion ARR vs contraction ARR per quarter |

### 7. Account Detail Table

| Account | ARR | Health Score | Last Support Ticket | Last Sales Touch | NPS | Renewal Date |
|---------|-----|-------------|--------------------|--------------------|-----|-------------|

Sortable by any column. Color-code health: green (76-100), blue (51-75), orange (26-50), red (0-25). Highlight accounts renewing within 90 days.

### 8. Filters

- Segment multi-select (Enterprise, Mid-Market, SMB, Strategic)
- Health tier multi-select (Thriving, Healthy, At Risk, Critical)
- Renewal window (Next 30/60/90/180 days)
- ARR range slider
- Owner / CSM dropdown
- Touchpoint type (Sales, Support, CSM, Product)

All filters update every chart, KPI, and table simultaneously.

CHART.JS LOADING (MANDATORY):
1. Include Chart.js CDN in <head>: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
2. ALL chart initialization code MUST be inside an IIFE placed immediately after its <canvas>: (function(){ new Chart(...); })();
3. Every <canvas> element must have a unique id attribute and explicit height: <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>
4. Chart initialization must reference canvas by getElementById, never querySelector.
5. If Chart.js fails to load, show a text fallback with the data in a table.
6. NEVER use import statements for Chart.js — use the global Chart object from CDN.
7. NEVER use type:"horizontalBar" — use type:"bar" with options.indexAxis:"y" instead.$$,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM skill_registry
  WHERE plugin_name = 'cross-functional' AND skill_name = 'customer-360'
);

-- ============================================================================
-- 5. Revenue Operations Dashboard (cross-functional plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'cross-functional',
  'revenue-operations',
  'general',
  'Build an interactive revenue operations dashboard with total pipeline, marketing-sourced pipeline percentage, sales cycle length, LTV/CAC ratio, funnel conversion, and pipeline source analysis. Use for revenue operations, RevOps analysis, pipeline management, funnel optimization, conversion tracking, LTV and CAC analysis, marketing sourced attribution, and unit economics.',
  $$---
name: revenue-operations
description: Build an interactive revenue operations dashboard with total pipeline, marketing-sourced pipeline percentage, sales cycle length, LTV/CAC ratio, funnel conversion, and pipeline source analysis. Use for revenue operations, RevOps analysis, pipeline management, funnel optimization, conversion tracking, LTV and CAC analysis, marketing sourced attribution, and unit economics.
argument-hint: "<business unit, quarter, or revenue scope>"
---

# /revenue-operations - Revenue Operations Dashboard

Build a self-contained interactive HTML dashboard for revenue operations — full-funnel visibility from lead to close, pipeline source attribution, conversion rate analysis, and unit economics tracking (LTV, CAC, LTV/CAC ratio).

## Usage

```
/revenue-operations <description of business unit or revenue scope>
```

## Workflow

### 1. Understand the RevOps Context

Determine:
- **Funnel stages**: Lead -> MQL -> SQL -> Opportunity -> Proposal -> Closed Won
- **Pipeline sources**: Marketing (Inbound, Paid, Content, Events), Sales (Outbound, Referral, Partner)
- **Conversion metrics**: Stage-to-stage conversion rates, velocity per stage
- **Unit economics**: Customer Acquisition Cost (CAC), Lifetime Value (LTV), payback period
- **Attribution model**: First-touch, last-touch, multi-touch, linear
- **Sales cycle definition**: Days from SQL creation to Closed Won

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify deal stages, source attributions, conversion timestamps, revenue amounts, and cost data.

**If working from description:** Generate a realistic dataset with 200-500 leads flowing through funnel stages, varied sources, conversion rates (typical: 30% Lead->MQL, 40% MQL->SQL, 50% SQL->Opp, 60% Opp->Proposal, 40% Proposal->Close), and unit economics. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Revenue Operations Dashboard         [Filters]       |
+------------+------------+------------+---------------+
| Total      | Marketing- | Sales      | LTV/CAC       |
| Pipeline   | Sourced %  | Cycle Days | Ratio         |
+------------------------------------------------------+
| Funnel: Lead to Close (horizontal bar)               |
+------------------------+-----------------------------+
| Pipeline by Source     | Conversion Rates            |
| (doughnut)             | by Stage (bar)              |
+------------------------+-----------------------------+
| LTV/CAC Trend (line)                                 |
+------------------------------------------------------+
| Pipeline Detail Table (sortable)                     |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, funnel horizontal bar chart, headline marketing-sourced percentage.

**Funnel** — Horizontal bar showing volume at each stage (Lead -> MQL -> SQL -> Opportunity -> Proposal -> Closed Won), stage-over-stage drop-off visualization, velocity annotations.

**Sources** — Doughnut of pipeline value by source, marketing vs sales sourced comparison, source performance trends.

**Unit Economics** — LTV/CAC ratio trend line over quarters, CAC payback period, blended vs segmented unit economics, efficiency benchmarks.

### 5. KPI Calculations

- **Total Pipeline**: Sum of open pipeline value across all active stages
- **Marketing-Sourced Pipeline %**: (Pipeline value from marketing sources / Total pipeline value) x 100
- **Sales Cycle Length**: Median days from SQL created_at to Closed Won date for deals closed in the period
- **LTV/CAC Ratio**: Average Customer Lifetime Value / Average Customer Acquisition Cost — target is 3:1+

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Horizontal bar | Funnel from lead to close — decreasing bar widths showing conversion at each stage, colored by stage |
| Doughnut | Pipeline by source — Inbound (green), Outbound (blue), Referral (purple), Partner (orange), Events (teal) |
| Bar | Conversion rates by stage — percentage bars for each stage transition, benchmark reference line |
| Line | LTV/CAC trend — quarterly ratio over 4-8 quarters, target ratio (3.0) as reference line |

### 7. Pipeline Detail Table

| Deal | Source | Stage | Value | Owner | Created | Expected Close | Days in Stage |
|------|--------|-------|-------|-------|---------|----------------|---------------|

Sortable by any column. Color-code stage: early stages (light blue), mid stages (blue), late stages (dark blue), Closed Won (green). Highlight deals stalled more than 30 days in current stage.

### 8. Filters

- Source multi-select (Inbound, Outbound, Referral, Partner, Events)
- Stage multi-select (Lead, MQL, SQL, Opportunity, Proposal, Closed Won)
- Owner dropdown
- Date range pickers (Created date, Expected close date)
- Pipeline value range slider
- Stalled deals toggle (>30 days in stage)

All filters update every chart, KPI, and table simultaneously.

CHART.JS LOADING (MANDATORY):
1. Include Chart.js CDN in <head>: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
2. ALL chart initialization code MUST be inside an IIFE placed immediately after its <canvas>: (function(){ new Chart(...); })();
3. Every <canvas> element must have a unique id attribute and explicit height: <canvas id="chart1" height="200" style="height:200px !important; max-height:200px;"></canvas>
4. Chart initialization must reference canvas by getElementById, never querySelector.
5. If Chart.js fails to load, show a text fallback with the data in a table.
6. NEVER use import statements for Chart.js — use the global Chart object from CDN.
7. NEVER use type:"horizontalBar" — use type:"bar" with options.indexAxis:"y" instead.$$,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM skill_registry
  WHERE plugin_name = 'cross-functional' AND skill_name = 'revenue-operations'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
