#!/usr/bin/env npx tsx
/**
 * validate-templates.ts — Template integrity validation
 *
 * Verifies that golden templates in skill_registry are:
 * 1. Present and active for all expected departments
 * 2. Have non-empty content with required sections
 * 3. Match sample prompts correctly via the matching algorithm
 *
 * Run: npx tsx scripts/validate-templates.ts
 *
 * Exit code 0 = all checks pass, 1 = failures found.
 * Run this before merging any PR that touches:
 *   - apps/api/src/kernel/context-injector.ts (matching algorithm)
 *   - supabase/migrations/*skill_registry* or *templates* (template content)
 *   - apps/api/src/starter-site.ts (quality validation)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ptaqytvztkhjpuawdxng.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Expected template coverage ──────────────────────────────────────
// Every department MUST have at least this many active templates.
const EXPECTED_COVERAGE: Record<string, number> = {
  sales: 3,
  marketing: 3,
  finance: 3,
  hr: 3,
  engineering: 2,
  product: 2,
  support: 2,
  legal: 2,
  admin: 2,       // executive
  operations: 2,
  design: 1,
  data: 2,
  general: 2,     // cross-functional
};

// ── Required content sections ───────────────────────────────────────
// Every template content field must contain these patterns.
const REQUIRED_PATTERNS = [
  { name: 'KPI section', pattern: /kpi|stat card|metric/i },
  { name: 'Chart reference', pattern: /chart\.js|chart|canvas/i },
  { name: 'Table reference', pattern: /table|columns/i },
  { name: 'Chart.js CDN mandate', pattern: /cdn\.jsdelivr\.net\/npm\/chart\.js/i },
];

// ── Sample prompt matching tests ────────────────────────────────────
// Each test verifies that a prompt matches a template from the expected department.
const MATCH_TESTS = [
  { prompt: 'sales pipeline CRM dashboard with revenue trends', expectDept: 'sales' },
  { prompt: 'marketing campaign ROI attribution dashboard', expectDept: 'marketing' },
  { prompt: 'budget allocation expense tracking finance', expectDept: 'finance' },
  { prompt: 'headcount attrition hiring pipeline HR', expectDept: 'hr' },
  { prompt: 'sprint velocity burndown engineering agile', expectDept: 'engineering' },
  { prompt: 'feature adoption retention product analytics', expectDept: 'product' },
  { prompt: 'support tickets resolution CSAT help desk', expectDept: 'support' },
  { prompt: 'contract compliance legal dashboard matters', expectDept: 'legal' },
  { prompt: 'patient outcomes readmission healthcare clinical', expectDept: 'general' }, // industry = general team_function
  { prompt: 'MRR churn retention SaaS subscription metrics', expectDept: 'general' },
];

// ── Stop words (must match context-injector.ts) ─────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'she', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some',
  'any', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'about', 'above', 'after', 'again', 'also', 'as', 'because',
  'before', 'between', 'if', 'into', 'over', 'then', 'there', 'under',
  'up', 'out', 'use', 'using', 'show', 'build', 'create', 'make', 'get',
]);

function tokenizeKeywords(text: string): Set<string> {
  const all = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(all.filter(t => t.length > 2 && !STOP_WORDS.has(t)));
}

function matchScore(
  promptKeywords: Set<string>,
  descKeywords: Set<string>,
): { score: number; overlap: number } {
  let overlap = 0;
  for (const token of Array.from(descKeywords)) {
    if (promptKeywords.has(token)) overlap++;
  }
  const forward = descKeywords.size > 0 ? overlap / descKeywords.size : 0;
  let reverseOverlap = 0;
  for (const token of Array.from(promptKeywords)) {
    if (descKeywords.has(token)) reverseOverlap++;
  }
  const reverse = promptKeywords.size > 0 ? reverseOverlap / promptKeywords.size : 0;
  return { score: Math.max(forward, reverse), overlap };
}

async function main() {
  let failures = 0;

  // ── 1. Fetch all active templates ─────────────────────────────────
  const { data: templates, error } = await supabase
    .from('skill_registry')
    .select('skill_name, team_function, description, content, plugin_name')
    .eq('is_active', true);

  if (error) {
    console.error(`FAIL: Could not query skill_registry: ${error.message}`);
    process.exit(1);
  }

  console.log(`Found ${templates.length} active templates in skill_registry\n`);

  // ── 2. Department coverage check ──────────────────────────────────
  console.log('=== Department Coverage ===\n');
  const deptCounts: Record<string, number> = {};
  for (const t of templates) {
    const dept = t.team_function ?? 'unknown';
    deptCounts[dept] = (deptCounts[dept] ?? 0) + 1;
  }

  for (const [dept, expected] of Object.entries(EXPECTED_COVERAGE)) {
    const actual = deptCounts[dept] ?? 0;
    if (actual >= expected) {
      console.log(`  OK    ${dept}: ${actual} templates (need >=${expected})`);
    } else {
      console.error(`  FAIL  ${dept}: ${actual} templates (need >=${expected})`);
      failures++;
    }
  }

  // ── 3. Content integrity check ────────────────────────────────────
  console.log('\n=== Content Integrity ===\n');
  for (const t of templates) {
    const content = t.content ?? '';
    if (content.length < 100) {
      console.error(`  FAIL  ${t.skill_name}: content too short (${content.length} chars)`);
      failures++;
      continue;
    }
    for (const { name, pattern } of REQUIRED_PATTERNS) {
      if (!pattern.test(content)) {
        console.error(`  FAIL  ${t.skill_name}: missing ${name}`);
        failures++;
      }
    }
  }
  console.log(`  Checked ${templates.length} templates for required patterns`);

  // ── 4. Matching algorithm test ────────────────────────────────────
  console.log('\n=== Prompt Matching ===\n');
  for (const test of MATCH_TESTS) {
    const promptKeywords = tokenizeKeywords(test.prompt);
    let bestScore = 0;
    let bestOverlap = 0;
    let bestMatch: typeof templates[0] | null = null;

    for (const t of templates) {
      const descKeywords = tokenizeKeywords(`${t.skill_name} ${t.description ?? ''}`);
      const { score, overlap } = matchScore(promptKeywords, descKeywords);
      if (score > bestScore || (score === bestScore && overlap > bestOverlap)) {
        bestScore = score;
        bestOverlap = overlap;
        bestMatch = t;
      }
    }

    const matched = bestScore >= 0.25 && bestOverlap >= 3 && bestMatch;
    const matchedDept = bestMatch?.team_function ?? 'none';
    const shortPrompt = test.prompt.slice(0, 50);

    if (matched && matchedDept === test.expectDept) {
      console.log(`  OK    "${shortPrompt}..." → ${bestMatch!.skill_name} (${matchedDept})`);
    } else if (!matched) {
      console.error(`  FAIL  "${shortPrompt}..." → no match (expected ${test.expectDept})`);
      failures++;
    } else {
      console.error(`  FAIL  "${shortPrompt}..." → ${bestMatch!.skill_name} (${matchedDept}, expected ${test.expectDept})`);
      failures++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────
  console.log(`\n=== Summary ===`);
  console.log(`Templates: ${templates.length}`);
  console.log(`Departments: ${Object.keys(deptCounts).length}`);
  console.log(`Failures: ${failures}`);

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  } else {
    console.log('\nAll checks passed.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
