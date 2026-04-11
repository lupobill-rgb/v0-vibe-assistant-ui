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
