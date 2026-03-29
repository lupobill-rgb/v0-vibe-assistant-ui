---
description: Run a smoke test against VIBE's core build and edit flows
---

Run a quick smoke test of VIBE's critical paths:

1. Hit /api/intake with a test NLP prompt payload — verify JSON response, no "Unexpected end of JSON input" errors
2. Confirm the response routes through the API (not the Supabase Edge Function) by checking that edit: true payloads go to /api/intake, not the edge function
3. Verify build flow returns a valid multi-page plan (check page count, component structure)
4. Check that the edit bar / NLP edit path is functional
5. Report pass/fail for each step

If anything fails, identify the file and line causing the issue before proposing a fix.
