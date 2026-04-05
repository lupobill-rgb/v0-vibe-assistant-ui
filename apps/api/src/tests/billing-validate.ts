export {}
/**
 * VIBE Billing Validation — Sprint 7 Verification
 * Validates Stripe billing endpoints against the live Railway API.
 * No test framework — native fetch + console.log + process.exit.
 *
 * Usage:
 *   npx tsx apps/api/src/tests/billing-validate.ts
 *   npx tsx apps/api/src/tests/billing-validate.ts --dry-run
 *
 * Env:
 *   API_URL — Railway API base (default: https://vibeapi-production-fdd1.up.railway.app)
 *   TEST_ORG_ID — org to test against (required for live mode)
 */

const DRY_RUN = process.argv.includes('--dry-run');
const API_URL = process.env.API_URL || 'https://vibeapi-production-fdd1.up.railway.app';
const TEST_ORG_ID = process.env.TEST_ORG_ID || 'test-billing-validation';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@vibe.ubigrowth.ai';
const CHECKOUT_DOMAIN = process.env.CHECKOUT_DOMAIN || 'checkout.stripe.com';

interface TestCase {
  id: string;
  description: string;
  run: () => Promise<{ pass: boolean; detail: string }>;
}

// ── Helpers ──

async function apiGet(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${API_URL}${path}`);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function apiPost(path: string, payload: any): Promise<{ status: number; body: any }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ── Mock responses for dry-run ──

const MOCKS: Record<string, { status: number; body: any }> = {
  'GET:/api/billing/status': {
    status: 200,
    body: {
      tierSlug: 'starter',
      subscriptionStatus: 'active',
      creditsUsed: 12,
      creditsLimit: 50,
      currentPeriodEnd: null,
    },
  },
  'POST:/api/billing/checkout:pro': {
    status: 200,
    body: { checkoutUrl: 'https://checkout.stripe.com/c/pay/test_xxx' },
  },
  'POST:/api/billing/checkout:growth': {
    status: 200,
    body: { checkoutUrl: 'https://checkout.stripe.com/c/pay/test_yyy' },
  },
  'POST:/api/billing/checkout:team': {
    status: 200,
    body: { checkoutUrl: 'https://checkout.stripe.com/c/pay/test_zzz' },
  },
  'POST:/api/billing/checkout:starter': {
    status: 400,
    body: { error: 'tierSlug must be one of: pro, growth, team' },
  },
  'POST:/api/billing/checkout:missing': {
    status: 400,
    body: { error: 'orgId, tierSlug, email, and orgName are required' },
  },
};

function mock(key: string) { return MOCKS[key]; }

// ── Test cases ──

const tests: TestCase[] = [
  {
    id: 'BV-01',
    description: 'GET /api/billing/status returns tier + limits',
    async run() {
      const r = DRY_RUN
        ? mock('GET:/api/billing/status')
        : await apiGet(`/api/billing/status?orgId=${TEST_ORG_ID}`);
      if (r.status !== 200) return { pass: false, detail: `HTTP ${r.status}` };
      const has = r.body?.tierSlug && r.body?.creditsLimit !== undefined;
      return { pass: has, detail: `tier=${r.body?.tierSlug} credits=${r.body?.creditsUsed}/${r.body?.creditsLimit}` };
    },
  },
  {
    id: 'BV-02',
    description: 'POST /api/billing/checkout creates Pro session',
    async run() {
      const r = DRY_RUN
        ? mock('POST:/api/billing/checkout:pro')
        : await apiPost('/api/billing/checkout', {
            orgId: TEST_ORG_ID, tierSlug: 'pro',
            email: TEST_EMAIL, orgName: 'Test Org',
          });
      if (r.status !== 200) return { pass: false, detail: `HTTP ${r.status}: ${JSON.stringify(r.body)}` };
      const url = r.body?.checkoutUrl || '';
      const valid = url.startsWith(`https://${CHECKOUT_DOMAIN}`);
      return { pass: valid, detail: valid ? 'checkout URL returned' : `unexpected: ${JSON.stringify(r.body)}` };
    },
  },
  {
    id: 'BV-03',
    description: 'POST /api/billing/checkout creates Growth session',
    async run() {
      const r = DRY_RUN
        ? mock('POST:/api/billing/checkout:growth')
        : await apiPost('/api/billing/checkout', {
            orgId: TEST_ORG_ID, tierSlug: 'growth',
            email: TEST_EMAIL, orgName: 'Test Org',
          });
      if (r.status !== 200) return { pass: false, detail: `HTTP ${r.status}: ${JSON.stringify(r.body)}` };
      const url = r.body?.checkoutUrl || '';
      const valid = url.startsWith(`https://${CHECKOUT_DOMAIN}`);
      return { pass: valid, detail: valid ? 'checkout URL returned' : `unexpected: ${JSON.stringify(r.body)}` };
    },
  },
  {
    id: 'BV-04',
    description: 'POST /api/billing/checkout creates Team session',
    async run() {
      const r = DRY_RUN
        ? mock('POST:/api/billing/checkout:team')
        : await apiPost('/api/billing/checkout', {
            orgId: TEST_ORG_ID, tierSlug: 'team',
            email: TEST_EMAIL, orgName: 'Test Org',
          });
      if (r.status !== 200) return { pass: false, detail: `HTTP ${r.status}: ${JSON.stringify(r.body)}` };
      const url = r.body?.checkoutUrl || '';
      const valid = url.startsWith(`https://${CHECKOUT_DOMAIN}`);
      return { pass: valid, detail: valid ? 'checkout URL returned' : `unexpected: ${JSON.stringify(r.body)}` };
    },
  },
  {
    id: 'BV-05',
    description: 'POST /api/billing/checkout rejects starter tier',
    async run() {
      const r = DRY_RUN
        ? mock('POST:/api/billing/checkout:starter')
        : await apiPost('/api/billing/checkout', {
            orgId: TEST_ORG_ID, tierSlug: 'starter',
            email: TEST_EMAIL, orgName: 'Test Org',
          });
      const rejected = r.status === 400 && r.body?.error?.includes('must be one of');
      return { pass: rejected, detail: rejected ? 'correctly rejected' : `unexpected ${r.status}: ${JSON.stringify(r.body)}` };
    },
  },
  {
    id: 'BV-06',
    description: 'POST /api/billing/checkout rejects missing fields',
    async run() {
      const r = DRY_RUN
        ? mock('POST:/api/billing/checkout:missing')
        : await apiPost('/api/billing/checkout', { orgId: TEST_ORG_ID });
      const rejected = r.status === 400 && r.body?.error?.includes('required');
      return { pass: rejected, detail: rejected ? 'correctly rejected' : `unexpected ${r.status}: ${JSON.stringify(r.body)}` };
    },
  },
];

// ── Runner ──

async function main() {
  console.log(`=== VIBE Billing Validation${DRY_RUN ? ' (DRY RUN)' : ''} ===`);
  console.log(`API: ${API_URL}\n`);

  let passed = 0;
  for (const tc of tests) {
    const tag = `[${tc.id}]`;
    console.log(`${tag} ${tc.description}`);
    try {
      const result = await tc.run();
      console.log(`${tag} ${result.pass ? 'PASS' : 'FAIL'} — ${result.detail}\n`);
      if (result.pass) passed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${tag} FAIL — ${msg}\n`);
    }
  }

  const total = tests.length;
  console.log(`=== Results: ${passed}/${total} passed ===`);
  if (passed < total) {
    console.log('BILLING GATE: BLOCKED');
    process.exit(1);
  }
  console.log(`BILLING GATE: CLEAR${DRY_RUN ? ' (dry run)' : ''}`);
  process.exit(0);
}

main();
