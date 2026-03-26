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
Pricing: Starter(free) / Pro($49) / Growth($99) / Team($199) / Enterprise(custom)

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
