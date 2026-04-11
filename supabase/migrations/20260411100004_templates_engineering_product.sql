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
