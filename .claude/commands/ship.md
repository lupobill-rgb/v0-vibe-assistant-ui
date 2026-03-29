# /ship — Lint, Test, Commit, Push

Ship current changes to main. Runs quality gates before pushing.

## Instructions

Execute each phase in order. Abort on failure.

### Phase 1: Pre-flight

1. `git status` — show what will be committed
2. `git diff --stat` — summarize changes
3. If no changes exist, report "Nothing to ship" and stop

### Phase 2: Lint

Run linting for changed workspaces only:

```bash
# Check which workspaces have changes
git diff --name-only HEAD | grep "^apps/web/" && (cd apps/web && npm run lint 2>&1 | tail -20)
git diff --name-only HEAD | grep "^apps/api/" && (cd apps/api && npm run lint 2>&1 | tail -20)
```

- If lint fails: report errors and STOP. Do not auto-fix without user approval.

### Phase 3: Type Check

```bash
# API typecheck
cd apps/api && npx tsc --noEmit 2>&1 | tail -20
```

- If typecheck fails: report errors and STOP.

### Phase 4: Test (if tests exist)

```bash
# Run tests if they exist
[ -f apps/api/jest.config.js ] && cd apps/api && npm test 2>&1 | tail -30
[ -f apps/web/jest.config.js ] && cd apps/web && npm test 2>&1 | tail -30
```

### Phase 5: Commit

1. Stage all changed files: `git add -A`
2. Generate a commit message based on the changes (follow conventional commits)
3. Show the user the proposed commit message and ask for approval
4. Commit with the approved message

### Phase 6: Push

1. Confirm current branch: `git branch --show-current`
2. If on a `claude/*` branch: push to origin
3. If on `main`: push to origin main
4. Command: `git push -u origin <branch>`

### Phase 7: Post-ship

Report:
- Commit SHA
- Branch pushed to
- Deployment targets that will auto-deploy:
  - `main` push → Railway redeploys `apps/api`
  - `main` push → Vercel redeploys `apps/web`
  - `claude/*` branch → no auto-deploy (merge to main required)

### Abort Conditions

STOP and report if any of these are true:
- Lint errors exist
- TypeScript errors exist
- Tests fail
- Working tree has merge conflicts
- Secrets detected in staged files (`.env`, credentials, API keys)
