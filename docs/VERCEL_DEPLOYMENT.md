# Vercel Deployment (Monorepo)

This repository is an npm-workspaces monorepo. The UI app lives in `apps/web` and uses Next.js.

## Why this doc exists

If Vercel is pointed at the repository root, it can fail with:

> "No Next.js version detected."

That happens because `next` is installed in the workspace app, not always discoverable from root-only detection.

## Required Vercel project settings

1. **Root Directory**: `apps/web` (recommended)
2. **Framework Preset**: `Next.js`
3. **Build Command**: `npm run build` (for `apps/web` Root Directory)
4. **Install Command**: `npm install`

## Environment variables (UI)

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_TENANT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Notes

- A root `vercel.json` is included and uses `npm run build`, which is compatible when Vercel project Root Directory is `apps/web`.
- An `apps/web/vercel.json` is also included so Vercel picks up Next.js config even when the project root is explicitly set to `apps/web`.
- Root `package.json` includes `next` in `devDependencies` so Vercel can detect Next.js when misconfigured to root.
- Best practice remains setting **Root Directory = `apps/web`** in the Vercel dashboard.


## Proof / verification commands

Run these from repository root:

```bash
npm run verify:vercel
npm run build:web
```

Expected result:
- `verify:vercel` prints all checks with ✅
- `build:web` completes with a successful Next.js production build


## Vercel dashboard sanity check

In Vercel Project Settings → General → Root Directory, set this to `apps/web` for VIBE-WEB.

If Root Directory points at repo root by accident, Vercel may detect the wrong package and throw:

> No Next.js version detected
