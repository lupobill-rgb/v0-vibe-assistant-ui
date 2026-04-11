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
