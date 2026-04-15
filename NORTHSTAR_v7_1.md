# VIBE North Star v7.1

**Status:** Active. Supersedes v7.0, Trust Layer Addendum, Addendum B, and v6.0 Addendum.
**Last updated:** 2026-04-15
**Authored by:** Bill Lupo (with Claude Opus 4.6, planning session)

This document replaces the v7.0 spec and its addenda. Prior versions are
preserved in `/docs/archive/` for audit. The plan in this document is what
the team executes against until v7.2 supersedes it.

---

## 1. The product, in one paragraph

VIBE is the Autonomous Company OS. Connected data sources flow into the
platform. The platform detects meaningful changes, decides what to do about
them, executes autonomously, and surfaces recommendations to the user
through a single interface. The user accepts, modifies, or dismisses each
recommendation. VIBE also accepts manual prompts ("build me X") through the
same interface. Both paths share the same orchestration spine, the same
event stream, and the same user surface.

---

## 2. The core thesis

**Investors and customers are buying proof that the autonomous loop works.**

Not features. Not roadmaps. Not connectors counted. Not skills cataloged.
One demonstrable end-to-end loop:

```
Live data source updates
  → VIBE detects the change
  → VIBE decides what to recommend
  → Recommendation surfaces in the Build tab
  → User accepts, modifies, or dismisses
  → Action executes
  → Result reported
```

Until this loop runs in production with real customer data, VIBE is a
builder with autonomous aspirations. After this loop runs in production, VIBE
is the Autonomous Company OS.

**Closing this loop is the only thing that matters until it is closed.**

---

## 3. Current state, honestly

**Shipped and working:**
- Reactive Kernel orchestration spine (Track A and B core)
- Trust Layer (26 RLS tables, audit log, approval signatures schema)
- Closed runtime loop discipline (8 conditions in CLAUDE.md Section 5)
- HubSpot via Nango as live connector
- Universal runtime dispatch via NangoService
- 43+ skill skeletons in golden template library
- Stripe billing + LLM 4-provider failover (off-spec, valuable)
- Section 4.7 render pipeline safety rules

**Built but not production-validated:**
- `autonomous_executions` table and processor
- Edge Function `generate-diff` autonomous mode detection
- Approval workflow schema (no UI, no enforcement)
- 7 of 9 Track B items

**Critical gaps preventing autonomous OS claim:**
- Only one connector live (HubSpot) — autonomous OS needs 3+ to be credible
- Autonomous executions have not run end-to-end in production with a real
  customer-visible result
- Autonomous outputs currently render as dashboards (wrong shape) — there
  is no recommendation mode
- No user surface for recommendations — `/chat` is built for prompts, not
  for autonomous outputs
- Edge Function bug: generates full standalone web apps instead of focused
  outputs in autonomous mode

**Reasonable assessment:** ~85% of v7.0 deliverables are shipped, but ~60%
of the autonomous OS vision is operational. The gap is closing the loop
end-to-end, not adding more features.

---

## 4. The plan

Three parallel tracks. All three must complete for v7.1 to be done.

### Track 1: Recommendation mode (the autonomous output shape)

The autonomous path currently uses the dashboard fast path because that's
the only output mode wired up. This is a bug. Autonomous outputs are not
dashboards — they are recommendations.

**Build:**
- New `mode: 'recommendation'` in the job/edge function pipeline
- Output shape: structured card (what changed, what is suggested, why, how
  to accept/modify/dismiss)
- Stored as `job_events` rows with severity `'recommendation'` (or extended
  schema if needed)
- Edge Function autonomous-mode detection routes to recommendation mode,
  not dashboard mode
- Audit logged via existing Trust Layer infrastructure

**Done when:** An autonomous execution produces a recommendation card, not
a dashboard, in a test environment with real connected data.

### Track 2: Build tab (the user surface)

`/build` route. Additive, does not modify `/chat` or any other existing
surface. Single view with two sections:

**Top section — Recommendations feed:**
- Cards rendered from `job_events` where the event is a recommendation
- Each card: source data summary, suggested action, accept/modify/dismiss
- Click to expand: full reasoning, raw data delta, audit trail link
- Live update via Supabase realtime subscription

**Bottom section — Build surface:**
- Reused `PromptCard` from existing infrastructure
- Live execution feed (same `job_events` stream, filtered for active builds)
- Diff viewer (library component, reads `jobs.last_diff`)
- Preview pane (iframe, reads `jobs.preview_url`)
- Run state chip (reads `jobs.execution_state`, translated to user labels)
- Progressive disclosure: details panel collapsed by default

**Done when:** A user can sit at `/build`, watch a recommendation arrive,
accept it, and watch the resulting action execute — all in one view.

### Track 3: Connector expansion + production validation

**Connectors:**
- Salesforce live via Nango (most pharma customers use Salesforce, not
  HubSpot)
- Slack live via Nango (highest-signal "where work happens" connector)

**Production validation:**
- One end-to-end autonomous loop running on real customer data
- Demo-ready: live Salesforce update → VIBE detection → recommendation in
  Build tab → user accepts → action executes → result reported
- Documented as a reference implementation for additional skills

**Done when:** The above loop runs successfully three times in production
with real (or production-realistic) data, and a five-minute video demo
exists.

---

## 5. Stage 1 exit criteria (carries forward from Addendum B)

Before declaring the autonomous OS operational:

1. ✅ Orchestrator route operational
2. 🟡 `autonomous_executions` dual-status bug resolved AND production-drained
3. 🟡 `team_integrations` connection-ID split-brain resolved
4. 🟡 Edge Function autonomous mode routes to recommendation, not dashboard
5. 🟡 Four April 10 bugs verified fixed in production
6. ❌ Salesforce + Slack live in addition to HubSpot
7. ❌ One end-to-end autonomous loop demonstrated in production
8. ❌ Build tab live with recommendation feed

Items 1–5 carried from Addendum B. Items 6–8 added in v7.1.

---

## 6. Calendar

Based on actual velocity (~19.5 PRs/day, 40% allocation to this work):

| Milestone | Target |
|---|---|
| Recommendation mode shipped to staging | Apr 22 |
| Build tab internal release behind feature flag | Apr 25 |
| Salesforce live | Apr 25 |
| Slack live | Apr 29 |
| First end-to-end autonomous loop in production | May 1 |
| Build tab customer beta | May 6 |
| All Stage 1 exit criteria met | May 9 |
| v7.1 declared done | May 9 |

**Calendar bottleneck:** dashboard stability window (Section 4.7 rules need
14 days clean to validate). Started April 14. If no resets, clears April 28.
Realistically with one reset, May 5.

**Total elapsed time from today: ~3 weeks for autonomous loop demo, ~3.5
weeks for full v7.1 completion.**

---

## 7. What is explicitly NOT in v7.1

These items remain valid but are not in scope for v7.1. They are deferred
to v7.5 or later.

- File sharing within the platform (Layer 5)
- Cross-team feed cascades (the autonomous-execution-triggers-other-team
  pattern)
- Marketplace switching costs (the route exists but the moat doesn't yet)
- Approval workflow UI (schema exists, no UI)
- Multi-page dashboards
- Edit/iterate flow beyond current state
- Additional connectors beyond Salesforce + Slack (GA4, Mixpanel, Snowflake,
  PostgreSQL, BigQuery, AWS S3 stay as stubs)
- Mobile / responsive
- Approval hooks
- Claude Agent SDK adoption
- Managed Agents adoption
- Planner/coder/verifier sub-agent split

These are not "never." They are "after v7.1 ships and customers are using
the autonomous loop."

---

## 8. What is explicitly parked

Go-to-market activities are parked until v7.1 ships. See `GTM_PARKED.md` for
the full list and restart conditions. The principle: do not market a product
that has not yet demonstrated its core promise. The autonomous loop is the
core promise. Until it works in production, marketing it is premature.

---

## 9. Off-spec work that continues

Some work is not in v7.1 scope but should continue because it supports the
autonomous OS regardless:

- **Stripe / billing:** revenue infrastructure, ongoing maintenance only
- **LLM failover:** reliability infrastructure, ongoing maintenance only
- **Observability:** ongoing instrumentation as needed
- **CI enforcement:** continue building out the gates beyond guardrail-files
- **Dashboard stability:** Section 4.7 rules in active enforcement, ongoing
  monitoring

These do not have v7.1 deliverables. They are background work that the team
maintains as needed.

---

## 10. Decision rights

- **Architectural decisions affecting the autonomous loop:** Bill, in writing
- **UI / UX decisions on Build tab:** the implementing engineer with Bill's
  sign-off on first internal release
- **Connector prioritization beyond Salesforce + Slack:** Bill
- **Sprint sequencing:** Bill, updated weekly in CLAUDE.md Section 1
- **Override of CLAUDE.md Section 8 deferrals:** Bill, in writing, in the
  PR description

---

## 11. The discipline

Per CLAUDE.md, all of the following remain in force:

- Closed runtime loop conditions (Section 5)
- Pre-merge gates (Section 4)
- Render pipeline safety (Section 4.7)
- Hard stops (Section 2)
- Session rules (Section 7)

v7.1 does not relax any of these. v7.1 is what the team builds; CLAUDE.md is
how the team builds it.

---

## 12. Success measure

v7.1 is successful when an investor or a customer can:

1. Open `/build` in the browser
2. See a recommendation card that VIBE generated autonomously from real data
3. Accept the recommendation
4. Watch VIBE execute the action
5. See the result delivered

If that flow works for one skill on one connector, v7.1 is done. Everything
else is amplification.

---

## 13. Changelog

| Date | Change |
|---|---|
| 2026-04-15 | Full rewrite as v7.1. Supersedes v7.0 + Addendum B + Trust Layer Addendum + v6.0 Addendum. Reframes the product around the autonomous loop. Adds recommendation mode, Build tab, and Salesforce + Slack as core deliverables. Parks GTM. Defers items previously in scope to v7.5+. Sets May 9 target. |
