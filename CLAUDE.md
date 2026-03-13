# VIBE — Agent Operating Rules

Read this entire file before every session. Non-negotiable.

## Mission

Prompt → deployed product. Org-aware. Governed. Beautiful.

## Stack

- Frontend: Next.js — Vercel (deploys from `UbiGrowth/VIBE` main — NOT `lupobill-rgb`)
- API: NestJS — Railway (`@vibe/api`, port 8080)
- Database: Supabase project `ptaqytvztkhjpuawdxng`
- LLM: Claude primary. GPT-4 fallback on rate limit / timeout / 529 ONLY.
- Repos: `UbiGrowth/VIBE` is source of truth. `lupobill-rgb/v0-vibe-assistant-ui` is Vercel legacy — do not push fixes there.

## Key File Map

- `apps/api/src/index.ts` — job routing, edgeCall, POST /jobs handler
- `apps/api/src/starter-site.ts` — INITIAL_BUILD_BUDGETS, DASHBOARD_BUILD_BUDGETS, mapWithConcurrency
- `apps/api/src/storage.ts` — ExecutionState and EventSeverity types
- `supabase/functions/generate-diff/index.ts` — Edge Function, source of truth for LLM behavior
- `apps/web/app/chat/page.tsx` — frontend job submission

## Database Constraints — Read Before Writing Any State Value

- `jobs.execution_state` allowed values: `queued`, `cloning`, `building_context`, `calling_llm`, `applying_diff`, `running_preflight`, `creating_pr`, `completed`, `complete`, `failed`, `planning`, `building`, `validating`, `testing`, `security`, `qa`, `ux`
- `job_events.severity` allowed values: `info`, `error`, `success`, `warning`, `warn`
- Always verify before writing: `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = '...'`

## Build Budgets (apps/api/src/starter-site.ts)

- `INITIAL_BUILD_BUDGETS.maxWallTimeMs`: 420,000 (7 min)
- `INITIAL_BUILD_BUDGETS.stepDeadlinesMs.building`: 360,000 (6 min)
- `INITIAL_BUILD_BUDGETS.buildConcurrency`: 3 (overridden to 1 in index.ts — pages build sequentially ~85s each)
- Do not change concurrency without testing against Supabase Edge Function concurrency limits

## Rules

1. **Reliability over cleverness.** Working MVP beats clever broken code.
2. **Chunked mode.** ONE file. MAX 200 lines per diff. Ask for exact path first.
3. **Read before write.** Always read the target file before making any change.
4. **No large refactors** unless cleanup mode explicitly triggered.
5. **RLS on.** Secrets never in logs or LLM context. Ever.
6. **Every change traceable:** job → diff → log → test result.
7. **OSS first.** No custom primitives when a library exists.
8. **Scan before planning.** Query live schema and git log before proposing any sprint.
9. **Verify constraint values** before writing any execution_state or severity value.
10. **Branch naming:** Claude Code branches follow `claude/*` pattern with random suffix — check `git branch -r` for exact names before merging.

## Deployment Flow

1. Claude Code commits to `claude/*` branch
2. Merge to `UbiGrowth/VIBE` main via PowerShell: `git fetch origin` → `git merge origin/claude/...` → `git push origin main`
3. Railway redeploys `apps/api` automatically on main push
4. Vercel redeploys `apps/web` automatically on main push

## Never

- Silent failures. Always return plain-English explanation + next action.
- Raw stack traces to users.
- Customer API keys. All LLM calls through our accounts.
- Whole-file rewrites. Diffs only.
- Push to `lupobill-rgb` for bug fixes — always use `UbiGrowth/VIBE`.
