---
description: Prepare and ship a change to VIBE — lint, test, commit, merge to main
---

Ship workflow:

1. Show me the diff of all changed files
2. Run lint and fix any issues automatically
3. Run any existing tests relevant to the changed files
4. If tests pass, create a descriptive commit message following conventional commits format
5. Commit and push directly to main (Bill's preferred workflow — no PRs for speed)
6. Verify the Vercel deploy triggers successfully

If tests fail or lint has unfixable issues, stop and report before committing. Never push broken code to main.
