# /status — VIBE Infrastructure Status

Generate a status dashboard for all VIBE infrastructure components.

## Instructions

Collect status from each layer and present a unified view.

### 1. Git Status

- Current branch: `git branch --show-current`
- Last commit: `git log --oneline -1`
- Uncommitted changes: `git status --short`
- Remote sync: `git log --oneline origin/main..HEAD 2>/dev/null` (commits ahead)

### 2. Monorepo Health

Check each workspace:

#### `apps/web` (Frontend — Vercel)
- Package exists: check `apps/web/package.json`
- Key deps present: `next`, `react`, `@supabase/supabase-js`
- Build script defined: `npm run build`

#### `apps/api` (API — Railway)
- Package exists: check `apps/api/package.json`
- Key deps present: `express` or `@nestjs/core`, `@supabase/supabase-js`
- Start script defined and uses port 8080

#### `supabase/functions/generate-diff` (Edge Function)
- Entry file exists: `supabase/functions/generate-diff/index.ts`
- `VIBE_SYSTEM_RULES` defined
- Dashboard mode handler present

### 3. Sprint Status

Read CLAUDE.md and report:
- Current sprint position
- Next sprint item
- Any blockers noted

### 4. Key Files Integrity

Verify these critical files exist and are non-empty:
- `apps/api/src/index.ts`
- `apps/api/src/starter-site.ts`
- `apps/api/src/storage.ts`
- `supabase/functions/generate-diff/index.ts`
- `apps/web/app/chat/page.tsx`

### Output Format

```
═══════════════════════════════════════
  VIBE STATUS DASHBOARD
═══════════════════════════════════════

Git
  Branch:    <branch>
  Commit:    <sha> <message>
  Dirty:     yes/no
  Ahead:     <n> commits

Infrastructure
  Frontend:  ✓/✗  apps/web
  API:       ✓/✗  apps/api
  Edge Fn:   ✓/✗  supabase/functions/generate-diff

Sprint
  Current:   <sprint position>
  Next:      <next item>
  Blockers:  <any>

Key Files
  index.ts:        ✓/✗
  starter-site.ts: ✓/✗
  storage.ts:      ✓/✗
  generate-diff:   ✓/✗
  chat/page.tsx:   ✓/✗

═══════════════════════════════════════
```
