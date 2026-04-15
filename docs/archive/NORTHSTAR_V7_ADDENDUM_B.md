# North Star v7.0 — Addendum B

**Date:** April 12, 2026
**Supersedes:** North Star v7.0 §§ Track B Stage 1 gate criteria; pricing reference from v5.0 §4
**Retains:** All v7.0 strategic commitments; Track A status; June 30, 2026 full autonomous company commit
**Precedent:** v6.0 Addendum format

> Source doc `VIBE_NorthStar_v7_0.docx` is not committed to repo. This addendum is the in-repo authoritative update to v7.0 and takes governance precedent alongside the v6.0 Addendum per CLAUDE.md governing document list.

---

## Purpose

Between the v7.0 ratification and April 12, 2026, UBIVibe absorbed material scope not contemplated in the original agreement. This addendum formally incorporates that scope, redefines Stage 1 exit criteria based on actual implementation reality, and forces one open strategic decision about the June 30 commit.

---

## § B.1 — Scope Absorbed Into v7.0

### B.1.1 Orchestrator Stack (new architectural layer)

Not contemplated in original v7.0. Now central to the product.

Shipped components:
- `orchestrator.service.ts` (per-team serial execution flag)
- `planner.service.ts` (ClaudePlanner, 5-line wrapper + skill injection)
- `worker.service.ts` (ClaudeWorker, build mode working, runtime stubbed)
- `orchestrator.module.ts` (DI wired, registered in `app.module.ts`)
- `orchestrator.controller.ts` (exists, compiles, one PR from live route)

Status: **95% complete.** Single 20-line PR (#563) registers the controller in the module's controllers array. DI bootstrap succeeds. Railway logs confirm `OrchestratorModule dependencies initialized`.

Parked to subsequent sprints:
- Cleanup of unreferenced `orchestrator.types.ts` and `orchestrator.interface.ts`
- Runtime tool dispatch (replaces ClaudeWorker `mode='runtime'` stub with Nango-backed tool calls scoped per skill via `tool_grants`)
- Job pipeline integration (routes user prompts through `OrchestratorService.run()` instead of directly to `generate-diff`)

### B.1.2 Skill Registry Orchestrator Extensions

Five new columns added to `skill_registry`: `mode`, `inputs_schema`, `outputs_schema`, `tool_grants`, `composable`. 240 rows backfilled with `mode='build'`, indexed. This schema turns 240 skills from catalog entries into callable functions an orchestrator can compose.

### B.1.3 Golden Template Library — 15 Skeletons

Not contemplated in original v7.0 (which assumed LLM generation per prompt). Now the primary rendering path for customer-facing builds.

15 skeletons shipped, all passing pre-merge chart gate, all with universal chart-sizing CSS:
- `executive-dashboard`, `executive-command-dashboard`
- `crm-dashboard`, `marketing-dashboard`, `sales-forecast`
- `finance-dashboard`, `pipeline-review`, `win-loss-analysis`, `abm-dashboard`
- `youth-sports-league-manager`
- `pharma-analytics-dashboard`, `pharma-phase1`, `phase2`, `phase3`, `phase4`

Pharma suite (5 skeletons) covers Advanced Decisions demo scope (Clinical Operations, Medical Affairs, Regulatory & QC from Apr 8 PLG plan) at template level.

### B.1.4 Auto-Cache Architecture (PR #528)

First user of any golden-template build pays LLM cost once. All subsequent users receive deterministic cached build. Material unit economics improvement against $17/month pricing. Makes margin math viable at PLG scale.

### B.1.5 Pricing — $17/user/month Simple Model

Supersedes v5.0 §4 five-tier model ($0 / $49 / $99 / $199 / custom). Live across billing, `PricingPage`, `UpgradeModal`, landing page, `/pe` route. Old tiers removed from code entirely.

### B.1.6 Foundation Seed Migration (PRs #542–546)

Org and team parent rows now created before all downstream migrations. Duplicate `team_visibility` resolved. Migration timestamp conflicts resolved. Preview branch replay works cleanly — Supabase branching now usable for v7.0 integration testing. This was a long-standing pain point; treat as formal v7.0 infrastructure deliverable.

### B.1.7 Intake Flow Hardening (PRs #522–526)

- `STRUCTURAL_REQUIREMENTS` restored in edge function
- `MIN_OVERLAP` 3 → 2 (short prompts match golden templates)
- CSV vs sample data selection step restored
- Original prompt passed verbatim (kills phase-1 hallucination bug from Apr 9)

### B.1.8 `index.ts` Extraction (PR #552)

1,845 → 1,240 lines. Four handler files extracted (`dashboard`, `enrich-prompt`, `fast-paths`, `planner`). 800-line per-file gate cleared.

### B.1.9 CLAUDE.md Pre-Merge Gates

Formalized engineering discipline rules:
- Skeleton build session rules
- Pre-merge gate: `charts=0` = automatic reject
- DB first, commit second
- Verification query required before marking work complete

### B.1.10 UbiVibe Brand System

Palette: Vibe Core `#00E5A0`, Signal `#00B4D8`, Autonomy `#7B61FF`, Deep `#0A0E17`, Surface `#0F1420`, Light `#E8ECF4`. Typography: Syne 800, -1px tracking. Full lockups shipped.

---

## § B.2 — Stage 1 Exit Criteria (Redefined)

Original v7.0 criterion: "Reactive Kernel Stage 1 merged by April 11/18."

**Replaced with functional criteria.** Stage 1 is closed when ALL of the following are true:

1. `POST /internal/orchestrator/run` returns valid `OrchestratorRunResult` JSON against live Railway endpoint (PR #563 merged)
2. `autonomous_executions` table has a single status column convention; the dual `queued`/`pending` drain bug is resolved; processor drains end to end on a live HubSpot webhook event
3. `team_integrations` has a single connection-ID column; the `nango_connection_id` vs `connection_id` split-brain is resolved
4. `generate-diff` edge function detects autonomous execution mode and emits a focused result card instead of a full standalone app
5. Four known bugs from Apr 10 session verified end-to-end: `skill.skill_name` (fixed), `generateRecommendations` persistence (fixed), wrong kernel template (process-opt vs sales-crm), cross-team feed toast persistence

Item 5 contains two subcriteria still unverified and must be confirmed before declaring Stage 1 closed.

---

## § B.3 — Strategic Decision Required: June 30 Commit Definition

The June 30, 2026 "full autonomous company capability" commit is retained in Addendum B but requires explicit definition that v7.0 original did not provide.

### Two defensible bars

**Option A — True Autonomous Company OS**
Orchestrator route live (B.2 #1) AND runtime tool dispatch replacing the ClaudeWorker `mode='runtime'` stub AND user prompts routed through `OrchestratorService.run()` (not directly to `generate-diff`). Every prompt flows planner → worker → orchestrator. This is the honest Autonomous Company OS product. Investor/customer messaging fully earned.

**Option B — Orchestrator as Opt-In Layer**
Orchestrator route live AND runtime tool dispatch working, BUT `generate-diff` remains the default build path for the 15-skeleton library. Orchestrator is opt-in for workflows that explicitly invoke it. Preserves demo reliability of the skeleton library during the June ship window. Softer positioning — "Autonomous Company OS in production-ready beta" rather than full launch.

Option A is the stronger product but carries a 2–3 week job pipeline integration risk that could compress pharma demo reliability for Advanced Decisions, BSW, and Reg-A roadshow.

Option B is the lower-risk ship but forces honest framing: UBIVibe at Jun 30 is "best-in-class dashboard generator with a working orchestrator layer" rather than "Autonomous Company OS."

- **Decision owner:** Bill Lupo
- **Decision deadline:** April 18, 2026 (Stage 1 gate)
- **Decision captured in:** This addendum, to be signed on selection

---

## § B.4 — Scope Cut From v7.0

The following were scoped in v7.0 or in Apr 7–9 chats but are formally **NOT** shipping as part of v7.0 and are not blockers for the June 30 commit:

- `ActivationStrip` home-screen component (scoped Apr 8, audit shows file does not exist — either cut or deferred to post-v7.0)
- Three-stage UX ship plan State B/C/D (State A shipped; B, C, D deferred)
- Terminology swap "Projects → Active Systems" (unconfirmed merge status; park as cosmetic)
- Snapshot preview page for Advanced Decisions demo (superseded by pharma suite)

Data-state three-state model (connected/sample/empty): **STATUS UNRESOLVED** between Apr 9 confirmation (shipped) and Apr 12 audit (not found). Requires one PowerShell verification before final status lock. Addendum B will be amended with the verified status inside 24 hours.

---

## § B.5 — Retained Without Change From v7.0

- Track A Foundation deliverables (all shipped, no change)
- Trust Layer scope (shipped 7 weeks early)
- Nango provider-agnostic discipline
- v6.0 wrapper architecture
- June 30, 2026 full commit date (definition pending § B.3)
- Week 8 (June 7) WorkOS SSO, enterprise billing, Synthesis Agent
- Omid solo-onboarding North Star metric

---

## Signatures

Bill Lupo, Founder/CEO — _______________ Date: _______________

Gary [COO] — acknowledgment of scope absorption — _______________ Date: _______________
