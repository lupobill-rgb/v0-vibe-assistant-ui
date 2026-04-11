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
