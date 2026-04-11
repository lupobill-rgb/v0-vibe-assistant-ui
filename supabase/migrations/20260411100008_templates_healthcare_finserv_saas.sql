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
