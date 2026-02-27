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

type PlanPage = { name: string; description: string };

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
    if (Array.isArray(planData.pages) && planData.pages.length > 0) {
      plan = planData.pages;
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
    // ── Step 2: Page loop ──
    for (let i = 0; i < plan.length; i++) {
      const page = plan[i];
      const safeName = page.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      log(`Building page ${i + 1} of ${plan.length}: ${page.name}...`);

      const pageResponse = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: page.description, model, mode: 'page' }),
      });
      const pageRawText = await pageResponse.text();
      if (!pageResponse.ok) throw new Error(`Page "${page.name}" call returned ${pageResponse.status}: ${pageRawText.slice(0, 200)}`);

      let pageData: { diff: string; usage: { total_tokens: number } };
      try {
        pageData = JSON.parse(pageRawText);
      } catch {
        throw new Error(`Page "${page.name}" returned invalid JSON (${pageRawText.length} chars)`);
      }

      if (pageData.usage?.total_tokens) totalTokens += pageData.usage.total_tokens;

      fs.writeFileSync(path.join(previewDir, `${safeName}.html`), pageData.diff);
      pageNames.push(page.name);
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
            pages: [
              { name: 'index', description: 'Build the homepage with hero section' },
              { name: 'about', description: 'Build the about page' },
              { name: 'pricing', description: 'Build the pricing page with tiers' },
            ],
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
            pages: [
              { name: '../../../etc/passwd', description: 'evil page' },
              { name: 'good-page', description: 'safe page' },
            ],
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

  it('sends mode:page with page description as prompt for each page', async () => {
    const receivedRequests: any[] = [];

    const { server, url } = await createMockServer((body) => {
      receivedRequests.push(body);
      if (body.mode === 'plan') {
        return {
          status: 200,
          json: {
            pages: [
              { name: 'home', description: 'Build homepage with navigation' },
              { name: 'contact', description: 'Build contact form page' },
            ],
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
        // Return valid HTTP 200 but with a pages field that's not an array
        return { status: 200, json: { pages: 'not-an-array', usage: { total_tokens: 10 } } };
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
        return { status: 200, json: { pages: [], usage: { total_tokens: 10 } } };
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
            pages: [{ name: 'index', description: 'home' }],
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
            pages: [
              { name: 'home', description: 'homepage' },
              { name: 'pricing', description: 'pricing page' },
              { name: 'faq', description: 'faq page' },
            ],
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
            pages: [
              { name: 'index', description: 'home' },
              { name: 'about', description: 'about' },
              { name: 'contact', description: 'contact' },
            ],
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
            pages: [{ name: 'index', description: 'home' }, { name: 'about', description: 'about' }],
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
