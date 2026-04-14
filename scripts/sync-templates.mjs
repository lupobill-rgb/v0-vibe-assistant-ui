#!/usr/bin/env node
// Sync packages/templates/*.html back into skill_registry.html_skeleton.
//
// Rules:
//   - UPDATE only, never INSERT. Rows are created through the skill
//     creation flow — this script just refreshes their html_skeleton.
//   - If a file's skill_name doesn't exist in skill_registry, warn and skip.
//   - Idempotent — safe to run on every deploy.
//   - Updates html_skeleton and updated_at only. Never touches
//     sample_data, content, or any other column.
//
// Usage: npm run sync-templates
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY at repo root .env.

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

async function rowExists(skillName) {
  const url = `${SUPABASE_URL}/rest/v1/skill_registry?skill_name=eq.${encodeURIComponent(skillName)}&select=skill_name`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`lookup ${skillName} failed: ${res.status}`);
  const rows = await res.json();
  return rows.length > 0;
}

async function updateSkeleton(skillName, html) {
  const url = `${SUPABASE_URL}/rest/v1/skill_registry?skill_name=eq.${encodeURIComponent(skillName)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ html_skeleton: html, updated_at: new Date().toISOString() }),
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
  let errors = 0;

  for (const file of files) {
    const skillName = path.basename(file, '.html');
    const html = fs.readFileSync(path.join(templatesDir, file), 'utf8');
    try {
      const exists = await rowExists(skillName);
      if (!exists) {
        console.log(`SKIP ${skillName}: not found in skill_registry`);
        skipped++;
        continue;
      }
      await updateSkeleton(skillName, html);
      console.log(`✓ ${skillName} (${html.length} bytes)`);
      updated++;
    } catch (err) {
      console.error(`✗ ${skillName}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} errors=${errors} total=${files.length}`);
  if (errors > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
