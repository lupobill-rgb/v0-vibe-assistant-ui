-- Migration: Seed golden templates for Support, Design, and Data departments.
-- support-dashboard, customer-health, design-ops, data-quality.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Support Dashboard (customer-support plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'customer-support',
  'support-dashboard',
  'support',
  'Build an interactive support ticket analytics dashboard with open tickets, avg resolution time, CSAT score, first response time, and SLA tracking. Use for support analytics, ticket volume reviews, resolution tracking, help desk reporting, customer service metrics, SLA compliance, and response time analysis.',
  $$---
name: support-dashboard
description: Build an interactive support ticket analytics dashboard with open tickets, avg resolution time, CSAT score, first response time, and SLA tracking. Use for support analytics, ticket volume reviews, resolution tracking, help desk reporting, customer service metrics, SLA compliance, and response time analysis.
argument-hint: "<support team, queue, or time period>"
---

# /support-dashboard - Support Ticket Analytics Dashboard

Build a self-contained interactive HTML dashboard for support ticket analytics — open ticket monitoring, resolution time tracking, CSAT scoring, first response time analysis, and SLA compliance.

## Usage

```
/support-dashboard <description of support team or queue>
```

## Workflow

### 1. Understand the Support Context

Determine:
- **Ticket sources**: Email, chat, phone, web form, social media
- **Priority levels**: Critical, High, Medium, Low
- **Categories**: Billing, Technical, Feature Request, Bug Report, Account, Onboarding
- **SLA targets**: First response time, resolution time per priority
- **Team structure**: Tiers (L1, L2, L3), specialists, team leads
- **CSAT method**: Post-resolution survey, 1-5 scale or thumbs up/down

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify ticket columns, priority, status, timestamps, CSAT scores, and agent assignments.

**If working from description:** Generate a realistic dataset with 200-500 tickets across categories, varied priorities, resolution times, and CSAT scores. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Support Ticket Analytics Dashboard   [Filters]       |
+------------+------------+------------+---------------+
| Open       | Avg        | CSAT       | First         |
| Tickets    | Resolution | Score      | Response      |
|            | Time       |            | Time          |
+------------------------------------------------------+
| Ticket Volume Trend (line)                           |
+------------------------+-----------------------------+
| Resolution Time        | CSAT Trend                  |
| by Priority (bar)      | (line)                      |
+------------------------+-----------------------------+
| Tickets by Category (doughnut)                       |
+------------------------------------------------------+
| Ticket List Table (sortable)                         |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, ticket volume trend line, current backlog status.

**Resolution** — Resolution time by priority bar chart, SLA compliance rates, escalation tracking.

**Satisfaction** — CSAT trend over time, score distribution, correlation with resolution time.

**Categories** — Doughnut showing ticket distribution by category, top issue identification.

### 5. KPI Calculations

- **Open Tickets**: Count of tickets with status not in (Resolved, Closed)
- **Avg Resolution Time**: Mean time from ticket creation to resolution, in hours
- **CSAT Score**: Average customer satisfaction rating (1-5 scale, displayed as percentage)
- **First Response Time**: Mean time from ticket creation to first agent response, in minutes

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line | Ticket volume trend over days/weeks — new vs resolved vs backlog |
| Bar | Resolution time by priority — Critical, High, Medium, Low with SLA target line |
| Line | CSAT trend over weeks/months — score line with target reference |
| Doughnut | Tickets by category — proportional segments with counts |

### 7. Ticket List Table

| ID | Subject | Customer | Priority | Status | Created | Assigned | Resolution Time |
|----|---------|----------|----------|--------|---------|----------|-----------------|

Sortable by any column. Color-code priority: Critical (red), High (orange), Medium (yellow), Low (green). Status badges: Open, In Progress, Waiting, Resolved, Closed.

### 8. Filters

- Status multi-select (Open, In Progress, Waiting, Resolved, Closed)
- Priority multi-select
- Category dropdown
- Agent / Assigned To dropdown
- Date range pickers
- SLA compliance (Met / Breached / All)

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
  WHERE plugin_name = 'customer-support' AND skill_name = 'support-dashboard'
);

-- ============================================================================
-- 2. Customer Health Dashboard (customer-support plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'customer-support',
  'customer-health',
  'support',
  'Build an interactive customer health score dashboard with avg health score, at-risk accounts, NPS, churn rate, and retention tracking. Use for customer health monitoring, health score analysis, churn prediction, NPS tracking, risk assessment, engagement analysis, retention strategy, and customer success reviews.',
  $$---
name: customer-health
description: Build an interactive customer health score dashboard with avg health score, at-risk accounts, NPS, churn rate, and retention tracking. Use for customer health monitoring, health score analysis, churn prediction, NPS tracking, risk assessment, engagement analysis, retention strategy, and customer success reviews.
argument-hint: "<customer segment, tier, or account list>"
---

# /customer-health - Customer Health Score Dashboard

Build a self-contained interactive HTML dashboard for customer health scoring — health score tracking, at-risk account identification, NPS analysis, churn rate monitoring, and engagement-based retention insights.

## Usage

```
/customer-health <description of customer segment or account base>
```

## Workflow

### 1. Understand the Health Model

Determine:
- **Health score components**: Product usage, support ticket volume, NPS response, billing status, engagement frequency
- **Scoring scale**: 0-100, with thresholds for Healthy (70+), At Risk (40-69), Critical (<40)
- **Customer tiers**: Enterprise, Mid-Market, SMB, Startup
- **Churn definition**: Contract non-renewal, downgrade, or inactivity threshold
- **NPS cadence**: Quarterly survey, post-interaction, annual
- **Engagement signals**: Login frequency, feature adoption, API calls, support interactions

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify account columns, health score fields, NPS responses, usage metrics, and churn indicators.

**If working from description:** Generate a realistic dataset with 50-100 accounts across tiers, varied health scores, NPS responses, and engagement levels. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Customer Health Dashboard            [Filters]       |
+------------+------------+------------+---------------+
| Avg Health | At-Risk    | NPS        | Churn         |
| Score      | Accounts   |            | Rate          |
+------------------------------------------------------+
| Health Score Distribution (bar)                      |
+------------------------+-----------------------------+
| Churn Risk by          | NPS Trend                   |
| Segment (doughnut)     | (line)                      |
+------------------------+-----------------------------+
| Engagement by Tier (grouped bar)                     |
+------------------------------------------------------+
| Account Health Table (sortable)                      |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, health score distribution bar chart, at-risk account count callout.

**Risk Analysis** — Churn risk by segment doughnut, at-risk account drill-down, trending risk changes.

**NPS** — NPS trend over time, promoter/passive/detractor breakdown, NPS by tier.

**Engagement** — Grouped bar chart of engagement by tier, feature adoption rates, usage frequency.

### 5. KPI Calculations

- **Avg Health Score**: Mean of all account health scores (0-100 scale)
- **At-Risk Accounts**: Count of accounts with health score below 40
- **NPS**: (% Promoters - % Detractors), displayed as integer (-100 to +100)
- **Churn Rate**: (Churned accounts in period / Total accounts at start of period) x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Health score distribution — buckets (0-20, 21-40, 41-60, 61-80, 81-100) with color gradient red to green |
| Doughnut | Churn risk by segment — Enterprise, Mid-Market, SMB proportional slices |
| Line | NPS trend over quarters — score line with promoter/detractor reference bands |
| Grouped bar | Engagement by tier — login frequency, feature usage, API calls side by side per tier |

### 7. Account Health Table

| Account | Health Score | NPS | Last Login | Support Tickets | Usage Trend | Risk Level |
|---------|-------------|-----|------------|-----------------|-------------|------------|

Sortable by any column. Color-code risk: Healthy (green), At Risk (yellow/amber), Critical (red). Usage trend: arrow up/down indicator.

### 8. Filters

- Risk level (Healthy, At Risk, Critical, All)
- Customer tier multi-select (Enterprise, Mid-Market, SMB)
- NPS category (Promoter, Passive, Detractor)
- Health score range slider
- Last login date range
- Account owner dropdown

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
  WHERE plugin_name = 'customer-support' AND skill_name = 'customer-health'
);

-- ============================================================================
-- 3. Design Ops Dashboard (design plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'design',
  'design-ops',
  'design',
  'Build an interactive design operations dashboard with active design projects, avg review cycles, design system coverage, handoff backlog, and workload tracking. Use for design ops, design system management, component coverage, handoff tracking, design sprint planning, figma workflow, review cycle analysis, and designer workload balancing.',
  $$---
name: design-ops
description: Build an interactive design operations dashboard with active design projects, avg review cycles, design system coverage, handoff backlog, and workload tracking. Use for design ops, design system management, component coverage, handoff tracking, design sprint planning, figma workflow, review cycle analysis, and designer workload balancing.
argument-hint: "<design team, project, or sprint>"
---

# /design-ops - Design Operations Dashboard

Build a self-contained interactive HTML dashboard for design operations — project pipeline tracking, review cycle analysis, design system component coverage, handoff management, and designer workload monitoring.

## Usage

```
/design-ops <description of design team or project>
```

## Workflow

### 1. Understand the Design Ops Context

Determine:
- **Project types**: Feature design, redesign, component library, marketing assets, user research
- **Review process**: Number of review rounds, stakeholders involved, approval gates
- **Design system scope**: Total components defined, components with code parity, coverage target
- **Handoff workflow**: Figma to dev, spec documentation, asset export, annotation status
- **Team structure**: Product designers, UX researchers, visual designers, design leads
- **Sprint cadence**: 1-week, 2-week sprints, continuous flow

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify project columns, designer assignments, review cycle counts, component coverage metrics, and handoff statuses.

**If working from description:** Generate a realistic dataset with 15-25 design projects, 6-10 designers, varied review cycles, and component coverage data. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Design Operations Dashboard          [Filters]       |
+------------+------------+------------+---------------+
| Active     | Avg Review | Design     | Handoff       |
| Projects   | Cycles     | System     | Backlog       |
|            |            | Coverage % |               |
+------------------------------------------------------+
| Project Pipeline (horizontal bar)                    |
+------------------------+-----------------------------+
| Review Cycle           | Component Coverage          |
| Trend (line)           | (bar)                       |
+------------------------+-----------------------------+
| Workload by Designer (bar)                           |
+------------------------------------------------------+
| Design Projects Table (sortable)                     |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, project pipeline horizontal bar, handoff backlog callout.

**Pipeline** — Horizontal bar chart of projects by stage (Discovery, Design, Review, Handoff, Done), bottleneck identification.

**Quality** — Review cycle trend over sprints, component coverage bar chart, design system adoption rate.

**Workload** — Bar chart of active projects per designer, capacity utilization, balanced vs overloaded status.

### 5. KPI Calculations

- **Active Design Projects**: Count of projects not in Done or Archived status
- **Avg Review Cycles**: Mean number of review rounds across completed projects
- **Design System Coverage %**: (Components with design system variants / Total UI components) x 100
- **Handoff Backlog**: Count of projects in Handoff stage awaiting developer pickup

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Horizontal bar | Project pipeline — projects grouped by stage (Discovery, Design, Review, Handoff, Done) |
| Line | Review cycle trend over sprints — avg cycles per sprint with target reference line |
| Bar | Component coverage — categories (Buttons, Forms, Navigation, Cards, etc.) with coverage % |
| Bar | Workload by designer — project count per designer, colored by capacity status |

### 7. Design Projects Table

| Project | Designer | Status | Review Cycles | Handoff Date | Components Used |
|---------|----------|--------|---------------|--------------|----------------|

Sortable by any column. Status badges: Discovery (blue), Design (purple), Review (orange), Handoff (yellow), Done (green). Highlight overdue handoffs in red.

### 8. Filters

- Status multi-select (Discovery, Design, Review, Handoff, Done)
- Designer dropdown
- Project type (Feature, Redesign, Component, Marketing)
- Sprint / Period selector
- Overdue toggle (show only overdue handoffs)

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
  WHERE plugin_name = 'design' AND skill_name = 'design-ops'
);

-- ============================================================================
-- 4. Data Quality Dashboard (data plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'data',
  'data-quality',
  'data',
  'Build an interactive data quality monitoring dashboard with overall quality score, tables monitored, failed checks, freshness SLA compliance, and validation tracking. Use for data quality monitoring, freshness tracking, completeness checks, accuracy validation, data governance, pipeline health, and data observability.',
  $$---
name: data-quality
description: Build an interactive data quality monitoring dashboard with overall quality score, tables monitored, failed checks, freshness SLA compliance, and validation tracking. Use for data quality monitoring, freshness tracking, completeness checks, accuracy validation, data governance, pipeline health, and data observability.
argument-hint: "<data source, warehouse, or pipeline>"
---

# /data-quality - Data Quality Monitoring Dashboard

Build a self-contained interactive HTML dashboard for data quality monitoring — quality score tracking, freshness SLA compliance, check failure analysis, table coverage, and validation rule management.

## Usage

```
/data-quality <description of data sources or warehouse>
```

## Workflow

### 1. Understand the Data Quality Context

Determine:
- **Data sources**: Warehouse tables, API feeds, ETL pipelines, streaming sources
- **Quality dimensions**: Freshness, completeness, accuracy, consistency, uniqueness, validity
- **Check types**: Schema validation, null checks, range checks, referential integrity, custom SQL
- **SLA definitions**: Freshness SLA per table (e.g., updated within 1 hour, 6 hours, 24 hours)
- **Monitoring tool**: dbt tests, Great Expectations, Monte Carlo, custom checks
- **Alert thresholds**: Warning at X failures, critical at Y failures

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify table names, check types, run timestamps, pass/fail status, and freshness metrics.

**If working from description:** Generate a realistic dataset with 30-50 monitored tables, varied check types, freshness data, and failure history. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Data Quality Monitoring Dashboard    [Filters]       |
+------------+------------+------------+---------------+
| Overall    | Tables     | Failed     | Freshness     |
| Quality    | Monitored  | Checks     | SLA           |
| Score %    |            | Today      | Compliance    |
+------------------------------------------------------+
| Quality Score Trend (line)                           |
+------------------------+-----------------------------+
| Failures by Check      | Freshness by Source         |
| Type (bar)             | (horizontal bar)            |
+------------------------+-----------------------------+
| Table Coverage (doughnut)                            |
+------------------------------------------------------+
| Quality Checks Table (sortable)                      |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, quality score trend line, today's failure count callout.

**Failures** — Bar chart of failures by check type, failure trend over time, most-failing tables.

**Freshness** — Horizontal bar showing freshness by source against SLA thresholds, stale data alerts.

**Coverage** — Doughnut showing table coverage (monitored vs unmonitored), coverage growth over time.

### 5. KPI Calculations

- **Overall Quality Score %**: (Passed checks / Total checks run) x 100 across all tables
- **Tables Monitored**: Count of distinct tables with at least one active check
- **Failed Checks Today**: Count of check runs with status = FAIL in the current day
- **Freshness SLA Compliance**: (Tables within freshness SLA / Total tables with freshness SLA) x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line | Quality score trend over days/weeks — overall score with 95% target reference line |
| Bar | Failures by check type — Null Check, Schema, Range, Referential, Custom with counts |
| Horizontal bar | Freshness by source — each source's last update time vs SLA threshold, green/red |
| Doughnut | Table coverage — Monitored vs Unmonitored proportional segments |

### 7. Quality Checks Table

| Table | Check Type | Last Run | Status | Records Checked | Failures | Freshness |
|-------|-----------|----------|--------|-----------------|----------|-----------|

Sortable by any column. Status badges: Pass (green), Fail (red), Warning (amber), Skipped (gray). Freshness: show time since last update, red if beyond SLA.

### 8. Filters

- Status multi-select (Pass, Fail, Warning, Skipped)
- Check type dropdown (Null, Schema, Range, Referential, Custom)
- Source / Database dropdown
- Table name search
- Freshness SLA (Met / Breached / All)
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
  WHERE plugin_name = 'data' AND skill_name = 'data-quality'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
