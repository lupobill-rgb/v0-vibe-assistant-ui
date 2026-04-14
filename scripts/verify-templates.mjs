#!/usr/bin/env node
// Verify every packages/templates/*.html file passes the gate checks from
// CLAUDE.md. Exits non-zero if any fail.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '..', 'packages', 'templates');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();

// Domain-specific wrong-term maps. Each template MUST NOT contain terms
// from any other domain's blocklist. Ops/exec are tolerant of generic
// business terms.
const WRONG_TERMS = {
  // Finance-specific terms that should NOT appear in non-finance templates.
  finance: [/\bebitda\b/i, /\brunway\b/i, /\bgross margin\b/i, /\bburn rate\b/i, /\bcashflow\b/i, /\bP&L\b/],
};

// Each template declares which domains are ALLOWED to mention finance terms.
// Everything else is checked against the "finance" blocklist.
const FINANCE_ALLOWED = new Set([
  'finance-dashboard',
  'pnl-dashboard',
  'executive-dashboard', // exec legitimately covers financials
  'executive-command-dashboard',
  'portfolio-dashboard', // investment portfolio — uses IRR/MOIC/valuations
]);

let pass = 0, fail = 0;
const results = [];
for (const f of files) {
  const name = path.basename(f, '.html');
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  const length = html.length;
  const charts = (html.match(/new Chart\(/g) || []).length;
  const hasTryCatch = html.includes('try{') || html.includes('try {');
  const hasTeamToken = html.includes('__VIBE_TEAM_ID__');
  const hasSampleData = html.includes('window.__VIBE_SAMPLE__');
  let wrongDomainRefs = 0;
  if (!FINANCE_ALLOWED.has(name)) {
    for (const re of WRONG_TERMS.finance) {
      const m = html.match(re);
      if (m) wrongDomainRefs++;
    }
  }
  const ok =
    length > 20000 &&
    charts >= 4 &&
    hasTryCatch &&
    hasTeamToken &&
    hasSampleData &&
    wrongDomainRefs === 0;
  results.push({ name, length, charts, hasTryCatch, hasTeamToken, hasSampleData, wrongDomainRefs, ok });
  if (ok) pass++; else fail++;
}

for (const r of results) {
  const badge = r.ok ? '✓' : '✗';
  console.log(`${badge} ${r.name.padEnd(32)} len=${r.length} charts=${r.charts} try=${r.hasTryCatch} team=${r.hasTeamToken} sample=${r.hasSampleData} wrong=${r.wrongDomainRefs}`);
}
console.log(`\n${pass}/${files.length} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
