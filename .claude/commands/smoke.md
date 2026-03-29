# /smoke — VIBE Smoke Test

Run smoke tests against VIBE build and edit flows.

## Instructions

Execute each check in order. Stop on first failure and report.

### Pre-flight

1. Confirm working directory is the VIBE monorepo root
2. Run `git status` — report any uncommitted changes
3. Check Node version: `node -v` (must be 18+)

### Build Smoke Tests

#### Frontend (`apps/web`)
```bash
cd apps/web && npm run build 2>&1 | tail -30
```
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No missing dependencies

#### API (`apps/api`)
```bash
cd apps/api && npx tsc --noEmit 2>&1 | tail -30
```
- [ ] TypeScript compiles clean
- [ ] No circular dependency warnings

#### Edge Function (`supabase/functions/generate-diff`)
- [ ] Read `supabase/functions/generate-diff/index.ts` — verify it parses without syntax errors
- [ ] Confirm `VIBE_SYSTEM_RULES` is defined and non-empty
- [ ] Confirm dashboard fast path is intact (DO NOT MODIFY — locked per CLAUDE.md)

### Edit Flow Smoke Test

1. Read `apps/api/src/index.ts` — verify the POST /jobs handler exists
2. Verify `edgeCall()` function is defined and called correctly
3. Check that `execution_state` transitions use only allowed values:
   `queued`, `cloning`, `building_context`, `calling_llm`, `applying_diff`, `running_preflight`, `creating_pr`, `completed`, `complete`, `failed`, `planning`, `building`, `validating`, `testing`, `security`, `qa`, `ux`
4. Check that `severity` values use only: `info`, `error`, `success`, `warning`, `warn`

### Dashboard Fast Path Verification

This is locked (v0.1-dashboard-stable). Verify it has NOT been modified:
1. When `mode === 'dashboard'`, job handler bypasses planner
2. Single `edgeCall({ prompt, model, mode: 'dashboard' })` generates output
3. Result written as `index.html` — no multi-page build

### Report

Output a summary table:

| Check | Status | Notes |
|-------|--------|-------|
| Frontend build | PASS/FAIL | |
| API typecheck | PASS/FAIL | |
| Edge Function syntax | PASS/FAIL | |
| Dashboard fast path | PASS/FAIL | |
| State enum compliance | PASS/FAIL | |

If all pass: "Smoke tests green. Safe to ship."
If any fail: "BLOCKED — fix before shipping." + details.
