# VIBE — North Star v4.0 (Distilled for Claude Code)

> **Source:** VIBE_NorthStar_v4_0.docx · Updated 2026-03-20
> Supersedes v3.4 and v2.0. This file is the repo-committed bridge.
> **DO NOT EDIT DIRECTLY** — update source doc and regenerate.

---

## CORE ARCHITECTURE — NON-NEGOTIABLE

**Claude is the engine. GPT-4 is the infrastructure fallback only. VIBE is the spine.**

* VIBE governs WHO Claude builds for — org identity, team context, RLS, deploy pipeline
* VIBE does NOT prescribe HOW Claude writes code
* System prompts are thin governance wrappers, not JavaScript tutorials
* If generated output is wrong: describe what is wrong in natural language. Let Claude fix it.
* GPT-4 fallback triggers on 429 / 529 / ETIMEDOUT / timeout ONLY — never quality, never preference

---

## IDENTITY

| Key | Value |
|---|---|
| Product | VIBE — Enterprise AI Execution Environment on UBI OS |
| Supabase Project | `ptaqytvztkhjpuawdxng` |
| Org ID | `3de82e57-4813-4ad6-83bd-2adb461604f0` |
| Marketing Team ID | `2a68d841-a6f0-4abd-8cfa-947767378684` |
| Sales Team ID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| API (Railway) | https://vibeapi-production-fdd1.up.railway.app |
| Frontend (Vercel) | https://vibe-web-tau.vercel.app |
| Edge Function | `supabase/functions/generate-diff/index.ts` |
| Edge Function version | v90s (as of March 20, 2026) |
| Primary LLM | Anthropic Claude |
| Fallback LLM | OpenAI GPT-4 — infrastructure fallback ONLY |
| Brand token | `#7c3aed` (confirmed firing) |

---

## LAYER STATUS (March 20, 2026)

| Layer | Status | Detail |
|---|---|---|
| Layer 1 — Core Loop | ✅ LIVE | Prompt › deploy. Full pipeline confirmed. |
| Layer 2 — Kernel | ✅ LIVE | Kernel schema live. Brand tokens firing. Context injector wired. |
| Layer 3 — Cross-Team | ✅ LIVE | resolveVisibleTeams live. Sales + Marketing seeded. |
| Layer 4 — Marketplace | 📋 QUEUED | published_assets table + RLS created. Weeks 5–6. |
| Layer 5 — Enterprise | 📋 QUEUED | WorkOS SSO, audit trail, Synthesis Agent. Weeks 7–8. |

---

## OPEN ITEMS (Verify Before New Feature Work)

| # | Item | Status |
|---|---|---|
| A | last_diff saved on completed jobs — thumbnails render | 🔨 VERIFY |
| B | Shareable deploy preview URL — accessible without login | 🔨 IN PROGRESS |
| C | index.ts connector extraction | ⚠️ BEFORE WEEK 4 |

**PRE-LAUNCH FIRST:** No new features until every BLOCKER and P1 is closed.

---

## ENGINEERING RULES — ALL SESSIONS

| Rule | Definition |
|---|---|
| RELIABILITY | Reliability over cleverness. Proven patterns first. Always. |
| SCOPE CONTROL | No large refactors unless cleanup mode triggered. Atomic diffs only. |
| TRACEABILITY | Every change traceable: job › commits › logs › tests. No silent changes. |
| SECURITY | RLS on, least privilege, secrets never in logs or LLM context. No exceptions. |
| CHUNKED MODE | Single-file diffs. Max 200 lines per output. Ask for exact file path first. |
| OSS FIRST | Use proven OSS. No custom primitives when standard library exists. |
| KERNEL FIRST | Org identity graph is prerequisite to all enterprise features. |
| PRE-LAUNCH FIRST | No new features until all BLOCKERs and P1s are closed. |
| NO DRIFT | Never add code rules to system prompts. Describe what is wrong. Trust Claude. |
| INDEX.TS DISCIPLINE | ~1620 lines — highest-risk file. Tightly scoped sessions only. Extract before Week 4. |

---

## SESSION RULES (ENFORCED)

* **ONE FILE PER PROMPT** — no exceptions
* **ONE CONCERN PER PROMPT** — bug fix OR feature, never combined
* **MAX 200 LINES** — if exceeded, scope is too large, split it
* **DEFINE DONE FIRST** — acceptance test before any code
* **VERIFY BEFORE CLOSING** — acceptance test must PASS, not "looks good"
* **NEVER FIX AND FEATURE** — separate prompts, separate sessions

---

## LLM ROUTING

* **Primary:** Anthropic Claude — all jobs
* **Fallback:** GPT-4 — triggers on HTTP 429, HTTP 529, ETIMEDOUT, request-timeout ONLY
* `isFallbackEligible()` — non-eligible errors fail fast, no silent fall-through
* Model **used** is metered in logs (not model requested)
* Customer API keys: **NEVER**. All calls route through VIBE accounts.

---

## KERNEL — RESOLUTION CHAIN

```
User Identity → Team → Role → Data Scopes → Allowed Actions → LLM Context Injection → Governed Output → Deploy Gate
```

* Context injector fires before every LLM call
* Injects: team identity, brand tokens, data scopes, Supabase connection details
* Secrets never passed to LLM context
* Every diff validated against resolved scopes before apply

---

## AGENTS — ALL LIVE

| Agent | Status |
|---|---|
| Builder | ✅ LIVE — atomic diffs, commit-based |
| QA | ✅ LIVE — test-fix retry loop, rollback on failure |
| Debug | ✅ LIVE — retry loop, git rollback, CANNOT_FIX signal |
| Security | ✅ LIVE — RLS coverage scan, auto-fix migration |
| UX | ✅ LIVE — per-issue fix loop, git rollback |

---

## TECH DEBT — MONITOR

| Severity | Issue | File |
|---|---|---|
| MEDIUM | index.ts ~1620 lines — primary drift/reset risk | `apps/api/src/index.ts` |
| MEDIUM | Prior-diff injection runs twice | `apps/api/src/index.ts` |
| LOW | Security agent is 5ms sleep no-op | `apps/api/src/index.ts` |
| LOW | UX agent is Promise no-op | `apps/api/src/index.ts` |

**Gate:** If index.ts > 800 lines → run Prompt 5 (connector extraction) before any new feature work.

---

## INFRASTRUCTURE NOTES

* Railway red logs are NOT failures. All stderr is colored red including git hints.
* API healthy = `"VIBE API server running on port 8080"` + `"Nest application successfully started."`
* Branch pattern: `claude/*` — always push to `claude/*`, never directly to main
* Merge flow (PowerShell): `git fetch origin` › `git merge origin/claude/[branch]` › `git push origin main`
* Supabase CLI NOT available in Claude Code — deploy Edge Functions locally
* `NANGO_SECRET_KEY` lives in Railway env vars ONLY. Never Vercel. Never logs.

---

## NEXT SPRINT PRIORITIES (Week 1–4)

| # | Prompt | File | When |
|---|---|---|---|
| Fix C | Verify last_diff saved | `apps/api/src/index.ts` | NOW |
| 1 | Feature Flag Table | `migrations/20240002_feature_flags.sql` | Week 1 |
| 2 | Comms Schema | `migrations/20240003_comms_schema.sql` | Week 2 |
| 4 | Context Injector Hardening | `apps/api/src/kernel/context-injector.ts` | Week 1 |
| 5 | index.ts Connector Extraction | `apps/api/src/connectors/index.ts` | Before Week 4 — CRITICAL |

---

## DELIVERY TARGET

**June 30, 2026.** 5–7 week buffer built in. Velocity: ~5 deploys/day sustained. Edge Function v63 → v90s in 6 days. One reset event absorbed by buffer. Two resets push to late July. Mitigation: extract index.ts connector logic before Week 4.

---

*VIBE · UbiGrowth · Confidential · North Star v4.0 · 2026-03-20*
