# /debug — VIBE Deployment Debugger

Diagnose deployment issues across the VIBE infrastructure stack.

## Instructions

You are debugging a VIBE deployment issue. Work through each layer systematically.

### Step 1: Identify the Layer

Ask the user (or infer from context) which layer is failing:
- **Vercel** (frontend — `apps/web`)
- **Railway** (API — `apps/api`, port 8080)
- **Supabase** (database + Edge Functions — project `ptaqytvztkhjpuawdxng`)

### Step 2: Vercel (Frontend)

1. Check `apps/web/` for build errors: `cd apps/web && npx next build 2>&1 | tail -50`
2. Verify environment variables are not leaking secrets to the client
3. Check that imports resolve — missing deps are the #1 Vercel failure
4. Confirm deploying from `UbiGrowth/VIBE` main, NOT `lupobill-rgb`
5. Review recent commits: `git log --oneline -10 -- apps/web/`

### Step 3: Railway (API)

1. Check `apps/api/` for build errors: `cd apps/api && npx tsc --noEmit 2>&1 | tail -50`
2. Verify `PORT=8080` is set (Railway requirement)
3. Check `apps/api/src/index.ts` for route handler issues
4. Look for Supabase connection errors — check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
5. Review recent commits: `git log --oneline -10 -- apps/api/`

### Step 4: Supabase (Edge Functions)

1. Read `supabase/functions/generate-diff/index.ts` — this is the LLM execution layer
2. Check for CORS issues (Edge Functions must return proper headers)
3. Verify `ANTHROPIC_API_KEY` is set in Supabase secrets
4. Check constraint values — `execution_state` and `severity` must match allowed enums
5. Look for timeout issues — Edge Functions have a 60s wall clock limit

### Step 5: Cross-Layer Issues

1. Check if the issue is a data contract mismatch (API sends X, Edge Function expects Y)
2. Verify CORS headers between Vercel → Railway → Supabase
3. Check for stale deployments — confirm latest commit SHA matches deployed version
4. Review `job_events` table for error breadcrumbs: severity = 'error'

### Output Format

Provide:
- **Root cause**: One sentence
- **Fix**: Exact file + line + change
- **Verification**: How to confirm the fix worked
