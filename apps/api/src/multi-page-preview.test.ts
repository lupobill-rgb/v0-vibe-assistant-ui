import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';

/**
 * Unit tests for the plan+page two-step preview flow in POST /jobs.
 *
 * Covers all three PR test-plan items:
 *   1. Plan+page flow generates multiple HTML files in preview directory
 *   2. Fallback to single-page mode when plan call fails
 *   3. Progress messages appear in the log stream
 *
 * Uses a mock HTTP server to simulate Edge Function responses and exercises
 * the same logic paths that live inside the fire-and-forget block.
 */

// ── Extracted helpers (mirror the logic in index.ts) ─────────────────────────

type PlanPage = { name: string; title: string; description: string };

/**
 * Simulates the plan+page orchestration from the fire-and-forget block.
 * Takes an edge function URL, prompt, model, taskId, and previewDir.
 * Returns { pageNames, totalTokens, logs } for assertions.
 */
async function runPlanPageFlow(
  edgeFunctionUrl: string,
  prompt: string,
  model: string,
  taskId: string,
  previewDir: string,
): Promise<{ pageNames: string[]; totalTokens: number; logs: string[] }> {
  const headers = { 'Content-Type': 'application/json' };
  const logs: string[] = [];

  const log = (msg: string) => { logs.push(msg); };

  // ── Step 1: Plan call ──
  let plan: PlanPage[] | null = null;
  let totalTokens = 0;

  try {
    log('Generating plan...');
    const planResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, model, mode: 'plan' }),
    });
    const planRawText = await planResponse.text();
    if (!planResponse.ok) throw new Error(planRawText || `Plan call returned ${planResponse.status}`);
    const planData = JSON.parse(planRawText);
    if (planData.usage?.total_tokens) totalTokens += planData.usage.total_tokens;
    // Edge Function returns { diff: "<JSON string of pages array>", mode: "plan", usage }
    const planPages = typeof planData.diff === 'string'
      ? JSON.parse(planData.diff)
      : planData.diff;
    if (Array.isArray(planPages) && planPages.length > 0) {
      plan = planPages;
      log(`Plan received: ${plan!.length} page(s) — ${plan!.map((p: PlanPage) => p.name).join(', ')}`);
    } else {
      throw new Error('Plan response missing valid pages array');
    }
  } catch (planErr: any) {
    log(`Plan call failed (${planErr.message}), falling back to single-page build...`);
    plan = null;
  }

  fs.mkdirSync(previewDir, { recursive: true });

  let pageNames: string[] = [];

  if (plan) {
    // ── Step 2: Page loop — build pages sequentially ──
    for (let i = 0; i < plan.length; i++) {
      const page = plan[i];
      const safeName = page.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      log(`Building page ${i + 1} of ${plan!.length}: ${page.name}...`);

      try {
        const pageResponse = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ prompt: page.description, model, mode: 'page', max_tokens: 2000, context: 'Original request: ' + prompt + '. All pages: ' + plan!.map(p => p.name).join(', ') + '. Maintain consistent design across all pages.' }),
        });
        const pageRawText = await pageResponse.text();
        if (!pageResponse.ok) throw new Error('Page ' + page.name + ' returned ' + pageResponse.status);
        const pageData = JSON.parse(pageRawText);
        if (pageData.usage?.total_tokens) totalTokens += pageData.usage.total_tokens;
        fs.writeFileSync(path.join(previewDir, safeName + '.html'), pageData.diff);
        pageNames.push(page.name);
      } catch (pageErr: any) {
        log('Page ' + page.name + ' failed: ' + pageErr.message + ' — skipping');
      }

      // Delay between pages omitted for test speed (production uses 5s)
    }

    if (pageNames.length === 0) {
      throw new Error('All page builds failed — zero pages generated');
    }
  } else {
    // ── Fallback: single-page build with mode: 'html' ──
    log('Calling Edge Function (single-page mode)...');
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, model, mode: 'html' }),
    });
    const rawText = await response.text();
    if (!response.ok) throw new Error(rawText || `Edge Function returned ${response.status}`);

    let data: { diff: string; usage: { total_tokens: number } };
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Edge Function returned invalid JSON (${rawText.length} chars)`);
    }

    if (data.usage?.total_tokens) totalTokens += data.usage.total_tokens;
    fs.writeFileSync(path.join(previewDir, 'index.html'), data.diff);
    pageNames = ['index'];
  }

  // ── Write manifest and finalize ──
  fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify(pageNames));
  log('Preview generated');
  log(`LLM responded: ${totalTokens} tokens used`);

  return { pageNames, totalTokens, logs };
}

// ── Mock Edge Function server ────────────────────────────────────────────────

type MockHandler = (body: any) => { status: number; json: any };

function createMockServer(handler: MockHandler): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        const body = JSON.parse(data);
        const result = handler(body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.json));
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-plan-page-test-'));
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

// ── Test Plan Item 1: plan+page flow generates multiple HTML files ───────────

describe('Plan+page flow — multi-page HTML generation', () => {
  it('generates separate HTML files for each page in the plan', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([
              { name: 'index', title: 'Home', description: 'Build the homepage with hero section' },
              { name: 'about', title: 'About Us', description: 'Build the about page' },
              { name: 'pricing', title: 'Pricing', description: 'Build the pricing page with tiers' },
            ]),
            mode: 'plan',
            usage: { total_tokens: 150 },
          },
        };
      }
      // mode === 'page'
      const pageHtml: Record<string, string> = {
        'Build the homepage with hero section': '<html><body><h1>Home</h1></body></html>',
        'Build the about page': '<html><body><h1>About Us</h1></body></html>',
        'Build the pricing page with tiers': '<html><body><h1>Pricing</h1></body></html>',
      };
      return {
        status: 200,
        json: {
          diff: pageHtml[body.prompt] || '<html><body>Unknown</body></html>',
          usage: { total_tokens: 200 },
        },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-multi');
      const result = await runPlanPageFlow(url, 'Build a SaaS site', 'claude', 'task-1', previewDir);

      // Verify 3 pages created
      assert.deepStrictEqual(result.pageNames, ['index', 'about', 'pricing']);

      // Verify HTML files exist with correct content
      assert.ok(fs.existsSync(path.join(previewDir, 'index.html')), 'index.html exists');
      assert.ok(fs.existsSync(path.join(previewDir, 'about.html')), 'about.html exists');
      assert.ok(fs.existsSync(path.join(previewDir, 'pricing.html')), 'pricing.html exists');

      assert.ok(
        fs.readFileSync(path.join(previewDir, 'index.html'), 'utf-8').includes('<h1>Home</h1>'),
        'index.html has correct content',
      );
      assert.ok(
        fs.readFileSync(path.join(previewDir, 'about.html'), 'utf-8').includes('<h1>About Us</h1>'),
        'about.html has correct content',
      );
      assert.ok(
        fs.readFileSync(path.join(previewDir, 'pricing.html'), 'utf-8').includes('<h1>Pricing</h1>'),
        'pricing.html has correct content',
      );

      // Verify manifest.json
      const manifest = JSON.parse(fs.readFileSync(path.join(previewDir, 'manifest.json'), 'utf-8'));
      assert.deepStrictEqual(manifest, ['index', 'about', 'pricing']);

      // Verify token accumulation: 150 (plan) + 3 * 200 (pages) = 750
      assert.strictEqual(result.totalTokens, 750);
    } finally {
      server.close();
    }
  });

  it('sanitizes page names to prevent path traversal', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([
              { name: '../../../etc/passwd', title: 'Evil', description: 'evil page' },
              { name: 'good-page', title: 'Good Page', description: 'safe page' },
            ]),
            mode: 'plan',
            usage: { total_tokens: 50 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: '<html>content</html>', usage: { total_tokens: 100 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-sanitize');
      await runPlanPageFlow(url, 'test', 'claude', 'task-2', previewDir);

      // Dangerous name sanitized to underscores
      assert.ok(
        fs.existsSync(path.join(previewDir, '_________etc_passwd.html')),
        'Dangerous name should be sanitized',
      );
      assert.ok(
        fs.existsSync(path.join(previewDir, 'good-page.html')),
        'Safe name should remain unchanged',
      );

      // No directory traversal
      assert.ok(!fs.existsSync(path.join(tmpDir, 'etc')), 'No path traversal should occur');
    } finally {
      server.close();
    }
  });

  it('handles planData.diff as an already-parsed array (not a string)', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        // Return diff as a raw array instead of a JSON string
        return {
          status: 200,
          json: {
            diff: [
              { name: 'index', title: 'Home', description: 'Build the homepage' },
              { name: 'docs', title: 'Documentation', description: 'Build the docs page' },
            ],
            mode: 'plan',
            usage: { total_tokens: 80 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: '<html><body>Page content</body></html>', usage: { total_tokens: 120 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-array-diff');
      const result = await runPlanPageFlow(url, 'Build a site', 'claude', 'task-array', previewDir);

      assert.deepStrictEqual(result.pageNames, ['index', 'docs']);
      assert.ok(fs.existsSync(path.join(previewDir, 'index.html')), 'index.html exists');
      assert.ok(fs.existsSync(path.join(previewDir, 'docs.html')), 'docs.html exists');
      assert.strictEqual(result.totalTokens, 80 + 120 * 2);
    } finally {
      server.close();
    }
  });

  it('sends mode:page with page description as prompt for each page', async () => {
    const receivedRequests: any[] = [];

    const { server, url } = await createMockServer((body) => {
      receivedRequests.push(body);
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([
              { name: 'home', title: 'Home', description: 'Build homepage with navigation' },
              { name: 'contact', title: 'Contact', description: 'Build contact form page' },
            ]),
            mode: 'plan',
            usage: { total_tokens: 100 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: '<html>page</html>', usage: { total_tokens: 50 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-requests');
      await runPlanPageFlow(url, 'Build a website', 'claude', 'task-3', previewDir);

      // First request should be mode: 'plan' with original prompt
      assert.strictEqual(receivedRequests[0].mode, 'plan');
      assert.strictEqual(receivedRequests[0].prompt, 'Build a website');

      // Subsequent requests should be mode: 'page' with page descriptions
      assert.strictEqual(receivedRequests[1].mode, 'page');
      assert.strictEqual(receivedRequests[1].prompt, 'Build homepage with navigation');
      assert.strictEqual(receivedRequests[2].mode, 'page');
      assert.strictEqual(receivedRequests[2].prompt, 'Build contact form page');
    } finally {
      server.close();
    }
  });

  it('builds >3 pages correctly in sequential order', async () => {
    const fivePages = [
      { name: 'index', title: 'Home', description: 'homepage' },
      { name: 'about', title: 'About Us', description: 'about page' },
      { name: 'pricing', title: 'Pricing', description: 'pricing page' },
      { name: 'blog', title: 'Blog', description: 'blog page' },
      { name: 'contact', title: 'Contact', description: 'contact page' },
    ];

    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify(fivePages),
            mode: 'plan',
            usage: { total_tokens: 100 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: `<html><body>${body.prompt}</body></html>`, usage: { total_tokens: 50 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-batching');
      const result = await runPlanPageFlow(url, 'Build a 5-page site', 'claude', 'task-batch', previewDir);

      // All 5 pages should be built
      assert.deepStrictEqual(result.pageNames, ['index', 'about', 'pricing', 'blog', 'contact']);

      // All 5 HTML files should exist
      for (const page of fivePages) {
        const safeName = page.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        assert.ok(fs.existsSync(path.join(previewDir, `${safeName}.html`)), `${safeName}.html exists`);
      }

      // Token count: 100 (plan) + 5 * 50 (pages) = 350
      assert.strictEqual(result.totalTokens, 350);

      // Build logs should reference all 5 pages
      const buildLogs = result.logs.filter(l => l.startsWith('Building page'));
      assert.strictEqual(buildLogs.length, 5, `Should have 5 build logs, got ${buildLogs.length}`);
      assert.ok(buildLogs[0].includes('1 of 5'), `First: ${buildLogs[0]}`);
      assert.ok(buildLogs[3].includes('4 of 5'), `Fourth: ${buildLogs[3]}`);
      assert.ok(buildLogs[4].includes('5 of 5'), `Fifth: ${buildLogs[4]}`);
    } finally {
      server.close();
    }
  });

  it('continues building remaining pages when one page fails', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([
              { name: 'index', title: 'Home', description: 'homepage' },
              { name: 'broken', title: 'Broken', description: 'this will fail' },
              { name: 'contact', title: 'Contact', description: 'contact page' },
            ]),
            mode: 'plan',
            usage: { total_tokens: 80 },
          },
        };
      }
      // Fail the second page
      if (body.prompt === 'this will fail') {
        return { status: 500, json: { error: 'Internal Server Error' } };
      }
      return {
        status: 200,
        json: { diff: `<html><body>${body.prompt}</body></html>`, usage: { total_tokens: 100 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-resilience');
      const result = await runPlanPageFlow(url, 'Build a site', 'claude', 'task-err', previewDir);

      // Only 2 of 3 pages should succeed
      assert.deepStrictEqual(result.pageNames, ['index', 'contact']);

      // HTML files for successful pages should exist
      assert.ok(fs.existsSync(path.join(previewDir, 'index.html')), 'index.html exists');
      assert.ok(fs.existsSync(path.join(previewDir, 'contact.html')), 'contact.html exists');
      assert.ok(!fs.existsSync(path.join(previewDir, 'broken.html')), 'broken.html should not exist');

      // Logs should show the failure warning
      const failLog = result.logs.find(l => l.includes('Page broken failed'));
      assert.ok(failLog, 'Should log page failure');
      assert.ok(failLog!.includes('— skipping'), 'Should include skipping suffix');
    } finally {
      server.close();
    }
  });

  it('throws when ALL pages fail (zero pages built)', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([
              { name: 'page1', title: 'Page 1', description: 'fail1' },
              { name: 'page2', title: 'Page 2', description: 'fail2' },
            ]),
            mode: 'plan',
            usage: { total_tokens: 50 },
          },
        };
      }
      // All pages fail
      return { status: 500, json: { error: 'Server Error' } };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-all-fail');
      await assert.rejects(
        () => runPlanPageFlow(url, 'Build a site', 'claude', 'task-allfail', previewDir),
        { message: 'All page builds failed — zero pages generated' },
      );
    } finally {
      server.close();
    }
  });

  it('sends max_tokens: 2000 in page requests to stay under rate limit', async () => {
    const receivedRequests: any[] = [];

    const { server, url } = await createMockServer((body) => {
      receivedRequests.push(body);
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([
              { name: 'index', title: 'Home', description: 'homepage' },
            ]),
            mode: 'plan',
            usage: { total_tokens: 50 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: '<html>page</html>', usage: { total_tokens: 100 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-maxtokens');
      await runPlanPageFlow(url, 'Build a site', 'claude', 'task-mt', previewDir);

      // Plan request should NOT have max_tokens, page request should have 2000
      assert.strictEqual(receivedRequests[0].mode, 'plan');
      assert.strictEqual(receivedRequests[0].max_tokens, undefined, 'Plan call should not have max_tokens');
      assert.strictEqual(receivedRequests[1].mode, 'page');
      assert.strictEqual(receivedRequests[1].max_tokens, 2000, 'Page call should have max_tokens: 2000');
    } finally {
      server.close();
    }
  });

  it('sends context field with original prompt and sibling page info in each page request', async () => {
    const receivedRequests: any[] = [];

    const planPages = [
      { name: 'home', title: 'Home Page', description: 'Build the homepage' },
      { name: 'about', title: 'About Us', description: 'Build the about page' },
    ];

    const { server, url } = await createMockServer((body) => {
      receivedRequests.push(body);
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify(planPages),
            mode: 'plan',
            usage: { total_tokens: 80 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: '<html>page</html>', usage: { total_tokens: 60 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-context');
      await runPlanPageFlow(url, 'Build a startup website', 'claude', 'task-ctx', previewDir);

      // Plan request (index 0) should NOT have context
      assert.strictEqual(receivedRequests[0].mode, 'plan');
      assert.strictEqual(receivedRequests[0].context, undefined, 'Plan call should not have context');

      // Page requests (index 1, 2) should have context
      for (let i = 1; i < receivedRequests.length; i++) {
        const req = receivedRequests[i];
        assert.strictEqual(req.mode, 'page');
        assert.ok(req.context, `Page request ${i} should have context field`);
        assert.ok(req.context.includes('Original request: Build a startup website'),
          `Context should include original prompt, got: ${req.context.slice(0, 100)}`);
        assert.ok(req.context.includes('home'),
          `Context should include sibling page name home`);
        assert.ok(req.context.includes('about'),
          `Context should include sibling page name about`);
        assert.ok(req.context.includes('Maintain consistent design'),
          `Context should include consistency instruction`);
      }
    } finally {
      server.close();
    }
  });
});

// ── Test Plan Item 2: Fallback to single-page mode when plan call fails ──────

describe('Plan+page flow — single-page fallback', () => {
  it('falls back to mode:html when plan call returns HTTP error', async () => {
    let callCount = 0;
    const { server, url } = await createMockServer((body) => {
      callCount++;
      if (body.mode === 'plan') {
        return { status: 500, json: { error: 'Internal Server Error' } };
      }
      if (body.mode === 'html') {
        return {
          status: 200,
          json: {
            diff: '<html><body><h1>Fallback Page</h1></body></html>',
            usage: { total_tokens: 300 },
          },
        };
      }
      return { status: 400, json: { error: 'unexpected mode' } };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-fallback-http');
      const result = await runPlanPageFlow(url, 'Build a site', 'claude', 'task-4', previewDir);

      // Should have fallen back to single-page
      assert.deepStrictEqual(result.pageNames, ['index']);
      assert.ok(fs.existsSync(path.join(previewDir, 'index.html')), 'index.html exists');
      assert.ok(
        fs.readFileSync(path.join(previewDir, 'index.html'), 'utf-8').includes('<h1>Fallback Page</h1>'),
        'index.html has fallback content',
      );

      // Verify manifest
      const manifest = JSON.parse(fs.readFileSync(path.join(previewDir, 'manifest.json'), 'utf-8'));
      assert.deepStrictEqual(manifest, ['index']);

      // Should have made exactly 2 calls: plan (failed) + html (fallback)
      assert.strictEqual(callCount, 2);
    } finally {
      server.close();
    }
  });

  it('falls back to mode:html when plan returns invalid JSON', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        // Return valid HTTP 200 but with a diff field that's not valid JSON
        return { status: 200, json: { diff: 'not-valid-json', mode: 'plan', usage: { total_tokens: 10 } } };
      }
      if (body.mode === 'html') {
        return {
          status: 200,
          json: { diff: '<html><body>Single</body></html>', usage: { total_tokens: 200 } },
        };
      }
      return { status: 400, json: { error: 'unexpected' } };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-fallback-json');
      const result = await runPlanPageFlow(url, 'test', 'claude', 'task-5', previewDir);

      assert.deepStrictEqual(result.pageNames, ['index']);
      assert.ok(
        fs.readFileSync(path.join(previewDir, 'index.html'), 'utf-8').includes('Single'),
        'Should contain fallback content',
      );

      // Logs should mention fallback
      assert.ok(
        result.logs.some(l => l.includes('falling back to single-page build')),
        'Should log fallback message',
      );
    } finally {
      server.close();
    }
  });

  it('falls back when plan returns empty pages array', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return { status: 200, json: { diff: '[]', mode: 'plan', usage: { total_tokens: 10 } } };
      }
      if (body.mode === 'html') {
        return {
          status: 200,
          json: { diff: '<html>empty-plan-fallback</html>', usage: { total_tokens: 100 } },
        };
      }
      return { status: 400, json: {} };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-fallback-empty');
      const result = await runPlanPageFlow(url, 'test', 'claude', 'task-6', previewDir);

      assert.deepStrictEqual(result.pageNames, ['index']);
      assert.ok(
        result.logs.some(l => l.includes('Plan response missing valid pages array')),
        'Should log that pages array is missing',
      );
    } finally {
      server.close();
    }
  });
});

// ── Test Plan Item 3: Progress messages appear in logs ────────────────────────

describe('Plan+page flow — progress log messages', () => {
  it('logs "Generating plan..." before the plan call', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([{ name: 'index', title: 'Home', description: 'home' }]),
            mode: 'plan',
            usage: { total_tokens: 50 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: '<html>page</html>', usage: { total_tokens: 100 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-log-plan');
      const result = await runPlanPageFlow(url, 'test', 'claude', 'task-7', previewDir);

      assert.ok(
        result.logs[0] === 'Generating plan...',
        `First log should be "Generating plan...", got: "${result.logs[0]}"`,
      );
    } finally {
      server.close();
    }
  });

  it('logs "Plan received: N page(s)" with page names after successful plan', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([
              { name: 'home', title: 'Home', description: 'homepage' },
              { name: 'pricing', title: 'Pricing', description: 'pricing page' },
              { name: 'faq', title: 'FAQ', description: 'faq page' },
            ]),
            mode: 'plan',
            usage: { total_tokens: 50 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: '<html>page</html>', usage: { total_tokens: 100 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-log-received');
      const result = await runPlanPageFlow(url, 'test', 'claude', 'task-8', previewDir);

      const planLog = result.logs.find(l => l.includes('Plan received'));
      assert.ok(planLog, 'Should have a "Plan received" log entry');
      assert.ok(planLog!.includes('3 page(s)'), `Should mention 3 pages, got: ${planLog}`);
      assert.ok(planLog!.includes('home'), `Should list "home", got: ${planLog}`);
      assert.ok(planLog!.includes('pricing'), `Should list "pricing", got: ${planLog}`);
      assert.ok(planLog!.includes('faq'), `Should list "faq", got: ${planLog}`);
    } finally {
      server.close();
    }
  });

  it('logs "Building page N of M: pageName..." for each page', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([
              { name: 'index', title: 'Home', description: 'home' },
              { name: 'about', title: 'About', description: 'about' },
              { name: 'contact', title: 'Contact', description: 'contact' },
            ]),
            mode: 'plan',
            usage: { total_tokens: 50 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: '<html>page</html>', usage: { total_tokens: 100 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-log-building');
      const result = await runPlanPageFlow(url, 'test', 'claude', 'task-9', previewDir);

      // Should have "Building page X of 3" for each page
      const buildLogs = result.logs.filter(l => l.startsWith('Building page'));
      assert.strictEqual(buildLogs.length, 3, `Should have 3 "Building page" logs, got ${buildLogs.length}`);

      assert.ok(buildLogs[0].includes('1 of 3') && buildLogs[0].includes('index'),
        `First build log should be page 1 of 3: index, got: ${buildLogs[0]}`);
      assert.ok(buildLogs[1].includes('2 of 3') && buildLogs[1].includes('about'),
        `Second build log should be page 2 of 3: about, got: ${buildLogs[1]}`);
      assert.ok(buildLogs[2].includes('3 of 3') && buildLogs[2].includes('contact'),
        `Third build log should be page 3 of 3: contact, got: ${buildLogs[2]}`);
    } finally {
      server.close();
    }
  });

  it('logs total tokens across all calls', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            diff: JSON.stringify([{ name: 'index', title: 'Home', description: 'home' }, { name: 'about', title: 'About', description: 'about' }]),
            mode: 'plan',
            usage: { total_tokens: 100 },
          },
        };
      }
      return {
        status: 200,
        json: { diff: '<html>page</html>', usage: { total_tokens: 250 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-log-tokens');
      const result = await runPlanPageFlow(url, 'test', 'claude', 'task-10', previewDir);

      // 100 (plan) + 250 * 2 (pages) = 600
      assert.strictEqual(result.totalTokens, 600);

      const tokenLog = result.logs.find(l => l.includes('tokens used'));
      assert.ok(tokenLog, 'Should have a tokens log');
      assert.ok(tokenLog!.includes('600'), `Should report 600 tokens, got: ${tokenLog}`);
    } finally {
      server.close();
    }
  });

  it('logs fallback warning when plan call fails', async () => {
    const { server, url } = await createMockServer((body) => {
      if (body.mode === 'plan') {
        return { status: 503, json: { error: 'Service unavailable' } };
      }
      return {
        status: 200,
        json: { diff: '<html>fallback</html>', usage: { total_tokens: 100 } },
      };
    });

    try {
      const previewDir = path.join(tmpDir, 'task-log-fallback');
      const result = await runPlanPageFlow(url, 'test', 'claude', 'task-11', previewDir);

      const fallbackLog = result.logs.find(l => l.includes('falling back'));
      assert.ok(fallbackLog, 'Should have a fallback log message');
      assert.ok(fallbackLog!.includes('Plan call failed'), `Should mention plan failure, got: ${fallbackLog}`);

      const singlePageLog = result.logs.find(l => l.includes('single-page mode'));
      assert.ok(singlePageLog, 'Should log single-page mode call');
    } finally {
      server.close();
    }
  });
});

// ── Test Plan Item 4: last_diff data format matches frontend parseDiff ──────
// These tests replicate the exact setTaskDiff payloads from index.ts and
// verify they can be parsed by the frontend's parseDiff() function.

interface PageData { name: string; filename: string; html: string }

/** Mirrors the frontend's parseDiff() from apps/web/app/building/[id]/page.tsx */
function parseDiff(raw: string): PageData[] {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const pages = JSON.parse(trimmed) as PageData[];
      if (Array.isArray(pages) && pages.length > 0 && pages[0].html) return pages;
    } catch {}
  }
  let html = trimmed;
  if (!html.startsWith('<!DOCTYPE') && html.includes('+<!DOCTYPE')) {
    html = html.split('\n')
      .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
      .map((l) => l.slice(1)).join('\n');
  }
  if (!html.trim()) return [];
  return [{ name: 'Preview', filename: 'index.html', html }];
}

/**
 * Mirrors the multi-page setTaskDiff logic from index.ts (lines 589-595):
 * Reads HTML files from disk and builds {name, filename, html} array.
 */
function buildMultiPageDiffPayload(
  plan: { name: string; description: string }[],
  previewDir: string,
): string {
  const pagesArray = plan.map((p) => {
    const safeName = p.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const html = fs.readFileSync(path.join(previewDir, `${safeName}.html`), 'utf-8');
    return { name: p.name, filename: `${safeName}.html`, html };
  });
  return JSON.stringify(pagesArray);
}

describe('last_diff payload for single-page (frontend parseDiff compat)', () => {
  it('single-page raw HTML is parseable by frontend parseDiff', () => {
    // Simulate what index.ts does: data.diff is the raw HTML from the Edge Function
    const singlePageHtml = '<!DOCTYPE html><html><body><h1>Hello</h1></body></html>';

    // index.ts passes data.diff directly to setTaskDiff
    const lastDiff = singlePageHtml;

    // Frontend parses it
    const pages = parseDiff(lastDiff);
    assert.strictEqual(pages.length, 1, 'Should produce one page');
    assert.strictEqual(pages[0].filename, 'index.html');
    assert.strictEqual(pages[0].html, singlePageHtml, 'HTML content should be preserved exactly');
  });

  it('single-page HTML without DOCTYPE is still parseable', () => {
    const html = '<html><body><p>No doctype</p></body></html>';
    const pages = parseDiff(html);
    assert.strictEqual(pages.length, 1);
    assert.strictEqual(pages[0].html, html);
  });
});

describe('last_diff payload for multi-page (frontend parseDiff compat)', () => {
  it('multi-page JSON array from setTaskDiff is parseable by frontend parseDiff', () => {
    // Simulate the multi-page flow from index.ts
    const plan = [
      { name: 'index', title: 'Home', description: 'Home page' },
      { name: 'about', title: 'About', description: 'About page' },
      { name: 'pricing', title: 'Pricing', description: 'Pricing page' },
    ];

    const previewDir = path.join(tmpDir, 'task-multi-diff');
    fs.mkdirSync(previewDir, { recursive: true });

    // Write HTML files as the page loop in index.ts does
    const htmlContent: Record<string, string> = {
      index: '<!DOCTYPE html><html><body><h1>Home</h1></body></html>',
      about: '<!DOCTYPE html><html><body><h1>About</h1></body></html>',
      pricing: '<!DOCTYPE html><html><body><h1>Pricing</h1></body></html>',
    };
    for (const p of plan) {
      fs.writeFileSync(path.join(previewDir, `${p.name}.html`), htmlContent[p.name]);
    }

    // Build the payload exactly as index.ts does
    const lastDiff = buildMultiPageDiffPayload(plan, previewDir);

    // Frontend parses it
    const pages = parseDiff(lastDiff);
    assert.strictEqual(pages.length, 3, 'Should produce 3 pages');

    // Verify each page has the correct shape
    for (const page of pages) {
      assert.ok(page.name, 'Each page should have a name');
      assert.ok(page.filename, 'Each page should have a filename');
      assert.ok(page.html, 'Each page should have html');
      assert.ok(page.filename.endsWith('.html'), 'Filename should end with .html');
    }

    // Verify specific pages
    assert.strictEqual(pages[0].name, 'index');
    assert.strictEqual(pages[0].filename, 'index.html');
    assert.strictEqual(pages[0].html, htmlContent['index']);

    assert.strictEqual(pages[1].name, 'about');
    assert.strictEqual(pages[1].filename, 'about.html');
    assert.strictEqual(pages[1].html, htmlContent['about']);

    assert.strictEqual(pages[2].name, 'pricing');
    assert.strictEqual(pages[2].filename, 'pricing.html');
    assert.strictEqual(pages[2].html, htmlContent['pricing']);
  });

  it('multi-page payload with special characters in names is parseable', () => {
    const plan = [
      { name: 'My Cool Page!', title: 'My Cool Page', description: 'A page with special chars' },
      { name: 'page-2', title: 'Page 2', description: 'Second page' },
    ];

    const previewDir = path.join(tmpDir, 'task-special');
    fs.mkdirSync(previewDir, { recursive: true });

    fs.writeFileSync(path.join(previewDir, 'My_Cool_Page_.html'), '<html><body>Cool</body></html>');
    fs.writeFileSync(path.join(previewDir, 'page-2.html'), '<html><body>Page 2</body></html>');

    const lastDiff = buildMultiPageDiffPayload(plan, previewDir);
    const pages = parseDiff(lastDiff);

    assert.strictEqual(pages.length, 2);
    assert.strictEqual(pages[0].name, 'My Cool Page!', 'Original name is preserved');
    assert.strictEqual(pages[0].filename, 'My_Cool_Page_.html', 'Filename is sanitized');
    assert.strictEqual(pages[1].name, 'page-2');
    assert.strictEqual(pages[1].filename, 'page-2.html');
  });

  it('round-trip: JSON.stringify → parseDiff produces valid blob-ready pages', () => {
    // This test verifies the full round-trip from API to frontend
    const pagesArray = [
      { name: 'home', filename: 'home.html', html: '<!DOCTYPE html><html><body>Home</body></html>' },
      { name: 'contact', filename: 'contact.html', html: '<!DOCTYPE html><html><body>Contact</body></html>' },
    ];
    const serialized = JSON.stringify(pagesArray);

    const parsed = parseDiff(serialized);
    assert.strictEqual(parsed.length, 2);

    // Verify the frontend can use these to build blob URLs
    for (const page of parsed) {
      assert.ok(typeof page.html === 'string', 'html should be a string');
      assert.ok(page.html.length > 0, 'html should not be empty');
      assert.ok(typeof page.filename === 'string', 'filename should be a string');
    }
  });
});

describe('No preview available guard', () => {
  it('empty string produces no pages (frontend shows "No preview available")', () => {
    const pages = parseDiff('');
    assert.strictEqual(pages.length, 0, 'Empty diff should produce no pages');
  });

  it('whitespace-only string produces no pages', () => {
    const pages = parseDiff('   \n\t  ');
    assert.strictEqual(pages.length, 0, 'Whitespace diff should produce no pages');
  });

  it('non-empty HTML produces pages (frontend shows preview)', () => {
    const pages = parseDiff('<h1>Hello</h1>');
    assert.strictEqual(pages.length, 1, 'Non-empty HTML should produce a page');
    assert.ok(pages[0].html.includes('<h1>Hello</h1>'));
  });
});
