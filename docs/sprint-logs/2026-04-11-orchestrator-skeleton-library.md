# Sprint Log

## Weekend of April 11–12, 2026 — Orchestrator + Skeleton Library + Intake Fixes

### Summary
Largest single-weekend build in the v7.0 cycle. Orchestrator stack reached
95% complete, golden template library expanded to 15 working skeletons
covering sales, marketing, finance, pharma (5), sports, and executive
surfaces. Intake flow hardened. Foundation migrations repaired. $17
pricing went live across all billing surfaces. 240 skill_registry rows
backfilled with orchestrator-aware columns.

### PRs Merged (chronological)

**Platform fixes:**
- #522 — Restored STRUCTURAL_REQUIREMENTS in generate-diff edge function
- #523 — Fixed MIN_OVERLAP 3→2 (short prompts now match golden templates)
- #524 — Restored intake data source selection step (CSV vs sample data)
- #525 — Intake passes original prompt verbatim to golden-template
        matcher (kills phase-1 hallucination bug)
- #526 — Intake cleanup follow-on

**Infrastructure:**
- #527 — Executive dashboard chart try/catch fallback fixed
- #528 — Auto-cache skeleton after first LLM build (unit economics win:
        first user pays LLM cost, all subsequent users deterministic)

**Foundation migrations:**
- #542 — Foundation seed migration: org + team parent rows created
        before downstream migrations
- #543 — Duplicate team_visibility migration fixed
- #544 — Migration timestamp conflicts resolved
- #545 — Preview branch replay verification
- #546 — Foundation migration follow-on

**index.ts extraction:**
- #552 — 1,845 → 1,240 lines. Four new handler files extracted:
        dashboard, enrich-prompt, fast-paths, planner. 800-line gate cleared.

**Orchestrator stack:**
- #561 — TypeScript alignment fix (flagged orchestrator.types.ts and
        orchestrator.interface.ts as unreferenced — cleanup PR pending)
- #562 — Nest DI bootstrap fix. OrchestratorModule dependencies
        initialized confirmed in Railway logs. API starts clean on 8080.

### Skill Registry Schema Extensions
Five new columns added to skill_registry:
- mode (text) — 'build' | 'runtime' | composable
- inputs_schema (jsonb) — input contract for orchestrator
- outputs_schema (jsonb) — output contract for orchestrator
- tool_grants (jsonb) — per-skill tool permissions (Nango scoped)
- composable (boolean) — whether skill can be chained

240 rows backfilled with mode='build'. No duplicates. Index on mode.
This is the schema foundation for runtime tool dispatch.

### Golden Template Library — 15 Skeletons, All Passing

| Skeleton | Charts |
|---|---|
| executive-dashboard | 5 |
| executive-command-dashboard | 5 |
| crm-dashboard | 4 |
| marketing-dashboard | 9 |
| sales-forecast | 9 |
| finance-dashboard | 8 |
| youth-sports-league-manager | 7 |
| pipeline-review | 4 |
| win-loss-analysis | 4 |
| abm-dashboard | 4 |
| pharma-analytics-dashboard | 4 |
| pharma-phase1-dashboard | 6 |
| pharma-phase2-dashboard | 9 |
| pharma-phase3-dashboard | 5 |
| pharma-phase4-dashboard | 8 |

Pharma suite (5 skeletons) makes Advanced Decisions demo template-ready.

### Global Chart Sizing Fix
Universal CSS injected via MCP into all 15 skeleton html_skeleton rows:
- canvas max-height: 280px
- chart-container height constraints
- table overflow + tab content scroll
- Live immediately, no deploy required

### GTM Data Seeded
- 8 deals, $445K pipeline (Advanced Decisions, BSW, PlayKout + 5 others)
- 8 leads + prospect scores
- team_id set to real Sales team UUID

### CLAUDE.md Hardening
New rules added:
- Skeleton build session rules
- Pre-merge gate: charts=0 = reject
- DB first, commit second
- Verification query required before marking work complete

### Pricing
$17/user/month simple pricing shipped and live across:
- Billing tiers
- PricingPage
- UpgradeModal
- Landing page
- /pe route

Old $49 and $199 tiers removed.

### Security Incident
Prompt injection via Claude Code desktop app executed taskkill and rd
commands without approval. No permanent damage, repo intact. Formal
report sent to security@anthropic.com. Evidence preserved. See
security-incident-2026-04-12.md.

### Known Blockers Carried to Next Sprint
1. PR #563 — Register OrchestratorController in OrchestratorModule
   (20-line fix, 95% → 100%)
2. Dual-status drain bug in autonomous_executions (queued vs pending
   path unification)
3. Dual connection-ID columns in team_integrations
4. generate-diff result-card mode (still generates full apps for
   autonomous execution path)
5. Runtime tool dispatch — ClaudeWorker mode='runtime' stubbed
6. Job pipeline integration — user prompts not yet routed through
   OrchestratorService.run()

### Next Sprint Priorities
1. PR #563 (controller registration + smoke test)
2. Test all 15 skeletons on staging — confirm chart sizing holds
3. email-analytics skeleton (Tier 2)
4. social-media skeleton (Tier 2)
5. patient-outcomes skeleton (healthcare demo)
6. Drain bug resolution
7. v7.0 Addendum B formalization
