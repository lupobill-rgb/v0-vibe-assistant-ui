# VIBE Architecture Audit — Claude-as-Runtime Assessment
**Date:** 2026-03-14
**Scope:** UbiGrowth/VIBE monorepo — report findings only

---

## 1. NestJS API Layer

### NestJS Module (apps/api/src/jobs/)
```
[jobs.module.ts]        — Module shell, exports controller+service              — ROUTING
[jobs.controller.ts]    — @Sse(':id/logs') SSE adapter                          — ROUTING
[jobs.service.ts]       — EventEmitter lifecycle, DB poll every 1s, cleanup     — KEEP
[log-emitter.ts]        — Typed EventEmitter subclass                           — KEEP
```

### Express Routes — Org/Team (apps/api/src/index.ts)
```
POST   /orgs                   — create org, delegates to storage               — ROUTING
GET    /orgs                   — list orgs                                      — ROUTING
GET    /orgs/:id               — fetch org                                      — ROUTING
POST   /orgs/:orgId/teams      — create team                                    — ROUTING
GET    /orgs/:orgId/teams      — list teams                                     — ROUTING
POST   /teams/:teamId/members  — add member                                     — ROUTING
```

### Express Routes — Projects
```
POST   /projects               — create + git init                              — ROUTING
POST   /projects/import/github — clone repo                                     — ROUTING
GET    /projects               — list by team/org                               — ROUTING
GET    /projects/:id           — single fetch                                   — ROUTING
GET    /projects/:id/jobs      — list jobs                                      — ROUTING
DELETE /projects/:id           — delete + cleanup local dir                      — ROUTING
POST   /projects/:id/publish   — copy preview to /published                     — ROUTING
```

### Express Routes — Jobs (LLM Pipeline)
```
POST   /jobs                   — FULL LLM ORCHESTRATION PIPELINE                — CLAUDE-OWNS
  ↳ kernel context injection (resolveKernelContext)
  ↳ prior-job context assembly
  ↳ budget enforcement
  ↳ page plan generation (Edge Function call)
  ↳ parallel page building (mapWithConcurrency)
  ↳ quality validation + repair loop
  ↳ token accounting + timeline tracking
GET    /jobs/:id               — fetch job + timeline                            — ROUTING
GET    /jobs                   — list by project                                 — ROUTING
GET    /jobs/:id/diff          — fetch last_diff                                 — ROUTING
POST   /jobs/:id/diff/apply    — git apply patch                                — ROUTING
POST   /jobs/:id/preview       — sign preview token                             — ROUTING
GET    /jobs/:id/logs          — SSE log streaming (Express impl)               — ROUTING
```

### Route Files
```
routes/supabase.ts — connect, status, migrate, add-table                        — KEEP
routes/preview.ts  — spawn build+serve, status, kill                            — KEEP
routes/billing.ts  — usage, CSV export, budget set                              — KEEP
```

### Core Modules
```
auth.ts                        — hash/verify, JWT, tenant middleware            — KEEP
middleware/tenant.ts           — JWT extraction, ownership assertion             — KEEP
storage.ts                     — VibeStorage singleton, all DB ops              — KEEP
kernel/context-injector.ts     — org/team/role/brand context assembly            — CLAUDE-OWNS
edge-function.ts               — Edge Function client wrapper                   — CLAUDE-OWNS
starter-site.ts                — plan heuristics, color scheme, quality gates    — CLAUDE-OWNS
migrations.ts                  — SQLite migrations (API uses Supabase)           — DEAD CODE
nest-main.ts                   — Standalone NestJS bootstrap (unused)            — DEAD CODE
```

---

## 2. Edge Functions

### Deployed Functions: 1
```
generate-diff (v1.5.0, 2026-03-12)                                              — CLAUDE-OWNS
```

- **What it does:** Universal LLM orchestration. 6 modes. Claude primary, GPT-4 fallback.
- **What it calls:** Anthropic API (claude-sonnet-4), OpenAI API (gpt-4-turbo fallback)
- **What writes to Supabase:** NOTHING. Stateless output generator. All writes in NestJS.
- **Duplication with NestJS:** NONE. Clean separation — API = state, Edge = LLM.

### Modes
```
plan       — JSON page plan {pages[], color_scheme}         max 2048 tokens     — CLAUDE-OWNS
page       — single page HTML for multi-page site           max 8192 tokens     — CLAUDE-OWNS
html       — single-page website                            max 8192 tokens     — CLAUDE-OWNS
edit       — edit existing HTML with preservation           max 8192 tokens     — CLAUDE-OWNS
dashboard  — 3-phase: visual→systems→build, Chart.js        max 8192 tokens     — CLAUDE-OWNS
default    — unified diff output                            max 4096 tokens     — CLAUDE-OWNS
```

### System Prompts (exact location in generate-diff/index.ts)
```
VIBE_SYSTEM_RULES     [lines 11-78]   — color system, form integration, mandatory interactivity
PLAN_SYSTEM           [lines 82-102]  — JSON plan generation rules
MULTI_PAGE_SYSTEM     [lines 104-169] — multi-page HTML rules, Space Grotesk/Inter, glassmorphism
SINGLE_PAGE_SYSTEM    [lines 174-240] — hero+10 sections, testimonials, pricing
DASHBOARD_SYSTEM      [lines 242-350] — sidebar+topbar, Chart.js, anti-React/JSX guardrails
DESIGN_PHASE_VISUAL   [lines 352-363] — design tokens JSON (dashboard phase 1)
DESIGN_PHASE_SYSTEMS  [lines 365-388] — chart/KPI/table spec JSON (dashboard phase 2)
```

---

## 3. Supabase Schema

### 13 Tables Total

**Org Kernel — KEEP (9 tables)**
```
organizations         — org identity (name, slug)                               — KEEP
teams                 — isolation boundary for projects/members                  — KEEP
team_members          — RBAC: user→team with role enum                           — KEEP
projects              — repo URL, local path, published state                    — KEEP
tenant_budgets        — billing caps per org (limit_usd)                         — KEEP
supabase_connections  — per-project encrypted Supabase creds                     — KEEP
data_scopes           — Layer 2: team ownership/read/aggregate scopes            — KEEP
team_visibility       — Layer 2: cross-team permission rules                     — KEEP
brand_tokens          — Layer 2: colors, fonts, logo, voice injected to LLM      — KEEP
```

**Job Orchestration — MAY COLLAPSE (3 tables)**
```
jobs                  — execution state machine (17 states)                      — MAY-COLLAPSE
job_events            — audit log, severity: info|error|success|warning|warn     — MAY-COLLAPSE
metering_calls        — LLM token/cost/latency tracking per job+team             — MAY-COLLAPSE
```

**Agent State — MAY COLLAPSE (1 table)**
```
form_submissions      — anon submissions from generated sites, JSONB payload     — MAY-COLLAPSE
```

### Confirmations
```
form_submissions      — EXISTS (migration 012_form_submissions.sql)
org_feature_flags     — DOES NOT EXIST (zero references in codebase)
```

---

## 4. Bug Surface

### Claude API Error Handling / Fallback
```
[generate-diff/index.ts:464-606]  — fallback triggers on ANY error, not just 429/529/timeout    — BUG SURFACE
[index.ts:751-773]                — edgeCall() retry: regex text match, no HTTP status check     — BUG SURFACE
[index.ts:763-770]                — rate limit detection via /rate limit|overload|429/i regex     — BUG SURFACE
[executor/llm-router.ts:138-156]  — duplicate fallback logic (also in Edge Function)             — CLAUDE-OWNS
[executor/llm-router.ts:29-31]    — missing SUPABASE_ANON_KEY = hard crash, no fallback          — BUG SURFACE
```

### Missing Event Handlers in Generated HTML
```
[generate-diff/index.ts:11-43]    — mandates complete handlers but NO downstream validation      — BUG SURFACE
[index.ts:877-905]                — quality gate checks nav/h1/sections, NOT handler presence     — BUG SURFACE
[generate-diff/index.ts:55-77]    — vibeSubmitForm script may be omitted by LLM                  — BUG SURFACE
[generate-diff/index.ts:73-74]    — alert() in sandboxed iframe = silent failure                  — BUG SURFACE
```

### Iframe / Thumbnail Rendering
```
[chat/page.tsx:155-166]           — 25% CSS transform scale; rendering glitches on low-DPI       — BUG SURFACE
[building/[id]/page.tsx:52-60]    — router injection may conflict with generated listeners        — BUG SURFACE
[building/[id]/page.tsx:175-180]  — postMessage lacks origin validation                          — BUG SURFACE
[jobs/demo.html:149,166]          — innerHTML without sanitization                               — DEAD CODE
```

### Data Safety
```
[index.ts:937-941]                — raw LLM response logged on parse error (may contain secrets) — BUG SURFACE
[index.ts:740-741]                — credential injection via string.replace(); LLM could leak    — BUG SURFACE
[generate-diff/index.ts:577-581]  — color_block prompt injection risk                            — BUG SURFACE
```

### State Consistency
```
[storage.ts:19-20]                — both 'completed' and 'complete' allowed                      — KEEP (legacy)
[storage.ts:30]                   — both 'warning' and 'warn' allowed                            — KEEP (legacy)
[index.ts:887]                    — uses 'warn' severity; DB constraint may expect 'warning'     — BUG SURFACE
```

### Resource Leaks
```
[index.ts:466-471]                — orphaned repo dirs on failed cleanup                         — BUG SURFACE
[index.ts:720-722]                — preview dirs leak on job failure                             — BUG SURFACE
```
