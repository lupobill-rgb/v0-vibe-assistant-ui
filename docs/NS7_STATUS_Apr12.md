# NS7 Status — Apr 12

Read-only audit. Findings reported verbatim from `UbiGrowth/VIBE` @ `claude/document-system-audit-WRLHF`.
Supabase MCP not connected in this session — DB-count queries marked `N/A (no Supabase MCP)`; schema checks substituted via migration grep.

---

## Shipped Since Apr 7

From `git log --since="2026-04-07"` (merge commits inline; PR numbers shown where present):

- `594311b` Add NorthStar v7.0 build status snapshot
- `2dca0ac` Merge PR #562 — claude/interesting-chaplygin
- `ac31bfd` Merge PR #561 — claude/orchestrator-07-align-imports
  - `973983d` fix(orchestrator): resolve Nest DI bootstrap failures in OrchestratorModule
  - `671f31c` Fix TypeScript compilation in apps/api orchestrator — align imports and class names
- `4389707` Merge PR #559 — claude/setup-nango-supabase-RwfZG
- `d61313e` Merge PR #560 — claude/setup-nango-supabase-D1kjw
  - `21baf8e` feat(orchestrator): internal run route + GPT-4 circuit breaker
- `d0394a8` Merge PR #558 — claude/setup-nango-supabase-KBKaT
- `af484bb` Merge PR #557 — claude/setup-nango-supabase-9bcgM
- `34a7d8e` Merge PR #556 — claude/setup-nango-supabase-XuwGp
  - `6a0b94c` feat(api): wire OrchestratorService with planner + worker into NestJS
  - `253fe98` fix(orchestrator): read skill_registry.content instead of system_prompt
  - `fbfa071` feat(db): add system_prompt column to skill_registry
  - `47410f3` feat(orchestrator): add ClaudeWorker for skill-scoped PlanStep execution
  - `8d04268` feat(orchestrator): add ClaudePlanner with 5-line wrapper + skill injection
  - `eb5cedb` feat(orchestrator): add types and interfaces for planner/worker/orchestrator
- `1d09006` Merge PR #555 — claude/setup-nango-supabase-raBb0
  - `638c61f` feat(db): extend skill_registry for runtime vs build-time orchestration
- `8a4c813` Merge PR #554 — Add win-loss-analysis skeleton
- `8f50e36` Merge PR #553 — Add pipeline-review skeleton
- `c5a74f7` Merge PR #552 — Extract handler logic from index.ts (2039 → 1396 lines)
- `d05de5f` Merge PR #551 — Add youth-sports-league-manager skeleton
- `db42c83` Merge PR #550 — Add finance-dashboard skeleton

Theme of the window: **Orchestrator module wired (planner + worker + internal run route), skill_registry extended for runtime/build-time split, index.ts extraction (2039→1396), 4 new golden template skeletons.**

Current branch: `claude/document-system-audit-WRLHF` (only `claude/*` local/remote branch present).
`git status`: clean after stashing pre-session lockfile drift.

---

## v7.0 Track Status

### Track A — Foundation
- **OrchestratorModule** exists (`apps/api/src/orchestrator/`): controller, service, planner, worker, types, interface — all files present.
- **Orchestrator internal run route** at `POST /internal/orchestrator/run` (`orchestrator.controller.ts:20-52`); x-internal-secret header guard.
- **GPT-4 circuit breaker**: merged per `21baf8e`.
- **Live probe of `POST /internal/orchestrator/run`**: curl from this sandbox returned HTTP `000` / `CONNECT tunnel failed 403` — sandbox egress blocks external HTTPS. Cannot confirm deployed status from this session.
- **`apps/api/src/index.ts`** reduced to 1396 lines (was 2039).
- Status: **Scaffolding in place, live reachability unverified from sandbox.**

### Track B — Reactive Kernel (Stage 1 gate)
- **`/connectors/webhook`** exists: `apps/api/src/connectors/webhook.controller.ts:16` — `@Post('webhook')`, receives Nango events, resolves org/team via `team_integrations.nango_connection_id`, reads `organizations.autonomous_kill_switch`, matches `skill_registry.trigger_on`, inserts into `autonomous_executions`, then kicks `AutonomousProcessorService.processQueuedExecutions()` via `setImmediate`.
- **Secondary webhook** `/api/webhooks/data-event` at `apps/api/src/reactive-kernel/webhook.controller.ts:24` — secret-guarded, queries `skill_triggers` table, inserts `autonomous_executions` with status `'pending'`.
- **`AutonomousProcessorService`** (`apps/api/src/connectors/autonomous-processor.service.ts`):
  - Polls `autonomous_executions` where `status = 'queued'`, dispatches via `POST /jobs`.
  - Uses `skill.skill_name` (`line 75`, `line 98`, `line 127`, `line 159`) — **`skill.name` bug FIXED**.
  - Cascade depth cap at 5 (`line 65`).
  - 1-hour dedup window on project-level recent jobs (`line 106-122`).
- **`WebhookService.generateRecommendations()`** (`webhook.service.ts:103-142`): **persists to `skill_recommendations`** at `line 133` via insert with org_id/team_id/title/rationale/proposed_action/estimated_impact/priority/status/recommended_by — **persistence FIXED**.
- **`skill_registry.trigger_on`**: column used by both webhook paths.
- **Redundant webhook plumbing**: TWO webhook controllers exist (`connectors/` + `reactive-kernel/`) each writing to `autonomous_executions` but with different status conventions (`'queued'` vs `'pending'`) and different match tables (`skill_registry.trigger_on` vs `skill_triggers`).
- **Module wiring snag**: `apps/api/src/orchestrator/orchestrator.module.ts:7` references `OrchestratorController` in the `controllers` array but **does not import it** in the top-of-file imports (imports only `Module`, `ClaudePlanner`, `ClaudeWorker`, `OrchestratorService`). Recent commits `973983d` / `671f31c` claimed to resolve Nest DI bootstrap failures — file as committed still appears to be missing the import line. Flag for verification.
- **Supabase counts (N/A — no Supabase MCP in session):**
  - `SELECT count(*) FROM autonomous_executions WHERE created_at > now() - interval '5 days'` — unrun.
  - `SELECT count(*) FROM skill_registry WHERE trigger_on IS NOT NULL` — unrun.
  - `SELECT count(*) FROM jobs WHERE metadata ? 'data_state'` — unrun; also `jobs.metadata` column not found in any migration (see Data-State section).
- **Stage 1 gate status**: **~70% code-complete, unverified live, one DI import smell, kernel has two parallel webhook paths.**

### Track C — PLG
- **ActivationStrip**: `apps/web/components/dashboard/activation-strip.tsx` — **does not exist**.
- **`apps/web/app/page.tsx`**: renders `HeroSection → RecommendationBanner (conditional) → PromptCard → ProjectsGrid`. No `ActivationStrip` import/usage.
- **Pricing route**: `apps/web/app/pricing/page.tsx` exists (3.05 kB per build output).
- Status: **Not started for the activation-strip component; pricing page live.**

---

## Outside v7.0 Agreement

Shipped in this window that was **not** in the original v7.0 doc scope per CLAUDE.md (Revenue Sprint takes priority; v7.0 is HARD STOPPED):

- **Orchestrator planner/worker/service** (full substrate wired into NestJS) — this is v7.0 work that shipped *despite* the hard stop.
- **`skill_registry` schema extensions** for runtime vs build-time orchestration + `system_prompt` column + subsequent revert to reading `content` instead.
- **index.ts extraction** 2039→1396 lines (tech debt from NORTH_STAR.md, not in v7.0 scope).
- **Four new golden-template skeletons**: finance-dashboard, youth-sports-league-manager, pipeline-review, win-loss-analysis. Not in v7.0 agreement; are Sprint 4 (design system + dashboard quality) feeders.
- **Secondary reactive-kernel webhook** at `/api/webhooks/data-event` (separate from `/connectors/webhook`). Not clear which one is canonical.
- **Background-LLM routing** (`webhook.service.ts:179-236`): DeepSeek primary, OpenAI/Anthropic fallback for short-output recommendation calls. Parallel failover chain distinct from edge function's failover chain.

---

## Known Bugs — Fixed vs Open (Apr 10 list)

| # | Bug | Status | Evidence |
|---|-----|--------|----------|
| a | `skill.name` → `skill.skill_name` in autonomous-processor | **FIXED** | `autonomous-processor.service.ts:75,98,127,159` all use `skill.skill_name`; no `skill.name` references found |
| b | `generateRecommendations()` persistence to `skill_recommendations` | **FIXED** | `webhook.service.ts:133` inserts into `skill_recommendations`; duplicate-title guard at `line 130-132` |
| c | Autonomous builds using wrong kernel template (process-optimization vs sales-crm) | **PARTIAL** | `autonomous-processor.service.ts:124-127` builds prompt from `skill.team_function`, `skill.skill_name`, `skill.description` — no hardcoded template. Whether the golden-template matcher routes correctly from that prompt was **not verified end-to-end** in this scan |
| d | Cross-team feed suggestion toast persistence | **UNVERIFIED** | No test touched the toast path this session; no grep of toast/feed-subscription commit in the Apr 7+ window surfaces a matching fix. `a86e54b fix: wire cross-team data sharing — feed subscriptions end-to-end` appears in earlier history (pre-Apr 7 window) |

---

## Scan Block 3 — Edge Function (`supabase/functions/generate-diff/index.ts`)

- Line count: **1401 lines**.
- Grep for `autonomous` / `result_card` / `VIBE_SYSTEM_RULES` / `data_state`: **zero matches** for any of the four terms.
- The edge function **does not detect autonomous-execution mode**. No `result_card` emission path. `VIBE_SYSTEM_RULES` has been removed or renamed in-file (CLAUDE.md still references it as the only system prompt; only `buildVibeSystemRules()` wrapper from the v6.0 addendum appears to remain under a different name).

---

## Scan Block 5 — Nango / Connectors

- `team_integrations` has **both** `nango_connection_id` (migration `20260404100000`) and `connection_id` (migration `20260407000001`). `connectors/webhook.controller.ts:74` resolves via `nango_connection_id`; `webhook.service.ts:20` resolves via `connection_id`. Two code paths, two columns.
- `packages/kernel/priors.ts`: **does not exist** (no `packages/kernel/` directory found).
- Supabase queries (provider counts, fake-ID detection `connection_id LIKE '%__%'`): **N/A — no Supabase MCP**.

---

## Scan Block 6 — Data-State Model

- `docs/dashboard-data-state-spec.md`: **does not exist**.
- `jobs.metadata` column: **not found** in any migration (grepped `ALTER TABLE jobs` and `metadata jsonb` across `supabase/migrations/`). `jobs` table as built has no JSONB metadata column. The Apr 10 query `WHERE metadata ? 'data_state'` would fail against current schema.
- `published_assets.skill_trigger` column: **not found**. `skill_triggers` is a separate table (migration `20260403210000_skill_triggers_table.sql`), not a column on `published_assets`.

---

## Scan Block 7 — PLG / Activation

- `apps/web/components/dashboard/activation-strip.tsx`: **does not exist**.
- `apps/web/app/page.tsx` render order: `HeroSection → RecommendationBanner (gated on currentTeam+currentOrg) → PromptCard → ProjectsGrid`. No activation strip.

---

## Scan Block 8 — Pricing

Grep results for dollar figures:

- `$17/user/month` — **live across the product**:
  - `apps/api/src/billing/tiers.ts:17`
  - `apps/web/components/billing/PricingPage.tsx` (lines 17, 109)
  - `apps/web/components/billing/UpgradeModal.tsx:94`
  - `apps/web/components/dialogs/upgrade-modal.tsx:16-19` (pro/growth/team/portfolio all show `$17/user/mo`)
  - `apps/web/app/landing/pe/constants.ts` (lines 56, 101, 111)
  - `CLAUDE.md:270` records this as the canonical model
- `$49` — **zero matches** in code paths (only appears in dashboard skeleton sample data as a test fixture, not as a pricing tier).
- `$199` — **zero matches** anywhere in repo.

Live model: **seat-based `$17/user/month` with 30-day free trial**; old credit-tier pricing has been removed.

---

## Blockers

- **`OrchestratorController` import smell** in `orchestrator.module.ts` — referenced in `controllers` array, not in top-of-file imports. Recent commits claim Nest DI fix merged; the file as checked out still looks broken. **Verify build of `apps/api` specifically** (the root `npm run build` in this scan captured `apps/web` output only).
- **Two parallel reactive-kernel webhook paths** (`/connectors/webhook` + `/api/webhooks/data-event`) with different match tables (`skill_registry.trigger_on` vs `skill_triggers`) and different initial statuses (`queued` vs `pending`). Unclear which is canonical; autonomous processor only polls `status = 'queued'`, so `pending` inserts from the reactive-kernel path never drain unless something promotes them.
- **Two `team_integrations` connection-ID columns** (`nango_connection_id` + `connection_id`) with two code paths reading different columns.
- **Edge function has no autonomous-mode detection** — no `result_card`, no `data_state`, no `autonomous` branch. Stage 1 Reactive Kernel cannot emit result cards end-to-end.
- **`jobs.metadata` column missing** — spec work that references `metadata.data_state` has no schema backing.
- **Sandbox cannot curl Railway** (CONNECT tunnel 403). Live `POST /internal/orchestrator/run` status unverified from this session — must be checked from a network with external egress.

---

## Build Health

- `npm run build` (root): captured output shows `apps/web` Next.js build **PASS** — all 22 routes generated. No errors in captured tail.
- `apps/api` build: **not explicitly visible** in captured tail — cannot confirm from this log whether NestJS compiled. Given the missing `OrchestratorController` import in `orchestrator.module.ts`, a targeted `tsc -p apps/api` should be run before merge.
- Latest merge to `main`: `2dca0ac` (PR #562, claude/interesting-chaplygin) — Railway auto-redeploy assumed per CLAUDE.md deploy flow; **not verified live** (see blocker above).

---

## Recommended Next Session

**Verify `apps/api` TypeScript build + OrchestratorController import.**
Scope: run `cd apps/api && npx tsc --noEmit`, confirm `orchestrator.module.ts` imports and registers `OrchestratorController`, and curl `POST /internal/orchestrator/run` from a network with external egress. One file, one concern — does Track A's orchestrator actually bootstrap in production.
