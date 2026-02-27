import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Unit tests for the multi-page preview logic in POST /jobs.
 *
 * These test the three PR test-plan items by exercising the same parsing
 * and file-writing logic that lives inside the fire-and-forget block of
 * POST /jobs without needing a running server or Supabase.
 */

// ── Extracted helpers (mirror the logic in index.ts) ─────────────────────────

/** Parse an Edge Function response body, throwing descriptive errors. */
function parseEdgeFunctionResponse(
  rawText: string,
  httpStatus: number,
  taskId: string,
): { diff: string; usage: { total_tokens: number } } {
  if (httpStatus < 200 || httpStatus >= 300) {
    throw new Error(rawText || `Edge Function returned ${httpStatus}`);
  }
  try {
    return JSON.parse(rawText);
  } catch {
    console.error(`Job ${taskId} — raw response (${rawText.length} chars):`, rawText.slice(0, 500));
    throw new Error(`Edge Function returned invalid JSON (${rawText.length} chars)`);
  }
}

/** Given a diff string, produce the pages array and write files + manifest. */
function writePreviewFiles(
  diff: string,
  previewDir: string,
): { pages: { name: string; html: string }[]; manifestPath: string } {
  fs.mkdirSync(previewDir, { recursive: true });

  let pages: { name: string; html: string }[];
  try {
    const parsed = JSON.parse(diff);
    pages = Array.isArray(parsed) ? parsed : [{ name: 'index', html: diff }];
  } catch {
    pages = [{ name: 'index', html: diff }];
  }

  for (const page of pages) {
    const safeName = page.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    fs.writeFileSync(path.join(previewDir, `${safeName}.html`), page.html);
  }

  const manifestPath = path.join(previewDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(pages.map(p => p.name)));

  return { pages, manifestPath };
}

// ── Tests ────────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-mp-test-'));
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

// ── Test Plan Item 1: Multi-page output → separate HTML files + manifest ────

describe('Multi-page preview output', () => {
  it('writes separate HTML files and manifest.json for a JSON array response', () => {
    const multiPageDiff = JSON.stringify([
      { name: 'index', html: '<html><body><h1>Home</h1></body></html>' },
      { name: 'about', html: '<html><body><h1>About</h1></body></html>' },
      { name: 'contact', html: '<html><body><h1>Contact</h1></body></html>' },
    ]);

    const previewDir = path.join(tmpDir, 'task-multi');
    const { pages, manifestPath } = writePreviewFiles(multiPageDiff, previewDir);

    // Verify 3 pages returned
    assert.strictEqual(pages.length, 3, 'Should have 3 pages');

    // Verify individual HTML files
    assert.ok(fs.existsSync(path.join(previewDir, 'index.html')), 'index.html exists');
    assert.ok(fs.existsSync(path.join(previewDir, 'about.html')), 'about.html exists');
    assert.ok(fs.existsSync(path.join(previewDir, 'contact.html')), 'contact.html exists');

    // Verify content
    assert.ok(
      fs.readFileSync(path.join(previewDir, 'index.html'), 'utf-8').includes('<h1>Home</h1>'),
      'index.html has correct content',
    );
    assert.ok(
      fs.readFileSync(path.join(previewDir, 'about.html'), 'utf-8').includes('<h1>About</h1>'),
      'about.html has correct content',
    );
    assert.ok(
      fs.readFileSync(path.join(previewDir, 'contact.html'), 'utf-8').includes('<h1>Contact</h1>'),
      'contact.html has correct content',
    );

    // Verify manifest.json
    assert.ok(fs.existsSync(manifestPath), 'manifest.json exists');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.deepStrictEqual(manifest, ['index', 'about', 'contact']);
  });

  it('sanitizes page names to prevent path traversal', () => {
    const nastyDiff = JSON.stringify([
      { name: '../../../etc/passwd', html: 'hacked' },
      { name: 'good-page', html: '<p>safe</p>' },
    ]);

    const previewDir = path.join(tmpDir, 'task-sanitize');
    writePreviewFiles(nastyDiff, previewDir);

    // The dangerous name should be sanitized to underscores
    assert.ok(
      fs.existsSync(path.join(previewDir, '_________etc_passwd.html')),
      'Dangerous name should be sanitized to underscores',
    );
    assert.ok(
      fs.existsSync(path.join(previewDir, 'good-page.html')),
      'Safe name should remain unchanged',
    );

    // No file should escape the preview directory
    assert.ok(
      !fs.existsSync(path.join(tmpDir, 'etc')),
      'No directory traversal should occur',
    );
  });
});

// ── Test Plan Item 2: Single-page (plain HTML) fallback ─────────────────────

describe('Single-page (plain HTML) fallback', () => {
  it('writes a single index.html when diff is plain HTML (not JSON)', () => {
    const plainHtml = '<html><body><h1>Single Page App</h1></body></html>';

    const previewDir = path.join(tmpDir, 'task-single');
    const { pages, manifestPath } = writePreviewFiles(plainHtml, previewDir);

    // Should fall back to single page
    assert.strictEqual(pages.length, 1, 'Should have 1 page');
    assert.strictEqual(pages[0].name, 'index');

    // Verify file
    const indexPath = path.join(previewDir, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'index.html exists');
    assert.strictEqual(
      fs.readFileSync(indexPath, 'utf-8'),
      plainHtml,
      'index.html should contain the raw HTML',
    );

    // Verify manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.deepStrictEqual(manifest, ['index']);
  });

  it('falls back to single page when diff is a JSON object (not array)', () => {
    const jsonObject = JSON.stringify({ key: 'value' });

    const previewDir = path.join(tmpDir, 'task-object');
    const { pages } = writePreviewFiles(jsonObject, previewDir);

    // Non-array JSON should fall back to single page with raw content
    assert.strictEqual(pages.length, 1);
    assert.strictEqual(pages[0].name, 'index');
    assert.strictEqual(pages[0].html, jsonObject);
  });
});

// ── Test Plan Item 3: Error messages ────────────────────────────────────────

describe('Edge Function error handling', () => {
  it('throws with the server error text for non-200 responses', () => {
    assert.throws(
      () => parseEdgeFunctionResponse('Internal Server Error: LLM rate limited', 500, 'task-err1'),
      (err: Error) => {
        assert.ok(
          err.message.includes('LLM rate limited'),
          `Error should contain server text, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it('throws with status code when response body is empty', () => {
    assert.throws(
      () => parseEdgeFunctionResponse('', 502, 'task-err2'),
      (err: Error) => {
        assert.ok(
          err.message.includes('502'),
          `Error should contain status code, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it('throws descriptive error for invalid JSON response', () => {
    const garbage = 'this is not json at all <html>broken';
    assert.throws(
      () => parseEdgeFunctionResponse(garbage, 200, 'task-err3'),
      (err: Error) => {
        assert.ok(
          err.message.includes('invalid JSON'),
          `Error should mention invalid JSON, got: ${err.message}`,
        );
        assert.ok(
          err.message.includes(String(garbage.length)),
          `Error should include response length, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  it('successfully parses valid JSON response', () => {
    const validResponse = JSON.stringify({
      diff: '<html>hello</html>',
      usage: { total_tokens: 500 },
    });
    const data = parseEdgeFunctionResponse(validResponse, 200, 'task-ok');
    assert.strictEqual(data.diff, '<html>hello</html>');
    assert.strictEqual(data.usage.total_tokens, 500);
  });
});
