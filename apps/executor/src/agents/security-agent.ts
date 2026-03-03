import fs from 'fs';
import path from 'path';
import { storage } from '../storage';

export interface SecurityAgentResult {
  criticalCount: number;
  warnCount: number;
  blocked: boolean;
  fixes: string[];
}

interface Finding {
  severity: 'critical' | 'warn';
  category: string;
  detail: string; // internal only — never written to SSE stream
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

// RLS coverage: CREATE TABLE without ENABLE ROW LEVEL SECURITY nearby
const CREATE_TABLE_PATTERN = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
const ENABLE_RLS_PATTERN = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;

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
// RLS coverage scan — checks that all CREATE TABLE statements have matching
// ENABLE ROW LEVEL SECURITY. Tables without RLS are critical findings.
// ---------------------------------------------------------------------------

interface RlsCoverage {
  tablesWithoutRls: string[];
  totalTables: number;
}

function scanRlsCoverage(files: string[], repoPath: string): RlsCoverage {
  const definedTables = new Set<string>();
  const rlsEnabledTables = new Set<string>();

  for (const filePath of files) {
    if (!filePath.endsWith('.sql')) continue;
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    // Collect all CREATE TABLE names
    CREATE_TABLE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CREATE_TABLE_PATTERN.exec(content)) !== null) {
      definedTables.add(match[1].toLowerCase());
    }

    // Collect all ENABLE RLS table names
    ENABLE_RLS_PATTERN.lastIndex = 0;
    while ((match = ENABLE_RLS_PATTERN.exec(content)) !== null) {
      rlsEnabledTables.add(match[1].toLowerCase());
    }
  }

  const tablesWithoutRls = [...definedTables].filter((t) => !rlsEnabledTables.has(t));
  return { tablesWithoutRls, totalTables: definedTables.size };
}

// ---------------------------------------------------------------------------
// Auto-fix: generate migration to enable RLS on uncovered tables
// ---------------------------------------------------------------------------

function generateRlsMigration(tablesWithoutRls: string[], repoPath: string): string | null {
  if (tablesWithoutRls.length === 0) return null;

  const statements = tablesWithoutRls
    .map((t) => `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`)
    .join('\n');

  const migration = `-- Auto-generated by VIBE security agent\n-- Enable RLS on tables missing coverage\n\n${statements}\n`;

  // Write to supabase/migrations if the directory exists
  const migrationsDir = path.join(repoPath, 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    // No supabase migrations directory — skip auto-fix
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const migrationFile = path.join(migrationsDir, `${timestamp}_enable_rls.sql`);
  fs.writeFileSync(migrationFile, migration, 'utf-8');
  return migrationFile;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runSecurityAgent(taskId: string, repoPath: string): Promise<SecurityAgentResult> {
  // Internal-only logging — findings are never written to the SSE event stream
  const internal = (msg: string) => console.log(`[SECURITY][${taskId}] ${msg}`);

  internal('Starting security scan');

  const allFindings: Finding[] = [];
  const fixes: string[] = [];
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

  // RLS coverage scan
  const rlsCoverage = scanRlsCoverage(files, repoPath);
  if (rlsCoverage.tablesWithoutRls.length > 0) {
    internal(`RLS coverage: ${rlsCoverage.tablesWithoutRls.length}/${rlsCoverage.totalTables} tables missing RLS`);
    for (const table of rlsCoverage.tablesWithoutRls) {
      allFindings.push({
        severity: 'critical',
        category: 'rls_missing',
        detail: `Table '${table}' has no ENABLE ROW LEVEL SECURITY`,
      });
    }

    // Auto-fix: generate migration
    const migrationFile = generateRlsMigration(rlsCoverage.tablesWithoutRls, repoPath);
    if (migrationFile) {
      const relPath = path.relative(repoPath, migrationFile);
      internal(`Auto-fix: generated RLS migration at ${relPath}`);
      fixes.push(`Generated RLS migration for ${rlsCoverage.tablesWithoutRls.length} table(s): ${relPath}`);
      await storage.logEvent(taskId, `[SECURITY] Auto-fix: RLS migration generated for ${rlsCoverage.tablesWithoutRls.length} table(s)`, 'success');
    }
  } else if (rlsCoverage.totalTables > 0) {
    internal(`RLS coverage: all ${rlsCoverage.totalTables} tables have RLS enabled`);
  }

  const criticalFindings = allFindings.filter((f) => f.severity === 'critical');
  const warnFindings = allFindings.filter((f) => f.severity === 'warn');

  internal(`Scan complete: ${criticalFindings.length} critical, ${warnFindings.length} warnings across ${files.length} files`);

  // Only severity counts go to SSE — no finding details, file paths, or secret values
  if (criticalFindings.length > 0) {
    // If all critical findings were auto-fixed (RLS), don't block
    const unfixedCritical = criticalFindings.filter(
      (f) => f.category !== 'rls_missing' || !fixes.some((fix) => fix.includes('RLS migration'))
    );

    if (unfixedCritical.length > 0) {
      await storage.logEvent(
        taskId,
        `[SECURITY] ${unfixedCritical.length} critical finding(s) — job blocked`,
        'error'
      );
    } else {
      await storage.logEvent(
        taskId,
        `[SECURITY] ${criticalFindings.length} critical finding(s) auto-fixed`,
        'success'
      );
    }
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

  // Block only if there are unfixed critical findings
  const unfixedCriticalCount = criticalFindings.filter(
    (f) => f.category !== 'rls_missing' || !fixes.some((fix) => fix.includes('RLS migration'))
  ).length;

  return {
    criticalCount: criticalFindings.length,
    warnCount: warnFindings.length,
    blocked: unfixedCriticalCount > 0,
    fixes,
  };
}
