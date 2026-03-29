# VIBE Claude Code Setup — Slash Commands, Subagents & Pipeline

## Quick Install

```bash
cd /path/to/UbiGrowth/VIBE
mkdir -p .claude/commands .claude/agents
```

Copy the 5 command files into `.claude/commands/`:
- debug.md
- smoke.md
- status.md
- ship.md
- close.md

Copy the 5 agent files into `.claude/agents/`:
- vibe-architect.md
- vibe-implementer.md
- vibe-qa.md
- vibe-marketplace.md
- vibe-devops.md

```bash
git add .claude/
git commit -m "feat: add Claude Code slash commands and subagents"
git push
```

Done. Next time you open Claude Code in the VIBE repo, everything is live.

---

## Slash Commands Reference

| Command | What It Does |
|---------|-------------|
| `/project:debug` | Diagnose deployment failures across Vercel, Railway, Supabase |
| `/project:smoke` | Smoke test build and edit flows against known failure patterns |
| `/project:status` | One-line-per-service infrastructure dashboard |
| `/project:ship` | Lint → test → commit → push to main → verify deploy |
| `/project:close` | Session close-out: what decided, what next, who owns it by when |

---

## Subagents Reference

| Agent | Role | Model | Access |
|-------|------|-------|--------|
| vibe-architect | Architecture decisions, technical planning, PR review | Opus | Read-only |
| vibe-implementer | Write code, fix bugs, produce unified diffs | Opus | Full |
| vibe-qa | Test changes, catch regressions, validate before shipping | Sonnet | Read + Bash |
| vibe-marketplace | OAuth connectors, skill_registry, Nango, integrations | Sonnet | Full |
| vibe-devops | Deployments, infra, Railway/Vercel/Supabase operations | Sonnet | Read + Bash |

Claude auto-delegates to agents based on task description. You can also invoke explicitly:
```
Use the vibe-qa agent to validate this change
```

---

## Pipeline: How the 5 Agents Chain Together

This is the standard workflow for any feature, bug fix, or infrastructure change in VIBE.

### Example: "Add Salesforce OAuth connector to the Marketplace"

**Step 1 → vibe-architect (Opus, read-only)**

You say:
```
I need to add Salesforce as an OAuth connector in the Marketplace. What's the right approach?
```

Architect scans the codebase, reads how Airtable and HubSpot connectors were implemented, and returns:
- Recommended approach (follow existing Nango pattern vs. custom)
- Files that need to change
- Tradeoffs (Nango managed auth vs. custom OAuth flow)
- Risk assessment (what could break, impact on Omid test)

You review. Approve or redirect.

**Step 2 → vibe-implementer (Opus, full access)**

You say:
```
Implement the Salesforce connector following the architect's recommendation. Use the Airtable connector as the reference pattern.
```

Implementer:
- Reads the Airtable connector files to understand the pattern
- Produces unified diffs for each file (one file at a time, max 200 lines)
- Adds Nango config, callback handler, token refresh logic
- Updates connector status persistence in Supabase
- Adds Salesforce to guided_next_steps

You review each diff. Approve or request changes.

**Step 3 → vibe-qa (Sonnet, read + bash)**

You say:
```
Validate the Salesforce connector changes before we ship
```

QA agent runs through its checklist:
```
[PASS/FAIL] Build flow still works after changes
[PASS/FAIL] Edit flow routes correctly (not through edge function)
[PASS/FAIL] No JSON parse errors
[PASS/FAIL] Files on disk match intended changes
[PASS/FAIL] Salesforce OAuth flow follows Airtable/HubSpot pattern
[PASS/FAIL] Connector status persists in Supabase
[PASS/FAIL] No credentials exposed in client-side code
```

If anything fails, QA reports the exact file, line, and expected vs. actual behavior. You send it back to the implementer.

**Step 4 → vibe-devops (Sonnet, read + bash)**

After QA passes, you say:
```
/project:ship
```

Ship command runs lint → test → commit → push to main. Then devops monitors:
- Vercel build triggers and completes
- Railway service picks up the change without crash loops
- Environment variables are correct across platforms
- No new 500s in Supabase edge function logs

**Step 5 → /project:close**

You say:
```
/project:close
```

Output:
```
## What Was Decided
- Salesforce connector uses Nango managed auth, following Airtable pattern
- Token refresh handled via Nango's built-in refresh, no custom logic
- Connector added to guided_next_steps nudge system

## What Gets Built Next
- GA4 connector (same Nango pattern, next priority)
- Marketplace UI update to show Salesforce in connector grid

## Who Owns It By When
- Omid: Test Salesforce OAuth in staging with a real Salesforce sandbox — by Wednesday
- Bill (via Claude Code): GA4 connector implementation — by Friday
- Gary: Notify Brain Surgery Worldwide that Salesforce connector is live — by Thursday
```

---

## Pipeline Variations

### Bug Fix Pipeline (shorter)
1. `/project:debug` — identify the problem
2. **vibe-implementer** — fix it
3. **vibe-qa** — validate the fix
4. `/project:ship` — push to main
5. `/project:close` — document it

### Architecture Decision (no code)
1. **vibe-architect** — analyze and recommend
2. `/project:close` — capture the decision

### Infrastructure Issue
1. `/project:status` — see what's broken
2. **vibe-devops** — diagnose root cause
3. **vibe-implementer** — fix if code change needed
4. **vibe-qa** — validate
5. `/project:ship` — deploy
6. `/project:close` — document

### Marketplace Work
1. **vibe-marketplace** — scope the integration
2. **vibe-implementer** — build it
3. **vibe-qa** — validate OAuth flow end-to-end
4. `/project:ship` — deploy
5. `/project:close` — document

---

## Key Design Principles

**Why Opus for architect and implementer?**
These make the highest-stakes decisions. Architect sets direction. Implementer writes production code. Worth the extra quality.

**Why Sonnet for QA, marketplace, and devops?**
Speed matters more than depth here. QA runs checklists. DevOps reads logs. Marketplace follows established patterns. Sonnet handles these efficiently.

**Why read-only for architect, QA, and devops?**
Separation of concerns. Architect recommends but doesn't write. QA validates but doesn't fix. DevOps diagnoses but doesn't change infra without approval. Only the implementer and marketplace agent modify code.

**Why separate context windows matter?**
Each agent runs in its own context. The architect can scan 50 files without bloating your main session. QA can trace code paths without eating your context budget. Your main conversation stays clean and focused.

**The Omid Test**
Every pipeline should end with this question: "Could Omid deploy this for a customer without messaging Bill?" If the answer is no, something needs to be documented, simplified, or automated before shipping.
