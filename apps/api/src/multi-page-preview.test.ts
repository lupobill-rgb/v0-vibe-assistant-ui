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
      { name: 'index', description: 'Home page' },
      { name: 'about', description: 'About page' },
      { name: 'pricing', description: 'Pricing page' },
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
      { name: 'My Cool Page!', description: 'A page with special chars' },
      { name: 'page-2', description: 'Second page' },
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
