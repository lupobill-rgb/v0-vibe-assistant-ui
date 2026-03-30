/**
 * VIBE Smoke Test Gate — Sprint 8
 * Runs LP-01, DASH-01, SITE-01 against the live Edge Function.
 * No test framework — native fetch + process.exit.
 */

const EDGE_URL =
  'https://ptaqytvztkhjpuawdxng.supabase.co/functions/v1/generate-diff';

const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!ANON_KEY) {
  console.error('FAIL: SUPABASE_ANON_KEY not set in environment');
  process.exit(1);
}

interface TestCase {
  id: string;
  prompt: string;
  mode: string;
  assertions: { pattern: RegExp; label: string }[];
}

const tests: TestCase[] = [
  {
    id: 'LP-01',
    prompt: 'Build a landing page for a SaaS product called Launchpad',
    mode: 'starter-site',
    assertions: [
      { pattern: /<html/i, label: 'contains <html' },
    ],
  },
  {
    id: 'DASH-01',
    prompt:
      'Build a sales pipeline dashboard with deal count KPI and stage chart',
    mode: 'dashboard',
    assertions: [
      {
        pattern: /vibeLoadData|<canvas|chart/i,
        label: 'contains vibeLoadData, <canvas, or chart',
      },
    ],
  },
  {
    id: 'SITE-01',
    prompt:
      'Build a multi-page marketing site with nav, about page, and contact form',
    mode: 'starter-site',
    assertions: [
      {
        pattern: /switchView|navigation|<nav/i,
        label: 'contains switchView, navigation, or <nav',
      },
    ],
  },
];

async function runTest(tc: TestCase): Promise<boolean> {
  const tag = `[${tc.id}]`;
  console.log(`${tag} Running: "${tc.prompt.slice(0, 60)}…"`);

  try {
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

    const body = await res.text();

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
  console.log('=== VIBE Smoke Test Gate ===\n');
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

  console.log('GATE: CLEAR — all smoke tests passed.');
  process.exit(0);
}

main();
