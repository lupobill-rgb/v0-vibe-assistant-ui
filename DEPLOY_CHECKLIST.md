# VIBE Deploy Checklist
## Run Before Every Merge to Main — No Exceptions

---

## Step 1 — Classify Your Change

| Change Type | Blast Radius | Smoke Suite Required |
|---|---|---|
| System prompt edit | HIGH | YES — all 3 cases |
| Edge Function deploy | HIGH | YES — all 3 cases |
| LLM output normalizer | HIGH | YES — all 3 cases |
| Supabase migration | MEDIUM | Schema + RLS check only |
| NestJS API route | LOW | Unit test for that route |
| UI component change | LOW | Manual spot check |

---

## Step 2 — Layer 1 Smoke Suite

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

## Step 3 — Infrastructure Checks

- [ ] Edge Function version confirmed in Railway logs
- [ ] `last_diff` non-null on all 3 completed test jobs
- [ ] No raw stack traces surfaced in any job failure
- [ ] Interactive elements verified — buttons fire, filters respond

---

## Step 4 — If Blast Radius is MEDIUM or HIGH

- [ ] Supabase RLS enabled on all affected tables
- [ ] Full chain verified: `job → project → team → team_members → auth.uid()`
- [ ] No credentials in logs

---

## GATE

**All boxes checked? Merge.**
**Any box unchecked? Do not merge. Fix first.**

---

_Last updated: 2026-03-19_
