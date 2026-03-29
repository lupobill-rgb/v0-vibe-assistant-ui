---
description: Debug VIBE deployment issues across Vercel, Railway, and Supabase
---

Check for deployment issues across the VIBE stack in this order:

1. Check Vercel deployment status for the frontend (Next.js)
2. Check Railway service logs for the NestJS API — look for crash loops, OOM, or timeout errors
3. Check Supabase Edge Function versions and recent invocation errors
4. If you find errors, identify root cause and produce a unified diff fix for ONE file only (max 200 lines)
5. If you need more context, ask for the exact file path and minimal lines needed

Always output: what broke, why, and the fix as a diff.
