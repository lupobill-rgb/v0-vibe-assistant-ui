# SCOPE REPORT — UbiVibe Internal Testing Handoff

Generated: 2026-04-08 | Source: `UbiGrowth/VIBE` main branch audit

---

## 1. BUILT (deployed on main)

| Surface | Status | Commit | Date |
|---------|--------|--------|------|
| **Intake / NLP pipeline** | LIVE — prompt → resolveMode → resolveKernelContext → edgeCall → deploy. Golden template matching suppresses clarifying questions when matched. | `0366d06` | 2026-04-02 |
| **Kernel + context injection** | LIVE — resolveKernelContext assembles: team identity, brand tokens, data scopes, uploads, connectors, HubSpot live data, budget context, published assets, feeds, department skills, visible teams. | `d561b9e` | 2026-03-31 |
| **skill_registry** | LIVE — table exists in Supabase (created via dashboard/seed). 3 golden template skills on main (survey-analytics, youth-sports-league, sales-crm-dashboard). 11 department plugins defined in seed-skills.ts but `vendor/knowledge-work-plugins/` dir not committed — hydration depends on manual run. Chart.js rules appended to matching skills. | `d05d200` | 2026-04-02 |
| **Marketplace page** | LIVE — `/marketplace` with browse/installed tabs, connectors + skills sections. OAuth badges for HubSpot, Airtable, Slack, GA4, Mixpanel, Salesforce. Connection status from Supabase. | `dfe24b2` | 2026-04-02 |
| **Nango connectors** | PARTIAL — 12 in enum. **Fetch implemented:** HubSpot (deals + contacts), Decipher/Forsta (surveys + responses). **Registered only (no fetch):** Salesforce, Slack, GA4, Mixpanel, Airtable, Snowflake, Postgres, BigQuery, S3, RevOS CRM. | `be8830b` | 2026-04-02 |
| **Dashboards** | LIVE — dashboard fast path bypasses planner, single edgeCall, vibeLoadData injected into HTML for live Supabase queries. DASHBOARD_BUILD_BUDGETS: 180s timeout. | `0366d06` | 2026-04-02 |
| **vibeLoadData** | LIVE — inline JS in generated HTML, fetches from Supabase REST API with auth token from localStorage. | `0366d06` | 2026-04-02 |
| **Edit/iterate flow** | LIVE — prior job `last_diff` injected as context on re-generation. Diff contract prompt + safe diff mode gate shipped. | `9e9f991` | 2026-04-01 |
| **Auth (login/signup)** | LIVE — email/password via Supabase Auth. JWT passed to API. Redirects to `/select-team`. | `8a0eb0f` | 2026-04-02 |
| **RLS chain** | PARTIAL — `anon_read_jobs` on jobs (open SELECT). `teams_select_via_org` on teams. `published_assets` RLS with team_visibility join. `team_visibility` table created (`007_team_visibility.sql`). **No explicit RLS on projects table found in migrations.** | various | 2026-03-27 |
| **Billing / Stripe** | LIVE — checkout, portal, webhook endpoints. 3 paid tiers (Pro/Growth/Team). Frontend billing + pricing pages deployed. | `d561b9e` | 2026-03-31 |
| **Push Live + custom domain** | LIVE — publish flow, domain modal, DNS TXT verification against `_vibe-verify.<domain>`. CNAME target: `cname.vercel-dns.com`. | `123126b` | 2026-04-02 |
| **File upload** | LIVE — multer, 10MB, CSV/XLSX. Stored in Supabase. Injected into dashboard builds. | `b2ace38` | 2026-03-31 |
| **Published assets / marketplace store** | LIVE — `published_assets` table with upsert, RLS, team_visibility-gated reads. | `d561b9e` | 2026-03-31 |
| **Cross-team visibility** | LIVE — `team_visibility` directed graph, `resolveVisibleTeams` in context-injector. | `d561b9e` | 2026-03-31 |
| **Multi-agent pipeline** | LIVE — Builder, QA, Debug, Security, UX agents. **Note:** Security agent is 5ms sleep no-op; UX agent is Promise no-op (tech debt). | `0366d06` | 2026-04-02 |
| **LLM failover** | LIVE — Claude primary, GPT-4 fallback on 529/timeout only. | `0366d06` | 2026-04-02 |
| **Reactive Kernel** | NOT ON MAIN — migrations and webhook controller exist locally only (staging). See §2. | — | — |
| **Compliance / Trust Layer** | NOT ON MAIN — audit_log, governance_versions, approval_signatures, compliance dashboard exist locally only. See §2. | — | — |
| **getTeamDefaults** | NOT BUILT — no matches in repo. | — | — |

---

## 2. IN FLIGHT

### Branches

| Branch | Last Commit | Purpose | Status |
|--------|-------------|---------|--------|
| `claude/draft-coo-ubivibe-email-0VOx2` | 2026-04-08 | COO email draft + scope report | IN PROGRESS |

No other `claude/*` remote branches exist. 0 open PRs.

### Unmerged work (on local/staging, not main)

| Item | Files | Status |
|------|-------|--------|
| Reactive Kernel: `autonomous_executions` + `cascade_edges` tables | `20260403100000_*.sql` | NOT ON MAIN — needs merge |
| Reactive Kernel: `trigger_on` column on skill_registry | `20260403200000_*.sql` | NOT ON MAIN — needs merge |
| Reactive Kernel: `skill_triggers` table | `20260403210000_*.sql` | NOT ON MAIN — needs merge |
| Reactive Kernel: webhook controller | `apps/api/src/reactive-kernel/webhook.controller.ts` | NOT ON MAIN — needs merge |
| Compliance: `governance_versions` table | `20260406000000_*.sql` | NOT ON MAIN — needs merge |
| Compliance: `compliance_audit_log` table + RLS | `20260406000001_*.sql` | NOT ON MAIN — needs merge |
| Compliance: `approval_signatures` table | `20260406000002_*.sql` | NOT ON MAIN — needs merge |
| Compliance: dashboard page | `apps/web/app/compliance/page.tsx` | NOT ON MAIN — needs merge |
| Onboarding tables + progression | `20260405000000-2_*.sql` | NOT ON MAIN — needs merge |
| Skill registry versioning | `20260405000003_*.sql` | NOT ON MAIN — needs merge |
| Feed subscriptions table | `20260403000000_*.sql` | NOT ON MAIN — needs merge |

### Known blockers

| Blocker | Status |
|---------|--------|
| `team_id` not passed to intake route — kernel context may use wrong team | BLOCKED |
| `upload_id` vs project creation order — file upload can drop if project doesn't exist yet | BLOCKED |
| Hardcoded user IDs in some kernel calls | BLOCKED |
| `index.ts` is 1,864 lines (> 800-line gate) — connector extraction overdue | BLOCKED (tech debt) |
| Security agent is a 5ms no-op | BLOCKED (tech debt) |
| UX agent is a Promise no-op | BLOCKED (tech debt) |
| `vendor/knowledge-work-plugins/` not committed — skill hydration returns 0 rows from script | BLOCKED |
| `skill_registry` CREATE TABLE migration (`20260325*`) not on main — table exists via Supabase dashboard only | RISK — no migration reproducibility |
| No explicit RLS policy on `projects` table | RISK |

---

## 3. NORTH STAR v7.0 GAP

Based on `NORTH_STAR.md` (v4.0 — the only version in repo). v7.0 and v6.0 Addendum `.docx` files are **not committed to the repo** — UNVERIFIED against those docs.

| Requirement | Status |
|-------------|--------|
| **Layer 1 — Core Loop** (prompt → deploy) | ✅ DONE |
| **Layer 2 — Kernel** (brand tokens, context injector, skill resolution) | ✅ DONE |
| **Layer 3 — Cross-Team** (resolveVisibleTeams, team seeding) | ✅ DONE |
| **Layer 4 — Marketplace** (published_assets table + RLS) | 🟡 PARTIAL — table + RLS live, marketplace page live, but no publish UI flow verified |
| **Layer 5 — Enterprise** (WorkOS SSO, audit trail, Synthesis Agent) | ❌ NOT STARTED on main (compliance migrations exist on staging only, no WorkOS, no Synthesis Agent) |
| Feature flag table | ❌ NOT STARTED |
| Comms schema | ❌ NOT STARTED |
| index.ts connector extraction | ❌ NOT STARTED (1,864 lines, gate is 800) |
| Shareable deploy preview URL (no login) | ❌ NOT STARTED |
| last_diff saved on completed jobs | ✅ DONE |
| Reactive Kernel (trigger_on, autonomous_executions, cascade_edges, webhooks) | 🟡 PARTIAL — built on staging, not merged to main |
| Compliance / Trust (audit log, governance versions, approval signatures) | 🟡 PARTIAL — built on staging, not merged to main |
| Onboarding flow | 🟡 PARTIAL — migrations on staging, not merged to main |
| Skill registry full hydration (11 departments) | 🟡 PARTIAL — 3 golden templates on main, 11 dept plugins defined but vendor dir not committed |

**Realistic ETA to full v7.0:** Layers 1–3 done. Layer 4 needs publish UI + verification. Layer 5 (Enterprise) is net-new work. Staging features (reactive kernel, compliance, onboarding) need merge + smoke test. index.ts extraction is a multi-day refactor. Assuming current velocity, **8–12 weeks** from today to full v7.0 with all layers live. Critical path: merge staging work → index.ts extraction → Enterprise tier.

---

## 4. KNOWN ISSUES FOR TESTERS (not bugs — do not file)

- **HubSpot is the only connector with live data.** Other connectors show in marketplace but return no data when used in builds.
- **Security and UX agents are no-ops.** They appear in the pipeline tracker but do no real validation.
- **Skill context may be thin.** Only 3 golden template skills are seeded. Department-specific skills won't fire unless the vendor plugin dir is hydrated.
- **team_id may not propagate** through all intake paths — some builds may miss org context.
- **File upload timing.** If you upload before the project is created, the upload may not attach.
- **Compliance page and reactive kernel features** are not accessible in prod — only on staging branch.
- **No SSO.** Login is email/password only.
- **jobs RLS is open SELECT** (`anon_read_jobs USING (true)`) — any authenticated user can read any job. This is intentional for now but will tighten.
- **index.ts is monolithic** — errors in one handler can cascade. Expect occasional 500s under load.

---

## 5. TEST URLS

| Environment | URL |
|-------------|-----|
| Prod | https://vibe.ubigrowth.ai |
| Staging | https://vibestaging-wheat.vercel.app |
| API | https://vibeapi-production-fdd1.up.railway.app |
| Kernel diagnostic | `/api/kernel-context/{userId}/{orgId}` |
