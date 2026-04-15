# NorthStar v7.0 — Build Status

> Snapshot of what exists in the repo against NorthStar v7.0 (Autonomous Company OS / Reactive Kernel).
> Source: actual code in `UbiGrowth/VIBE` as of branch `claude/document-system-audit-WRLHF`.
> NorthStar v7.0 source doc (`VIBE_NorthStar_v7_0.docx`) is NOT committed to repo. Only v4.0 (`NORTH_STAR.md`) is tracked.

---

## Revenue Sprint Gate (blocks v7.0 per CLAUDE.md)

| # | Sprint | Status | Evidence |
|---|--------|--------|----------|
| 1A | Thin wrapper replaces VIBE_SYSTEM_RULES in edge fn | Done | `supabase/functions/generate-diff/index.ts` — `buildVibeSystemRules()` ~line 11 |
| 1B | `resolveDepartmentSkills()` in context-injector | Done | CLAUDE.md marker; context-injector present in `apps/api/src/kernel/` |
| 2  | Auth identity fix on frontend call sites | Not started | — |
| 3  | Nango HubSpot live | Partial | HubSpot real (`fetchHubSpotDeals`, `fetchHubSpotContacts`) + Decipher real. Salesforce/Slack/GA/Airtable/Snowflake/BigQuery/S3 are enum-only stubs |
| 4  | Design system + dashboard quality | Partial | `DESIGN_SYSTEM_CORE`, `DASHBOARD_SYSTEM`, `CHART_ENFORCEMENT` in edge fn; 43+ `html_skeleton` entries in `skill_registry` (28 dept golden templates + 15 niche) |
| 5  | Edit/iterate flow | Partial | `edit` mode (24k tokens) exists in edge fn; end-to-end wiring unverified |
| 6  | File upload stability | Partial | Multer + `upload_id` path wired in `POST /jobs`; stability not tested |
| 7A | Stripe backend | Done | `apps/api/src/billing/` — checkout, portal, webhook, status, trial, token-usage endpoints all real; `organizations.stripe_customer_id` column live (migration `20260330400000`) |
| 7B | Stripe frontend (UpgradeModal, PricingPage) | Present | `apps/web/components/billing/UpgradeModal.tsx`, `/pricing` route, `billing-dashboard.tsx` exist; full checkout flow unverified |
| 8  | Smoke test gate | Manual only | No automated CI gate; manual verification per CLAUDE.md pre-merge checklist |

**CLAUDE.md recorded position:** Sprint 1B done → next Sprint 2
**Actual code state:** 1A, 1B, 7A done; 7B scaffolded; 3/4/5/6 partial; 2 and 8 open

---

## v7.0 Components Already In Repo

Despite CLAUDE.md's "HARD STOP — DO NOT START v7.0 WORK", these v7.0 building blocks already exist:

### Reactive Kernel / Autonomous Execution
- **`ReactiveKernelModule`** — registered in `apps/api/src/app.module.ts`
- **`OrchestratorModule`** — registered in `apps/api/src/app.module.ts`
- **`autonomous_executions` table** — migration `20260403100000`
  - Columns: `org_id`, `team_id`, `skill_id`, `trigger_event` JSONB, `cascade_depth`, `parent_execution_id`
  - Status enum: pending / queued / running / complete / failed / skipped
  - Indexes on (org_id, team_id, status), (skill_id, created_at DESC), parent_execution_id
- **`autonomous-processor.service.ts`** — polls `autonomous_executions`, dispatches skill-based jobs via internal `POST /jobs`, 1-hour dedup window, max cascade depth 5
- **Nango webhook → autonomous execution pipeline**
  - `POST /connectors/webhook/nango` → `WebhookService.handleNangoEvent()`
  - Matches event against `skill_registry.trigger_on` → queues autonomous execution
- **`skill_registry.trigger_on`** column — event-driven skill activation

### Governance / Audit
- **`compliance_audit_log`** — fire-and-forget audit writes after each LLM generation; logs `artifact_type`, `artifact_hash`, `skill_ids`, `department`, `governance_version_id`
- **`governance_versions`** — versioned governance policies
- **`approval_signatures`** — human-in-the-loop approval records
- **`skill_approvals`** — per-skill approval gating
- Migrations: `20260406*`
- 26 tables have RLS enabled

### LLM Redundancy
- **4-provider cascade** in both `apps/executor/src/llm-failover.ts` and `supabase/functions/generate-diff/index.ts`
  - Claude Sonnet 4 → GPT-4o → DeepSeek → Gemini 2.0 Flash → Fireworks DeepSeek V3
- **Context window pre-check** (~3.5 chars/token, 90% safety margin)
- **Cost circuit breaker** — per-provider daily caps (Anthropic $300, OpenAI $200, Google $100, Fireworks $50)
- **LiteLLM proxy support** — `LITELLM_PROXY_URL` env var enables OpenAI-compatible routing; config at `litellm/litellm_config.yaml`

### Skill Registry / Golden Templates
- 43+ `html_skeleton` entries populated (28 dept golden templates + 15 niche/pharma/CRM/sales/marketing/finance/sports skeletons)
- Dashboard fast path locked in `apps/api/src/index.ts` lines ~808–839 (v0.1-dashboard-stable)

---

## What's Missing for v7.0 Completion

- Reactive kernel loop not proven firing end-to-end against live Nango webhooks (code path exists, no production evidence)
- `autonomous_executions` table present, but no evidence of sustained production runs
- **Security agent is a 5ms sleep no-op** (per NORTH_STAR.md tech debt)
- **UX agent is a Promise no-op** (per NORTH_STAR.md tech debt)
- `apps/api/src/index.ts` is ~1800+ lines — connector extraction was a "before Week 4" gate that has not been done
- No automated smoke-test CI gate — still manual per CLAUDE.md pre-merge checklist
- NorthStar v7.0 source doc (`VIBE_NorthStar_v7_0.docx`) not committed — only v4.0 is in repo
- Revenue Sprint 2 (auth identity fix on frontend call sites) not started
- No end-to-end verification of edit/iterate flow (Sprint 5)
- File upload stability not tested under load (Sprint 6)

---

## Bottom Line

Revenue Sprint gate: **~60% complete** (1A, 1B, 7A done; 7B scaffolded; 3/4/5/6 partial; 2/8 open).

The v7.0 autonomous layer is **scaffolded in code** — tables, modules, processor service, Nango webhook pipeline, governance tables, LLM failover all exist — but it's sitting behind the revenue gate and has not been proven live end-to-end.
