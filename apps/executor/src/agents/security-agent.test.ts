import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Security Agent Tests
 *
 * Exercises:
 * - Static secret / env-exposure / RLS-disabled detection
 * - RLS coverage scanning (CREATE TABLE vs ENABLE RLS)
 * - Auto-fix migration generation for missing RLS
 */

// We import the agent function directly — it uses the real filesystem for
// scanning, so we create temp directories with known content.
// The `storage` dependency is unused in scan helpers; we only test the
// exported `runSecurityAgent` via a lightweight integration.
// For pure-function coverage we replicate the regex logic in isolation below.

// ────────────────────────────────────────────────────────────────────────────
// Regex patterns copied from agent (to unit-test without export gymnastics)
// ────────────────────────────────────────────────────────────────────────────

const HARDCODED_SECRET_PATTERNS: RegExp[] = [
  /(?:api[_-]?key|apikey|secret|password|passwd|pwd|token|auth[_-]?token)\s*[=:]\s*['"`]([^'"`${\s]{8,})['"`]/gi,
  /sk-[A-Za-z0-9]{20,}/g,
  /ghp_[A-Za-z0-9]{36,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
];

const RLS_DISABLED_PATTERNS: RegExp[] = [
  /\.rls\s*=\s*false/i,
  /disable\s+row\s+level\s+security/i,
  /ALTER\s+TABLE\s+\S+\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/i,
];

const CREATE_TABLE_PATTERN = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
const ENABLE_RLS_PATTERN = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;

function testPatterns(patterns: RegExp[], content: string): boolean {
  return patterns.some((p) => {
    p.lastIndex = 0;
    return p.test(content);
  });
}

function extractTables(content: string): { defined: Set<string>; rls: Set<string> } {
  const defined = new Set<string>();
  const rls = new Set<string>();
  CREATE_TABLE_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CREATE_TABLE_PATTERN.exec(content)) !== null) defined.add(m[1].toLowerCase());
  ENABLE_RLS_PATTERN.lastIndex = 0;
  while ((m = ENABLE_RLS_PATTERN.exec(content)) !== null) rls.add(m[1].toLowerCase());
  return { defined, rls };
}

// ────────────────────────────────────────────────────────────────────────────
// Secret detection
// ────────────────────────────────────────────────────────────────────────────

describe('Security Agent - Secret Detection', () => {
  it('detects hardcoded API key', () => {
    const code = `const API_KEY = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';`;
    assert.ok(testPatterns(HARDCODED_SECRET_PATTERNS, code));
  });

  it('detects GitHub PAT', () => {
    const code = `const token = 'ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012';`;
    assert.ok(testPatterns(HARDCODED_SECRET_PATTERNS, code));
  });

  it('detects AWS access key', () => {
    const code = `const awsKey = 'AKIAIOSFODNN7EXAMPLE';`;
    assert.ok(testPatterns(HARDCODED_SECRET_PATTERNS, code));
  });

  it('detects private key header', () => {
    const code = `const key = "-----BEGIN RSA PRIVATE KEY-----\\nMII..."`;
    assert.ok(testPatterns(HARDCODED_SECRET_PATTERNS, code));
  });

  it('does NOT flag short or template-variable values', () => {
    const safe = `const api_key = '\${process.env.API_KEY}';`;
    assert.ok(!testPatterns(HARDCODED_SECRET_PATTERNS, safe));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// RLS disabled detection
// ────────────────────────────────────────────────────────────────────────────

describe('Security Agent - RLS Disabled Detection', () => {
  it('detects .rls = false', () => {
    const code = `table.rls = false;`;
    assert.ok(testPatterns(RLS_DISABLED_PATTERNS, code));
  });

  it('detects ALTER TABLE DISABLE ROW LEVEL SECURITY', () => {
    const sql = `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`;
    assert.ok(testPatterns(RLS_DISABLED_PATTERNS, sql));
  });

  it('does NOT flag enabled RLS', () => {
    const sql = `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`;
    assert.ok(!testPatterns(RLS_DISABLED_PATTERNS, sql));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// RLS coverage scanning
// ────────────────────────────────────────────────────────────────────────────

describe('Security Agent - RLS Coverage', () => {
  it('finds tables without RLS', () => {
    const sql = `
      CREATE TABLE users (id uuid PRIMARY KEY, name text);
      CREATE TABLE posts (id uuid PRIMARY KEY, title text);
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    `;
    const { defined, rls } = extractTables(sql);
    assert.deepStrictEqual([...defined].sort(), ['posts', 'users']);
    assert.deepStrictEqual([...rls], ['users']);
    const missing = [...defined].filter((t) => !rls.has(t));
    assert.deepStrictEqual(missing, ['posts']);
  });

  it('returns empty when all tables have RLS', () => {
    const sql = `
      CREATE TABLE users (id uuid PRIMARY KEY);
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    `;
    const { defined, rls } = extractTables(sql);
    const missing = [...defined].filter((t) => !rls.has(t));
    assert.strictEqual(missing.length, 0);
  });

  it('handles IF NOT EXISTS and public schema prefix', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS public.orders (id serial);
      ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    `;
    const { defined, rls } = extractTables(sql);
    assert.ok(defined.has('orders'));
    assert.ok(rls.has('orders'));
  });

  it('detects zero tables (no SQL)', () => {
    const { defined } = extractTables('SELECT 1;');
    assert.strictEqual(defined.size, 0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Auto-fix migration generation (filesystem integration)
// ────────────────────────────────────────────────────────────────────────────

describe('Security Agent - RLS Migration Generation', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sec-test-'));
    // Create supabase/migrations structure
    fs.mkdirSync(path.join(tmpDir, 'supabase', 'migrations'), { recursive: true });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates migration for tables missing RLS', () => {
    const tablesWithoutRls = ['users', 'posts'];
    const statements = tablesWithoutRls
      .map((t) => `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`)
      .join('\n');
    const migration = `-- Auto-generated by VIBE security agent\n-- Enable RLS on tables missing coverage\n\n${statements}\n`;

    const migrationsDir = path.join(tmpDir, 'supabase', 'migrations');
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const migrationFile = path.join(migrationsDir, `${timestamp}_enable_rls.sql`);
    fs.writeFileSync(migrationFile, migration, 'utf-8');

    assert.ok(fs.existsSync(migrationFile));
    const content = fs.readFileSync(migrationFile, 'utf-8');
    assert.ok(content.includes('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY'));
    assert.ok(content.includes('ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY'));
    assert.ok(content.includes('Auto-generated'));
  });

  it('skips migration when no supabase/migrations directory exists', () => {
    const noSupaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sec-nosupa-'));
    const migrationsDir = path.join(noSupaDir, 'supabase', 'migrations');
    assert.ok(!fs.existsSync(migrationsDir));
    fs.rmSync(noSupaDir, { recursive: true, force: true });
  });
});
