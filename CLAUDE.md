# VIBE — Agent Operating Rules

Read this entire file before every session. Non-negotiable.

## Mission

Prompt → deployed product. Org-aware. Governed. Beautiful.

## Stack

- Frontend: Next.js — Vercel (deploys from `UbiGrowth/VIBE` main — NOT `lupobill-rgb`)
- API: NestJS — Railway (`@vibe/api`, port 8080)
- Database: Supabase project `ptaqytvztkhjpuawdxng`
- LLM: Claude primary. GPT-4 fallback on rate limit / timeout / 529 ONLY.
- Repos: `UbiGrowth/VIBE` is source of truth. `lupobill-rgb/v0-vibe-assistant-ui` is Vercel legacy — do not push fixes there.

## Key File Map

- `apps/api/src/index.ts` — job routing, edgeCall, POST /jobs handler
- `apps/api/src/starter-site.ts` — INITIAL_BUILD_BUDGETS, DASHBOARD_BUILD_BUDGETS, mapWithConcurrency
- `apps/api/src/storage.ts` — ExecutionState and EventSeverity types
- `supabase/functions/generate-diff/index.ts` — Edge Function, source of truth for LLM behavior
- `apps/web/app/chat/page.tsx` — frontend job submission

## Database Constraints — Read Before Writing Any State Value

- `jobs.execution_state` allowed values: `queued`, `cloning`, `building_context`, `calling_llm`, `applying_diff`, `running_preflight`, `creating_pr`, `completed`, `complete`, `failed`, `planning`, `building`, `validating`, `testing`, `security`, `qa`, `ux`
- `job_events.severity` allowed values: `info`, `error`, `success`, `warning`, `warn`
- Always verify before writing: `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = '...'`

## Build Budgets (apps/api/src/starter-site.ts)

- `INITIAL_BUILD_BUDGETS.maxWallTimeMs`: 420,000 (7 min)
- `INITIAL_BUILD_BUDGETS.stepDeadlinesMs.building`: 360,000 (6 min)
- `INITIAL_BUILD_BUDGETS.buildConcurrency`: 3 (overridden to 1 in index.ts — pages build sequentially ~85s each)
- Do not change concurrency without testing against Supabase Edge Function concurrency limits

## Rules

1. **Reliability over cleverness.** Working MVP beats clever broken code.
2. **Chunked mode.** ONE file. MAX 200 lines per diff. Ask for exact path first.
3. **Read before write.** Always read the target file before making any change.
4. **No large refactors** unless cleanup mode explicitly triggered.
5. **RLS on.** Secrets never in logs or LLM context. Ever.
6. **Every change traceable:** job → diff → log → test result.
7. **OSS first.** No custom primitives when a library exists.
8. **Scan before planning.** Query live schema and git log before proposing any sprint.
9. **Verify constraint values** before writing any execution_state or severity value.
10. **Branch naming:** Claude Code branches follow `claude/*` pattern with random suffix — check `git branch -r` for exact names before merging.

## Deployment Flow

1. Claude Code commits to `claude/*` branch
2. Merge to `UbiGrowth/VIBE` main via PowerShell: `git fetch origin` → `git merge origin/claude/...` → `git push origin main`
3. Railway redeploys `apps/api` automatically on main push
4. Vercel redeploys `apps/web` automatically on main push

**⛔ DO NOT deploy to vibe-web (production Vercel) until explicitly instructed. All work deploys to vibe_staging only. Do not create PRs targeting the production Vercel project or modify any Vercel production project settings.**

## Stable: Dashboard Fast Path (v0.1-dashboard-stable) — DO NOT MODIFY

The dashboard generation pipeline is **working and demo-ready** (Advanced Decisions demo).
The following components are locked. **No changes without explicit approval.**

### What is locked

1. **Dashboard fast path in `apps/api/src/index.ts` (lines ~808–839)**
   - When `mode === 'dashboard'`, the job handler bypasses the planner entirely.
   - A single `edgeCall({ prompt, model, mode: 'dashboard' })` generates the full output.
   - Result is written as `index.html` to the preview directory — no multi-page build, no plan step.

2. **`VIBE_SYSTEM_RULES` is the only system prompt (`supabase/functions/generate-diff/index.ts`)**
   - The edge function prepends `VIBE_SYSTEM_RULES` to every mode's system message (line ~581).
   - Dashboard mode adds `DASHBOARD_SYSTEM` and design-phase specs — no additional dashboard-specific rules are injected.
   - No extra system prompts, no prompt wrappers, no middleware prompt injection.

3. **User prompt passes directly to Claude**
   - The `enrichedPrompt` (user prompt + org context) is sent as the user message.
   - No rewriting, no summarisation, no template wrapping of the user's intent.

4. **Output is single-file HTML, no navigation links**
   - The edge function returns `{ diff: "<html>..." }` — one self-contained HTML file.
   - `index.html` is the only file written. `manifest.json` contains `["index"]`.
   - No `<a>` navigation between pages, no multi-page routing.

### Why this is locked

- This exact pipeline produced the Advanced Decisions dashboard demo successfully.
- Any change to prompt structure, output format, or routing logic risks breaking a proven path.
- Future enhancements (multi-page dashboards, iterative refinement) must be built as **new modes**, not modifications to this path.

## LLM Redundancy

LLM failover architecture spec: see `docs/llm-redundancy-plan.md` — implement per that spec when working on LLM routing, provider integration, or failover logic. Key files: `litellm/litellm_config.yaml` (proxy config), `apps/executor/src/llm-failover.ts` (failover orchestrator), `supabase/functions/generate-diff/index.ts` (edge function with 4-provider chain).

## PRE-MERGE REQUIREMENTS — Regression Prevention Gate

Before pushing ANY branch to main, complete ALL of the following. No exceptions.

### Step 1 — Run a test dashboard build

Use the prompt **"show me my pipeline"** on the **Sales** team workspace.
Wait for the build to complete and preview to render.

### Step 2 — Confirm every check passes

- [ ] Charts render on first load (no follow-up prompt needed)
- [ ] Navigation links respond to clicks
- [ ] Buttons respond to clicks
- [ ] Token count under 30,000 (check Railway logs)
- [ ] No `[LLM-FALLBACK]` in Railway logs
- [ ] No `[QA REASONS]` repair pass triggered
- [ ] No raw "html" text visible in preview

### Step 3 — If ANY check fails

**Do not merge.** Fix the regression on the branch and re-run the smoke test.
Only proceed to main once every box is checked.

### Step 4 — Document in the PR

Add a "Smoke Test Results" section to the PR description listing what was tested
and confirming all checks passed. Include the test job ID for traceability.

## SKELETON BUILD SESSIONS

Skeleton builds are a separate session type from code change sessions.
Different rules apply. Do not apply code change rules to skeleton sessions.

### What is a skeleton session?
A session that creates or updates an html_skeleton in skill_registry.
No code files are changed. No git commits are required unless a migration
file is created for audit purposes.

### Rules for skeleton sessions

| Rule | Requirement |
|------|-------------|
| APPLY METHOD | Always via Supabase MCP apply_migration — never CLI |
| VERIFY IMMEDIATELY | Run execute_sql length check after every apply |
| QUALITY GATE | length > 20000 AND contains 'new Chart(' |
| DYNAMIC KPIs | KPI values must be JavaScript-rendered from __VIBE_SAMPLE__ — never hardcoded in HTML |
| TRY/CATCH | Every vibeLoadData() call must be wrapped in try/catch with __VIBE_SAMPLE__ fallback |
| TOKEN PLACEHOLDERS | Must contain __SUPABASE_URL__, __SUPABASE_ANON_KEY__, __VIBE_TEAM_ID__ |
| NO HARDCODED DATA | Sample data lives in window.__VIBE_SAMPLE__ in <head> only |
| ISO 27001 | All regulated industry skeletons (pharma, finserv, healthcare) must include ISO 27001 panel |
| DESIGN STANDARD | Dark theme #0A0E17, Space Grotesk headings, Inter body, #00E5A0 primary |
| ONE SKELETON PER SESSION | One skill_name per Claude Code session. No batching. |

### Verification query (run after every skeleton apply)
```sql
SELECT skill_name,
  length(html_skeleton) as length,
  (LENGTH(html_skeleton) - LENGTH(REPLACE(html_skeleton, 'new Chart(', ''))) 
    / LENGTH('new Chart(') as charts,
  html_skeleton LIKE '%__VIBE_TEAM_ID__%' as has_team_token,
  html_skeleton LIKE '%window.__VIBE_SAMPLE__%' as has_sample_data,
  html_skeleton LIKE '%try{%vibeLoadData%' as has_try_catch
FROM skill_registry
WHERE skill_name = '[skill_name]';
```

### DONE WHEN for skeleton sessions
DONE WHEN: length > 20000 AND charts >= 4 AND has_team_token = true 
AND has_sample_data = true AND has_try_catch = true

### Pre-session checklist for skeleton sessions
1. Confirm skill_name exists in skill_registry (execute_sql SELECT)
2. Confirm html_skeleton IS NULL (don't overwrite existing)
3. Confirm plugin_name and team_function for the skill
4. Define the 5 nav tabs and 6 KPI cards before writing any HTML
5. Run verification query immediately after apply

### Priority skeleton build order
Tier 1 (demo-critical):
- crm-dashboard (Sales)
- marketing-dashboard (Marketing)
- sales-forecast (Sales)
- finance-dashboard (Finance)
- youth-sports-league-manager (PlayKout demo)

Tier 2 (platform completeness):
- pipeline-review, win-loss-analysis, commission-tracker (Sales)
- abm-dashboard, email-analytics, social-media (Marketing)
- pnl-dashboard, finance-dashboard (Finance)
- patient-outcomes, hipaa-compliance (Healthcare)

## Never

- Silent failures. Always return plain-English explanation + next action.
- Raw stack traces to users.
- Customer API keys. All LLM calls through our accounts.
- Whole-file rewrites. Diffs only.
- Push to `lupobill-rgb` for bug fixes — always use `UbiGrowth/VIBE`.

## CURRENT SPRINT: REVENUE SPRINT (March 26, 2026)

Governing doc: VIBE_NorthStar_v7_0.docx Sprint prompts: VIBE_Revenue_Sprint_Prompts.md Design standard: VIBE_Design_System_Spec.md

Sprint Sequence — Execute in order. Do NOT skip or reorder.

1A. Thin wrapper (replace VIBE_SYSTEM_RULES) → Edge Function
1B. resolveDepartmentSkills() → context-injector.ts
2. Auth identity fix → frontend call sites
3. Nango HubSpot live → apps/api/src/connectors/
4. Design system + dashboard quality → context-injector.ts + skill_registry
5. Edit/iterate flow → API + Edge Function
6. File upload stability → upload handler
7A. Stripe backend → apps/api/src/billing/
7B. Stripe frontend → UpgradeModal + PricingPage
8. Smoke test gate → manual verification

Current Position: SPRINT 1B ✅ → next: SPRINT 2

### Billing

STRIPE_SECRET_KEY → Railway env only (never Vercel, never frontend)
STRIPE_WEBHOOK_SECRET → Railway env only
Pricing model: Seat fee ($17/user/month) + token consumption (750K included/user/month)
Free trial: 30 days full access, no credit card required
Volume discounts: 500+ users $15, 2500+ $12, 10000+ $10
Builder persona tiers (Starter/Pro/Growth/Team/Portfolio/Enterprise) retained for feature gating
Cost rates: read from DB cost_rates table, never hardcoded
Customer-facing copy: no mention of markup, tokens, or LLM

### Design System

Every build output must follow DESIGN_SYSTEM_RULES. Injected by context-injector.ts AFTER department skills, BEFORE user prompt. Brand tokens from kernel drive color palette. Light/dark follows user intent.

### Governing Documents (priority order)

1. CLAUDE.md (this file) — session enforcement
2. VIBE_NorthStar_v7_0.docx — strategic direction (Autonomous Company OS)
3. VIBE_NorthStar_v6_0_Addendum.docx — wrapper architecture
4. VIBE_Revenue_Sprint_Prompts.md — current sprint sequence
5. VIBE_Design_System_Spec.md — Figma-quality output standard

### HARD STOP

DO NOT START ANY v7.0 (Reactive Kernel / autonomous execution) WORK UNTIL ALL 8 REVENUE SPRINTS PASS AND CUSTOMERS ARE PAYING. No exceptions. Revenue first. Autonomy second.
