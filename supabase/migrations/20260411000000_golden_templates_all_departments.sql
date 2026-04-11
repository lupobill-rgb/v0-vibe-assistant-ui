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
