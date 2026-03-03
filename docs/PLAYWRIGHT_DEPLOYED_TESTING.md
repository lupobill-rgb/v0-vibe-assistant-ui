# Playwright Deployed Testing (vibe-web)

This repo is configured so Playwright can run against a deployed Vercel URL instead of always targeting localhost.

## Base URL behavior

Playwright reads the base URL from:

- `PLAYWRIGHT_BASE_URL` (preferred for CI/deployed testing)
- fallback: `http://localhost:3000` (local development)

Defined in `playwright.config.ts`:

```ts
use: {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
}
```

## Run locally (localhost)

```bash
npm run dev:web
npm run test:e2e
```

## Run against deployed Vercel URL (preview or production)

```bash
export PLAYWRIGHT_BASE_URL="https://<your-vibe-web-deployment>.vercel.app"
npm run test:e2e:deployed
```

## CI example

Set `PLAYWRIGHT_BASE_URL` in CI environment variables to the target Vercel deployment URL, then run:

```bash
npm run test:e2e:deployed
```

## Notes

- Playwright tests should use relative navigation (for example `page.goto('/')`) so they honor the configured `baseURL`.
- Do not hardcode `http://localhost:3000` in test files.
