# VIBE Deploy Checklist
## Run Before Every Merge to Main — No Exceptions

---

## Pre-Merge Smoke Tests (run before EVERY merge to main)

- [ ] Dashboard builds on first prompt — no follow-up needed
- [ ] Charts render on first load
- [ ] Navigation links work
- [ ] Buttons respond to clicks
- [ ] Token count < 30,000 (Railway logs)
- [ ] No `[LLM-FALLBACK]` in logs
- [ ] No QA repair pass triggered
- [ ] No raw "html" in preview pane
- [ ] Edge Function deployed if `generate-diff/index.ts` changed

**Test prompt:** `"show me my pipeline"` on Sales team workspace.
**Document results in the PR description with the test job ID.**

---

## Blast Radius Classification

Before merging, classify the change:

| Blast Radius | Files | Required Testing |
|---|---|---|
| **HIGH** | `context-injector.ts`, `index.ts`, `edge-function.ts`, `generate-diff/index.ts` | Full smoke test (all checks above) |
| **MEDIUM** | `intake/route.ts`, `prompt-card.tsx`, `building/[id]/page.tsx` | Dashboard render test |
| **LOW** | Migrations, seed data, CSS | Visual check only |

---

## Layer 1 Smoke Suite (HIGH blast radius changes)

Run all 3 cases through the live pipeline. All must pass before merge.

- [ ] **LP-01** — `"Build a landing page for a SaaS product called Launchpad"`
  - Hero section present
  - CTA button present and clickable
  - Form present
  - Mobile-responsive

- [ ] **DASH-01** — `"Build a sales pipeline dashboard with deal count KPI and stage chart"`
  - Chart renders
  - Data table renders
  - Filter interactive (not dead)

- [ ] **SITE-01** — `"Build a multi-page marketing site with nav, about page, and contact form"`
  - Nav links work (no 404s)
  - Pages route correctly
  - Form present

---

## Infrastructure Checks

- [ ] Edge Function version confirmed in Railway logs
- [ ] `last_diff` non-null on all completed test jobs
- [ ] No raw stack traces surfaced in any job failure
- [ ] Interactive elements verified — buttons fire, filters respond

---

## Security Checks (MEDIUM or HIGH blast radius)

- [ ] Supabase RLS enabled on all affected tables
- [ ] Full chain verified: `job → project → team → team_members → auth.uid()`
- [ ] No credentials in logs

---

## GATE

**All boxes checked? Merge.**
**Any box unchecked? Do not merge. Fix first.**

---

_Last updated: 2026-03-30_
