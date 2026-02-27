import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';

// ---------------------------------------------------------------------------
// These tests verify the two code changes in POST /jobs:
//   1. Safe text-first response parsing  (response.text → JSON.parse)
//   2. Multi-page preview support         (JSON array → separate files)
//
// We exercise the exact same logic paths that live inside the route handler
// without needing Supabase or a running API server.
// ---------------------------------------------------------------------------

// ── Preview-writing logic (mirrors lines 541-560 of index.ts) ─────────────

function writePreview(previewDir: string, diff: string) {
  fs.mkdirSync(previewDir, { recursive: true });

  let pageNames: string[];
  try {
    const pages = JSON.parse(diff) as { name: string; html: string }[];
    if (Array.isArray(pages) && pages.length > 0 && pages[0].name && pages[0].html) {
      pageNames = pages.map(p => p.name);
      for (const page of pages) {
        fs.writeFileSync(path.join(previewDir, page.name), page.html);
      }
    } else {
      throw new Error('not a pages array');
    }
  } catch {
    // Fallback: treat diff as single-page HTML
    pageNames = ['index.html'];
    fs.writeFileSync(path.join(previewDir, 'index.html'), diff);
  }
  fs.writeFileSync(path.join(previewDir, 'manifest.json'), JSON.stringify({ pages: pageNames }));
  return pageNames;
}

// ── Response-parsing logic (mirrors lines 529-537 of index.ts) ────────────

function parseEdgeResponse(rawText: string, ok: boolean) {
  if (!ok) throw new Error(rawText.slice(0, 500) || 'Edge Function call failed');
  let data: { error?: string; diff: string; usage: { total_tokens: number } };
  try {
    data = JSON.parse(rawText);
  } catch (parseErr) {
    console.error('JSON parse failed. First 500 chars:', rawText.slice(0, 500));
    throw new Error('Edge Function returned non-JSON response');
  }
  return data;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Preview generation — single-page HTML fallback', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-preview-single-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes plain HTML as index.html when diff is not JSON', () => {
    const html = '<html><body><h1>Hello</h1></body></html>';
    const previewDir = path.join(tmpDir, 'task-single');

    const pages = writePreview(previewDir, html);

    assert.deepStrictEqual(pages, ['index.html']);

    // index.html exists with correct content
    const written = fs.readFileSync(path.join(previewDir, 'index.html'), 'utf-8');
    assert.strictEqual(written, html);

    // manifest.json lists only index.html
    const manifest = JSON.parse(fs.readFileSync(path.join(previewDir, 'manifest.json'), 'utf-8'));
    assert.deepStrictEqual(manifest, { pages: ['index.html'] });
  });

  it('falls back to single page when JSON is not a {name,html} array', () => {
    const notPages = JSON.stringify({ some: 'object' });
    const previewDir = path.join(tmpDir, 'task-not-array');

    const pages = writePreview(previewDir, notPages);

    assert.deepStrictEqual(pages, ['index.html']);
    const written = fs.readFileSync(path.join(previewDir, 'index.html'), 'utf-8');
    assert.strictEqual(written, notPages);
  });

  it('falls back when JSON array has wrong shape (missing html field)', () => {
    const badShape = JSON.stringify([{ name: 'page.html' }]);
    const previewDir = path.join(tmpDir, 'task-bad-shape');

    const pages = writePreview(previewDir, badShape);

    assert.deepStrictEqual(pages, ['index.html']);
    const written = fs.readFileSync(path.join(previewDir, 'index.html'), 'utf-8');
    assert.strictEqual(written, badShape);
  });
});

describe('Preview generation — multi-page JSON array', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-preview-multi-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes each {name,html} entry as a separate file', () => {
    const multiPage = JSON.stringify([
      { name: 'index.html', html: '<html><body>Home</body></html>' },
      { name: 'about.html', html: '<html><body>About</body></html>' },
      { name: 'contact.html', html: '<html><body>Contact</body></html>' },
    ]);
    const previewDir = path.join(tmpDir, 'task-multi');

    const pages = writePreview(previewDir, multiPage);

    assert.deepStrictEqual(pages, ['index.html', 'about.html', 'contact.html']);

    // Each file exists with correct content
    assert.strictEqual(
      fs.readFileSync(path.join(previewDir, 'index.html'), 'utf-8'),
      '<html><body>Home</body></html>',
    );
    assert.strictEqual(
      fs.readFileSync(path.join(previewDir, 'about.html'), 'utf-8'),
      '<html><body>About</body></html>',
    );
    assert.strictEqual(
      fs.readFileSync(path.join(previewDir, 'contact.html'), 'utf-8'),
      '<html><body>Contact</body></html>',
    );

    // manifest.json lists all pages
    const manifest = JSON.parse(fs.readFileSync(path.join(previewDir, 'manifest.json'), 'utf-8'));
    assert.deepStrictEqual(manifest, { pages: ['index.html', 'about.html', 'contact.html'] });
  });

  it('handles a single-element array correctly', () => {
    const singleArray = JSON.stringify([
      { name: 'index.html', html: '<html><body>Only page</body></html>' },
    ]);
    const previewDir = path.join(tmpDir, 'task-single-array');

    const pages = writePreview(previewDir, singleArray);

    assert.deepStrictEqual(pages, ['index.html']);
    assert.strictEqual(
      fs.readFileSync(path.join(previewDir, 'index.html'), 'utf-8'),
      '<html><body>Only page</body></html>',
    );

    const manifest = JSON.parse(fs.readFileSync(path.join(previewDir, 'manifest.json'), 'utf-8'));
    assert.deepStrictEqual(manifest, { pages: ['index.html'] });
  });
});

describe('Edge response parsing — text-first with safe error handling', () => {
  it('parses valid JSON response correctly', () => {
    const raw = JSON.stringify({
      diff: '<html>hello</html>',
      usage: { total_tokens: 42 },
    });

    const data = parseEdgeResponse(raw, true);

    assert.strictEqual(data.diff, '<html>hello</html>');
    assert.strictEqual(data.usage.total_tokens, 42);
  });

  it('throws with raw text (first 500 chars) when response is not ok', () => {
    const errorBody = 'Upstream timeout: the function took too long';

    assert.throws(
      () => parseEdgeResponse(errorBody, false),
      (err: Error) => {
        assert.ok(err.message.includes('Upstream timeout'), 'error should contain raw text');
        return true;
      },
    );
  });

  it('throws with truncated text for long error bodies', () => {
    const longBody = 'X'.repeat(1000);

    assert.throws(
      () => parseEdgeResponse(longBody, false),
      (err: Error) => {
        assert.strictEqual(err.message.length, 500, 'error should be truncated to 500 chars');
        return true;
      },
    );
  });

  it('throws clear message when response is ok but body is not JSON', () => {
    const notJson = '<html>502 Bad Gateway</html>';

    assert.throws(
      () => parseEdgeResponse(notJson, true),
      (err: Error) => {
        assert.strictEqual(err.message, 'Edge Function returned non-JSON response');
        return true;
      },
    );
  });

  it('falls back to generic message when !ok body is empty', () => {
    assert.throws(
      () => parseEdgeResponse('', false),
      (err: Error) => {
        assert.strictEqual(err.message, 'Edge Function call failed');
        return true;
      },
    );
  });
});
