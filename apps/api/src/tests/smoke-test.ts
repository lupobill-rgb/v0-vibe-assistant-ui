/**
 * VIBE Smoke Test Gate — Sprint 8
 * Runs LP-01, DASH-01, SITE-01 against the live Edge Function.
 * No test framework — native fetch + console.log + process.exit.
 *
 * Usage:
 *   SUPABASE_ANON_KEY=... npx tsx apps/api/src/tests/smoke-test.ts
 *   npx tsx apps/api/src/tests/smoke-test.ts --dry-run   (validate harness with mock data)
 */

const DRY_RUN = process.argv.includes('--dry-run');

const EDGE_URL =
  'https://ptaqytvztkhjpuawdxng.supabase.co/functions/v1/generate-diff';

const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!ANON_KEY && !DRY_RUN) {
  console.error('FAIL: SUPABASE_ANON_KEY not set. Use --dry-run to validate harness offline.');
  process.exit(1);
}

interface TestCase {
  id: string;
  prompt: string;
  mode: string;
  assertions: { pattern: RegExp; label: string }[];
  mockResponse: string;
}

const tests: TestCase[] = [
  {
    id: 'LP-01',
    prompt: 'Build a landing page for a SaaS product called Launchpad',
    mode: 'starter-site',
    assertions: [
      { pattern: /<html/i, label: 'response contains <html' },
    ],
    mockResponse: '{"diff":"<!DOCTYPE html><html><head><title>Launchpad</title></head><body><h1>Launchpad</h1><button>Get Started</button></body></html>"}',
  },
  {
    id: 'DASH-01',
    prompt: 'Build a sales pipeline dashboard with deal count KPI and stage chart',
    mode: 'dashboard',
    assertions: [
      {
        pattern: /vibeLoadData|<canvas|chart/i,
        label: 'response contains vibeLoadData, <canvas, or chart',
      },
    ],
    mockResponse: '{"diff":"<!DOCTYPE html><html><body><canvas id=\\"chart\\"></canvas><script>vibeLoadData()</script></body></html>"}',
  },
  {
    id: 'SITE-01',
    prompt: 'Build a multi-page marketing site with nav, about page, and contact form',
    mode: 'starter-site',
    assertions: [
      {
        pattern: /switchView|navigation|<nav/i,
        label: 'response contains switchView, navigation, or <nav',
      },
    ],
    mockResponse: '{"diff":"<!DOCTYPE html><html><body><nav><a href=\\"#home\\">Home</a><a href=\\"#about\\">About</a></nav><script>function switchView(p){}</script></body></html>"}',
  },
];

async function runTest(tc: TestCase): Promise<boolean> {
  const tag = `[${tc.id}]`;
  console.log(`${tag} Running: "${tc.prompt.slice(0, 60)}…"`);

  try {
    let body: string;

    if (DRY_RUN) {
      console.log(`${tag} (dry-run — using mock response)`);
      body = tc.mockResponse;
    } else {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY!,
        },
        body: JSON.stringify({ prompt: tc.prompt, mode: tc.mode }),
      });

      if (!res.ok) {
        console.log(`${tag} FAIL — HTTP ${res.status}: ${res.statusText}`);
        return false;
      }

      body = await res.text();
    }

    for (const a of tc.assertions) {
      if (!a.pattern.test(body)) {
        console.log(`${tag} FAIL — assertion failed: ${a.label}`);
        console.log(`${tag}   response length: ${body.length} chars`);
        return false;
      }
    }

    console.log(`${tag} PASS`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`${tag} FAIL — ${msg}`);
    return false;
  }
}

async function main() {
  console.log(`=== VIBE Smoke Test Gate${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`);
  const results: boolean[] = [];

  for (const tc of tests) {
    const passed = await runTest(tc);
    results.push(passed);
    console.log('');
  }

  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`=== Results: ${passed}/${total} passed ===`);

  if (passed < total) {
    console.log('GATE: BLOCKED — fix failures before merging.');
    process.exit(1);
  }

  console.log(`GATE: CLEAR — all smoke tests passed${DRY_RUN ? ' (dry run)' : ''}.`);
  process.exit(0);
}

main();
