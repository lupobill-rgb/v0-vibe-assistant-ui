import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';

const TEST_PREVIEWS_DIR = `/tmp/vibe-test-previews-${Date.now()}`;
const TEST_REPOS_DIR = `/tmp/vibe-test-repos-${Date.now()}`;
const TEST_PUBLISHED_DIR = `/tmp/vibe-test-published-${Date.now()}`;
const TEST_DB_PATH = `/tmp/vibe-test-${Date.now()}.db`;
const TEST_TENANT = 'test-tenant-job';
const API_PORT = 3099;

// ── Mock Edge Function server ───────────────────────────────────────────────

const MOCK_DIFF = `--- a/index.html
+++ b/index.html
@@ -1,3 +1,4 @@
 <html>
+<head><title>Hello</title></head>
 <body>
-<p>old</p>
+<p>new</p>
 </body>
 </html>`;

let mockEdgeServer: http.Server;
let mockEdgePort: number;

function startMockEdgeFunction(): Promise<number> {
  return new Promise((resolve) => {
    mockEdgeServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        diff: MOCK_DIFF,
        usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 },
      }));
    });
    mockEdgeServer.listen(0, () => {
      const addr = mockEdgeServer.address() as { port: number };
      mockEdgePort = addr.port;
      resolve(mockEdgePort);
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      method,
      hostname: '127.0.0.1',
      port: API_PORT,
      path: urlPath,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TEST_TENANT,
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed: any;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode!, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForTerminal(taskId: string, timeoutMs = 20000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { body } = await httpRequest('GET', `/jobs/${taskId}`);
    if (body.execution_state === 'completed' || body.execution_state === 'failed') {
      return body;
    }
    await sleep(500);
  }
  throw new Error(`Task ${taskId} did not reach terminal state within ${timeoutMs}ms`);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /jobs — async job processing + preview generation', () => {
  let apiProc: ChildProcess;
  let projectId: string;

  before(async () => {
    // 1. Start mock Edge Function
    await startMockEdgeFunction();

    // 2. Prep temp dirs
    fs.mkdirSync(TEST_PREVIEWS_DIR, { recursive: true });
    fs.mkdirSync(TEST_REPOS_DIR, { recursive: true });
    fs.mkdirSync(TEST_PUBLISHED_DIR, { recursive: true });

    // 3. Start API server via npx tsx from the api directory
    //    (so tsconfig.json with experimentalDecorators is picked up)
    const apiDir = path.resolve(__dirname, '..');
    apiProc = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: apiDir,
      env: {
        ...process.env,
        API_PORT: String(API_PORT),
        DATABASE_PATH: TEST_DB_PATH,
        PREVIEWS_DIR: TEST_PREVIEWS_DIR,
        REPOS_BASE_DIR: TEST_REPOS_DIR,
        PUBLISHED_DIR: TEST_PUBLISHED_DIR,
        SUPABASE_ANON_KEY: 'test-mock-key',
        SUPABASE_URL: `http://127.0.0.1:${mockEdgePort}`,
        NODE_ENV: 'test',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Collect stdout/stderr for debugging
    let serverOutput = '';
    apiProc.stdout?.on('data', (d) => { serverOutput += d.toString(); });
    apiProc.stderr?.on('data', (d) => { serverOutput += d.toString(); });

    // 4. Wait for server to respond on /health
    const healthStart = Date.now();
    let ready = false;
    while (Date.now() - healthStart < 20000) {
      try {
        const { status } = await httpRequest('GET', '/health');
        if (status === 200) { ready = true; break; }
      } catch { /* not up yet */ }
      await sleep(500);
    }
    if (!ready) {
      throw new Error(`API server failed to start within 20s. Output:\n${serverOutput}`);
    }

    // 5. Create a test project
    const projRes = await httpRequest('POST', '/projects', {
      name: `test-proj-${Date.now()}`,
    });
    assert.strictEqual(projRes.status, 201,
      `Expected 201 for project creation, got ${projRes.status}: ${JSON.stringify(projRes.body)}`);
    projectId = projRes.body.id;
  });

  after(() => {
    apiProc?.kill('SIGTERM');
    mockEdgeServer?.close();
    // Clean up temp files
    try { fs.rmSync(TEST_PREVIEWS_DIR, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(TEST_REPOS_DIR, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(TEST_PUBLISHED_DIR, { recursive: true, force: true }); } catch {}
    try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  });

  it('returns 201 immediately with task_id and queued status', async () => {
    const res = await httpRequest('POST', '/jobs', {
      prompt: 'Add a title tag',
      project_id: projectId,
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.task_id, 'response should include task_id');
    assert.strictEqual(res.body.status, 'queued');
  });

  it('transitions through calling_llm → completed and generates HTML preview', async () => {
    const createRes = await httpRequest('POST', '/jobs', {
      prompt: 'Add a title tag to index.html',
      project_id: projectId,
    });
    assert.strictEqual(createRes.status, 201);
    const taskId = createRes.body.task_id;

    // Wait for async processing to finish
    const finalTask = await waitForTerminal(taskId);

    // ── Verify terminal state ──
    assert.strictEqual(finalTask.execution_state, 'completed',
      `Expected completed but got ${finalTask.execution_state}`);

    // ── Verify preview URL is set ──
    assert.ok(finalTask.preview_url, 'preview_url should be set on the task');
    assert.strictEqual(finalTask.preview_url, `/previews/${taskId}/index.html`);

    // ── Verify the HTML file was written to disk ──
    const previewPath = path.join(TEST_PREVIEWS_DIR, taskId, 'index.html');
    assert.ok(fs.existsSync(previewPath), `Preview file should exist at ${previewPath}`);

    // ── Verify HTML content ──
    const html = fs.readFileSync(previewPath, 'utf-8');
    assert.ok(html.includes('<!DOCTYPE html>'), 'Preview should be valid HTML');
    assert.ok(html.includes('Diff Preview'), 'Preview should contain heading');
    assert.ok(html.includes('diff-add'), 'Preview should style added lines');
    assert.ok(html.includes('diff-del'), 'Preview should style deleted lines');
    assert.ok(html.includes('diff-hunk'), 'Preview should style hunk headers');
    assert.ok(html.includes('&lt;title&gt;Hello&lt;/title&gt;'),
      'HTML entities should be escaped in the diff');
  });

  it('stores the diff and usage metrics in the database', async () => {
    const createRes = await httpRequest('POST', '/jobs', {
      prompt: 'Store diff test',
      project_id: projectId,
    });
    const taskId = createRes.body.task_id;
    await waitForTerminal(taskId);

    // Verify diff is retrievable
    const diffRes = await httpRequest('GET', `/jobs/${taskId}/diff`);
    assert.strictEqual(diffRes.status, 200);
    assert.ok(diffRes.body.diff, 'diff should be returned');
    assert.ok(diffRes.body.diff.includes('--- a/index.html'),
      'diff should contain the mock diff content');
    assert.ok(diffRes.body.diff.includes('+<head><title>Hello</title></head>'),
      'diff should contain the added line');
  });

  it('handles Edge Function failure gracefully', async () => {
    // Temporarily break the mock server
    mockEdgeServer.close();

    const createRes = await httpRequest('POST', '/jobs', {
      prompt: 'This should fail',
      project_id: projectId,
    });
    assert.strictEqual(createRes.status, 201);
    const taskId = createRes.body.task_id;

    const finalTask = await waitForTerminal(taskId);
    assert.strictEqual(finalTask.execution_state, 'failed',
      'Task should be marked as failed when Edge Function is unreachable');

    // Restart mock for any subsequent tests
    await startMockEdgeFunction();
  });
});
