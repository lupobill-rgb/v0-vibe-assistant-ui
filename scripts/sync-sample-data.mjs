#!/usr/bin/env node
// Sync window.__VIBE_SAMPLE__ blocks from packages/templates/*.html
// into skill_registry.sample_data.
//
// Rules (mirror sync-templates.mjs):
//   - UPDATE only, never INSERT.
//   - If a file's skill_name doesn't exist in skill_registry, warn and skip.
//   - Idempotent.
//   - Updates sample_data and updated_at only. Never touches html_skeleton,
//     content, or any other column.
//
// Usage: npm run sync-sample-data

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const templatesDir = path.join(repoRoot, 'packages', 'templates');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv(path.join(repoRoot, '.env.local'));
loadEnv(path.join(repoRoot, '.env'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// Extract the __VIBE_SAMPLE__ block from a template file and return it as
// a plain object. The block is a JS object literal (unquoted keys, single
// quotes, nested objects), so we walk braces with a small state machine
// that respects string literals. Regex isn't reliable when nested objects
// close with `};` before the outer sample object does.
function extractSample(html) {
  const anchor = html.indexOf('window.__VIBE_SAMPLE__');
  if (anchor === -1) return null;
  const eqIdx = html.indexOf('=', anchor);
  if (eqIdx === -1) return null;
  const openIdx = html.indexOf('{', eqIdx);
  if (openIdx === -1) return null;

  let depth = 0;
  let inString = null; // null | '"' | "'" | '`'
  let escaped = false;
  let end = -1;
  for (let i = openIdx; i < html.length; i++) {
    const c = html[i];
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (c === '\\') { escaped = true; continue; }
      if (c === inString) inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) throw new Error('__VIBE_SAMPLE__ block is not brace-balanced');
  const literal = html.slice(openIdx, end);
  try {
    return new Function(`return (${literal});`)();
  } catch (err) {
    throw new Error(`__VIBE_SAMPLE__ parse failed: ${err.message}`);
  }
}

async function rowExists(skillName) {
  const url = `${SUPABASE_URL}/rest/v1/skill_registry?skill_name=eq.${encodeURIComponent(skillName)}&select=skill_name`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`lookup ${skillName} failed: ${res.status}`);
  const rows = await res.json();
  return rows.length > 0;
}

async function updateSampleData(skillName, obj) {
  const url = `${SUPABASE_URL}/rest/v1/skill_registry?skill_name=eq.${encodeURIComponent(skillName)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ sample_data: obj, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`update ${skillName} failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (rows.length === 0) throw new Error(`update ${skillName}: zero rows affected`);
}

async function main() {
  if (!fs.existsSync(templatesDir)) {
    console.error(`ERROR: templates directory not found: ${templatesDir}`);
    process.exit(1);
  }
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html')).sort();
  if (files.length === 0) {
    console.log('No .html files found in packages/templates/ — nothing to sync.');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let noSample = 0;
  let errors = 0;

  for (const file of files) {
    const skillName = path.basename(file, '.html');
    const html = fs.readFileSync(path.join(templatesDir, file), 'utf8');
    try {
      const sample = extractSample(html);
      if (!sample) {
        console.log(`SKIP ${skillName}: no __VIBE_SAMPLE__ block found in file`);
        noSample++;
        continue;
      }
      const exists = await rowExists(skillName);
      if (!exists) {
        console.log(`SKIP ${skillName}: not found in skill_registry`);
        skipped++;
        continue;
      }
      await updateSampleData(skillName, sample);
      const size = JSON.stringify(sample).length;
      const keys = Object.keys(sample).join(',');
      console.log(`✓ ${skillName} (${size} bytes, keys=${keys})`);
      updated++;
    } catch (err) {
      console.error(`✗ ${skillName}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} noSample=${noSample} errors=${errors} total=${files.length}`);
  if (errors > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
