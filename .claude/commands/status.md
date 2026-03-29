---
description: Quick status check across all VIBE infrastructure
---

Give me a concise status report:

1. **Vercel**: Latest deploy status, any build errors
2. **Railway**: NestJS API service health, recent restart count, memory usage
3. **Supabase**: Edge function versions deployed, any recent 500s in logs
4. **Marketplace**: Nango connector status (which OAuth flows are live vs broken)
5. **Git**: Last 3 commits on main, any open PRs

Format as a quick dashboard — one line per item, green/yellow/red status.
