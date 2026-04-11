-- Migration: Seed golden templates for Marketing, Finance, HR, Legal, Executive, and Operations (general).
-- These ensure high-quality dashboard output across all departments regardless of LLM model.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Marketing Performance Dashboard
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'marketing',
  'marketing-dashboard',
  'marketing',
  'Build an interactive marketing performance dashboard with campaign ROI, channel attribution, lead funnel, CAC trends, and conversion tracking.',
  $$---
name: marketing-dashboard
description: Build an interactive marketing performance dashboard with campaign ROI, channel attribution, lead funnel, CAC trends, and conversion tracking. Use when analyzing marketing spend, campaign effectiveness, lead generation, or channel performance.
argument-hint: "<marketing team or campaign data>"
---

# /marketing-dashboard - Marketing Performance Dashboard

Build a self-contained interactive HTML dashboard for marketing performance — campaign ROI, channel attribution, lead funnel visualization, CAC/LTV trends, and conversion tracking.

## Workflow

### 1. Understand the Marketing Org

Determine:
- **Channels**: Paid search, paid social, organic, email, events, content, referral, direct
- **Funnel stages**: Visitor → Lead → MQL → SQL → Opportunity → Customer
- **Budget allocation**: Monthly/quarterly by channel
- **Key metrics**: CAC, LTV, ROAS, CPL, MQL-to-SQL conversion, pipeline contribution
- **Attribution model**: First-touch, last-touch, multi-touch, linear

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Marketing Performance Dashboard      [Filters]       |
+------------+------------+------------+---------------+
| Total      | Customer   | Marketing  | MQL to SQL    |
| Leads      | Acq. Cost  | ROI        | Conv. Rate    |
+------------------------------------------------------+
| Lead Funnel              | Spend by Channel          |
| (horizontal bar)         | (doughnut)                |
+------------------------+-----------------------------+
| Campaign Performance    | Channel Trend               |
| (bar: spend vs revenue) | (line: leads over time)     |
+------------------------+-----------------------------+
| Campaign Detail Table (sortable, filterable)         |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- Total Leads (count, trend vs prior period)
- Customer Acquisition Cost (currency, trend arrow)
- Marketing ROI / ROAS (percentage or multiplier)
- MQL→SQL Conversion Rate (percentage)

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Horizontal bar | Lead funnel by stage (Visitor→Lead→MQL→SQL→Opp→Customer) |
| Doughnut | Budget/spend allocation by channel |
| Grouped bar | Campaign spend vs revenue generated |
| Line | Leads/conversions trend over 12 months |
| Bar | Top performing campaigns by ROI |

### 5. Channel Attribution

Break down by channel: paid search, paid social, organic search, email, events, referral.
Show: spend, leads generated, cost per lead, conversion rate, attributed revenue.
Color-code by performance: green (above target), yellow (near target), red (below target).

### 6. Campaign Table

Columns: Campaign Name, Channel, Status (Active/Paused/Completed), Spend, Leads, CPL, Conversions, Revenue, ROI.
Sortable by any column. Search filter. Status badges color-coded.

### 7. Filters

- Date range picker (7D / 30D / 90D / 1Y)
- Channel multi-select
- Campaign status filter
- Budget range slider

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
  WHERE plugin_name = 'marketing' AND skill_name = 'marketing-dashboard'
);

-- ============================================================================
-- 2. Finance & Budget Dashboard
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'finance',
  'finance-dashboard',
  'finance',
  'Build an interactive finance dashboard with budget allocation, expense tracking, cash flow trends, revenue forecasting, and departmental spend analysis.',
  $$---
name: finance-dashboard
description: Build an interactive finance dashboard with budget allocation, expense tracking, cash flow trends, revenue forecasting, and departmental spend analysis. Use when analyzing budgets, P&L, cash flow, expense categories, or financial planning.
argument-hint: "<finance data or budget period>"
---

# /finance-dashboard - Finance & Budget Dashboard

Build a self-contained interactive HTML dashboard for financial management — budget allocation, expense tracking, cash flow analysis, revenue forecasting, and departmental spend breakdowns.

## Workflow

### 1. Understand the Financial Context

Determine:
- **Reporting period**: Monthly, quarterly, annual, YTD
- **Budget structure**: By department, cost center, project, or category
- **Key metrics**: Revenue, COGS, gross margin, operating expenses, EBITDA, net income
- **Forecast model**: Linear, seasonal, growth-adjusted
- **Currency**: USD, EUR, GBP, or multi-currency

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Finance Dashboard                    [Period]        |
+------------+------------+------------+---------------+
| Total      | Operating  | Gross      | Budget        |
| Revenue    | Expenses   | Margin %   | Variance      |
+------------------------------------------------------+
| Revenue vs Expenses     | Budget Allocation           |
| (line: actual vs plan)  | (doughnut by department)    |
+------------------------+-----------------------------+
| Cash Flow Waterfall     | Expense Category Breakdown  |
| (bar: in/out/net)       | (horizontal bar)            |
+------------------------+-----------------------------+
| Budget vs Actual Table (by department/category)      |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- Total Revenue (currency, % change vs prior period)
- Operating Expenses (currency, trend arrow)
- Gross Margin (percentage, trend arrow)
- Budget Variance (currency or %, over/under indicator)

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line (dual axis) | Revenue vs expenses over 12 months, with plan/forecast as dashed |
| Doughnut | Budget allocation by department |
| Bar (waterfall style) | Cash flow: inflows, outflows, net cash |
| Horizontal bar | Expense breakdown by category (payroll, SaaS, marketing, etc.) |
| Bar | Budget vs actual by department (grouped: budget, actual, variance) |

### 5. Budget vs Actual Analysis

For each department/category:
- Budgeted amount, actual spend, variance ($ and %)
- Color-code: green (under budget), yellow (within 5%), red (over budget)
- Running total and projected year-end based on current burn rate

### 6. Cash Flow

Monthly view: operating inflows, operating outflows, investing, financing, net change.
Running balance line overlay. Highlight months with negative net cash flow.

### 7. Finance Table

Columns: Department/Category, Budget, Actual, Variance ($), Variance (%), Status.
Sortable. Subtotals by group. Status badges: On Track / At Risk / Over Budget.

### 8. Filters

- Period selector (Monthly / Quarterly / Annual / YTD)
- Department multi-select
- Category filter
- Comparison toggle (vs prior year, vs budget, vs forecast)

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
  WHERE plugin_name = 'finance' AND skill_name = 'finance-dashboard'
);

-- ============================================================================
-- 3. HR / People Dashboard
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'human-resources',
  'hr-dashboard',
  'hr',
  'Build an interactive HR dashboard with headcount tracking, attrition trends, hiring pipeline, employee satisfaction scores, and department org breakdown.',
  $$---
name: hr-dashboard
description: Build an interactive HR dashboard with headcount tracking, attrition trends, hiring pipeline, employee satisfaction scores, and department org breakdown. Use when analyzing workforce data, turnover, recruiting, DEI metrics, or employee engagement.
argument-hint: "<HR data or team scope>"
---

# /hr-dashboard - HR / People Dashboard

Build a self-contained interactive HTML dashboard for human resources — headcount tracking, attrition analysis, hiring pipeline, employee satisfaction, and department breakdowns.

## Workflow

### 1. Understand the HR Context

Determine:
- **Org size**: Total headcount, departments, locations
- **Key metrics**: Headcount, attrition rate, time-to-hire, offer acceptance rate, eNPS
- **Reporting cadence**: Monthly, quarterly
- **DEI dimensions**: Gender, ethnicity, age band, tenure, level
- **Hiring stages**: Applied → Screened → Interview → Offer → Hired

### 2. Dashboard Layout

```
+------------------------------------------------------+
| People & HR Dashboard                [Period]        |
+------------+------------+------------+---------------+
| Total      | Attrition  | Open       | Avg Time      |
| Headcount  | Rate       | Positions  | to Hire       |
+------------------------------------------------------+
| Headcount Trend          | Department Breakdown       |
| (line: hires vs exits)   | (doughnut)                 |
+------------------------+-----------------------------+
| Hiring Pipeline          | Satisfaction Scores        |
| (horizontal bar funnel)  | (bar by department)        |
+------------------------+-----------------------------+
| Employee Directory Table (sortable, searchable)      |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- Total Headcount (number, net change this period)
- Attrition Rate (percentage, trend arrow, annualized)
- Open Positions (count, change vs prior month)
- Avg Time to Hire (days, trend arrow)

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line (dual) | Monthly hires vs departures over 12 months |
| Doughnut | Headcount by department |
| Horizontal bar | Hiring pipeline funnel (Applied→Screened→Interview→Offer→Hired) |
| Bar | Employee satisfaction/eNPS by department |
| Stacked bar | Tenure distribution by department |

### 5. Attrition Analysis

Monthly attrition rate = departures / avg headcount * 100.
Break down by: voluntary vs involuntary, department, tenure band, level.
Highlight departments above org-wide average in red.

### 6. Hiring Pipeline

Funnel visualization: Applied → Screened → Interview → Offer → Hired.
Conversion rates between each stage. Average days per stage.
Color progression from light to dark as candidates advance.

### 7. Employee Table

Columns: Name, Department, Role, Level, Location, Start Date, Tenure, Status.
Searchable, sortable. Status badges: Active (green), On Leave (yellow), Exiting (red).

### 8. Filters

- Date range (Monthly / Quarterly / YTD)
- Department multi-select
- Location filter
- Level/band filter

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
  WHERE plugin_name = 'human-resources' AND skill_name = 'hr-dashboard'
);

-- ============================================================================
-- 4. Legal & Compliance Dashboard
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'legal',
  'legal-dashboard',
  'legal',
  'Build an interactive legal dashboard with contract tracking, compliance status, matter pipeline, spend analysis, and deadline management.',
  $$---
name: legal-dashboard
description: Build an interactive legal dashboard with contract tracking, compliance status, matter pipeline, spend analysis, and deadline management. Use when analyzing legal matters, contract lifecycle, regulatory compliance, outside counsel spend, or litigation status.
argument-hint: "<legal team or contract data>"
---

# /legal-dashboard - Legal & Compliance Dashboard

Build a self-contained interactive HTML dashboard for legal operations — contract tracking, compliance monitoring, matter pipeline, legal spend analysis, and deadline management.

## Workflow

### 1. Understand the Legal Context

Determine:
- **Practice areas**: Corporate, employment, IP, regulatory, litigation, commercial contracts
- **Contract types**: NDA, MSA, SaaS, employment, vendor, partnership
- **Compliance frameworks**: SOC 2, GDPR, HIPAA, SOX, industry-specific
- **Key metrics**: Open matters, contracts pending, avg review time, outside counsel spend
- **Risk levels**: Critical, high, medium, low

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Legal & Compliance Dashboard         [Period]        |
+------------+------------+------------+---------------+
| Active     | Contracts  | Compliance | Legal Spend   |
| Matters    | Pending    | Score %    | This Quarter  |
+------------------------------------------------------+
| Matter Pipeline          | Spend by Category         |
| (horizontal bar by stage)| (doughnut)                |
+------------------------+-----------------------------+
| Compliance Status       | Contract Expiry Timeline   |
| (bar by framework)      | (line: upcoming deadlines) |
+------------------------+-----------------------------+
| Contracts & Matters Table (sortable, filterable)     |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- Active Matters (count, change vs prior quarter)
- Contracts Pending Review (count, avg days in review)
- Compliance Score (percentage across all frameworks)
- Legal Spend This Quarter (currency, vs budget)

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Horizontal bar | Matter pipeline by stage (Intake→Review→Active→Resolution→Closed) |
| Doughnut | Legal spend by category (outside counsel, internal, filing fees, settlements) |
| Bar | Compliance status by framework (% compliant per SOC2, GDPR, HIPAA, etc.) |
| Line | Contract expirations and renewals over next 12 months |
| Bar | Matters by practice area and priority |

### 5. Compliance Tracking

For each framework: total controls, compliant count, non-compliant, in-progress.
Overall score = compliant / total * 100. Color: green (>90%), yellow (70-90%), red (<70%).
List overdue items with days overdue and assigned owner.

### 6. Contract Lifecycle

Stages: Draft → Internal Review → Counterparty Review → Negotiation → Executed → Active → Expiring.
Avg days per stage. Bottleneck identification. Renewal alerts for contracts expiring within 90 days.

### 7. Legal Table

Columns: Matter/Contract Name, Type, Status, Priority, Assigned To, Created, Deadline, Value.
Sortable. Priority badges: Critical (red), High (orange), Medium (yellow), Low (green).

### 8. Filters

- Date range (30D / 90D / 1Y / All)
- Practice area / type multi-select
- Status filter
- Priority filter
- Assigned attorney filter

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
  WHERE plugin_name = 'legal' AND skill_name = 'legal-dashboard'
);

-- ============================================================================
-- 5. Executive Summary Dashboard
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'executive',
  'executive-dashboard',
  'admin',
  'Build an interactive executive summary dashboard with company KPIs, revenue performance, department scorecards, team health, and strategic initiative tracking.',
  $$---
name: executive-dashboard
description: Build an interactive executive summary dashboard with company KPIs, revenue performance, department scorecards, team health, and strategic initiative tracking. Use when building C-suite views, board reports, company-wide performance summaries, or leadership dashboards.
argument-hint: "<company or leadership scope>"
---

# /executive-dashboard - Executive Summary Dashboard

Build a self-contained interactive HTML dashboard for executive leadership — company-wide KPIs, revenue performance, department scorecards, team health metrics, and strategic initiative tracking.

## Workflow

### 1. Understand the Executive Context

Determine:
- **Company stage**: Startup, growth, enterprise
- **Key business metrics**: ARR/MRR, growth rate, burn rate, runway, headcount
- **Departments to track**: Sales, Marketing, Product, Engineering, Finance, HR
- **Strategic initiatives**: OKRs, quarterly goals, major projects
- **Board reporting needs**: Investor metrics, unit economics

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Executive Dashboard                  [Quarter]       |
+------------+------------+------------+---------------+
| Revenue    | Growth     | Burn Rate  | Runway        |
| (ARR/MRR)  | Rate %     | (monthly)  | (months)      |
+------------------------------------------------------+
| Revenue Trend            | Revenue by Segment        |
| (line: actual vs target) | (doughnut)                |
+------------------------+-----------------------------+
| Department Scorecards   | Team Health                 |
| (bar: targets vs actual)| (bar: satisfaction scores)  |
+------------------------+-----------------------------+
| Strategic Initiatives Table (OKRs/goals tracker)     |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- Revenue / ARR (currency, % growth vs prior period)
- Growth Rate (percentage, MoM or QoQ)
- Burn Rate (monthly spend, trend arrow)
- Runway (months remaining at current burn, alert if <12)

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line (dual) | Revenue actual vs plan/target over 12 months |
| Doughnut | Revenue segmentation (by product, region, or customer tier) |
| Grouped bar | Department scorecards: target vs actual for each dept KPI |
| Bar | Team health / eNPS scores by department |
| Line | Monthly growth rate trend with target line |

### 5. Department Scorecards

For each department show 2-3 key metrics with target vs actual:
- Sales: Pipeline, closed revenue, win rate
- Marketing: Leads, CAC, campaign ROI
- Product: Feature velocity, bug count, NPS
- Engineering: Sprint velocity, uptime, deploy frequency
- Finance: Burn rate, gross margin, collections
- HR: Headcount, attrition, time-to-hire

Color-code: green (≥100% of target), yellow (80-99%), red (<80%).

### 6. Strategic Initiatives

OKR or goal tracker: Objective, Key Results, Owner, Progress (%), Status, Due Date.
Progress bar visualization. Status: On Track (green), At Risk (yellow), Behind (red), Complete (blue).

### 7. Executive Table

Columns: Initiative, Owner, Department, Progress, Status, Target Date, Notes.
Sortable. Progress bar in cell. Status badges color-coded.

### 8. Filters

- Period selector (Monthly / Quarterly / Annual / YTD)
- Department filter
- Initiative status filter
- Comparison toggle (vs prior period, vs plan)

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
  WHERE plugin_name = 'executive' AND skill_name = 'executive-dashboard'
);

-- ============================================================================
-- 6. Operations Management Dashboard (general — replaces youth-sports-only)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'operations',
  'operations-dashboard',
  'operations',
  'Build an interactive operations dashboard with workflow tracking, resource utilization, project timelines, SLA compliance, and process efficiency metrics.',
  $$---
name: operations-dashboard
description: Build an interactive operations dashboard with workflow tracking, resource utilization, project timelines, SLA compliance, and process efficiency metrics. Use when analyzing operational workflows, capacity planning, project delivery, supply chain, or service-level performance.
argument-hint: "<operations team or process data>"
---

# /operations-dashboard - Operations Management Dashboard

Build a self-contained interactive HTML dashboard for operations — workflow tracking, resource utilization, project timelines, SLA compliance, and process efficiency analysis.

## Workflow

### 1. Understand the Operations Context

Determine:
- **Operations type**: Project delivery, supply chain, service ops, IT ops, facilities
- **Key metrics**: Throughput, cycle time, utilization rate, SLA compliance, on-time delivery
- **Workflow stages**: Backlog → In Progress → Review → Done (or custom pipeline)
- **Resource model**: Teams, individuals, contractors, capacity hours
- **SLA targets**: Response time, resolution time, uptime, delivery deadlines

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Operations Dashboard                 [Period]        |
+------------+------------+------------+---------------+
| Active     | Avg Cycle  | Resource   | SLA           |
| Projects   | Time       | Util. %    | Compliance %  |
+------------------------------------------------------+
| Project Pipeline         | Resource Utilization       |
| (horizontal bar by stage)| (bar by team/person)       |
+------------------------+-----------------------------+
| Throughput Trend        | SLA Performance             |
| (line: completed/week)  | (bar: met vs missed)        |
+------------------------+-----------------------------+
| Project / Task Tracker Table (sortable, filterable)  |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- Active Projects/Tasks (count, change vs prior period)
- Avg Cycle Time (days, trend arrow)
- Resource Utilization (percentage, by capacity vs allocated)
- SLA Compliance Rate (percentage, trend arrow)

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Horizontal bar | Project pipeline by stage (Backlog→In Progress→Review→Done) |
| Bar | Resource utilization by team member or team |
| Line | Weekly throughput trend (tasks/projects completed) |
| Grouped bar | SLA targets met vs missed by category |
| Doughnut | Work distribution by project type or priority |

### 5. Resource Management

For each resource/team: total capacity hours, allocated hours, utilization %.
Color-code: green (70-85% utilized), yellow (85-95%), red (>95% overloaded or <50% underutilized).
Identify bottlenecks and available capacity.

### 6. SLA Tracking

By category: target time, actual avg time, compliance %.
Trend line showing compliance over last 12 weeks/months.
Flag categories below 95% compliance threshold.

### 7. Operations Table

Columns: Project/Task, Owner, Priority, Stage, Start Date, Due Date, Cycle Time, Status.
Sortable. Status badges: On Track, At Risk, Overdue, Complete. Priority: P0-P3 color-coded.

### 8. Filters

- Date range (7D / 30D / 90D / 1Y)
- Stage/status multi-select
- Team/owner filter
- Priority filter
- Project type filter

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
  WHERE plugin_name = 'operations' AND skill_name = 'operations-dashboard'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
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
-- Migration: Seed 4 Marketing golden template skills into skill_registry.
-- Email Analytics, Social Media, Event Management, ABM Dashboard.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Email Analytics Dashboard (marketing plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'marketing',
  'email-analytics',
  'marketing',
  'Build an interactive email marketing performance dashboard with open rates, click-through rates, subscriber growth, campaign comparisons, deliverability metrics, and segment engagement. Use for email, newsletter, open rate, click rate, subscribers, campaigns, deliverability analysis.',
  $$---
name: email-analytics
description: Build an interactive email marketing performance dashboard with open rates, click-through rates, subscriber growth, campaign comparisons, deliverability metrics, and segment engagement. Use for email, newsletter, open rate, click rate, subscribers, campaigns, deliverability analysis.
argument-hint: "<email platform or campaign description>"
---

# /email-analytics - Email Marketing Performance Dashboard

Build a self-contained interactive HTML dashboard for email marketing analytics — open/click rates, campaign performance, subscriber growth, segment engagement, and deliverability health.

## Usage

```
/email-analytics <description of email platform or campaign set>
```

## Workflow

### 1. Understand the Email Program

Determine:
- **Email types**: Newsletter, promotional, transactional, drip/nurture, re-engagement
- **Send frequency**: Daily, weekly, bi-weekly, monthly
- **Audience size**: Total subscribers, active vs dormant segmentation
- **Platform**: Mailchimp, SendGrid, HubSpot, Klaviyo, or custom
- **Key goals**: Revenue per email, list growth, engagement uplift, churn reduction

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify campaign columns, metric columns, date fields.

**If working from description:** Generate a realistic sample dataset with 20-40 campaigns over 6 months. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Email Analytics Dashboard            [Filters]       |
+------------+------------+------------+---------------+
| Open Rate  | Click-     | Unsubscribe| Revenue       |
| (%)        | Through    | Rate (%)   | per Email ($) |
|            | Rate (%)   |            |               |
+------------------------------------------------------+
| OVERVIEW                                             |
+------------------------+-----------------------------+
| Open/Click Trends      | Performance by Campaign     |
| (line over time)       | (bar chart)                 |
+------------------------+-----------------------------+
| CAMPAIGNS                                            |
+------------------------------------------------------+
| Campaign Detail Table (sortable, filterable)         |
| Campaign | Sent | Opens | Clicks | CTR | Unsubs |   |
| Revenue                                              |
+------------------------------------------------------+
| SEGMENTS                                             |
+------------------------+-----------------------------+
| Subscriber Growth      | Engagement by Segment       |
| (line over time)       | (grouped bar)               |
+------------------------+-----------------------------+
| DELIVERABILITY                                       |
+------------------------------------------------------+
| Bounce rate, spam complaints, inbox placement        |
+------------------------------------------------------+
```

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line | Open/click rate trends over time (dual axis) |
| Bar | Performance comparison across campaigns |
| Line | Subscriber growth over time (total, new, churned) |
| Grouped bar | Engagement metrics by audience segment |

### 5. KPI Calculations

- Open Rate: unique opens / delivered x 100
- Click-Through Rate (CTR): unique clicks / delivered x 100
- Click-to-Open Rate (CTOR): unique clicks / unique opens x 100
- Unsubscribe Rate: unsubscribes / delivered x 100
- Revenue per Email: total email-attributed revenue / emails delivered
- Bounce Rate: bounces / sent x 100
- List Growth Rate: (new subscribers - unsubscribes) / total list x 100

### 6. Sections

**Overview** - Top KPI cards plus trend lines. At-a-glance health of the email program.

**Campaigns** - Sortable table with per-campaign drill-down: Campaign name, Date sent, Sent count, Opens, Clicks, CTR, Unsubscribes, Revenue. Color-code CTR: green (above avg), yellow (at avg), red (below avg).

**Segments** - Grouped bar comparing open rate, CTR, and revenue across segments (e.g., new subscribers, engaged, dormant, VIP). Subscriber growth line chart.

**Deliverability** - Bounce rate trend, spam complaint rate, inbox vs spam placement ratio. Flag any metric exceeding industry thresholds (bounce >2%, spam >0.1%).

### 7. Filters

- Date range pickers
- Campaign type dropdown (newsletter, promotional, drip, transactional)
- Segment dropdown
- Send status (sent, scheduled, draft)

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
  WHERE plugin_name = 'marketing' AND skill_name = 'email-analytics'
);

-- ============================================================================
-- 2. Social Media Analytics Dashboard (marketing plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'marketing',
  'social-media',
  'marketing',
  'Build an interactive social media analytics dashboard with follower growth, engagement rates, post performance, reach trends, and platform comparisons. Use for social media, followers, engagement, posts, impressions, reach, instagram, linkedin, twitter analysis.',
  $$---
name: social-media
description: Build an interactive social media analytics dashboard with follower growth, engagement rates, post performance, reach trends, and platform comparisons. Use for social media, followers, engagement, posts, impressions, reach, instagram, linkedin, twitter analysis.
argument-hint: "<social platforms or brand name>"
---

# /social-media - Social Media Analytics Dashboard

Build a self-contained interactive HTML dashboard for social media analytics — follower growth, engagement rates, post performance, reach and impressions, and cross-platform comparison.

## Usage

```
/social-media <description of social platforms or brand>
```

## Workflow

### 1. Understand the Social Presence

Determine:
- **Platforms**: Instagram, LinkedIn, Twitter/X, Facebook, TikTok, YouTube
- **Content types**: Image, video, carousel, story, reel, text post, article
- **Posting frequency**: Daily, 3x/week, weekly per platform
- **Audience**: B2B, B2C, mixed; demographics and regions
- **Goals**: Brand awareness, lead generation, community building, traffic

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify platform, post type, date, and metric columns.

**If working from description:** Generate a realistic sample dataset with 50-100 posts across 3 months and multiple platforms. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Social Media Dashboard               [Filters]       |
+------------+------------+------------+---------------+
| Total      | Engagement | Total      | Social-       |
| Followers  | Rate (%)   | Reach      | Attributed    |
|            |            |            | Conversions   |
+------------------------------------------------------+
| OVERVIEW                                             |
+------------------------+-----------------------------+
| Follower Growth by     | Engagement by Content Type  |
| Platform (line)        | (bar chart)                 |
+------------------------+-----------------------------+
| BY PLATFORM                                          |
+------------------------------------------------------+
| Platform cards: per-platform KPIs + sparklines       |
+------------------------------------------------------+
| CONTENT PERFORMANCE                                  |
+------------------------+-----------------------------+
| Post Performance       | Reach Trend                 |
| (bar chart)            | (line chart)                |
+------------------------+-----------------------------+
| Post Performance Table (sortable, filterable)        |
| Date | Platform | Content | Impressions | Engagement |
| | Clicks | Shares                                    |
+------------------------------------------------------+
| AUDIENCE                                             |
+------------------------------------------------------+
| Demographics, top regions, growth sources            |
+------------------------------------------------------+
```

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line | Follower growth over time, one series per platform |
| Bar | Engagement metrics by content type (image, video, carousel, etc.) |
| Bar | Top posts by engagement or impressions |
| Line | Reach/impressions trend over time |

### 5. KPI Calculations

- Total Followers: sum of followers across all active platforms
- Engagement Rate: (likes + comments + shares) / impressions x 100
- Reach: unique accounts that saw content in period
- Impressions: total views (including repeats)
- Social-Attributed Conversions: conversions tracked via UTM or pixel from social
- Virality Rate: shares / impressions x 100
- Amplification Rate: shares per post / total followers x 100

### 6. Sections

**Overview** - Aggregate KPI cards plus follower growth line and engagement-by-type bar. High-level health of the social program.

**By Platform** - Card per platform showing followers, engagement rate, best post, posting frequency. Platform-color coded (Instagram gradient, LinkedIn blue, Twitter/X black, Facebook blue, TikTok pink/cyan).

**Content Performance** - Bar chart of top-performing posts. Sortable table: Date, Platform, Content type, Caption preview, Impressions, Engagement, Clicks, Shares. Reach trend line.

**Audience** - Follower demographics (age, gender if available), top geographic regions, follower source breakdown (organic, paid, viral).

### 7. Filters

- Date range pickers
- Platform multi-select
- Content type dropdown (image, video, carousel, story, reel, article)
- Metric selector (engagement, impressions, reach, clicks)

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
  WHERE plugin_name = 'marketing' AND skill_name = 'social-media'
);

-- ============================================================================
-- 3. Event Management Dashboard (marketing plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'marketing',
  'event-management',
  'marketing',
  'Build an interactive event and webinar management dashboard with registrations, attendance rates, lead conversion, event ROI, and scheduling. Use for event, webinar, conference, registrations, attendance, event ROI, speakers management.',
  $$---
name: event-management
description: Build an interactive event and webinar management dashboard with registrations, attendance rates, lead conversion, event ROI, and scheduling. Use for event, webinar, conference, registrations, attendance, event ROI, speakers management.
argument-hint: "<event program or conference name>"
---

# /event-management - Event / Webinar Management Dashboard

Build a self-contained interactive HTML dashboard for event and webinar management — registration tracking, attendance analytics, lead conversion, ROI measurement, and event scheduling.

## Usage

```
/event-management <description of event program or conference>
```

## Workflow

### 1. Understand the Event Program

Determine:
- **Event types**: Webinar, conference, trade show, workshop, meetup, product launch
- **Frequency**: One-off, series (monthly webinars), annual conference
- **Scale**: Attendees per event (50-person webinar vs 5,000-person conference)
- **Goals**: Lead generation, brand awareness, customer education, partner engagement
- **Revenue model**: Free, paid tickets, sponsored, hybrid

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify event name, date, type, registration, attendance, and conversion columns.

**If working from description:** Generate a realistic sample dataset with 15-30 events over 12 months across multiple event types. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Event Management Dashboard           [Filters]       |
+------------+------------+------------+---------------+
| Total      | Attendance | Lead Conv  | Cost per      |
| Registra-  | Rate (%)   | from       | Attendee ($)  |
| tions      |            | Events     |               |
+------------------------------------------------------+
| OVERVIEW                                             |
+------------------------+-----------------------------+
| Registration vs        | Leads Generated by Event    |
| Attendance (grouped    | (bar chart)                 |
| bar)                   |                             |
+------------------------+-----------------------------+
| UPCOMING EVENTS                                      |
+------------------------------------------------------+
| Upcoming events list with registration progress bars |
+------------------------------------------------------+
| PAST PERFORMANCE                                     |
+------------------------+-----------------------------+
| Event ROI              | Registration Timeline       |
| (bar chart)            | (line chart)                |
+------------------------+-----------------------------+
| Event Detail Table (sortable, filterable)            |
| Event | Date | Type | Registrations | Attended |    |
| Leads | Cost | ROI                                   |
+------------------------------------------------------+
| LEAD CONVERSION                                      |
+------------------------------------------------------+
| Conversion funnel: registered > attended > engaged > |
| MQL > SQL by event                                   |
+------------------------------------------------------+
```

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Grouped bar | Registration count vs attendance count per event |
| Bar | Leads generated per event |
| Bar | Event ROI comparison (revenue or pipeline vs cost) |
| Line | Registration timeline (cumulative registrations over time leading up to events) |

### 5. KPI Calculations

- Total Registrations: sum of registrations across all events in period
- Attendance Rate: total attended / total registered x 100
- Lead Conversion from Events: leads generated from events / total attendees x 100
- Cost per Attendee: total event spend / total attendees
- Event ROI: (pipeline or revenue attributed - event cost) / event cost x 100
- No-Show Rate: (registered - attended) / registered x 100
- Avg Registrations per Event: total registrations / event count

### 6. Sections

**Overview** - Top KPI cards plus registration-vs-attendance grouped bar and leads-by-event bar. Snapshot of event program health.

**Upcoming Events** - Cards or list for future events: event name, date, type, venue/platform, registration count vs capacity, progress bar. Days until event. Speaker names.

**Past Performance** - Event ROI bar chart. Registration timeline line showing how registrations accumulated before each event. Sortable table: Event, Date, Type, Registrations, Attended, Leads, Cost, ROI. Color-code ROI: green (>100%), yellow (0-100%), red (<0%).

**Lead Conversion** - Funnel visualization: Registered > Attended > Engaged (asked questions / visited booth) > MQL > SQL. Conversion rate at each stage. Breakdown by event type.

### 7. Filters

- Date range pickers
- Event type dropdown (webinar, conference, trade show, workshop, meetup)
- Status (upcoming, completed, cancelled)
- Region / location

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
  WHERE plugin_name = 'marketing' AND skill_name = 'event-management'
);

-- ============================================================================
-- 4. Account-Based Marketing (ABM) Dashboard (marketing plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'marketing',
  'abm-dashboard',
  'marketing',
  'Build an interactive account-based marketing dashboard with target account engagement, pipeline attribution, engagement scoring, account penetration, and tier analysis. Use for ABM, account based, target accounts, engagement score, account penetration, intent signal tracking.',
  $$---
name: abm-dashboard
description: Build an interactive account-based marketing dashboard with target account engagement, pipeline attribution, engagement scoring, account penetration, and tier analysis. Use for ABM, account based, target accounts, engagement score, account penetration, intent signal tracking.
argument-hint: "<ABM program or target account list>"
---

# /abm-dashboard - Account-Based Marketing Dashboard

Build a self-contained interactive HTML dashboard for account-based marketing — target account engagement tracking, pipeline attribution, engagement scoring, account penetration rates, and tier-based analysis.

## Usage

```
/abm-dashboard <description of ABM program or target account list>
```

## Workflow

### 1. Understand the ABM Program

Determine:
- **ABM model**: One-to-one (strategic), one-to-few (lite), one-to-many (programmatic)
- **Account tiers**: Tier 1 (strategic, high-touch), Tier 2 (mid-touch), Tier 3 (programmatic)
- **Target account list size**: 10-50 (strategic) to 500+ (programmatic)
- **Engagement channels**: Direct mail, ads, email, events, content, sales outreach
- **Intent data sources**: Bombora, 6sense, G2, TrustRadius, or manual signals

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify account name, tier, contacts, engagement metrics, pipeline, and stage columns.

**If working from description:** Generate a realistic sample dataset with 30-60 target accounts across 3 tiers with engagement and pipeline data. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| ABM Dashboard                        [Filters]       |
+------------+------------+------------+---------------+
| Target     | Pipeline   | Avg        | Account       |
| Accounts   | from ABM   | Engagement | Penetration   |
| Engaged    | ($)        | Score      | Rate (%)      |
+------------------------------------------------------+
| OVERVIEW                                             |
+------------------------+-----------------------------+
| Account Engagement     | Pipeline by Account         |
| Tiers (doughnut)       | (horizontal bar)            |
+------------------------+-----------------------------+
| ACCOUNT TIERS                                        |
+------------------------------------------------------+
| Tier breakdown cards with account counts, avg        |
| engagement, pipeline, and conversion rates           |
+------------------------------------------------------+
| PIPELINE                                             |
+------------------------+-----------------------------+
| Engagement Trend       | Channel Effectiveness       |
| (line over time)       | (bar chart)                 |
+------------------------+-----------------------------+
| ENGAGEMENT                                           |
+------------------------------------------------------+
| Account Detail Table (sortable, filterable)          |
| Account | Tier | Contacts Engaged | Engagement      |
| Score | Pipeline Value | Stage | Last Touch          |
+------------------------------------------------------+
```

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Doughnut | Account distribution across engagement tiers (highly engaged, warming, cold) |
| Horizontal bar | Pipeline value by account (top accounts, sorted descending) |
| Line | Aggregate engagement score trend over time |
| Bar | Channel effectiveness (engagement contribution by channel: ads, email, events, content, direct mail) |

### 5. KPI Calculations

- Target Accounts Engaged: count of accounts with engagement score > threshold in period
- Pipeline from ABM: sum of pipeline value for deals linked to ABM target accounts
- Avg Engagement Score: mean engagement score across all target accounts (0-100 scale)
- Account Penetration Rate: accounts with 2+ contacts engaged / total target accounts x 100
- Multi-Threading Score: avg contacts engaged per account
- ABM-Influenced Revenue: closed-won revenue from target accounts
- Engagement Velocity: rate of engagement score change over time

### 6. Engagement Scoring Model

Weight engagement signals:
- Website visit: 1 pt
- Content download: 5 pts
- Email open: 2 pts
- Email click: 5 pts
- Ad click: 3 pts
- Event registration: 10 pts
- Event attendance: 15 pts
- Meeting booked: 20 pts
- Intent signal: 10 pts

Engagement tiers: Hot (75-100), Warm (40-74), Cool (15-39), Cold (0-14).
Color code: Hot=#2e7d32, Warm=#f9a825, Cool=#ef6c00, Cold=#c62828.

### 7. Sections

**Overview** - Top KPI cards plus engagement tier doughnut and pipeline-by-account horizontal bar. At-a-glance ABM program health.

**Account Tiers** - Card per tier: account count, avg engagement score, total pipeline, conversion rate, top account name. Progress bar showing engaged vs total accounts per tier.

**Pipeline** - Engagement trend line (weekly or monthly avg engagement score). Channel effectiveness bar chart. Pipeline stage breakdown for ABM accounts vs non-ABM comparison.

**Engagement** - Sortable detail table: Account, Tier, Contacts Engaged, Engagement Score (with color-coded badge), Pipeline Value, Deal Stage, Last Touch Date. Search by account name. Inline sparkline for engagement trend per account.

### 8. Filters

- Account tier dropdown (Tier 1, Tier 2, Tier 3)
- Engagement level (hot, warm, cool, cold)
- Pipeline stage
- Date range pickers
- Industry / vertical

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
  WHERE plugin_name = 'marketing' AND skill_name = 'abm-dashboard'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
-- Migration: Seed 4 specialized Finance department golden templates into skill_registry.
-- P&L Dashboard, Accounts Payable, Expense Report, Procurement Tracker.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Profit & Loss / Income Statement Dashboard (finance plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'finance',
  'pnl-dashboard',
  'finance',
  'Build an interactive profit and loss dashboard with revenue, COGS, gross margin, net income, expense breakdown, and income statement line items. Use for profit loss, income statement, PnL, revenue, expenses, gross margin, net income, COGS analysis.',
  $$---
name: pnl-dashboard
description: Build an interactive profit and loss dashboard with revenue, COGS, gross margin, net income, expense breakdown, and income statement line items. Use for profit loss, income statement, PnL, revenue, expenses, gross margin, net income, COGS analysis.
argument-hint: "<P&L data source or reporting period>"
---

# /pnl-dashboard - Profit & Loss / Income Statement Dashboard

Build a self-contained interactive HTML dashboard for profit and loss analysis — revenue trends, cost of goods sold, gross margin tracking, expense breakdowns by category, and a full income statement comparison table.

## Usage

```
/pnl-dashboard <description of P&L data or reporting period>
```

## Workflow

### 1. Understand the Financial Structure

Determine:
- **Reporting period**: Monthly, quarterly, annual, YTD
- **Revenue streams**: Product lines, services, segments, regions
- **Cost structure**: COGS components, operating expenses, SG&A, R&D
- **Comparison basis**: Prior period, prior year, budget/forecast
- **Currency and rounding**: USD/EUR/GBP, thousands or millions

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Profit & Loss Dashboard              [Period]        |
+------------+------------+------------+---------------+
| Total      | COGS       | Gross      | Net           |
| Revenue    |            | Margin %   | Income        |
+------------------------------------------------------+
| Revenue vs Expenses     | Expense Breakdown           |
| (line: 12-month trend)  | (doughnut by category)      |
+------------------------+-----------------------------+
| Gross Margin Trend      | Revenue by Segment          |
| (line: monthly %)       | (bar chart)                 |
+------------------------+-----------------------------+
| P&L Line Items Table                                 |
| (Category | Current | Prior | Var $ | Var % | YTD)   |
+------------------------------------------------------+
```

### 3. KPI Cards (4 required)

- Total Revenue (currency, % change vs prior period, trend arrow)
- Cost of Goods Sold (currency, % of revenue, trend arrow)
- Gross Margin % (percentage, change in basis points vs prior period)
- Net Income (currency, % change vs prior period, positive=green / negative=red)

### 4. Sections

Organize the dashboard into these sections:
- **Overview** - KPI cards and high-level summary
- **Revenue** - Revenue trends, segment breakdown, growth analysis
- **Expenses** - Expense categories, cost drivers, variance analysis
- **Margins** - Gross margin trend, operating margin, net margin waterfall

### 5. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line (dual series) | Revenue vs total expenses trend over 12 months, area shading between |
| Doughnut | Expense breakdown by category (Payroll, COGS, Marketing, R&D, SG&A, Other) |
| Line | Gross margin % trend over 12 months with target reference line |
| Bar | Revenue by segment/product line (vertical, colored by segment) |

### 6. Revenue vs Expenses Trend

X-axis: months. Two line series: revenue (solid green) and total expenses (solid red).
Shaded area between lines represents profit (green shade) or loss (red shade).
Include month-over-month growth rate annotation on revenue line.

### 7. Expense Breakdown

Doughnut chart with 6-8 categories: Payroll & Benefits, Cost of Goods Sold, Marketing & Sales, Research & Development, General & Administrative, Rent & Facilities, Technology & Software, Other.
Each slice labeled with category name and percentage. Legend below chart.

### 8. Gross Margin Trend

Line chart showing gross margin % over 12 months.
Horizontal dashed reference line at target margin (e.g., 65%).
Color: green when above target, red when below. Annotate min/max points.

### 9. Revenue by Segment

Vertical bar chart. One bar per segment/product line.
Sorted descending by revenue. Color-coded by segment.
Show YoY growth % above each bar.

### 10. P&L Line Items Table

Full income statement table with columns:
- Category (indented hierarchy: Revenue > COGS > Gross Profit > OpEx > Operating Income > Other > Net Income)
- Current Period (currency)
- Prior Period (currency)
- Variance $ (green positive, red negative)
- Variance % (green positive, red negative)
- YTD (currency)

Bold subtotal rows for: Gross Profit, Total Operating Expenses, Operating Income, Net Income.
Alternating row shading for readability.

### 11. Filters

- Period selector (Monthly / Quarterly / Annual / YTD)
- Comparison toggle (vs Prior Period / vs Prior Year / vs Budget)
- Segment/product filter
- Department filter (for expense drill-down)

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
  WHERE plugin_name = 'finance' AND skill_name = 'pnl-dashboard'
);

-- ============================================================================
-- 2. Accounts Payable Dashboard (finance plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'finance',
  'accounts-payable',
  'finance',
  'Build an interactive accounts payable dashboard with AP aging, vendor management, payment tracking, and overdue invoice analysis. Use for accounts payable, invoices, vendors, aging, payment, overdue, AP, bills tracking.',
  $$---
name: accounts-payable
description: Build an interactive accounts payable dashboard with AP aging, vendor management, payment tracking, and overdue invoice analysis. Use for accounts payable, invoices, vendors, aging, payment, overdue, AP, bills tracking.
argument-hint: "<AP data source or vendor list>"
---

# /accounts-payable - Accounts Payable Dashboard

Build a self-contained interactive HTML dashboard for accounts payable management — AP aging analysis, vendor concentration, payment trends, overdue tracking, and early payment discount optimization.

## Usage

```
/accounts-payable <description of AP data or vendor scope>
```

## Workflow

### 1. Understand the AP Context

Determine:
- **Vendor count**: Total active vendors, critical suppliers
- **Invoice volume**: Monthly invoice count, average invoice amount
- **Payment terms**: Net 30, Net 45, Net 60, 2/10 Net 30 (early pay discounts)
- **Approval workflow**: Single approver, multi-tier, threshold-based
- **Currency**: Single or multi-currency payables

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Accounts Payable Dashboard           [Period]        |
+------------+------------+------------+---------------+
| Total AP   | Avg Days   | Overdue    | Discount      |
| Outstanding| to Pay     | Amount     | Captured      |
+------------------------------------------------------+
| AP Aging Buckets         | Payment Trend               |
| (bar: current/30/60/90+)| (line: monthly payments)    |
+------------------------+-----------------------------+
| Vendor Concentration    | Early Payment Savings        |
| (doughnut: top vendors) | (bar: captured vs missed)   |
+------------------------+-----------------------------+
| Invoice Detail Table                                 |
| (Vendor | Invoice# | Amount | Due | Days | Status)  |
+------------------------------------------------------+
```

### 3. KPI Cards (4 required)

- Total AP Outstanding (currency, % change vs prior period, trend arrow)
- Avg Days to Pay (days, trend arrow, vs payment term target)
- Overdue Amount (currency, % of total AP, red highlight if >10%)
- Discount Captured (currency saved this period, % of available discounts taken)

### 4. Sections

Organize the dashboard into these sections:
- **Overview** - KPI cards and high-level AP health summary
- **Aging** - AP aging buckets, aging trend, overdue analysis
- **Vendors** - Vendor concentration, top vendors, payment history
- **Payment Schedule** - Upcoming payments, cash requirement forecast, discount opportunities

### 5. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | AP aging buckets: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days (color: green to red gradient) |
| Line | Payment trend over 12 months (amount paid per month) |
| Doughnut | Vendor concentration: top 5 vendors by outstanding AP, plus \"Other\" |
| Bar | Early payment savings: discount captured vs discount missed per month |

### 6. AP Aging Buckets

Vertical bar chart with 5 buckets:
- Current (not yet due): green (#4caf50)
- 1-30 days past due: yellow (#ffeb3b)
- 31-60 days past due: orange (#ff9800)
- 61-90 days past due: deep orange (#ff5722)
- 90+ days past due: red (#d32f2f)

Show count of invoices and total amount for each bucket. Label bars with dollar amount.

### 7. Payment Trend

Line chart over 12 months showing total payments made per month.
Include a secondary line or annotation for number of invoices paid.
Highlight months with unusually high or low payments.

### 8. Vendor Concentration

Doughnut chart showing top 5 vendors by outstanding AP balance.
\"Other\" slice for remaining vendors. Click on slice to filter table below.
Include vendor risk note: if any single vendor exceeds 25% of total AP.

### 9. Early Payment Savings

Bar chart with two series per month:
- Discount captured (green): early payment discounts successfully taken
- Discount missed (red): discounts available but not taken due to late payment
Annotate total annual savings potential.

### 10. Invoice Detail Table

Columns:
- Vendor Name
- Invoice # (text)
- Amount (currency, right-aligned)
- Due Date (date, highlight overdue in red)
- Days Outstanding (number, color-coded by aging bucket)
- Status (badge: Paid/Approved/Pending/Overdue/Disputed)
- Priority (High/Medium/Low based on amount and days outstanding)

Sortable by any column. Search filter for vendor name or invoice number.
Paginated if >25 rows. Subtotal row showing total outstanding.

### 11. Filters

- Date range picker (30D / 60D / 90D / 1Y)
- Vendor multi-select
- Status filter (All / Pending / Approved / Overdue / Paid / Disputed)
- Aging bucket filter
- Amount range slider

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
  WHERE plugin_name = 'finance' AND skill_name = 'accounts-payable'
);

-- ============================================================================
-- 3. Expense Tracking & Reporting Dashboard (finance plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'finance',
  'expense-report',
  'finance',
  'Build an interactive expense tracking and reporting dashboard with category breakdowns, employee spending, policy compliance, and approval workflows. Use for expense, spending, reimbursement, receipts, travel, per diem, expense report, policy analysis.',
  $$---
name: expense-report
description: Build an interactive expense tracking and reporting dashboard with category breakdowns, employee spending, policy compliance, and approval workflows. Use for expense, spending, reimbursement, receipts, travel, per diem, expense report, policy analysis.
argument-hint: "<expense data source or reporting period>"
---

# /expense-report - Expense Tracking & Reporting Dashboard

Build a self-contained interactive HTML dashboard for expense management — category breakdowns, employee spend analysis, policy violation tracking, department comparisons, and approval workflow monitoring.

## Usage

```
/expense-report <description of expense data or team scope>
```

## Workflow

### 1. Understand the Expense Context

Determine:
- **Expense categories**: Travel, meals, software, office supplies, entertainment, professional development
- **Policy rules**: Per diem limits, category caps, pre-approval thresholds, receipt requirements
- **Approval workflow**: Manager approval, finance review, auto-approve under threshold
- **Reimbursement cycle**: Weekly, bi-weekly, monthly
- **Employee scope**: All employees, specific departments, field teams

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Expense Dashboard                    [Period]        |
+------------+------------+------------+---------------+
| Total      | Avg Expense| Policy     | Pending       |
| Expenses   | /Employee  | Violations | Approvals     |
+------------------------------------------------------+
| Expenses by Category    | Monthly Spend Trend         |
| (doughnut)              | (line: 12-month)            |
+------------------------+-----------------------------+
| Top Spenders            | Department Spend             |
| (horizontal bar)        | (bar by department)         |
+------------------------+-----------------------------+
| Expense Detail Table                                 |
| (Employee | Date | Category | Amount | Status)       |
+------------------------------------------------------+
```

### 3. KPI Cards (4 required)

- Total Expenses This Period (currency, % change vs prior period, trend arrow)
- Avg Expense per Employee (currency, vs company benchmark, trend arrow)
- Policy Violations (count, % of total submissions, red highlight if >5%)
- Pending Approvals (count, avg days pending, alert if >5 days)

### 4. Sections

Organize the dashboard into these sections:
- **Overview** - KPI cards and high-level expense summary
- **By Category** - Category breakdown, largest categories, category trends
- **By Department** - Department comparisons, budget vs actual, outliers
- **Approvals** - Pending queue, approval cycle time, bottleneck identification

### 5. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Doughnut | Expenses by category (Travel, Meals, Software, Supplies, Entertainment, Other) |
| Line | Monthly spend trend over 12 months with budget reference line |
| Horizontal bar (indexAxis:y) | Top 10 spenders by total amount this period |
| Bar | Department spend comparison (vertical bars, one per department) |

### 6. Expenses by Category

Doughnut chart with 6-8 categories. Each slice labeled with category name and percentage.
Color palette: distinct, accessible colors per category.
Center text showing total expense amount. Legend below chart.
Click on slice to filter the detail table to that category.

### 7. Monthly Spend Trend

Line chart over 12 months showing total expenses per month.
Dashed horizontal reference line at monthly budget target.
Shade area above budget line in light red to highlight over-budget months.
Annotate significant spikes with reason if known (e.g., conference, team offsite).

### 8. Top Spenders

Horizontal bar chart (type:bar with indexAxis:y) showing top 10 employees by total spend.
Bars colored by compliance: green (within policy), orange (near limit), red (policy violation).
Show amount label at end of each bar.

### 9. Department Spend

Vertical bar chart with one bar per department.
Sorted descending by total spend. Show budget amount as a reference marker or second bar series.
Color-code: green (under budget), yellow (90-100% of budget), red (over budget).

### 10. Expense Detail Table

Columns:
- Employee Name
- Date (submission date)
- Category (badge with category color)
- Description (truncated, hover for full text)
- Amount (currency, right-aligned)
- Status (badge: Submitted/Pending/Approved/Rejected/Reimbursed)
- Approver (name of approving manager)

Sortable by any column. Search filter for employee name or description.
Paginated if >25 rows. Subtotal row showing total for current filter.
Highlight rows with policy violations in light red background.

### 11. Filters

- Date range picker (7D / 30D / 90D / 1Y)
- Category multi-select
- Department multi-select
- Status filter (All / Pending / Approved / Rejected / Reimbursed)
- Amount range slider
- Policy violation toggle (show only violations)

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
  WHERE plugin_name = 'finance' AND skill_name = 'expense-report'
);

-- ============================================================================
-- 4. Procurement & Vendor Management Dashboard (finance plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'finance',
  'procurement-tracker',
  'finance',
  'Build an interactive procurement dashboard with purchase order tracking, vendor management, spend analysis, and savings monitoring. Use for procurement, purchase orders, vendors, sourcing, spend analysis, PO, supplier management.',
  $$---
name: procurement-tracker
description: Build an interactive procurement dashboard with purchase order tracking, vendor management, spend analysis, and savings monitoring. Use for procurement, purchase orders, vendors, sourcing, spend analysis, PO, supplier management.
argument-hint: "<procurement data source or vendor list>"
---

# /procurement-tracker - Procurement & Vendor Management Dashboard

Build a self-contained interactive HTML dashboard for procurement management — purchase order tracking, vendor performance, spend analysis by category, savings vs budget monitoring, and delivery pipeline visibility.

## Usage

```
/procurement-tracker <description of procurement data or vendor scope>
```

## Workflow

### 1. Understand the Procurement Context

Determine:
- **Procurement scope**: Direct materials, indirect spend, services, SaaS, capex
- **Vendor base**: Number of active vendors, preferred vendor list, single-source risks
- **PO workflow**: Requisition → Approval → PO Issued → Received → Invoiced → Paid
- **Budget structure**: By category, department, project, or cost center
- **Savings targets**: Negotiated savings, volume discounts, consolidation opportunities

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Procurement Dashboard                [Period]        |
+------------+------------+------------+---------------+
| Active     | Total Spend| Avg Vendor | Savings vs    |
| POs        | This Period| Lead Time  | Budget        |
+------------------------------------------------------+
| Spend by Vendor          | PO Status Pipeline        |
| (doughnut: top vendors)  | (horizontal bar)          |
+------------------------+-----------------------------+
| Spend Trend             | Category Breakdown          |
| (line: monthly spend)   | (bar by category)           |
+------------------------+-----------------------------+
| Purchase Orders Table                                |
| (PO# | Vendor | Category | Amount | Status | Dates) |
+------------------------------------------------------+
```

### 3. KPI Cards (4 required)

- Active POs (count, change vs prior period, trend arrow)
- Total Spend This Period (currency, % change vs prior period, vs budget)
- Avg Vendor Lead Time (days, trend arrow, vs target)
- Savings vs Budget (currency or %, green if positive savings, red if over budget)

### 4. Sections

Organize the dashboard into these sections:
- **Overview** - KPI cards and high-level procurement health summary
- **Purchase Orders** - PO pipeline, status distribution, aging analysis
- **Vendors** - Vendor concentration, performance, lead times, risk
- **Savings** - Budget vs actual, negotiated savings, cost avoidance

### 5. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Doughnut | Spend by vendor: top 5 vendors by total spend, plus \"Other\" |
| Horizontal bar (indexAxis:y) | PO status pipeline: Draft, Pending Approval, Approved, Ordered, Partially Received, Received, Closed |
| Line | Monthly spend trend over 12 months with budget reference line |
| Bar | Spend by category (vertical bars: Materials, Services, Software, Equipment, Facilities, Other) |

### 6. Spend by Vendor

Doughnut chart showing top 5 vendors by total spend amount.
\"Other\" slice for remaining vendors. Center text showing total spend.
Risk indicator: flag if any single vendor exceeds 30% of total spend (concentration risk).
Legend below chart with vendor name and spend amount.

### 7. PO Status Pipeline

Horizontal bar chart (type:bar with indexAxis:y) showing PO count by status stage.
Stages in order: Draft → Pending Approval → Approved → Ordered → Partially Received → Received → Closed.
Color progression: light blue (early stages) to dark blue (completed).
Show count and total value label for each bar.

### 8. Spend Trend

Line chart over 12 months showing total procurement spend per month.
Dashed reference line at monthly budget allocation.
Shade area above budget in light red. Annotate large one-time purchases.
Secondary line or annotation for PO count per month.

### 9. Category Breakdown

Vertical bar chart with one bar per procurement category.
Categories: Materials, Professional Services, Software/SaaS, Equipment, Facilities, Travel, Other.
Sorted descending by spend amount. Show YoY change % above each bar.
Color-coded: consistent palette across categories.

### 10. Purchase Orders Table

Columns:
- PO # (text identifier)
- Vendor (vendor name)
- Category (badge with category color)
- Amount (currency, right-aligned)
- Status (badge: Draft/Pending/Approved/Ordered/Received/Closed)
- Order Date (date)
- Delivery Date (date, highlight overdue in red)
- Lead Time (days, calculated from order to delivery/expected delivery)

Sortable by any column. Search filter for PO number or vendor name.
Paginated if >25 rows. Subtotal row showing total amount for current filter.
Highlight overdue POs (past expected delivery date) in light red background.

### 11. Filters

- Date range picker (30D / 90D / 6M / 1Y)
- Vendor multi-select
- Category multi-select
- Status filter (All / Draft / Pending / Approved / Ordered / Received / Closed)
- Amount range slider
- Overdue toggle (show only overdue POs)

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
  WHERE plugin_name = 'finance' AND skill_name = 'procurement-tracker'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
-- Migration: Seed 4 HR golden template skills into skill_registry.
-- Compensation & Benefits, Learning & Development, Performance Review, Onboarding Tracker.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Compensation & Benefits Dashboard (human-resources plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'human-resources',
  'compensation-benefits',
  'hr',
  'Build an interactive compensation and benefits dashboard with salary distributions, pay equity analysis, compa-ratio tracking, and benefits utilization.',
  $$---
name: compensation-benefits
description: Build an interactive compensation and benefits dashboard with salary distributions, pay equity analysis, compa-ratio tracking, and benefits utilization. Use when analyzing compensation, salary, benefits, pay equity, compa ratio, pay bands, total comp, or bonus data.
argument-hint: "<compensation data source or team scope>"
---

# /compensation-benefits - Compensation & Benefits Dashboard

Build a self-contained interactive HTML dashboard for compensation and benefits analysis — salary distributions, pay equity ratios, compa-ratio tracking, benefits utilization, and pay band progression.

## Usage

```
/compensation-benefits <description of compensation data or team>
```

## Workflow

### 1. Understand the Compensation Context

Determine:
- **Org structure**: Departments, levels, job families, locations
- **Comp components**: Base salary, bonus, equity/RSU, benefits value
- **Pay bands**: Min/mid/max per level and role family
- **Equity dimensions**: Gender, ethnicity, tenure, geography
- **Benefits offerings**: Health, dental, vision, 401k match, wellness stipend, PTO
- **Benchmarking**: Internal compa-ratio targets (typically 0.90-1.10)

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Compensation & Benefits Dashboard    [Filters]       |
+------------+------------+------------+---------------+
| Avg Salary | Benefits   | Pay Equity | Compa-Ratio   |
|            | Cost / Emp | Ratio      | Median        |
+------------------------------------------------------+
| Salary Distribution      | Benefits Utilization       |
| (bar / histogram)        | (doughnut)                 |
+------------------------+-----------------------------+
| Compa-Ratio by Dept    | Pay Band Progression        |
| (bar)                  | (line over time)            |
+------------------------+-----------------------------+
| Compensation Detail Table (sortable, searchable)     |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- **Avg Salary**: Mean base salary across org, delta vs prior period
- **Total Benefits Cost per Employee**: Annual benefits spend / headcount, trend arrow
- **Pay Equity Ratio**: Female-to-male median comp ratio (target >= 0.98), color-coded
- **Compa-Ratio Median**: Median of (actual salary / band midpoint), healthy range 0.95-1.05

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar / histogram | Salary distribution across pay bands (bucket by $10k ranges) |
| Doughnut | Benefits utilization breakdown (health, dental, vision, 401k, wellness) |
| Bar | Compa-ratio by department (color-coded: green 0.95-1.05, yellow 0.85-0.94 or 1.06-1.15, red outside) |
| Line | Pay band progression over quarters (min/mid/max trend lines per level) |
| Grouped bar | Total comp breakdown by level (base, bonus, equity stacked) |

### 5. Salary Distribution

Histogram buckets of $10k. Vertical dashed line at org median.
Overlay a normal curve if sample size > 100.
Color by department or level using legend toggle.

### 6. Pay Equity Analysis

Compare median comp across gender and ethnicity dimensions at each job level.
Pay equity ratio = median comp (underrepresented group) / median comp (reference group).
Flag any ratio below 0.95 in red. Show confidence interval where sample allows.

### 7. Compa-Ratio Detail

Compa-ratio = actual salary / pay band midpoint.
Visualize distribution: green (0.95-1.05), yellow (0.85-0.94 or 1.06-1.15), red (below 0.85 or above 1.15).
Break down by department, level, and tenure.

### 8. Benefits Utilization

Doughnut chart showing enrollment percentages across benefit categories.
Table below with: Benefit, Enrolled Count, Enrollment %, Avg Employer Cost, Total Cost.
Highlight under-utilized benefits (enrollment < 40%).

### 9. Compensation Detail Table

Columns: Employee, Role, Level, Department, Base Salary, Bonus, Total Comp, Compa-Ratio, Pay Band.
Sortable by any column. Searchable. Compa-ratio cell color-coded.

### 10. Sections & Navigation

- **Overview**: KPI cards and summary charts
- **Pay Equity**: Equity ratio analysis, gap identification
- **Benefits**: Utilization doughnut, enrollment table
- **Bands**: Pay band ranges, progression over time

### 11. Filters

- Department multi-select
- Level / Band dropdown
- Location filter
- Date range (quarterly / annual)

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
  WHERE plugin_name = 'human-resources' AND skill_name = 'compensation-benefits'
);

-- ============================================================================
-- 2. Learning & Development Dashboard (human-resources plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'human-resources',
  'learning-development',
  'hr',
  'Build an interactive learning and development dashboard with course completion rates, training hours, certification tracking, and skill gap analysis.',
  $$---
name: learning-development
description: Build an interactive learning and development dashboard with course completion rates, training hours, certification tracking, and skill gap analysis. Use when analyzing learning, development, training, courses, certifications, skills, L&D, or upskilling data.
argument-hint: "<L&D data source or team scope>"
---

# /learning-development - Learning & Development Dashboard

Build a self-contained interactive HTML dashboard for learning and development — course completion tracking, training hour analysis, certification rates, skill gap identification, and L&D spend efficiency.

## Usage

```
/learning-development <description of L&D data or team>
```

## Workflow

### 1. Understand the L&D Context

Determine:
- **Program types**: Onboarding, compliance, technical skills, leadership, soft skills
- **Delivery formats**: E-learning, instructor-led, blended, self-paced, cohort-based
- **Tracking metrics**: Completion rate, hours logged, assessment scores, certifications earned
- **Budget scope**: L&D spend per employee, cost per training hour
- **Org structure**: Departments, levels, mandatory vs elective training

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Learning & Development Dashboard     [Filters]       |
+------------+------------+------------+---------------+
| Courses    | Avg Train  | Certifi-   | L&D Spend     |
| Completed  | Hours/Emp  | cation Rate| per Employee  |
+------------------------------------------------------+
| Completion Rate by Dept  | Training Hours Trend       |
| (bar)                    | (line over months)         |
+------------------------+-----------------------------+
| Course Popularity        | Skill Gap Analysis          |
| (horizontal bar)         | (grouped bar by dept)      |
+------------------------+-----------------------------+
| Training Detail Table (sortable, searchable)         |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- **Courses Completed**: Total completions this period, delta vs prior period
- **Avg Training Hours per Employee**: Mean hours logged, trend arrow
- **Certification Rate**: Percentage of employees with at least one active certification
- **L&D Spend per Employee**: Total L&D budget / headcount, comparison to industry benchmark

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Completion rate by department (color-coded: green >= 80%, yellow 60-79%, red < 60%) |
| Line | Training hours trend over 12 months (actual vs target dashed line) |
| Horizontal bar | Top 10 most popular courses by enrollment count |
| Grouped bar | Skill gap analysis: required vs actual proficiency by department |
| Doughnut | Training format mix (e-learning, instructor-led, blended, self-paced) |

### 5. Completion Rate Analysis

Completion rate = completed courses / assigned courses * 100.
Break down by department, mandatory vs elective, and delivery format.
Highlight departments below 70% completion in red.
Show overdue assignments count as a warning badge.

### 6. Training Hours Trend

Line chart over 12 months. Solid line for actual hours, dashed line for target.
Annotate months with major training events (compliance deadline, new hire cohort).
Secondary y-axis for cumulative hours if useful.

### 7. Course Popularity

Horizontal bar chart of top 10 courses by enrollment.
Label each bar with: course name, enrollment count, avg score.
Color by category (compliance=blue, technical=green, leadership=purple, soft skills=orange).

### 8. Skill Gap Heatmap Concept

Grouped bar chart: departments on x-axis, skill categories as groups.
Each group has two bars: required proficiency level vs current average.
Gap highlighted when current < required. Larger gaps shown in deeper red.

### 9. Training Detail Table

Columns: Employee, Course, Status (Completed/In Progress/Not Started/Overdue), Hours, Score, Completion Date, Certification (Yes/No).
Sortable by any column. Searchable. Status badges color-coded.
Overdue rows highlighted with a warning background.

### 10. Sections & Navigation

- **Overview**: KPI cards and summary charts
- **Courses**: Course catalog, popularity, completion rates
- **Departments**: Per-department drill-down, compliance status
- **Certifications**: Certification tracker, expiry alerts, renewal pipeline

### 11. Filters

- Department multi-select
- Course category dropdown
- Status filter (Completed / In Progress / Overdue)
- Date range (monthly / quarterly / annual)

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
  WHERE plugin_name = 'human-resources' AND skill_name = 'learning-development'
);

-- ============================================================================
-- 3. Performance Review Dashboard (human-resources plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'human-resources',
  'performance-review',
  'hr',
  'Build an interactive performance review dashboard with rating distributions, goal completion tracking, department comparisons, and review cycle progress.',
  $$---
name: performance-review
description: Build an interactive performance review dashboard with rating distributions, goal completion tracking, department comparisons, and review cycle progress. Use when analyzing performance, review, ratings, goals, evaluation, 360, feedback, or appraisal data.
argument-hint: "<performance review data or team scope>"
---

# /performance-review - Performance Review Dashboard

Build a self-contained interactive HTML dashboard for performance reviews — rating distributions, goal completion tracking, department-level comparisons, review cycle progress, and improvement plan monitoring.

## Usage

```
/performance-review <description of performance data or team>
```

## Workflow

### 1. Understand the Review Context

Determine:
- **Review cycle**: Annual, semi-annual, quarterly, continuous
- **Rating scale**: 1-5, 1-4, Exceeds/Meets/Below, letter grades
- **Components**: Self-assessment, manager review, 360 peer feedback, goal tracking
- **Calibration**: Whether ratings are calibrated across departments
- **Outcomes**: Merit increases, promotions, improvement plans (PIPs)

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Performance Review Dashboard         [Filters]       |
+------------+------------+------------+---------------+
| Reviews    | Avg        | Top        | Improvement   |
| Completed %| Rating     | Performers | Plan Count    |
+------------------------------------------------------+
| Rating Distribution      | Performance by Department  |
| (bar)                    | (grouped bar)              |
+------------------------+-----------------------------+
| Review Completion        | Rating Trend               |
| Progress (doughnut)      | (line over cycles)         |
+------------------------+-----------------------------+
| Review Detail Table (sortable, searchable)           |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- **Reviews Completed %**: Completed reviews / total expected, color-coded (green >= 90%, yellow 70-89%, red < 70%)
- **Avg Rating**: Organization-wide mean rating with delta vs prior cycle
- **Top Performers Count**: Employees rated in top tier (e.g., 5/5 or Exceeds), percentage of workforce
- **Improvement Plan Count**: Active PIPs, trend arrow vs prior cycle

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Rating distribution (count per rating level, bell curve overlay target) |
| Grouped bar | Average rating by department (current cycle vs prior cycle side by side) |
| Doughnut | Review completion progress (Completed, In Progress, Not Started, Overdue) |
| Line | Average rating trend over last 4-6 review cycles |
| Stacked bar | Goal completion status by department (Exceeded, Met, Partially Met, Missed) |

### 5. Rating Distribution

Bar chart with one bar per rating level (1 through 5).
Ideal distribution overlay as a dashed bell curve.
Color gradient: 1=red, 2=orange, 3=yellow, 4=light green, 5=green.
Annotate count and percentage on each bar.
Flag if distribution is heavily skewed (> 40% at one level).

### 6. Performance by Department

Grouped bar chart: departments on x-axis, two bars per department (current cycle, prior cycle).
Color current cycle in brand primary, prior cycle in muted gray.
Horizontal reference line at org-wide average.
Highlight departments with significant change (> 0.3 shift).

### 7. Review Completion Progress

Doughnut chart with four segments:
- Completed (green)
- In Progress (blue)
- Not Started (gray)
- Overdue (red)
Center text shows overall completion percentage.
Updates in real time as reviews are submitted.

### 8. Rating Trend

Line chart over review cycles (x-axis: cycle names/dates).
Primary line for org-wide average. Secondary lines per department (toggleable legend).
Annotate notable events (calibration change, scale change, reorg).

### 9. Goal Completion

Stacked bar: departments on x-axis, segments for Exceeded / Met / Partially Met / Missed.
Color scale: dark green, light green, yellow, red.
Percentage labels inside segments where space permits.

### 10. Review Detail Table

Columns: Employee, Manager, Department, Rating (with color badge), Goal Completion %, Status (Completed/Pending/Overdue), Next Review Date.
Sortable by any column. Searchable. Overdue rows highlighted.
Click to expand shows goal details and manager comments summary.

### 11. Sections & Navigation

- **Overview**: KPI cards and summary distributions
- **By Department**: Department drill-down, calibration view
- **Ratings**: Distribution analysis, trend, outlier detection
- **Goals**: Goal completion rates, alignment tracking

### 12. Filters

- Review cycle selector
- Department multi-select
- Manager dropdown
- Rating range filter
- Status filter (Completed / In Progress / Overdue)

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
  WHERE plugin_name = 'human-resources' AND skill_name = 'performance-review'
);

-- ============================================================================
-- 4. Employee Onboarding Dashboard (human-resources plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'human-resources',
  'onboarding-tracker',
  'hr',
  'Build an interactive employee onboarding dashboard with pipeline tracking, time-to-productivity analysis, milestone completion, and 90-day retention metrics.',
  $$---
name: onboarding-tracker
description: Build an interactive employee onboarding dashboard with pipeline tracking, time-to-productivity analysis, milestone completion, and 90-day retention metrics. Use when analyzing onboarding, new hire, orientation, ramp up, productivity, first 90 days, or buddy program data.
argument-hint: "<onboarding data source or team scope>"
---

# /onboarding-tracker - Employee Onboarding Dashboard

Build a self-contained interactive HTML dashboard for employee onboarding — pipeline stage tracking, time-to-productivity analysis, milestone completion rates, buddy/mentor assignments, and 90-day retention monitoring.

## Usage

```
/onboarding-tracker <description of onboarding data or team>
```

## Workflow

### 1. Understand the Onboarding Context

Determine:
- **Onboarding stages**: Pre-boarding, Day 1, Week 1, Month 1, Month 2, Month 3
- **Milestone checkpoints**: IT setup, compliance training, team intro, first project, 30/60/90 reviews
- **Buddy/mentor program**: Assigned buddies, mentor pairing, check-in cadence
- **Productivity definition**: First commit, first deal, first ticket resolved, manager sign-off
- **Retention tracking**: 30-day, 60-day, 90-day retention rates

### 2. Dashboard Layout

```
+------------------------------------------------------+
| Employee Onboarding Dashboard        [Filters]       |
+------------+------------+------------+---------------+
| Active     | Avg Time to| Onboarding | 90-Day        |
| Onboardees | Productivity| Completion| Retention     |
+------------------------------------------------------+
| Onboarding Pipeline      | Completion Rate Trend      |
| by Stage (horiz bar)     | (line over months)         |
+------------------------+-----------------------------+
| Time to Productivity     | Buddy/Mentor               |
| by Role (bar)            | Assignments (doughnut)     |
+------------------------+-----------------------------+
| Onboardee Detail Table (sortable, searchable)        |
+------------------------------------------------------+
```

### 3. KPI Cards (4 minimum)

- **Active Onboardees**: Current employees in onboarding pipeline, trend vs prior month
- **Avg Time to Productivity**: Mean days from start date to productivity milestone, trend arrow
- **Onboarding Completion Rate**: Percentage of onboardees who completed all milestones on time
- **90-Day Retention**: Percentage of new hires still employed at 90 days, color-coded (green >= 90%, yellow 80-89%, red < 80%)

### 4. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Horizontal bar | Onboarding pipeline by stage (Pre-boarding through Month 3, count per stage) |
| Line | Completion rate trend over 12 months (actual vs target dashed) |
| Bar | Time to productivity by role family (Engineering, Sales, Operations, etc.) |
| Doughnut | Buddy/mentor assignment status (Assigned & Active, Assigned & Inactive, Unassigned) |
| Stacked bar | Milestone completion by cohort (Completed On Time, Completed Late, In Progress, Missed) |

### 5. Onboarding Pipeline

Horizontal bar chart showing headcount at each onboarding stage.
Stages ordered chronologically: Pre-boarding, Day 1, Week 1, Month 1, Month 2, Month 3, Completed.
Color gradient from light (early stages) to dark (completed).
Show expected vs actual count per stage. Flag bottlenecks where count exceeds expected.

### 6. Completion Rate Trend

Line chart over 12 months. Solid line for actual completion rate.
Dashed line for target (typically 85-90%).
Annotate months with large cohorts or process changes.
Shaded region between actual and target when below target (red tint).

### 7. Time to Productivity

Bar chart grouped by role family.
Each bar shows average days to productivity.
Horizontal reference line at org-wide average.
Color-coded: green (below average), yellow (at average), red (above average by > 20%).
Tooltip shows sample size and standard deviation.

### 8. Buddy/Mentor Assignments

Doughnut chart with three segments:
- Assigned & Active (green): buddy relationship active with regular check-ins
- Assigned & Inactive (yellow): buddy assigned but no recent check-in
- Unassigned (red): no buddy paired yet
Center text shows total onboardees.
Table below: Buddy Name, Onboardee Count, Last Check-In, Status.

### 9. Milestone Tracking

Timeline or stacked bar showing milestone completion:
- IT Setup Complete
- Compliance Training Done
- Team Introduction
- First Project Assigned
- 30-Day Check-In
- 60-Day Check-In
- 90-Day Review

Each milestone: On Time (green), Late (yellow), Missed (red), Upcoming (gray).

### 10. Onboardee Detail Table

Columns: Name, Role, Department, Start Date, Current Stage, Progress %, Buddy, Days to Complete.
Sortable by any column. Searchable.
Progress bar in the Progress % column (green/yellow/red based on pace).
Overdue milestones flagged with warning icon.

### 11. Sections & Navigation

- **Overview**: KPI cards and pipeline summary
- **Pipeline**: Stage-by-stage drill-down, bottleneck analysis
- **Milestones**: Milestone completion tracking, timeline view
- **Retention**: 30/60/90-day retention rates, early attrition analysis

### 12. Filters

- Department multi-select
- Start date range
- Current stage filter
- Buddy assignment status
- Role family dropdown

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
  WHERE plugin_name = 'human-resources' AND skill_name = 'onboarding-tracker'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
-- Migration: Seed 5 golden templates into skill_registry.
-- Engineering: Sprint Dashboard, Platform Health, CI/CD Pipeline.
-- Product: Product Analytics, Roadmap Tracker.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Sprint Dashboard (engineering plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'engineering',
  'sprint-dashboard',
  'engineering',
  'Build an interactive sprint and agile dashboard with sprint velocity, story points completed, bugs found, and sprint goal completion %. Use for sprint reviews, velocity tracking, burndown analysis, backlog grooming, scrum ceremonies, agile retrospectives, and story point estimation.',
  $$---
name: sprint-dashboard
description: Build an interactive sprint and agile dashboard with sprint velocity, story points completed, bugs found, and sprint goal completion %. Use for sprint reviews, velocity tracking, burndown analysis, backlog grooming, scrum ceremonies, agile retrospectives, and story point estimation.
argument-hint: "<team, sprint, or iteration>"
---

# /sprint-dashboard - Sprint & Agile Dashboard

Build a self-contained interactive HTML dashboard for sprint and agile tracking — sprint velocity trends, story point completion, burndown tracking, and bug discovery analysis.

## Usage

```
/sprint-dashboard <description of team or sprint>
```

## Workflow

### 1. Understand the Sprint Context

Determine:
- **Sprint cadence**: 1-week, 2-week, or 3-week sprints
- **Team size**: Number of engineers, capacity in story points
- **Velocity baseline**: Average story points completed per sprint
- **Bug tracking**: Bugs found during sprint, severity levels
- **Sprint goals**: Discrete goals per sprint and completion criteria
- **Estimation method**: Story points (Fibonacci), T-shirt sizes, or hours

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify sprint columns, story point values, assignee fields, status, and bug records.

**If working from description:** Generate a realistic dataset with 6-10 sprints, 8-12 team members, varied velocity (30-60 points per sprint), and bug counts. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Sprint Dashboard                     [Filters]       |
+------------+------------+------------+---------------+
| Sprint     | Story Pts  | Bugs       | Sprint Goal   |
| Velocity   | Completed  | Found      | Completion %  |
+------------------------------------------------------+
| Burndown Chart (line)                                |
+------------------------+-----------------------------+
| Velocity Trend         | Story Point Distribution    |
| (bar)                  | (doughnut)                  |
+------------------------+-----------------------------+
| Bug Severity Breakdown (bar)                         |
+------------------------------------------------------+
| Sprint Backlog Table (sortable)                      |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, burndown line chart, current sprint health summary.

**Velocity** — Bar chart showing velocity per sprint over last 6-10 sprints, rolling average line overlay.

**Story Points** — Doughnut showing distribution by status (Done, In Progress, To Do, Blocked), breakdown by assignee.

**Bugs** — Bar chart of bugs by severity (Critical, High, Medium, Low), trend over sprints.

### 5. KPI Calculations

- **Sprint Velocity**: Story points completed in the current/latest sprint
- **Story Points Completed**: Sum of story points with status = Done in the sprint
- **Bugs Found**: Count of bugs opened during the sprint
- **Sprint Goal Completion %**: (Completed sprint goals / Total sprint goals) x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line | Burndown: ideal line (straight diagonal) vs actual remaining points per day |
| Bar | Velocity trend over past 6-10 sprints — highlight current sprint, show rolling average |
| Doughnut | Story point distribution by status — Done (green), In Progress (blue), To Do (gray), Blocked (red) |
| Bar | Bug severity breakdown — Critical (red), High (orange), Medium (yellow), Low (blue) |

### 7. Sprint Backlog Table

| Story | Points | Assignee | Status | Priority | Sprint |
|-------|--------|----------|--------|----------|--------|

Sortable by any column. Color-code status: Done (green), In Progress (blue), Blocked (red). Group by assignee optionally.

### 8. Filters

- Sprint selector (current + last 6-10)
- Assignee dropdown
- Status multi-select (Done, In Progress, To Do, Blocked)
- Priority multi-select (Critical, High, Medium, Low)
- Story type (Feature, Bug, Tech Debt, Spike)

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
  WHERE plugin_name = 'engineering' AND skill_name = 'sprint-dashboard'
);

-- ============================================================================
-- 2. Platform Health Dashboard (engineering plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'engineering',
  'platform-health',
  'engineering',
  'Build an interactive platform health and reliability dashboard with uptime %, P50/P99 latency, error rate, and active incidents. Use for uptime monitoring, SLA tracking, error analysis, latency profiling, incident management, infrastructure reviews, and reliability engineering.',
  $$---
name: platform-health
description: Build an interactive platform health and reliability dashboard with uptime %, P50/P99 latency, error rate, and active incidents. Use for uptime monitoring, SLA tracking, error analysis, latency profiling, incident management, infrastructure reviews, and reliability engineering.
argument-hint: "<platform, service, or infrastructure scope>"
---

# /platform-health - Platform Health & Reliability Dashboard

Build a self-contained interactive HTML dashboard for platform health monitoring — uptime tracking, latency percentiles, error rate analysis, and incident management overview.

## Usage

```
/platform-health <description of platform or services>
```

## Workflow

### 1. Understand the Platform Scope

Determine:
- **Services monitored**: API, web app, database, CDN, auth, payments, etc.
- **SLA targets**: 99.9%, 99.95%, 99.99% uptime commitments
- **Latency budgets**: P50 < 100ms, P99 < 500ms (typical)
- **Error budget**: Acceptable error rate per service (e.g., < 0.1%)
- **Incident severity levels**: SEV1 (critical), SEV2 (major), SEV3 (minor), SEV4 (low)
- **Monitoring stack**: Datadog, Grafana, CloudWatch, custom

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify service names, uptime records, latency percentiles, error counts, and incident logs.

**If working from description:** Generate a realistic dataset with 5-8 services, 30-day uptime history, latency distributions, and 10-20 incidents. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Platform Health Dashboard            [Filters]       |
+------------+------------+------------+---------------+
| Uptime %   | P50        | Error      | Active        |
|            | / P99      | Rate       | Incidents     |
|            | Latency    |            |               |
+------------------------------------------------------+
| Uptime Trend (line)                                  |
+------------------------+-----------------------------+
| Error Rate by          | Latency Percentiles         |
| Service (bar)          | (line)                      |
+------------------------+-----------------------------+
| Incident Severity Distribution (doughnut)            |
+------------------------------------------------------+
| Incident Log Table (sortable)                        |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, uptime trend line, active incident count with severity badges.

**Errors** — Bar chart of error rate by service, top error types, error spike detection.

**Latency** — Multi-series line chart showing P50, P90, P99 latency over time, per-service breakdown.

**Incidents** — Doughnut of incident severity distribution, timeline of recent incidents, MTTR tracking.

### 5. KPI Calculations

- **Uptime %**: (Total minutes - Downtime minutes) / Total minutes x 100
- **P50 / P99 Latency**: 50th and 99th percentile response times in ms
- **Error Rate**: (Error responses / Total responses) x 100
- **Active Incidents**: Count of incidents with status = Open or Investigating

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line | Uptime trend over 30 days — green above SLA target, red below, target line overlay |
| Bar | Error rate by service — sorted descending, red for services above error budget |
| Line (multi-series) | Latency percentiles — P50 (green), P90 (yellow), P99 (red) over time |
| Doughnut | Incident severity distribution — SEV1 (red), SEV2 (orange), SEV3 (yellow), SEV4 (blue) |

### 7. Incident Log Table

| ID | Service | Severity | Status | Started | Duration | RCA |
|----|---------|----------|--------|---------|----------|-----|

Sortable by any column. Color-code severity: SEV1 (red), SEV2 (orange). Status badges: Open (red), Investigating (yellow), Resolved (green).

### 8. Filters

- Service dropdown
- Severity multi-select (SEV1, SEV2, SEV3, SEV4)
- Status (Open, Investigating, Resolved, All)
- Date range pickers
- SLA target toggle (99.9%, 99.95%, 99.99%)

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
  WHERE plugin_name = 'engineering' AND skill_name = 'platform-health'
);

-- ============================================================================
-- 3. CI/CD Pipeline Dashboard (engineering plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'engineering',
  'cicd-pipeline',
  'engineering',
  'Build an interactive CI/CD pipeline dashboard with deploy frequency, build success rate, average deploy time, and rollback rate. Use for CI/CD monitoring, pipeline optimization, deploy tracking, build analysis, continuous integration reviews, deployment management, and release planning.',
  $$---
name: cicd-pipeline
description: Build an interactive CI/CD pipeline dashboard with deploy frequency, build success rate, average deploy time, and rollback rate. Use for CI/CD monitoring, pipeline optimization, deploy tracking, build analysis, continuous integration reviews, deployment management, and release planning.
argument-hint: "<project, service, or environment>"
---

# /cicd-pipeline - CI/CD Pipeline Dashboard

Build a self-contained interactive HTML dashboard for CI/CD pipeline monitoring — deploy frequency trends, build success/failure rates, deployment duration tracking, and rollback analysis.

## Usage

```
/cicd-pipeline <description of project or deployment environment>
```

## Workflow

### 1. Understand the Pipeline Scope

Determine:
- **Pipeline stages**: Build, Test, Lint, Security Scan, Deploy, Smoke Test
- **Environments**: Dev, Staging, Production
- **Deploy frequency target**: Daily, multiple per day, weekly
- **Success rate baseline**: Typical 85-95% build pass rate
- **Rollback policy**: Automatic on failure, manual approval, canary
- **CI/CD platform**: GitHub Actions, Jenkins, CircleCI, GitLab CI

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify commit/build columns, status fields, duration, branch, author, and environment.

**If working from description:** Generate a realistic dataset with 50-100 recent deploys across 3 environments, varied success/failure rates, and rollback events. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| CI/CD Pipeline Dashboard             [Filters]       |
+------------+------------+------------+---------------+
| Deploy     | Build      | Avg Deploy | Rollback      |
| Frequency  | Success    | Time       | Rate          |
| (per week) | Rate %     | (min)      | %             |
+------------------------------------------------------+
| Deploy Frequency Trend (bar)                         |
+------------------------+-----------------------------+
| Build Pass/Fail        | Deploy Duration             |
| (stacked bar)          | Trend (line)                |
+------------------------+-----------------------------+
| Failure by Stage (doughnut)                          |
+------------------------------------------------------+
| Recent Deploys Table (sortable)                      |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, deploy frequency bar chart, pipeline health summary.

**Builds** — Stacked bar showing pass/fail per day or week, failure rate trend, flaky test identification.

**Deploy Duration** — Line chart of deploy times over time, per-environment breakdown, slow deploy detection.

**Failures** — Doughnut of failures by pipeline stage, most common failure reasons, MTTR for failed deploys.

### 5. KPI Calculations

- **Deploy Frequency**: Count of successful production deploys per week
- **Build Success Rate %**: (Passed builds / Total builds) x 100
- **Avg Deploy Time**: Mean duration from commit to production deploy in minutes
- **Rollback Rate %**: (Rollback events / Total deploys) x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Deploy frequency per week — shows deployment cadence over 8-12 weeks |
| Stacked bar | Build pass (green) / fail (red) per day — shows build reliability trend |
| Line | Deploy duration trend — time from trigger to completion, flag outliers |
| Doughnut | Failure by pipeline stage — Build (red), Test (orange), Lint (yellow), Deploy (purple) |

### 7. Recent Deploys Table

| Commit | Branch | Status | Duration | Author | Environment | Timestamp |
|--------|--------|--------|----------|--------|-------------|----------|

Sortable by any column. Color-code status: Success (green), Failed (red), Rolled Back (orange), In Progress (blue).

### 8. Filters

- Environment (Dev, Staging, Production)
- Status (Success, Failed, Rolled Back, All)
- Branch dropdown
- Author dropdown
- Date range pickers
- Duration range (min-max minutes)

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
  WHERE plugin_name = 'engineering' AND skill_name = 'cicd-pipeline'
);

-- ============================================================================
-- 4. Product Usage Analytics Dashboard (product-management plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'product-management',
  'product-analytics',
  'product',
  'Build an interactive product usage analytics dashboard with DAU/MAU, feature adoption rate, session duration, and retention rate. Use for product analytics, feature adoption tracking, user engagement analysis, retention cohort reviews, DAU/MAU monitoring, and usage pattern discovery.',
  $$---
name: product-analytics
description: Build an interactive product usage analytics dashboard with DAU/MAU, feature adoption rate, session duration, and retention rate. Use for product analytics, feature adoption tracking, user engagement analysis, retention cohort reviews, DAU/MAU monitoring, and usage pattern discovery.
argument-hint: "<product, feature set, or user segment>"
---

# /product-analytics - Product Usage Analytics Dashboard

Build a self-contained interactive HTML dashboard for product usage analytics — DAU/MAU tracking, feature adoption analysis, session duration trends, and retention cohort visualization.

## Usage

```
/product-analytics <description of product or feature area>
```

## Workflow

### 1. Understand the Product Context

Determine:
- **Product type**: SaaS, mobile app, marketplace, platform
- **Key features**: 5-10 core features to track adoption
- **User segments**: Free, trial, paid, enterprise; or by persona
- **Engagement model**: Daily active use, weekly workflows, monthly reporting
- **Retention definition**: D1, D7, D30 retention; or custom activation criteria
- **Growth metrics**: Signup rate, activation rate, expansion revenue

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify user activity columns, feature usage events, session records, and cohort data.

**If working from description:** Generate a realistic dataset with 90 days of DAU/MAU data, 8-12 features with varied adoption, and weekly retention cohorts. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Product Analytics Dashboard          [Filters]       |
+------------+------------+------------+---------------+
| DAU / MAU  | Feature    | Avg Session| Retention     |
|            | Adoption   | Duration   | Rate          |
|            | Rate       |            |               |
+------------------------------------------------------+
| DAU / MAU Trend (line)                               |
+------------------------+-----------------------------+
| Feature Adoption       | Retention Cohorts           |
| (horizontal bar)       | (grouped bar)               |
+------------------------+-----------------------------+
| User Journey Funnel (horizontal bar)                 |
+------------------------------------------------------+
| Feature Usage Table (sortable)                       |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, DAU/MAU trend line, stickiness ratio (DAU/MAU).

**Feature Adoption** — Horizontal bar chart of adoption rate per feature, sorted by usage, adoption over time.

**Retention** — Grouped bar chart showing D1, D7, D30 retention by cohort week, cohort comparison.

**User Journey** — Horizontal bar funnel: Signup -> Activation -> Engagement -> Retention -> Expansion.

### 5. KPI Calculations

- **DAU / MAU**: Daily active users and monthly active users; stickiness = DAU/MAU ratio
- **Feature Adoption Rate**: (Users who used feature / Total active users) x 100
- **Avg Session Duration**: Mean session length in minutes across all users
- **Retention Rate**: (Users active on day N / Users in cohort) x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line (dual axis) | DAU (left axis) and MAU (right axis) trend over 90 days, stickiness ratio overlay |
| Horizontal bar | Feature adoption rate — sorted descending, colored by category, adoption % labels |
| Grouped bar | Retention cohorts — D1, D7, D30 bars grouped by cohort week, benchmark line |
| Horizontal bar | User journey funnel — Signup to Expansion, conversion % between stages |

### 7. Feature Usage Table

| Feature | DAU | Adoption % | Avg Sessions | Retention | Trend |
|---------|-----|-----------|-------------|-----------|-------|

Sortable by any column. Trend column shows sparkline or arrow indicator. Color-code adoption: green (>50%), yellow (20-50%), red (<20%).

### 8. Filters

- Date range pickers
- User segment (Free, Trial, Paid, Enterprise)
- Feature multi-select
- Platform (Web, iOS, Android)
- Cohort week selector

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
  WHERE plugin_name = 'product-management' AND skill_name = 'product-analytics'
);

-- ============================================================================
-- 5. Product Roadmap Tracker Dashboard (product-management plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'product-management',
  'roadmap-tracker',
  'product',
  'Build an interactive product roadmap dashboard with features shipped, in-progress count, blocked items, and on-time delivery %. Use for roadmap planning, feature tracking, release management, milestone reviews, initiative prioritization, timeline visualization, and delivery forecasting.',
  $$---
name: roadmap-tracker
description: Build an interactive product roadmap dashboard with features shipped, in-progress count, blocked items, and on-time delivery %. Use for roadmap planning, feature tracking, release management, milestone reviews, initiative prioritization, timeline visualization, and delivery forecasting.
argument-hint: "<product area, quarter, or team>"
---

# /roadmap-tracker - Product Roadmap Dashboard

Build a self-contained interactive HTML dashboard for product roadmap tracking — features shipped, work in progress, blocked items, delivery timelines, and team velocity across quarters.

## Usage

```
/roadmap-tracker <description of product area or planning period>
```

## Workflow

### 1. Understand the Roadmap Structure

Determine:
- **Planning horizon**: Current quarter, next 2-4 quarters
- **Feature hierarchy**: Themes > Initiatives > Features > Stories
- **Priority framework**: P0 (critical), P1 (high), P2 (medium), P3 (low)
- **Status model**: Planned, In Progress, In Review, Shipped, Blocked, Cut
- **Teams**: Cross-functional teams owning different product areas
- **Delivery cadence**: Monthly releases, continuous delivery, quarterly milestones

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify feature names, team assignments, quarter targets, priority, status, and progress fields.

**If working from description:** Generate a realistic dataset with 20-40 roadmap items across 3-4 teams and 2-4 quarters, varied statuses and priorities. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Product Roadmap Dashboard            [Filters]       |
+------------+------------+------------+---------------+
| Features   | In-Progress| Blocked    | On-Time       |
| Shipped    | Count      | Items      | Delivery %    |
+------------------------------------------------------+
| Roadmap Timeline by Quarter (horizontal bar)         |
+------------------------+-----------------------------+
| Status Distribution    | Velocity by Team            |
| (doughnut)             | (bar)                       |
+------------------------+-----------------------------+
| Delivery Trend (line)                                |
+------------------------------------------------------+
| Roadmap Items Table (sortable)                       |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, roadmap timeline visualization, delivery health summary.

**Timeline** — Horizontal bar chart showing features by quarter, color-coded by status, progress indicators.

**Status** — Doughnut of status distribution (Shipped, In Progress, Planned, Blocked, Cut), trend over time.

**Delivery** — Line chart of on-time delivery % over quarters, velocity by team bar chart, forecast accuracy.

### 5. KPI Calculations

- **Features Shipped**: Count of roadmap items with status = Shipped in the period
- **In-Progress Count**: Count of items with status = In Progress or In Review
- **Blocked Items**: Count of items with status = Blocked
- **On-Time Delivery %**: (Features shipped by target date / Total features shipped) x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Horizontal bar | Roadmap timeline — features grouped by quarter, colored by status, length = duration |
| Doughnut | Status distribution — Shipped (green), In Progress (blue), Planned (gray), Blocked (red), Cut (dark gray) |
| Bar | Velocity by team — features shipped per team per quarter, stacked by priority |
| Line | Delivery trend — on-time delivery % over past 4-6 quarters, target line at 80% |

### 7. Roadmap Items Table

| Feature | Team | Quarter | Priority | Status | Progress % | Target Date |
|---------|------|---------|----------|--------|-----------|-------------|

Sortable by any column. Progress bar in Progress % column. Color-code status: Shipped (green), Blocked (red), In Progress (blue). Group by quarter optionally.

### 8. Filters

- Quarter selector (Q1-Q4, multi-year)
- Team dropdown
- Priority multi-select (P0, P1, P2, P3)
- Status multi-select (Shipped, In Progress, Planned, Blocked, Cut)
- Progress range slider

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
  WHERE plugin_name = 'product-management' AND skill_name = 'roadmap-tracker'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
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
-- Migration: Seed 5 industry-vertical golden templates into skill_registry.
-- Healthcare: Patient Outcomes, Claims & Billing, HIPAA Compliance.
-- Financial Services: Portfolio Dashboard.
-- SaaS: SaaS Business Metrics.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.
-- All templates use team_function = 'general' for cross-department availability.

-- ============================================================================
-- 1. Patient Outcomes Dashboard (healthcare plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'healthcare',
  'patient-outcomes',
  'general',
  'Build an interactive patient outcomes dashboard with patient count, avg length of stay, readmission rate, and patient satisfaction score. Use for clinical outcome reviews, department benchmarking, readmission reduction, quality improvement, and patient experience analysis.',
  $$---
name: patient-outcomes
description: Build an interactive patient outcomes dashboard with patient count, avg length of stay, readmission rate, and patient satisfaction score. Use for clinical outcome reviews, department benchmarking, readmission reduction, quality improvement, and patient experience analysis.
argument-hint: "<hospital, department, or patient population>"
---

# /patient-outcomes - Patient Outcomes Dashboard

Build a self-contained interactive HTML dashboard for patient outcomes tracking — patient volumes, length of stay analysis, readmission trends, and satisfaction scoring across departments.

## Usage

```
/patient-outcomes <description of hospital, department, or patient population>
```

## Workflow

### 1. Understand the Clinical Context

Determine:
- **Facility scope**: Single hospital, multi-site, specific department
- **Patient population**: All admissions, surgical, medical, ICU, ED
- **Outcome metrics**: Mortality, readmissions, complications, LOS, satisfaction
- **Time range**: Monthly, quarterly, rolling 12 months
- **Benchmarks**: National averages, peer hospitals, internal targets
- **Quality programs**: CMS Star ratings, Leapfrog, Joint Commission

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify department columns, patient counts, LOS values, readmission flags, and satisfaction scores.

**If working from description:** Generate a realistic dataset with 6-10 departments, monthly volumes, and outcome metrics. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Patient Outcomes Dashboard           [Filters]       |
+------------+------------+------------+---------------+
| Patient    | Avg Length | Readmission| Patient       |
| Count      | of Stay    | Rate %     | Satisfaction  |
|            | (days)     |            | Score         |
+------------------------------------------------------+
| Outcomes by Department (bar)                         |
+------------------------+-----------------------------+
| Readmission Trend      | Satisfaction Distribution   |
| (line)                 | (doughnut)                  |
+------------------------+-----------------------------+
| Length of Stay Trend (line)                          |
+------------------------------------------------------+
| Patient Summary Table (sortable)                     |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, outcomes by department bar chart, headline readmission rate.

**By Department** — Department-level breakdown of volumes, LOS, complications, and satisfaction.

**Readmissions** — Readmission trend line over months, 30-day readmission rate by department, top readmission diagnoses.

**Satisfaction** — Doughnut showing satisfaction score distribution, HCAHPS domain scores, department comparison.

### 5. KPI Calculations

- **Patient Count**: Total unique admissions in the period
- **Avg Length of Stay**: Sum of LOS days / total discharges
- **Readmission Rate %**: (30-day readmissions / total discharges) x 100
- **Patient Satisfaction Score**: Mean HCAHPS top-box score across all domains

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Outcomes by department — grouped bars for LOS, readmission rate, satisfaction |
| Line | Readmission trend — monthly 30-day readmission rate with target reference line |
| Doughnut | Satisfaction distribution — Excellent, Good, Fair, Poor segments |
| Line | Length of stay trend — monthly avg LOS with benchmark comparison |

### 7. Patient Summary Table

| Department | Patients | Avg LOS | Readmission % | Satisfaction | Complications |
|------------|----------|---------|---------------|-------------|---------------|

Sortable by any column. Color-code readmission rate: green (<10%), yellow (10-15%), red (>15%).

### 8. Filters

- Department dropdown
- Time period selector (Month / Quarter / Year)
- Patient type (Medical, Surgical, ICU, ED)
- Outcome metric toggle
- Benchmark comparison toggle

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
  WHERE plugin_name = 'healthcare' AND skill_name = 'patient-outcomes'
);

-- ============================================================================
-- 2. Healthcare Claims & Billing Dashboard (healthcare plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'healthcare',
  'claims-billing',
  'general',
  'Build an interactive healthcare claims and billing dashboard with total claims submitted, denial rate, avg days to payment, and clean claim rate. Use for revenue cycle management, denial analysis, payer mix review, reimbursement tracking, and billing operations optimization.',
  $$---
name: claims-billing
description: Build an interactive healthcare claims and billing dashboard with total claims submitted, denial rate, avg days to payment, and clean claim rate. Use for revenue cycle management, denial analysis, payer mix review, reimbursement tracking, and billing operations optimization.
argument-hint: "<facility, payer, or billing period>"
---

# /claims-billing - Healthcare Claims & Billing Dashboard

Build a self-contained interactive HTML dashboard for healthcare claims and billing — claims volume tracking, denial analysis, revenue cycle trends, and payer mix visualization.

## Usage

```
/claims-billing <description of facility, payer mix, or billing period>
```

## Workflow

### 1. Understand the Billing Context

Determine:
- **Facility type**: Hospital, clinic, physician practice, multi-site
- **Payer mix**: Commercial, Medicare, Medicaid, Self-Pay, Workers Comp
- **Claim types**: Professional (CMS-1500), Institutional (UB-04)
- **Revenue cycle stages**: Charge capture, coding, submission, adjudication, payment, appeals
- **Denial categories**: Front-end (eligibility, auth), clinical (medical necessity), coding (CPT/ICD)
- **Performance targets**: Clean claim rate >95%, denial rate <5%, days to payment <30

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify claim IDs, payer columns, amounts, status fields, denial reasons, and date columns.

**If working from description:** Generate a realistic dataset with 200-500 claims across 4-6 payers, varied statuses, and denial reasons. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Claims & Billing Dashboard           [Filters]       |
+------------+------------+------------+---------------+
| Total      | Denial     | Avg Days   | Clean Claim   |
| Claims     | Rate %     | to Payment | Rate %        |
| Submitted  |            |            |               |
+------------------------------------------------------+
| Claims by Status (doughnut)                          |
+------------------------+-----------------------------+
| Denial Reasons         | Revenue Cycle Trend         |
| (bar)                  | (line)                      |
+------------------------+-----------------------------+
| Payer Mix (doughnut)                                 |
+------------------------------------------------------+
| Claims Detail Table (sortable)                       |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, claims by status doughnut, headline denial rate.

**Denials** — Bar chart of denial reasons, denial rate by payer, top denial codes, appeal success rate.

**Revenue Cycle** — Line chart of monthly collections, days in A/R trend, charge-to-collection ratio.

**Payers** — Payer mix doughnut, reimbursement rate by payer, avg days to payment by payer.

### 5. KPI Calculations

- **Total Claims Submitted**: Count of all claims submitted in the period
- **Denial Rate %**: (Denied claims / total claims adjudicated) x 100
- **Avg Days to Payment**: Mean calendar days from submission to payment receipt
- **Clean Claim Rate %**: (Claims paid on first submission / total claims submitted) x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Doughnut | Claims by status — Paid, Denied, Pending, In Process, Appeal segments |
| Bar | Denial reasons — sorted descending, top 8-10 denial categories |
| Line | Revenue cycle trend — monthly collections, charges, and net revenue |
| Doughnut | Payer mix — proportional breakdown of claims by payer category |

### 7. Claims Detail Table

| Claim ID | Patient | Payer | Amount | Status | Submit Date | Days to Pay | Denial Reason |
|----------|---------|-------|--------|--------|-------------|-------------|---------------|

Sortable by any column. Color-code status: green (Paid), red (Denied), yellow (Pending). Filter by payer or denial reason.

### 8. Filters

- Payer dropdown (Commercial, Medicare, Medicaid, Self-Pay)
- Status multi-select (Paid, Denied, Pending, Appeal)
- Denial reason dropdown
- Date range pickers
- Amount range slider

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
  WHERE plugin_name = 'healthcare' AND skill_name = 'claims-billing'
);

-- ============================================================================
-- 3. HIPAA Compliance Dashboard (healthcare plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'healthcare',
  'hipaa-compliance',
  'general',
  'Build an interactive HIPAA compliance dashboard with compliance score, open findings, training completion rate, and incident count. Use for HIPAA audits, privacy monitoring, security assessments, PHI breach tracking, workforce training compliance, and regulatory readiness.',
  $$---
name: hipaa-compliance
description: Build an interactive HIPAA compliance dashboard with compliance score, open findings, training completion rate, and incident count. Use for HIPAA audits, privacy monitoring, security assessments, PHI breach tracking, workforce training compliance, and regulatory readiness.
argument-hint: "<organization, facility, or compliance period>"
---

# /hipaa-compliance - HIPAA Compliance Dashboard

Build a self-contained interactive HTML dashboard for HIPAA compliance monitoring — compliance scoring, findings tracking, workforce training progress, and incident management.

## Usage

```
/hipaa-compliance <description of organization or compliance scope>
```

## Workflow

### 1. Understand the Compliance Scope

Determine:
- **Organization type**: Covered entity, business associate, hybrid entity
- **HIPAA rules tracked**: Privacy Rule, Security Rule, Breach Notification Rule
- **Assessment framework**: OCR audit protocol, NIST CSF, HITRUST
- **Control categories**: Administrative, Physical, Technical safeguards
- **Training requirements**: Annual workforce training, role-based training, new hire onboarding
- **Incident types**: Breaches, complaints, unauthorized access, device loss

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify control categories, finding statuses, training records, and incident logs.

**If working from description:** Generate a realistic dataset with 40-60 controls across categories, 10-20 open findings, training records for 100+ workforce members, and 5-15 incidents. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| HIPAA Compliance Dashboard           [Filters]       |
+------------+------------+------------+---------------+
| Compliance | Open       | Training   | Incident      |
| Score %    | Findings   | Completion | Count         |
|            |            | %          |               |
+------------------------------------------------------+
| Compliance by Category (bar)                         |
+------------------------+-----------------------------+
| Training Progress      | Incidents Trend             |
| (doughnut)             | (line)                      |
+------------------------+-----------------------------+
| Risk Assessment by Safeguard (horizontal bar)        |
+------------------------------------------------------+
| Findings Detail Table (sortable)                     |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, compliance by category bar chart, overall compliance score.

**Controls** — Compliance score by HIPAA safeguard category, control implementation status, gap analysis.

**Training** — Doughnut of training completion, overdue training by department, completion trend over time.

**Incidents** — Incident trend line over months, incidents by type, breach notification status, resolution time.

### 5. KPI Calculations

- **Compliance Score %**: (Controls fully implemented / total required controls) x 100
- **Open Findings**: Count of findings with status not equal to Closed or Remediated
- **Training Completion %**: (Workforce members with current training / total workforce) x 100
- **Incident Count**: Total privacy/security incidents reported in the period

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Compliance by category — Administrative, Physical, Technical safeguard scores |
| Doughnut | Training progress — Complete, In Progress, Overdue, Not Started segments |
| Line | Incidents trend — monthly incident count with rolling average |
| Horizontal bar | Risk assessment — risk level by safeguard type, sorted by severity |

### 7. Findings Detail Table

| ID | Category | Severity | Status | Owner | Due Date | Description |
|----|----------|----------|--------|-------|----------|-------------|

Sortable by any column. Color-code severity: red (Critical), orange (High), yellow (Medium), green (Low).

### 8. Filters

- Category dropdown (Administrative, Physical, Technical)
- Severity multi-select (Critical, High, Medium, Low)
- Status (Open, In Progress, Remediated, Closed)
- Owner dropdown
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
  WHERE plugin_name = 'healthcare' AND skill_name = 'hipaa-compliance'
);

-- ============================================================================
-- 4. Investment Portfolio Dashboard (finserv plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'finserv',
  'portfolio-dashboard',
  'general',
  'Build an interactive investment portfolio dashboard with total AUM, YTD return, alpha, and Sharpe ratio. Use for portfolio reviews, asset allocation analysis, performance attribution, risk assessment, benchmark comparison, and investment committee reporting.',
  $$---
name: portfolio-dashboard
description: Build an interactive investment portfolio dashboard with total AUM, YTD return, alpha, and Sharpe ratio. Use for portfolio reviews, asset allocation analysis, performance attribution, risk assessment, benchmark comparison, and investment committee reporting.
argument-hint: "<portfolio, fund, or investment strategy>"
---

# /portfolio-dashboard - Investment Portfolio Dashboard

Build a self-contained interactive HTML dashboard for investment portfolio analysis — AUM tracking, performance vs benchmark, asset allocation breakdown, and risk-adjusted return metrics.

## Usage

```
/portfolio-dashboard <description of portfolio, fund, or investment strategy>
```

## Workflow

### 1. Understand the Portfolio Context

Determine:
- **Portfolio type**: Equity, fixed income, balanced, alternatives, multi-asset
- **Benchmark**: S&P 500, Bloomberg Aggregate, custom blended benchmark
- **Asset classes**: US Equity, International Equity, Fixed Income, Real Estate, Alternatives, Cash
- **Risk metrics**: Standard deviation, Sharpe ratio, alpha, beta, max drawdown
- **Reporting period**: MTD, QTD, YTD, 1Y, 3Y, 5Y, Since Inception
- **Holdings granularity**: Individual securities, ETFs, mutual funds, sectors

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify security names, tickers, asset classes, weights, values, and return data.

**If working from description:** Generate a realistic dataset with 15-30 holdings across 5-7 asset classes, with performance and risk metrics. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Portfolio Dashboard                  [Filters]       |
+------------+------------+------------+---------------+
| Total      | YTD        | Alpha      | Sharpe        |
| AUM        | Return %   |            | Ratio         |
+------------------------------------------------------+
| Asset Allocation (doughnut)                          |
+------------------------+-----------------------------+
| Performance vs         | Sector Exposure             |
| Benchmark (line)       | (bar)                       |
+------------------------+-----------------------------+
| Risk/Return by Asset Class (bar)                     |
+------------------------------------------------------+
| Holdings Detail Table (sortable)                     |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, asset allocation doughnut, total AUM and return summary.

**Allocation** — Asset class weights, drift from target allocation, rebalancing recommendations.

**Performance** — Performance vs benchmark line chart, return attribution by asset class, time-period comparison.

**Risk** — Risk/return bar chart by asset class, Sharpe ratio trend, drawdown analysis, volatility breakdown.

### 5. KPI Calculations

- **Total AUM**: Sum of current market values across all holdings
- **YTD Return %**: (Current portfolio value - start-of-year value) / start-of-year value x 100
- **Alpha**: Portfolio return minus (beta x benchmark return) — excess risk-adjusted return
- **Sharpe Ratio**: (Portfolio return - risk-free rate) / portfolio standard deviation

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Doughnut | Asset allocation — proportional weight of each asset class with values |
| Line | Performance vs benchmark — portfolio return (solid) vs benchmark (dashed) over time |
| Bar | Sector exposure — weight of each sector, sorted descending |
| Bar | Risk/return by asset class — grouped bars showing return and volatility side by side |

### 7. Holdings Detail Table

| Security | Ticker | Asset Class | Weight | Value | Return | Risk Rating |
|----------|--------|-------------|--------|-------|--------|-------------|

Sortable by any column. Color-code return: green (positive), red (negative). Risk rating as colored badge (Low/Med/High).

### 8. Filters

- Asset class multi-select (Equity, Fixed Income, Alternatives, Cash)
- Time period selector (MTD, QTD, YTD, 1Y, 3Y, 5Y)
- Sector dropdown
- Risk rating filter (Low, Medium, High)
- Minimum weight threshold slider

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
  WHERE plugin_name = 'finserv' AND skill_name = 'portfolio-dashboard'
);

-- ============================================================================
-- 5. SaaS Business Metrics Dashboard (saas plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'saas',
  'saas-metrics',
  'general',
  'Build an interactive SaaS business metrics dashboard with MRR, MRR growth rate, churn rate, and LTV/CAC ratio. Use for board reporting, investor updates, subscription analytics, cohort analysis, unit economics review, and recurring revenue tracking.',
  $$---
name: saas-metrics
description: Build an interactive SaaS business metrics dashboard with MRR, MRR growth rate, churn rate, and LTV/CAC ratio. Use for board reporting, investor updates, subscription analytics, cohort analysis, unit economics review, and recurring revenue tracking.
argument-hint: "<SaaS product, business unit, or reporting period>"
---

# /saas-metrics - SaaS Business Metrics Dashboard

Build a self-contained interactive HTML dashboard for SaaS business metrics — MRR tracking with new/expansion/churn decomposition, cohort retention analysis, churn diagnostics, and unit economics.

## Usage

```
/saas-metrics <description of SaaS product or business unit>
```

## Workflow

### 1. Understand the SaaS Model

Determine:
- **Pricing model**: Per-seat, usage-based, tiered, flat rate, freemium
- **Revenue components**: New MRR, Expansion MRR, Contraction MRR, Churn MRR
- **Billing cadence**: Monthly, annual, mixed
- **Customer segments**: SMB, Mid-Market, Enterprise, or by plan tier
- **Cohort definition**: By signup month, by plan, by acquisition channel
- **Unit economics**: CAC payback period, LTV target, gross margin

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify MRR columns, customer counts, churn events, cohort identifiers, and cost data.

**If working from description:** Generate a realistic dataset with 12-18 months of MRR data, 6-12 monthly cohorts, and unit economics. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| SaaS Metrics Dashboard               [Filters]      |
+------------+------------+------------+---------------+
| MRR        | MRR        | Churn      | LTV/CAC       |
|            | Growth %   | Rate %     | Ratio         |
+------------------------------------------------------+
| MRR Trend: New + Expansion + Churn (stacked bar)     |
+------------------------+-----------------------------+
| Cohort Retention       | Churn by Reason             |
| (line)                 | (doughnut)                  |
+------------------------+-----------------------------+
| LTV/CAC Trend (line)                                 |
+------------------------------------------------------+
| Cohort Detail Table (sortable)                       |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, MRR trend with decomposition, headline growth rate.

**MRR Breakdown** — Stacked bar chart decomposing MRR into New, Expansion, Contraction, and Churn components each month.

**Cohorts** — Cohort retention curves (line chart), month-over-month retention rates, cohort revenue waterfall.

**Unit Economics** — LTV/CAC trend line, CAC payback period, gross margin trend, customer lifetime analysis.

### 5. KPI Calculations

- **MRR**: Sum of all active subscription recurring revenue in the current month
- **MRR Growth %**: ((Current MRR - Previous MRR) / Previous MRR) x 100
- **Churn Rate %**: (Churned MRR / Starting MRR) x 100 — logo churn and revenue churn tracked separately
- **LTV/CAC Ratio**: (Average Revenue Per Account x Gross Margin / Monthly Churn Rate) / Customer Acquisition Cost — target >3x

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Stacked bar | MRR trend — New MRR (green), Expansion (blue), Contraction (yellow), Churn (red) per month |
| Line | Cohort retention — one line per cohort showing % retained over months since signup |
| Doughnut | Churn by reason — Product fit, Price, Competitor, Support, No longer needed segments |
| Line | LTV/CAC trend — ratio over time with 3x target reference line |

### 7. Cohort Detail Table

| Cohort | Starting MRR | Expansion | Churn | Net MRR | Retention % | Customers |
|--------|-------------|-----------|-------|---------|------------|----------|

Sortable by any column. Color-code retention: green (>90%), yellow (80-90%), red (<80%). Highlight best and worst cohorts.

### 8. Filters

- Time period selector (Monthly, Quarterly, YTD, Custom)
- Cohort selector (by signup month)
- Plan tier multi-select (Free, Starter, Pro, Enterprise)
- Customer segment (SMB, Mid-Market, Enterprise)
- MRR component toggle (New, Expansion, Contraction, Churn)

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
  WHERE plugin_name = 'saas' AND skill_name = 'saas-metrics'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
-- Migration: Seed 4 industry-vertical golden templates into skill_registry.
-- Real Estate Property Portfolio, Financial Services Risk Assessment,
-- Retail E-commerce Analytics, Education Student Performance.
-- All use team_function = 'general' so they are available across departments.
-- Idempotent: uses NOT EXISTS guard on plugin_name + skill_name.

-- ============================================================================
-- 1. Property Portfolio Dashboard (real-estate plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'real-estate',
  'property-portfolio',
  'general',
  'Build an interactive real estate portfolio dashboard with total properties, occupancy rate, portfolio value, and average cap rate. Use for property management, occupancy tracking, portfolio valuation, NOI analysis, lease management, and commercial real estate reviews.',
  $$---
name: property-portfolio
description: Build an interactive real estate portfolio dashboard with total properties, occupancy rate, portfolio value, and average cap rate. Use for property management, occupancy tracking, portfolio valuation, NOI analysis, lease management, and commercial real estate reviews.
argument-hint: "<property portfolio, region, or property type>"
---

# /property-portfolio - Real Estate Portfolio Dashboard

Build a self-contained interactive HTML dashboard for real estate portfolio management — total property count, occupancy tracking, portfolio value analysis, and cap rate comparison across assets.

## Usage

```
/property-portfolio <description of portfolio or property type>
```

## Workflow

### 1. Understand the Portfolio Context

Determine:
- **Property types**: Office, retail, multifamily, industrial, mixed-use
- **Portfolio scope**: Single market, regional, national
- **Occupancy model**: Physical occupancy vs economic occupancy
- **Revenue streams**: Base rent, CAM charges, percentage rent, parking
- **Cap rate benchmarks**: Market-specific cap rate expectations by property type
- **Lease structure**: Gross, net, triple-net, modified gross

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify property columns, unit counts, occupancy data, and financial metrics.

**If working from description:** Generate a realistic dataset with 10-20 properties across 3-5 types with varied occupancy and cap rates. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Property Portfolio Dashboard         [Filters]       |
+------------+------------+------------+---------------+
| Total      | Occupancy  | Total      | Avg Cap       |
| Properties | Rate %     | Portfolio  | Rate %        |
|            |            | Value      |               |
+------------------------------------------------------+
| Property Value by Type (doughnut)                    |
+------------------------+-----------------------------+
| Occupancy Trend        | Revenue by Property         |
| (line)                 | (bar)                       |
+------------------------+-----------------------------+
| Cap Rate Comparison (bar)                            |
+------------------------------------------------------+
| Properties Table (sortable)                          |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, property value by type doughnut, portfolio summary.

**Properties** — Detailed property table, value distribution, type breakdown.

**Occupancy** — Occupancy trend line over time, occupancy by property type, vacancy analysis.

**Performance** — Revenue by property bar chart, cap rate comparison, NOI analysis.

### 5. KPI Calculations

- **Total Properties**: Count of all properties in the portfolio
- **Occupancy Rate %**: (Occupied Units / Total Units) x 100 across portfolio
- **Total Portfolio Value**: Sum of appraised or market values for all properties
- **Avg Cap Rate %**: Mean of (NOI / Property Value) x 100 across all properties

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Doughnut | Property value by type — proportional segments for office, retail, multifamily, etc. |
| Line | Occupancy trend — monthly or quarterly occupancy rate over 12-24 months |
| Bar | Revenue by property — sorted descending, colored by property type |
| Bar | Cap rate comparison — each property's cap rate vs portfolio average reference line |

### 7. Properties Table

| Property | Type | Location | Units | Occupancy % | Value | NOI | Cap Rate |
|----------|------|----------|-------|-------------|-------|-----|----------|

Sortable by any column. Color-code occupancy: green (95%+), yellow (85-94%), red (<85%). Highlight highest-value properties.

### 8. Filters

- Property type dropdown (Office, Retail, Multifamily, Industrial, Mixed-Use)
- Location / market multi-select
- Occupancy range slider
- Value range
- Date range for trend data

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
  WHERE plugin_name = 'real-estate' AND skill_name = 'property-portfolio'
);

-- ============================================================================
-- 2. Risk Assessment Dashboard (finserv plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'finserv',
  'risk-assessment',
  'general',
  'Build an interactive financial risk assessment dashboard with overall risk score, Value at Risk (VaR), concentration risk, and stress test results. Use for risk management, regulatory compliance, counterparty analysis, stress testing, VaR monitoring, and portfolio risk reviews.',
  $$---
name: risk-assessment
description: Build an interactive financial risk assessment dashboard with overall risk score, Value at Risk (VaR), concentration risk, and stress test results. Use for risk management, regulatory compliance, counterparty analysis, stress testing, VaR monitoring, and portfolio risk reviews.
argument-hint: "<portfolio, business unit, or risk category>"
---

# /risk-assessment - Financial Risk Assessment Dashboard

Build a self-contained interactive HTML dashboard for financial risk assessment — overall risk scoring, Value at Risk trending, concentration risk analysis, and stress test scenario modeling.

## Usage

```
/risk-assessment <description of portfolio or risk scope>
```

## Workflow

### 1. Understand the Risk Context

Determine:
- **Risk categories**: Market risk, credit risk, operational risk, liquidity risk
- **VaR methodology**: Historical, parametric, Monte Carlo
- **Confidence level**: 95% or 99% VaR
- **Time horizon**: 1-day, 10-day, or custom
- **Concentration thresholds**: Single-name limits, sector limits, geography limits
- **Stress scenarios**: Historical (2008, COVID), hypothetical (rate shock, credit spread widening)
- **Regulatory framework**: Basel III/IV, Dodd-Frank, internal risk appetite

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify risk factor columns, exposure data, VaR calculations, and scenario outputs.

**If working from description:** Generate a realistic dataset with 15-25 risk items across 4-6 categories, VaR history over 12 months, and 4-6 stress scenarios. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Risk Assessment Dashboard            [Filters]       |
+------------+------------+------------+---------------+
| Overall    | Value at   | Concentra- | Stress Test   |
| Risk Score | Risk (VaR) | tion Risk %| Results       |
|            |            |            |               |
+------------------------------------------------------+
| Risk by Category (bar)                               |
+------------------------+-----------------------------+
| VaR Trend              | Concentration by            |
| (line)                 | Counterparty (doughnut)     |
+------------------------+-----------------------------+
| Stress Scenarios (grouped bar)                       |
+------------------------------------------------------+
| Risk Register Table (sortable)                       |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, risk by category bar chart, overall risk score gauge.

**VaR** — VaR trend line over time, VaR by portfolio segment, confidence interval bands.

**Concentration** — Counterparty concentration doughnut, sector concentration, geographic concentration, threshold breach alerts.

**Stress Tests** — Grouped bar chart of scenario impacts, worst-case vs base-case comparison, P&L impact under each scenario.

### 5. KPI Calculations

- **Overall Risk Score**: Weighted composite of market, credit, operational, and liquidity risk scores (scale 0-100)
- **Value at Risk (VaR)**: Maximum expected loss at the specified confidence level over the time horizon
- **Concentration Risk %**: Largest single-counterparty exposure / Total portfolio exposure x 100
- **Stress Test Results**: Portfolio P&L impact under the most severe scenario

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Risk by category — market, credit, operational, liquidity risk scores side by side |
| Line | VaR trend — daily or weekly VaR over 6-12 months with limit line overlay |
| Doughnut | Concentration by counterparty — top 10 counterparties as proportional segments |
| Grouped bar | Stress scenarios — P&L impact for each scenario, grouped by portfolio segment |

### 7. Risk Register Table

| Risk | Category | Likelihood | Impact | Score | Mitigation | Owner | Status |
|------|----------|-----------|--------|-------|------------|-------|--------|

Sortable by any column. Color-code score: red (high, >75), amber (medium, 40-75), green (low, <40). Flag breached limits.

### 8. Filters

- Risk category multi-select (Market, Credit, Operational, Liquidity)
- Counterparty dropdown
- Confidence level toggle (95%, 99%)
- Time horizon selector
- Scenario selector
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
  WHERE plugin_name = 'finserv' AND skill_name = 'risk-assessment'
);

-- ============================================================================
-- 3. E-commerce Analytics Dashboard (retail plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'retail',
  'ecommerce-analytics',
  'general',
  'Build an interactive e-commerce analytics dashboard with revenue, orders, average order value, and cart abandonment rate. Use for online store performance, product analytics, conversion funnel analysis, category revenue tracking, and AOV optimization.',
  $$---
name: ecommerce-analytics
description: Build an interactive e-commerce analytics dashboard with revenue, orders, average order value, and cart abandonment rate. Use for online store performance, product analytics, conversion funnel analysis, category revenue tracking, and AOV optimization.
argument-hint: "<store name, product category, or time period>"
---

# /ecommerce-analytics - E-commerce Analytics Dashboard

Build a self-contained interactive HTML dashboard for e-commerce analytics — revenue tracking, order volume, average order value trends, conversion funnel analysis, and cart abandonment monitoring.

## Usage

```
/ecommerce-analytics <description of store or product focus>
```

## Workflow

### 1. Understand the E-commerce Context

Determine:
- **Platform**: Shopify, WooCommerce, Magento, custom, marketplace
- **Product categories**: Electronics, apparel, home goods, etc.
- **Revenue model**: Direct sales, subscription, marketplace commission
- **Conversion funnel stages**: Visit, Product View, Add to Cart, Checkout, Purchase
- **Key metrics**: Revenue, AOV, conversion rate, cart abandonment rate, return rate
- **Traffic sources**: Organic, paid, social, email, direct, referral

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify product columns, order data, revenue figures, and funnel metrics.

**If working from description:** Generate a realistic dataset with 20-40 products across 4-6 categories, daily order data over 30-90 days, and funnel conversion rates. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| E-commerce Analytics Dashboard       [Filters]       |
+------------+------------+------------+---------------+
| Revenue    | Orders     | Avg Order  | Cart          |
| (total)    | (count)    | Value      | Abandonment % |
+------------------------------------------------------+
| Revenue Trend (line)                                 |
+------------------------+-----------------------------+
| Sales by Category      | Conversion Funnel           |
| (doughnut)             | (horizontal bar)            |
+------------------------+-----------------------------+
| AOV Trend (line)                                     |
+------------------------------------------------------+
| Product Performance Table (sortable)                 |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, revenue trend line, headline conversion rate.

**Products** — Product performance table, top sellers, underperformers, category breakdown doughnut.

**Funnel** — Conversion funnel horizontal bar, drop-off analysis at each stage, funnel comparison over time.

**Returns** — Return rate by product and category, refund amounts, return reason distribution.

### 5. KPI Calculations

- **Revenue**: Sum of all completed order values in the period
- **Orders**: Count of completed orders in the period
- **Avg Order Value (AOV)**: Total Revenue / Total Orders
- **Cart Abandonment Rate %**: (Carts Created - Orders Completed) / Carts Created x 100

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Line | Revenue trend — daily or weekly revenue over the selected period |
| Doughnut | Sales by category — proportional revenue segments per product category |
| Horizontal bar | Conversion funnel — Visit > Product View > Add to Cart > Checkout > Purchase with drop-off % |
| Line | AOV trend — average order value over time with target reference line |

### 7. Product Performance Table

| Product | Category | Units Sold | Revenue | Conversion % | Return Rate | Avg Rating |
|---------|----------|-----------|---------|--------------|-------------|------------|

Sortable by any column. Color-code conversion: green (above average), red (below average). Highlight top 5 revenue products.

### 8. Filters

- Date range pickers
- Category multi-select
- Product search / dropdown
- Traffic source multi-select
- Min revenue threshold

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
  WHERE plugin_name = 'retail' AND skill_name = 'ecommerce-analytics'
);

-- ============================================================================
-- 4. Student Performance Dashboard (education plugin)
-- ============================================================================

INSERT INTO skill_registry (plugin_name, skill_name, team_function, description, content, is_active)
SELECT
  'education',
  'student-performance',
  'general',
  'Build an interactive student performance dashboard with average GPA, pass rate, at-risk student count, and attendance rate. Use for academic performance reviews, grade analysis, attendance tracking, at-risk identification, enrollment reporting, and student advising.',
  $$---
name: student-performance
description: Build an interactive student performance dashboard with average GPA, pass rate, at-risk student count, and attendance rate. Use for academic performance reviews, grade analysis, attendance tracking, at-risk identification, enrollment reporting, and student advising.
argument-hint: "<school, department, or student cohort>"
---

# /student-performance - Student Performance Dashboard

Build a self-contained interactive HTML dashboard for student performance tracking — GPA distribution, pass rate trends, at-risk student identification, and attendance monitoring.

## Usage

```
/student-performance <description of school, department, or cohort>
```

## Workflow

### 1. Understand the Academic Context

Determine:
- **Institution type**: K-12, community college, university
- **Grading system**: GPA (4.0 scale), letter grades, percentage-based
- **At-risk criteria**: GPA below threshold, attendance below threshold, multiple failing grades
- **Reporting period**: Semester, quarter, academic year
- **Cohort segmentation**: Grade level, major, program, demographics
- **Interventions tracked**: Tutoring, advising, academic probation, early alerts

### 2. Gather the Data

**If data is provided:** Parse CSV/JSON, identify student columns, grade data, attendance records, and risk indicators.

**If working from description:** Generate a realistic dataset with 30-60 students across 4-6 grade levels or programs, with varied GPA, attendance, and risk levels. Note clearly that sample data is in use.

### 3. Dashboard Layout

```
+------------------------------------------------------+
| Student Performance Dashboard        [Filters]       |
+------------+------------+------------+---------------+
| Avg GPA    | Pass Rate  | At-Risk    | Attendance    |
|            | %          | Students   | Rate %        |
+------------------------------------------------------+
| Grade Distribution (bar)                             |
+------------------------+-----------------------------+
| Performance Trend      | At-Risk by Factor           |
| (line)                 | (doughnut)                  |
+------------------------+-----------------------------+
| Attendance Trend (line)                              |
+------------------------------------------------------+
| Student Roster Table (sortable)                      |
+------------------------------------------------------+
```

### 4. Sections

**Overview** — Aggregate KPIs, grade distribution bar chart, top-level performance summary.

**Grades** — Grade distribution bar chart, GPA histogram, pass/fail ratio, performance by subject or program.

**Attendance** — Attendance trend line over time, chronic absenteeism count, attendance by grade level.

**At-Risk** — At-risk factor doughnut breakdown (low GPA, poor attendance, failed courses), intervention tracking, early alert status.

### 5. KPI Calculations

- **Avg GPA**: Mean GPA across all active students in the cohort
- **Pass Rate %**: (Students with GPA >= 2.0 or passing grade / Total Students) x 100
- **At-Risk Students**: Count of students meeting one or more at-risk criteria (GPA < 2.0, attendance < 80%, 2+ failing grades)
- **Attendance Rate %**: (Total days attended / Total possible attendance days) x 100 across cohort

### 6. Key Visualizations

| Chart | Purpose |
|-------|--------|
| Bar | Grade distribution — count of students in each GPA band (0-1, 1-2, 2-3, 3-4) or letter grade |
| Line | Performance trend — average GPA or pass rate over semesters/quarters |
| Doughnut | At-risk by factor — proportional breakdown: low GPA, poor attendance, failed courses, multiple factors |
| Line | Attendance trend — weekly or monthly attendance rate with target reference line |

### 7. Student Roster Table

| Student | Grade Level | GPA | Attendance % | Status | Advisor | Risk Level |
|---------|------------|-----|-------------|--------|---------|------------|

Sortable by any column. Color-code risk level: red (high risk), amber (moderate), green (on track). Flag students below 2.0 GPA or 80% attendance.

### 8. Filters

- Grade level / program dropdown
- Risk level multi-select (High, Moderate, On Track)
- GPA range slider
- Attendance range slider
- Advisor dropdown
- Semester / term selector

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
  WHERE plugin_name = 'education' AND skill_name = 'student-performance'
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
