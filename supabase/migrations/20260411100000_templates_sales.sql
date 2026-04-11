-- Migration: Seed 4 Sales department golden templates into skill_registry.
-- Sales Forecast, Sales Territory, Win/Loss Analysis, Commission Tracker.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Sales Forecast Dashboard (sales plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'sales',
  'sales-forecast',
  'sales',
  'Build an interactive revenue forecasting dashboard with quota attainment, forecast accuracy, projected vs actual revenue, and pipeline coverage ratio. Use for forecast reviews, quota tracking, revenue projections, attainment analysis, and pipeline coverage planning.',
  $$---
name: sales-forecast
description: Build an interactive revenue forecasting dashboard with quota attainment, forecast accuracy, projected vs actual revenue, and pipeline coverage ratio. Use for forecast reviews, quota tracking, revenue projections, attainment analysis, and pipeline coverage planning.
argument-hint: "<sales team, quarter, or forecast period>"
---

# /sales-forecast - Revenue Forecasting Dashboard

Build a self-contained interactive HTML dashboard for sales revenue forecasting — quota attainment tracking, forecast accuracy analysis, projected vs actual revenue comparison, and pipeline coverage ratios.

## Usage

```
/sales-forecast <description of sales team or forecast period>
```

## Workflow

### 1. Understand the Forecast Context

Determine:
- **Forecast cadence**: Weekly, monthly, quarterly
- **Quota structure**: Individual rep quotas, team quotas, segment quotas
- **Forecast categories**: Commit, Best Case, Pipeline, Omitted
- **Revenue model**: New business, expansion, renewal, total ARR/MRR
- **Pipeline coverage target**: Typical 3x-4x coverage required
- **Historical accuracy**: Track forecast-to-close accuracy over time

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify rep columns, quota values, forecast categories, and actuals.

**If working from description:** Generate a realistic sample dataset with 8-15 reps, quarterly quotas, and forecast snapshots. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Revenue Forecast Dashboard           [Filters]       |
+------------+------------+------------+---------------+
| Quota      | Forecast   | Projected  | Pipeline      |
| Attainment | Accuracy   | vs Actual  | Coverage      |
| %          | %          | Revenue    | Ratio         |
+------------------------------------------------------+
| Revenue Forecast (actual + projected + target line)  |
+------------------------+-----------------------------+
| Quota Attainment       | Forecast Accuracy           |
| by Rep (bar)           | Trend (line)                |
+------------------------+-----------------------------+
| Pipeline Coverage by Quarter (bar)                   |
+------------------------------------------------------+
| Rep Forecast Detail Table (sortable)                 |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, revenue forecast line chart, pipeline coverage summary.

**By Rep** — Quota attainment bar chart per rep, individual commit/best-case/pipeline breakdown.

**By Segment** — Revenue and attainment sliced by segment (Enterprise, Mid-Market, SMB).

**Quarterly View** — Quarter-over-quarter forecast accuracy, pipeline coverage trends, seasonal patterns.

### 5. KPI Calculations

- **Quota Attainment %**: (Closed-Won Revenue / Quota) x 100
- **Forecast Accuracy %**: (Forecasted Amount / Actual Closed Amount) x 100 — closer to 100% is better
- **Projected vs Actual Revenue**: Projected total = Closed-Won + Weighted Pipeline
- **Pipeline Coverage Ratio**: Total Open Pipeline Value / Remaining Quota — target is 3x+

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line (multi-series) | Revenue forecast: actual (solid), projected (dashed), target (dotted) |
| Bar | Quota attainment by rep — green above 100%, red below 80% |
| Line | Forecast accuracy trend over past 4-6 quarters |
| Bar | Pipeline coverage by quarter — green above 3x, yellow 2-3x, red below 2x |

### 7. Rep Forecast Detail Table

| Rep | Quota | Committed | Best Case | Pipeline | Closed Won | Attainment % |
|-----|-------|-----------|-----------|----------|------------|-------------|

Sortable by any column. Color-code attainment: green (100%+), yellow (80-99%), red (<80%).

### 8. Filters

- Quarter / Period selector
- Rep dropdown
- Segment multi-select (Enterprise, Mid-Market, SMB)
- Forecast category (Commit, Best Case, Pipeline)

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
  WHERE plugin_name = 'sales' AND skill_name = 'sales-forecast'
);

-- ============================================================================
-- 2. Sales Territory Dashboard (sales plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'sales',
  'sales-territory',
  'sales',
  'Build an interactive territory and region performance dashboard with revenue by region, deal distribution, territory growth trends, and rep leaderboard. Use for territory planning, regional analysis, rep performance comparison, geographic coverage, and area reviews.',
  $$---
name: sales-territory
description: Build an interactive territory and region performance dashboard with revenue by region, deal distribution, territory growth trends, and rep leaderboard. Use for territory planning, regional analysis, rep performance comparison, geographic coverage, and area reviews.
argument-hint: "<sales region, territory, or team>"
---

# /sales-territory - Territory & Region Performance Dashboard

Build a self-contained interactive HTML dashboard for sales territory performance — revenue by region, deal distribution, territory growth trends, and rep leaderboard rankings.

## Usage

```
/sales-territory <description of territories or regions>
```

## Workflow

### 1. Understand the Territory Structure

Determine:
- **Geography model**: Named regions (West, East, Central), states, countries, custom territories
- **Rep assignment**: Single-territory or overlay model
- **Metrics tracked**: Revenue, deals closed, pipeline, growth rate, avg deal size
- **Hierarchy**: Region > Territory > Rep
- **Coverage goals**: Revenue targets per territory, whitespace identification

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify territory/region columns, rep assignments, and revenue data.

**If working from description:** Generate a realistic dataset with 4-6 regions, 2-4 territories per region, and 8-15 reps. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Territory Performance Dashboard      [Filters]       |
+------------+------------+------------+---------------+
| Revenue    | Top        | Avg Deal   | Territory     |
| by Region  | Territory  | Size by    | Coverage %    |
| (total)    | (name)     | Territory  |               |
+------------------------------------------------------+
| Revenue by Region (bar)                              |
+------------------------+-----------------------------+
| Deal Distribution      | Territory Growth            |
| by Region (doughnut)   | Trend (line)                |
+------------------------+-----------------------------+
| Rep Leaderboard (horizontal bar)                     |
+------------------------------------------------------+
| Territory Detail Table (sortable)                    |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, revenue by region bar chart, top-performing territory callout.

**By Region** — Doughnut showing deal distribution, revenue comparison bars, region-level detail.

**Rep Leaderboard** — Horizontal bar chart ranking reps by revenue, deals, or attainment. Top 3 highlighted.

**Growth Trends** — Line chart showing territory growth over time, quarter-over-quarter comparison.

### 5. KPI Calculations

- **Revenue by Region**: Sum of closed-won revenue grouped by region
- **Top Territory**: Territory with highest total revenue in the period
- **Avg Deal Size by Territory**: Territory revenue / territory deal count
- **Territory Coverage %**: (Territories with active pipeline / Total territories) x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Revenue by region — sorted descending, colored by region |
| Doughnut | Deal distribution across regions — proportional segments |
| Line | Territory growth trend — one series per territory over quarters |
| Horizontal bar | Rep leaderboard — ranked by revenue, top 3 in accent color |

### 7. Territory Detail Table

| Territory | Rep | Deals | Revenue | Avg Deal Size | Growth % |
|-----------|-----|-------|---------|---------------|----------|

Sortable by any column. Color-code growth: green (positive), red (negative). Highlight top territory row.

### 8. Filters

- Region dropdown
- Territory multi-select
- Rep dropdown
- Date range pickers
- Metric toggle (Revenue, Deals, Avg Deal Size)

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
  WHERE plugin_name = 'sales' AND skill_name = 'sales-territory'
);

-- ============================================================================
-- 3. Win/Loss Analysis Dashboard (sales plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'sales',
  'win-loss-analysis',
  'sales',
  'Build an interactive win/loss analysis dashboard with win rate trends, loss reason breakdowns, competitive analysis, and deal outcome tracking. Use for deal outcome reviews, win loss analysis, competitive intelligence, loss reason diagnosis, and win rate improvement.',
  $$---
name: win-loss-analysis
description: Build an interactive win/loss analysis dashboard with win rate trends, loss reason breakdowns, competitive analysis, and deal outcome tracking. Use for deal outcome reviews, win loss analysis, competitive intelligence, loss reason diagnosis, and win rate improvement.
argument-hint: "<sales team, product line, or time period>"
---

# /win-loss-analysis - Win/Loss Analysis Dashboard

Build a self-contained interactive HTML dashboard for sales win/loss analysis — win rate trends, loss reason breakdowns, competitive win rates, and detailed deal outcome tracking.

## Usage

```
/win-loss-analysis <description of sales team or analysis scope>
```

## Workflow

### 1. Understand the Analysis Scope

Determine:
- **Deal stages tracked**: At which stage are losses recorded? (Demo, Proposal, Negotiation, etc.)
- **Loss reasons taxonomy**: Price, product fit, competitor, timing, budget, no decision, champion left
- **Competitors tracked**: Named competitors or generic categories
- **Win definition**: Closed-Won only, or include verbal commits
- **Time range**: Last quarter, last 6 months, year-over-year
- **Segmentation**: By rep, product line, deal size tier, segment

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify outcome columns, loss reason fields, competitor mentions, and deal metadata.

**If working from description:** Generate a realistic dataset with 80-150 closed deals (mix of won/lost), varied loss reasons, and 3-5 competitors. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Win/Loss Analysis Dashboard          [Filters]       |
+------------+------------+------------+---------------+
| Win Rate   | Avg Deal   | Avg Sales  | Top Loss      |
| %          | Size Won   | Cycle Won  | Reason        |
|            | vs Lost    | vs Lost    |               |
+------------------------------------------------------+
| Win/Loss Ratio Trend (line)                          |
+------------------------+-----------------------------+
| Loss Reasons           | Win Rate by                 |
| Breakdown (doughnut)   | Stage (bar)                 |
+------------------------+-----------------------------+
| Competitive Win Rate (grouped bar)                   |
+------------------------------------------------------+
| Deal Outcomes Table (sortable)                       |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, win/loss trend line, headline loss reason.

**Loss Reasons** — Doughnut breakdown of loss reasons, drill-down by segment, actionable insights.

**Competitive** — Grouped bar chart of win rate vs each competitor, head-to-head deal counts.

**Trends** — Win rate over time (monthly/quarterly), deal cycle length trends, deal size trends.

### 5. KPI Calculations

- **Win Rate %**: Closed-Won / (Closed-Won + Closed-Lost) x 100
- **Avg Deal Size Won vs Lost**: Mean amount for won deals vs mean for lost deals
- **Avg Sales Cycle Won vs Lost**: Mean days-to-close for won vs lost
- **Top Loss Reason**: Mode of loss_reason field for closed-lost deals in the period

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line | Win/loss ratio trend over months — green for win rate, red reference line at target |
| Doughnut | Loss reasons breakdown — distinct colors per reason, percentage labels |
| Bar | Win rate by pipeline stage — shows at which stage deals are most commonly lost |
| Grouped bar | Competitive win rate — side-by-side bars: wins vs losses per competitor |

### 7. Deal Outcomes Table

| Deal | Company | Stage Lost | Reason | Competitor | Value | Days in Pipeline |
|------|---------|-----------|--------|------------|-------|------------------|

Sortable by any column. Color-code outcome: green row (won), red row (lost). Filter by reason or competitor.

### 8. Filters

- Outcome (Won, Lost, All)
- Loss reason multi-select
- Competitor dropdown
- Rep dropdown
- Deal size range
- Date range pickers

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
  WHERE plugin_name = 'sales' AND skill_name = 'win-loss-analysis'
);

-- ============================================================================
-- 4. Commission Tracker Dashboard (sales plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'sales',
  'commission-tracker',
  'sales',
  'Build an interactive sales commission and compensation dashboard with total commissions earned, payout tracking, tier distribution, and accelerator progress. Use for commission tracking, compensation analysis, payout management, earnings reviews, accelerator monitoring, and quota attainment payouts.',
  $$---
name: commission-tracker
description: Build an interactive sales commission and compensation dashboard with total commissions earned, payout tracking, tier distribution, and accelerator progress. Use for commission tracking, compensation analysis, payout management, earnings reviews, accelerator monitoring, and quota attainment payouts.
argument-hint: "<sales team, comp plan, or payout period>"
---

# /commission-tracker - Sales Commission & Compensation Dashboard

Build a self-contained interactive HTML dashboard for sales commission tracking — total commissions earned, per-rep payouts, tier distribution, and accelerator progress monitoring.

## Usage

```
/commission-tracker <description of comp plan or sales team>
```

## Workflow

### 1. Understand the Comp Plan

Determine:
- **Commission structure**: Flat rate, tiered, accelerator-based, split
- **Base rate**: Typical 8-12% of closed revenue
- **Tiers**: Tier 1 (0-80% quota) base rate, Tier 2 (80-100%) 1.5x, Tier 3 (100%+) 2x accelerator
- **Payout frequency**: Monthly, quarterly, upon close
- **Clawback rules**: If deal churns within X days
- **Special incentives**: SPIFs, bonuses, team overrides

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify rep columns, quota values, closed revenue, commission rates, and payout records.

**If working from description:** Generate a realistic dataset with 8-15 reps, varied attainment levels (60%-140%), tiered commission rates, and monthly payouts. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Commission Tracker Dashboard         [Filters]       |
+------------+------------+------------+---------------+
| Total      | Avg        | Accelerator| Payout This   |
| Commissions| Commission | Eligible   | Period        |
| Earned     | per Rep    | Reps       |               |
+------------------------------------------------------+
| Commission by Rep (bar)                              |
+------------------------+-----------------------------+
| Payout Trend           | Tier Distribution           |
| by Month (line)        | (doughnut)                  |
+------------------------+-----------------------------+
| Accelerator Progress (horizontal bar)                |
+------------------------------------------------------+
| Commission Detail Table (sortable)                   |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, commission by rep bar chart, total payout summary.

**By Rep** — Per-rep commission breakdown, attainment %, current tier, earnings to date.

**Payouts** — Monthly payout trend line, cumulative payout tracking, pending vs paid status.

**Tiers** — Doughnut showing rep distribution across tiers, accelerator progress bars, tier threshold lines.

### 5. KPI Calculations

- **Total Commissions Earned**: Sum of all commission amounts in the period
- **Avg Commission per Rep**: Total commissions / number of active reps
- **Accelerator-Eligible Reps**: Count of reps at or above 100% quota attainment
- **Payout This Period**: Sum of commissions scheduled for current payout cycle

### 6. Commission Tier Logic

```
Tier 1 (Base):      0% - 80% attainment  -> base rate (e.g., 8%)
Tier 2 (Standard):  80% - 100% attainment -> 1.5x base rate (e.g., 12%)
Tier 3 (Accelerator): 100%+ attainment   -> 2x base rate (e.g., 16%)
```

Color coding: Tier 1 = gray/blue, Tier 2 = yellow/amber, Tier 3 = green/gold.

### 7. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Commission earned by rep — sorted descending, colored by tier |
| Line | Monthly payout trend — actual payouts over 6-12 months |
| Doughnut | Tier distribution — how many reps in each tier |
| Horizontal bar | Accelerator progress — each rep's attainment vs 100% threshold |

### 8. Commission Detail Table

| Rep | Quota | Attainment | Rate | Commission Earned | Tier | Status |
|-----|-------|-----------|------|-------------------|------|--------|

Sortable by any column. Status values: Paid, Pending, Processing. Color-code tier: Tier 3 in green, Tier 1 in gray.

### 9. Filters

- Payout period (Month / Quarter selector)
- Rep dropdown
- Tier multi-select (Tier 1, Tier 2, Tier 3)
- Status (Paid, Pending, All)
- Min commission amount

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
  WHERE plugin_name = 'sales' AND skill_name = 'commission-tracker'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
