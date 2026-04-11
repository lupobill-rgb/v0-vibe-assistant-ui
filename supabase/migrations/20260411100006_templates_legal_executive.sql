-- Migration: Seed 4 golden templates into skill_registry.
-- Legal: Litigation Tracker, Contract Lifecycle.
-- Executive: Board Report, OKR Tracker.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Litigation Tracker Dashboard (legal plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'legal',
  'litigation-tracker',
  'legal',
  'Build an interactive litigation and dispute tracking dashboard with active cases, total exposure, average case duration, and quarterly resolution metrics. Use for case tracking, legal proceedings, lawsuit monitoring, exposure analysis, dispute management, settlement tracking, and court case reviews.',
  $$---
name: litigation-tracker
description: Build an interactive litigation and dispute tracking dashboard with active cases, total exposure, average case duration, and quarterly resolution metrics. Use for case tracking, legal proceedings, lawsuit monitoring, exposure analysis, dispute management, settlement tracking, and court case reviews.
argument-hint: "<legal team, case type, or jurisdiction>"
---

# /litigation-tracker - Litigation & Dispute Tracking Dashboard

Build a self-contained interactive HTML dashboard for litigation and dispute tracking — active case monitoring, total exposure analysis, case duration trends, and resolution tracking.

## Usage

```
/litigation-tracker <description of legal team or case portfolio>
```

## Workflow

### 1. Understand the Litigation Context

Determine:
- **Case types**: Employment, IP, contract dispute, regulatory, personal injury, class action
- **Exposure model**: Estimated liability, settlement range, worst-case exposure
- **Status taxonomy**: Open, Discovery, Mediation, Trial, Settled, Dismissed, Appealed
- **Duration tracking**: Filed date to resolution, time in each phase
- **Practice areas**: Which legal teams or outside counsel handle which cases
- **Jurisdiction**: State, federal, international, arbitration

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify case columns, exposure amounts, status fields, dates, and attorney assignments.

**If working from description:** Generate a realistic dataset with 25-50 cases across 4-6 types, varied statuses, exposure ranges from $50K to $5M, and 6-10 attorneys. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Litigation Tracker Dashboard         [Filters]       |
+------------+------------+------------+---------------+
| Active     | Total      | Avg Case   | Cases         |
| Cases      | Exposure   | Duration   | Resolved      |
|            | ($)        | (months)   | This Quarter  |
+------------------------------------------------------+
| Cases by Type (doughnut)                             |
+------------------------+-----------------------------+
| Exposure by Practice   | Case Timeline               |
| Area (bar)             | (horizontal bar)            |
+------------------------+-----------------------------+
| Resolution Trend (line)                              |
+------------------------------------------------------+
| Case List Table (sortable)                           |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, cases by type doughnut, total exposure headline.

**By Type** — Doughnut breakdown of cases by litigation type, count and exposure per type.

**Exposure** — Bar chart of exposure by practice area, high-exposure cases flagged, trend over time.

**Resolution** — Line chart of cases resolved per quarter, average time-to-resolution trend, settlement vs dismissal ratio.

### 5. KPI Calculations

- **Active Cases**: Count of cases with status not in (Settled, Dismissed, Closed)
- **Total Exposure**: Sum of estimated exposure for all active cases
- **Avg Case Duration**: Mean of (current_date - filed_date) in months for active cases
- **Cases Resolved This Quarter**: Count of cases resolved in the current quarter

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Doughnut | Cases by type — distinct color per litigation type, percentage labels |
| Bar | Exposure by practice area — sorted descending, highlight top exposure area |
| Horizontal bar | Case timeline — each case as a bar from filed date to expected resolution, colored by status |
| Line | Resolution trend — cases resolved per quarter over 6-8 quarters |

### 7. Case List Table

| Case | Type | Opposing Party | Exposure | Status | Filed Date | Attorney | Next Action |
|------|------|---------------|----------|--------|-----------|----------|-------------|

Sortable by any column. Color-code status: green (Settled/Dismissed), yellow (Mediation/Discovery), red (Trial/Appeal). Highlight high-exposure rows (>$1M).

### 8. Filters

- Case type multi-select
- Status dropdown (Open, Discovery, Mediation, Trial, Settled, Dismissed)
- Attorney dropdown
- Exposure range slider
- Date range pickers (filed date)
- Practice area multi-select

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
  WHERE plugin_name = 'legal' AND skill_name = 'litigation-tracker'
);

-- ============================================================================
-- 2. Contract Lifecycle Dashboard (legal plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'legal',
  'contract-lifecycle',
  'legal',
  'Build an interactive contract lifecycle management dashboard with active contracts, pending renewals, average negotiation days, and auto-renewal alerts. Use for contract management, CLM, renewal tracking, negotiation analysis, expiry monitoring, agreement oversight, and terms review.',
  $$---
name: contract-lifecycle
description: Build an interactive contract lifecycle management dashboard with active contracts, pending renewals, average negotiation days, and auto-renewal alerts. Use for contract management, CLM, renewal tracking, negotiation analysis, expiry monitoring, agreement oversight, and terms review.
argument-hint: "<legal team, contract type, or business unit>"
---

# /contract-lifecycle - Contract Lifecycle Management Dashboard

Build a self-contained interactive HTML dashboard for contract lifecycle management — active contract tracking, renewal pipeline, negotiation cycle times, and expiry alerts.

## Usage

```
/contract-lifecycle <description of contract portfolio or business unit>
```

## Workflow

### 1. Understand the Contract Portfolio

Determine:
- **Contract types**: SaaS, vendor, employment, NDA, partnership, MSA, SOW, lease
- **Lifecycle stages**: Draft, In Review, Negotiation, Pending Signature, Active, Expired, Renewed, Terminated
- **Renewal model**: Auto-renewal, manual renewal, evergreen, fixed-term
- **Value tracking**: Annual contract value (ACV), total contract value (TCV)
- **Ownership**: Legal owner, business owner, signing authority
- **Renewal window**: Typically 90 days before expiry for renewal planning

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify contract columns, stage fields, dates, values, and counterparties.

**If working from description:** Generate a realistic dataset with 40-80 contracts across 5-7 types, varied stages, values from $10K to $2M, and realistic expiry dates. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Contract Lifecycle Dashboard         [Filters]       |
+------------+------------+------------+---------------+
| Active     | Pending    | Avg        | Auto-Renewal  |
| Contracts  | Renewals   | Negotiation| Alerts        |
|            | (90 day)   | Days       |               |
+------------------------------------------------------+
| Contracts by Stage (horizontal bar)                  |
+------------------------+-----------------------------+
| Expiry Timeline        | Value by Type               |
| (line)                 | (doughnut)                  |
+------------------------+-----------------------------+
| Cycle Time Trend (line)                              |
+------------------------------------------------------+
| Contracts Table (sortable)                           |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, contracts by stage horizontal bar, renewal alerts count.

**Pipeline** — Horizontal bar of contracts in each lifecycle stage, bottleneck identification, stage duration analysis.

**Renewals** — Line chart of upcoming expiries by month, auto-renewal flags, renewal rate tracking.

**Cycle Time** — Line chart of average negotiation duration trend, stage-by-stage cycle time breakdown, improvement tracking.

### 5. KPI Calculations

- **Active Contracts**: Count of contracts with status = Active
- **Pending Renewals (90 day)**: Count of active contracts expiring within 90 days
- **Avg Negotiation Days**: Mean of (signature_date - draft_date) for contracts signed in the period
- **Auto-Renewal Alerts**: Count of contracts with auto_renewal = true expiring within 60 days that have not been reviewed

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Horizontal bar | Contracts by stage — one bar per lifecycle stage, colored by stage category |
| Line | Expiry timeline — contracts expiring per month over the next 12 months |
| Doughnut | Value by contract type — ACV distribution across contract types |
| Line | Cycle time trend — average negotiation days per quarter, declining is good |

### 7. Contracts Table

| Name | Counterparty | Type | Value | Start | Expiry | Status | Owner |
|------|-------------|------|-------|-------|--------|--------|-------|

Sortable by any column. Color-code status: green (Active), yellow (Pending Renewal), red (Expired/Expiring Soon), gray (Terminated). Flag auto-renewal contracts with an icon.

### 8. Filters

- Contract type multi-select
- Stage dropdown
- Owner dropdown
- Value range slider
- Expiry date range pickers
- Auto-renewal toggle (Yes/No/All)

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
  WHERE plugin_name = 'legal' AND skill_name = 'contract-lifecycle'
);

-- ============================================================================
-- 3. Board Report Dashboard (executive plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'executive',
  'board-report',
  'admin',
  'Build an interactive board report dashboard with ARR, growth rate, burn rate, and runway metrics. Use for board meetings, investor updates, quarterly reports, strategic reviews, ARR tracking, burn rate monitoring, and runway planning.',
  $$---
name: board-report
description: Build an interactive board report dashboard with ARR, growth rate, burn rate, and runway metrics. Use for board meetings, investor updates, quarterly reports, strategic reviews, ARR tracking, burn rate monitoring, and runway planning.
argument-hint: "<company, quarter, or reporting period>"
---

# /board-report - Board Report Dashboard

Build a self-contained interactive HTML dashboard for board-level reporting — ARR tracking, growth analysis, burn rate monitoring, and strategic metrics vs plan.

## Usage

```
/board-report <description of company or reporting period>
```

## Workflow

### 1. Understand the Reporting Context

Determine:
- **Company stage**: Seed, Series A/B/C, growth, public
- **Revenue model**: SaaS ARR/MRR, transactional, marketplace, hybrid
- **Key metrics**: ARR, growth rate, burn rate, runway, NRR, CAC, LTV
- **Reporting cadence**: Monthly board updates, quarterly board meetings
- **Investor expectations**: Target growth rate, acceptable burn multiple
- **Strategic initiatives**: Top 3-5 company priorities for the period

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify revenue columns, expense data, growth metrics, and strategic KPIs.

**If working from description:** Generate a realistic dataset for a Series B SaaS company with $5M-$20M ARR, 80-120% growth, 18-24 month runway, and 6-8 strategic metrics. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Board Report Dashboard               [Filters]       |
+------------+------------+------------+---------------+
| ARR        | Growth     | Burn Rate  | Runway        |
| ($)        | Rate (%)   | ($/month)  | (months)      |
+------------------------------------------------------+
| ARR Trend with Target (line)                         |
+------------------------+-----------------------------+
| Revenue by Segment     | Burn Rate Trend             |
| (doughnut)             | (bar)                       |
+------------------------+-----------------------------+
| Key Metrics vs Plan (grouped bar)                    |
+------------------------------------------------------+
| Strategic Metrics Table (sortable)                   |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, ARR trend with target line, executive summary.

**Revenue** — Doughnut showing revenue by segment (New, Expansion, Renewal), cohort analysis, NRR trend.

**Burn** — Monthly burn rate bar chart, cash balance trend, runway projection under current vs reduced spend.

**Strategic Metrics** — Grouped bar chart comparing current vs target for each strategic metric, traffic light status indicators.

### 5. KPI Calculations

- **ARR**: Monthly recurring revenue x 12 (or sum of active annual contracts)
- **Growth Rate %**: ((Current Period ARR - Prior Period ARR) / Prior Period ARR) x 100
- **Burn Rate**: Total monthly operating expenses - total monthly revenue (net burn)
- **Runway (months)**: Current cash balance / monthly net burn rate

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line (multi-series) | ARR trend: actual (solid), target/plan (dashed), prior year (dotted) |
| Doughnut | Revenue by segment — New Business, Expansion, Renewal proportions |
| Bar | Burn rate trend — monthly net burn over past 12 months, colored by above/below target |
| Grouped bar | Key metrics vs plan — side-by-side bars for actual vs target per metric |

### 7. Strategic Metrics Table

| Metric | Current | Target | Variance | Status | Trend |
|--------|---------|--------|----------|--------|-------|

Sortable by any column. Status values: On Track (green), At Risk (yellow), Off Track (red). Trend shown as arrow icon or sparkline. Variance calculated as (Current - Target) / Target x 100.

### 8. Filters

- Reporting period (Quarter / Month selector)
- Segment multi-select (New, Expansion, Renewal)
- Metric category (Revenue, Efficiency, Growth, Product)
- Comparison toggle (vs Plan, vs Prior Year, vs Prior Quarter)

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
  WHERE plugin_name = 'executive' AND skill_name = 'board-report'
);

-- ============================================================================
-- 4. OKR Tracker Dashboard (executive plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'executive',
  'okr-tracker',
  'admin',
  'Build an interactive OKR and goal tracking dashboard with on-track percentage, average progress, blocked objectives, and quarterly completion metrics. Use for OKR reviews, objectives and key results tracking, goal setting, quarterly planning, progress monitoring, target tracking, and initiative management.',
  $$---
name: okr-tracker
description: Build an interactive OKR and goal tracking dashboard with on-track percentage, average progress, blocked objectives, and quarterly completion metrics. Use for OKR reviews, objectives and key results tracking, goal setting, quarterly planning, progress monitoring, target tracking, and initiative management.
argument-hint: "<company, department, or quarter>"
---

# /okr-tracker - OKR & Goal Tracking Dashboard

Build a self-contained interactive HTML dashboard for OKR and goal tracking — objective progress monitoring, department comparison, blocked item identification, and quarterly completion analysis.

## Usage

```
/okr-tracker <description of company or department OKRs>
```

## Workflow

### 1. Understand the OKR Framework

Determine:
- **OKR structure**: Company-level objectives cascade to department-level, then team/individual
- **Scoring model**: 0-1.0 scale (Google style) or percentage-based
- **Cadence**: Annual objectives with quarterly key results, or fully quarterly
- **Status taxonomy**: On Track, At Risk, Behind, Blocked, Completed, Cancelled
- **Departments**: Engineering, Product, Sales, Marketing, CS, Finance, HR, Legal
- **Review cycle**: Weekly check-ins, monthly reviews, quarterly scoring

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify objective columns, key result fields, progress values, owners, and department assignments.

**If working from description:** Generate a realistic dataset with 5-8 company objectives, 3-4 key results each, across 5-6 departments, with varied progress levels (10%-100%). Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| OKR Tracker Dashboard                [Filters]       |
+------------+------------+------------+---------------+
| OKRs       | Avg        | Blocked    | Completed     |
| On Track   | Progress   | Objectives | This Quarter  |
| (%)        | (%)        |            |               |
+------------------------------------------------------+
| Progress by Objective (horizontal bar)               |
+------------------------+-----------------------------+
| Status Distribution    | Progress Trend              |
| (doughnut)             | (line)                      |
+------------------------+-----------------------------+
| Department Comparison (grouped bar)                  |
+------------------------------------------------------+
| OKR Detail Table (sortable)                          |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, progress by objective horizontal bar, overall health indicator.

**By Department** — Grouped bar chart comparing departments on avg progress, on-track %, and completion rate.

**Progress** — Line chart of overall progress over weekly check-ins, velocity tracking, forecast to end-of-quarter.

**Blocked** — Filtered view of blocked objectives and key results, blocker reasons, escalation status, days blocked.

### 5. KPI Calculations

- **OKRs On Track %**: (Key results with status = On Track or Completed / Total key results) x 100
- **Avg Progress**: Mean of all key result progress percentages
- **Blocked Objectives**: Count of objectives where any key result has status = Blocked
- **Completed This Quarter**: Count of key results with progress = 100% and status = Completed

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Horizontal bar | Progress by objective — each objective as a bar showing avg KR progress, colored by status |
| Doughnut | Status distribution — On Track, At Risk, Behind, Blocked, Completed segments |
| Line | Progress trend — weekly average progress over the quarter, target line at expected pace |
| Grouped bar | Department comparison — side-by-side bars per department: avg progress vs on-track % |

### 7. OKR Detail Table

| Objective | Key Result | Owner | Department | Progress % | Status | Due Date |
|-----------|-----------|-------|------------|-----------|--------|----------|

Sortable by any column. Color-code status: green (On Track/Completed), yellow (At Risk), red (Behind/Blocked). Progress shown as inline bar within cell. Group rows by objective with expandable key results.

### 8. Filters

- Department multi-select
- Status dropdown (On Track, At Risk, Behind, Blocked, Completed)
- Owner dropdown
- Objective level (Company, Department, Team)
- Progress range slider (0%-100%)
- Quarter selector

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
  WHERE plugin_name = 'executive' AND skill_name = 'okr-tracker'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
