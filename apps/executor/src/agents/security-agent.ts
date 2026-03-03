import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { generateDiff } from '../llm-router';

export interface SecurityAgentResult {
  criticalCount: number;
  warnCount: number;
  blocked: boolean;
  summary: string;
  fixes: SecurityFix[];
}

export interface SecurityFix {
  category: string;
  description: string;
  diff: string; // unified diff ready for applyDiff
}

interface Finding {
  severity: 'critical' | 'warn';
  category: string;
  detail: string; // internal only — never written to SSE stream
}

// ---------------------------------------------------------------------------
// RLS Coverage — dominant capability
// ---------------------------------------------------------------------------

const MIGRATION_SEARCH_PATHS = [
  'supabase/migrations',
  'apps/api/supabase/migrations',
];

function findMigrationsDir(repoPath: string): string | null {
  for (const candidate of MIGRATION_SEARCH_PATHS) {
    const full = path.join(repoPath, candidate);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

/** Extract table names from CREATE TABLE statements in migration files. */
function extractTablesFromMigrations(migrationsDir: string): Set<string> {
  const tables = new Set<string>();
  let files: string[];
  try {
    files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
  } catch {
    return tables;
  }
  const createTablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/gi;
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    let match: RegExpExecArray | null;
    createTablePattern.lastIndex = 0;
    while ((match = createTablePattern.exec(content)) !== null) {
      const tableName = match[2];
      // Skip Supabase internal tables
      if (!tableName.startsWith('_') && tableName !== 'schema_migrations') {
        tables.add(tableName);
      }
    }
  }
  return tables;
}

/** Extract tables that have RLS explicitly enabled or have policies defined. */
function extractRlsCoveredTables(migrationsDir: string): Set<string> {
  const covered = new Set<string>();
  let files: string[];
  try {
    files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
  } catch {
    return covered;
  }
  const enableRlsPattern = /ALTER\s+TABLE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  const createPolicyPattern = /CREATE\s+POLICY\s+\S+\s+ON\s+(?:"?(\w+)"?\.)?"?(\w+)"?/gi;
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    let match: RegExpExecArray | null;
    enableRlsPattern.lastIndex = 0;
    while ((match = enableRlsPattern.exec(content)) !== null) covered.add(match[2]);
    createPolicyPattern.lastIndex = 0;
    while ((match = createPolicyPattern.exec(content)) !== null) covered.add(match[2]);
  }
  return covered;
}

/** Build a safe default RLS migration for uncovered tables. */
function buildRlsFixMigration(uncoveredTables: string[]): string {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const filename = `${timestamp}_vibe_rls_fix.sql`;
  const statements = uncoveredTables.map((table) => `
-- VIBE Security Agent: enable RLS on ${table}
ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;

-- Default deny-all policy — replace with your access rules
CREATE POLICY "${table}_deny_all" ON "${table}"
  AS RESTRICTIVE
  USING (false);
`).join('\n');

  return `--- /dev/null
+++ b/supabase/migrations/${filename}
@@ -0,0 +1 @@
+${statements.replace(/\n/g, '\n+')}`;
}

// ---------------------------------------------------------------------------
// Static scan patterns — all internal; matched values are never exposed to SSE
// ---------------------------------------------------------------------------

// Hardcoded high-entropy secrets / API keys
const HARDCODED_SECRET_PATTERNS: RegExp[] = [
  /(?:api[_-]?key|apikey|secret|password|passwd|pwd|token|auth[_-]?token)\s*[=:]\s*['"`]([^'"`${\s]{8,})['"`]/gi,
  /sk-[A-Za-z0-9]{20,}/g,           // OpenAI secret keys
  /ghp_[A-Za-z0-9]{36,}/g,          // GitHub PATs
  /AKIA[0-9A-Z]{16}/g,               // AWS access key IDs
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
];

// Env vars whose values are piped directly into HTTP responses or console
const ENV_EXPOSURE_PATTERNS: RegExp[] = [
  /process\.env\.[A-Z_][A-Z0-9_]*.*(?:res\.(?:json|send|end)|console\.log)/s,
  /JSON\.stringify\(\s*process\.env\s*\)/g,
];

// Supabase / Postgres RLS disabled
const RLS_DISABLED_PATTERNS: RegExp[] = [
  /\.rls\s*=\s*false/i,
  /disable\s+row\s+level\s+security/i,
  /ALTER\s+TABLE\s+\S+\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/i,
];

// Express/Koa/Fastify route handlers that lack any auth middleware reference.
// A "warn" rather than critical because auth may be applied upstream.
const UNPROTECTED_ROUTE_PATTERN =
  /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`](\/(?!health\b|ping\b|favicon)[^'"`]+)['"`]\s*,\s*(?:async\s*)?\((?!.*(?:auth|guard|verify|protect|require|middleware))[^)]*\)\s*(?:=>|\{)/gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function testPatterns(patterns: RegExp[], content: string): boolean {
  return patterns.some((p) => {
    p.lastIndex = 0; // reset stateful global regexes
    return p.test(content);
  });
}

function scanFile(filePath: string, content: string): Finding[] {
  const findings: Finding[] = [];

  if (testPatterns(HARDCODED_SECRET_PATTERNS, content)) {
    findings.push({
      severity: 'critical',
      category: 'hardcoded_secret',
      detail: filePath,
    });
  }

  if (testPatterns(ENV_EXPOSURE_PATTERNS, content)) {
    findings.push({
      severity: 'critical',
      category: 'exposed_env_var',
      detail: filePath,
    });
  }

  if (testPatterns(RLS_DISABLED_PATTERNS, content)) {
    findings.push({
      severity: 'critical',
      category: 'rls_disabled',
      detail: filePath,
    });
  }

  // Unprotected routes — warn only
  UNPROTECTED_ROUTE_PATTERN.lastIndex = 0;
  if (UNPROTECTED_ROUTE_PATTERN.test(content)) {
    findings.push({
      severity: 'warn',
      category: 'endpoint_missing_auth',
      detail: filePath,
    });
  }

  return findings;
}

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql', '.env']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const SKIP_SUFFIXES = ['.test.ts', '.test.js', '.spec.ts', '.spec.js', '.env.example', '.env.sample'];

function walkDir(dir: string): string[] {
  const files: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        files.push(...walkDir(path.join(dir, entry.name)));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const fullPath = path.join(dir, entry.name);
      if (
        SCAN_EXTENSIONS.has(ext) &&
        !SKIP_SUFFIXES.some((s) => entry.name.endsWith(s))
      ) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runSecurityAgent(taskId: string, repoPath: string): Promise<SecurityAgentResult> {
  // Internal-only logging — findings are never written to the SSE event stream
  const internal = (msg: string) => console.log(`[SECURITY][${taskId}] ${msg}`);

  internal('Starting security scan');

  const allFindings: Finding[] = [];
  const files = walkDir(repoPath);

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    const fileFindings = scanFile(filePath, content);
    for (const f of fileFindings) {
      internal(`[${f.severity.toUpperCase()}] ${f.category}: ${f.detail}`);
      allFindings.push(f);
    }
  }

  const criticalFindings = allFindings.filter((f) => f.severity === 'critical');
  const warnFindings = allFindings.filter((f) => f.severity === 'warn');

  // --- RLS Coverage Check ---
  const fixes: SecurityFix[] = [];
  const migrationsDir = findMigrationsDir(repoPath);

  if (migrationsDir) {
    internal(`Migrations dir found: ${migrationsDir}`);
    const allTables = extractTablesFromMigrations(migrationsDir);
    const coveredTables = extractRlsCoveredTables(migrationsDir);
    const uncovered = [...allTables].filter((t) => !coveredTables.has(t));

    internal(`Tables found: ${[...allTables].join(', ') || 'none'}`);
    internal(`RLS covered: ${[...coveredTables].join(', ') || 'none'}`);
    internal(`RLS gaps: ${uncovered.join(', ') || 'none'}`);

    if (uncovered.length > 0) {
      // Each uncovered table is a critical finding
      for (const table of uncovered) {
        criticalFindings.push({
          severity: 'critical',
          category: 'rls_not_enabled',
          detail: table,
        });
      }

      // Generate fix migration
      const fixDiff = buildRlsFixMigration(uncovered);
      fixes.push({
        category: 'rls_not_enabled',
        description: `Enable RLS on ${uncovered.length} table(s): ${uncovered.join(', ')}. Deny-all policy scaffolded — replace with your access rules.`,
        diff: fixDiff,
      });

      await storage.logEvent(
        taskId,
        `[SECURITY] RLS not enabled on ${uncovered.length} table(s) — job blocked`,
        'error'
      );
    } else {
      internal('RLS coverage: all tables covered');
      await storage.logEvent(taskId, '[SECURITY] RLS coverage: all tables covered', 'success');
    }
  } else {
    internal('No migrations directory found — skipping RLS coverage check');
    await storage.logEvent(taskId, '[SECURITY] No migrations dir found — RLS coverage check skipped', 'warning');
  }

  internal(`Scan complete: ${criticalFindings.length} critical, ${warnFindings.length} warnings across ${files.length} files`);

  if (criticalFindings.length > 0) {
    await storage.logEvent(
      taskId,
      `[SECURITY] ${criticalFindings.length} critical finding(s) — job blocked. ${fixes.length} fix(es) available.`,
      'error'
    );
  }
  if (warnFindings.length > 0) {
    await storage.logEvent(
      taskId,
      `[SECURITY] ${warnFindings.length} warning(s) detected`,
      'warning'
    );
  }
  if (criticalFindings.length === 0 && warnFindings.length === 0) {
    await storage.logEvent(taskId, '[SECURITY] Scan complete: no findings', 'success');
  }

  const summary = criticalFindings.length === 0 && warnFindings.length === 0
    ? 'Security scan passed. No findings.'
    : `${criticalFindings.length} critical finding(s), ${warnFindings.length} warning(s). ${fixes.length > 0 ? fixes.map((f) => f.description).join(' ') : 'No auto-fixes available.'}`;

  return {
    criticalCount: criticalFindings.length,
    warnCount: warnFindings.length,
    blocked: criticalFindings.length > 0,
    summary,
    fixes,
  };
}
