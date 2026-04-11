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
