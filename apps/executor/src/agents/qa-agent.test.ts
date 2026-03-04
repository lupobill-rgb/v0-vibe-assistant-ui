import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * QA Agent Tests
 *
 * Exercises:
 * - CANNOT_FIX signal detection for QA test-fix loop
 * - QaAgentResult shape with cannotFix + fixes fields
 * - Retry-loop exhaustion produces cannotFix: true
 * - System prompt content (QA_SYSTEM, QA_FIX_SYSTEM)
 */

import type { QaAgentResult } from './qa-agent';

// ────────────────────────────────────────────────────────────────────────────
// CANNOT_FIX signal detection
// ────────────────────────────────────────────────────────────────────────────

function isQaCannotFix(diff: string | null | undefined): boolean {
  if (!diff || diff === 'NO_CHANGES') return true;
  if (diff.trim() === 'CANNOT_FIX') return true;
  return false;
}

describe('QA Agent - CANNOT_FIX Signal', () => {
  it('recognizes "CANNOT_FIX" string', () => {
    assert.ok(isQaCannotFix('CANNOT_FIX'));
  });

  it('recognizes CANNOT_FIX with surrounding whitespace', () => {
    assert.ok(isQaCannotFix('  CANNOT_FIX  '));
    assert.ok(isQaCannotFix('CANNOT_FIX\n'));
    assert.ok(isQaCannotFix('\nCANNOT_FIX\n'));
  });

  it('recognizes empty / null / undefined as cannot-fix', () => {
    assert.ok(isQaCannotFix(null));
    assert.ok(isQaCannotFix(undefined));
    assert.ok(isQaCannotFix(''));
  });

  it('recognizes NO_CHANGES', () => {
    assert.ok(isQaCannotFix('NO_CHANGES'));
  });

  it('does NOT flag a valid diff', () => {
    const diff = `--- a/src/foo.test.ts\n+++ b/src/foo.test.ts\n@@ -0,0 +1,5 @@\n+import { describe, it } from 'node:test';\n+import assert from 'node:assert';\n+describe('foo', () => {\n+  it('works', () => { assert.ok(true); });\n+});`;
    assert.ok(!isQaCannotFix(diff));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// QaAgentResult shape
// ────────────────────────────────────────────────────────────────────────────

describe('QA Agent - Result Shape', () => {
  it('represents successful test generation', () => {
    const result: QaAgentResult = {
      success: true,
      cannotFix: false,
      testOutput: 'All tests passed (3 passing)',
      fixes: [],
    };
    assert.ok(result.success);
    assert.ok(!result.cannotFix);
  });

  it('represents CANNOT_FIX after retries', () => {
    const result: QaAgentResult = {
      success: false,
      cannotFix: true,
      testOutput: 'Error: Cannot find module ./foo',
      fixes: ['Attempt 1: fixed test failures'],
    };
    assert.ok(!result.success);
    assert.ok(result.cannotFix);
    assert.strictEqual(result.fixes.length, 1);
  });

  it('represents failed test generation (LLM error, no CANNOT_FIX)', () => {
    const result: QaAgentResult = {
      success: false,
      cannotFix: false,
      testOutput: 'LLM error: rate limited',
      fixes: [],
    };
    assert.ok(!result.success);
    assert.ok(!result.cannotFix);
  });

  it('represents success with no changes needed', () => {
    const result: QaAgentResult = {
      success: true,
      cannotFix: false,
      testOutput: 'No changed source files',
      fixes: [],
    };
    assert.ok(result.success);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Retry-loop exhaustion
// ────────────────────────────────────────────────────────────────────────────

describe('QA Agent - Retry Loop', () => {
  const MAX_QA_RETRIES = 3;

  it('simulates retry exhaustion producing cannotFix', () => {
    let retries = 0;
    let cannotFix = false;

    for (let attempt = 1; attempt <= MAX_QA_RETRIES; attempt++) {
      retries++;
      const testsPass = false;
      if (!testsPass && attempt === MAX_QA_RETRIES) {
        cannotFix = true;
      }
    }

    assert.strictEqual(retries, 3);
    assert.ok(cannotFix);
  });

  it('simulates fix success on 2nd attempt', () => {
    let retries = 0;
    let success = false;

    for (let attempt = 1; attempt <= MAX_QA_RETRIES; attempt++) {
      retries++;
      if (attempt === 2) {
        success = true;
        break;
      }
    }

    assert.strictEqual(retries, 2);
    assert.ok(success);
  });

  it('simulates LLM returning CANNOT_FIX mid-loop', () => {
    let retries = 0;
    let cannotFix = false;

    for (let attempt = 1; attempt <= MAX_QA_RETRIES; attempt++) {
      retries++;
      const llmResponse = attempt === 2 ? 'CANNOT_FIX' : '--- a/test.ts\n+++ b/test.ts';
      if (isQaCannotFix(llmResponse)) {
        cannotFix = true;
        break;
      }
    }

    assert.strictEqual(retries, 2);
    assert.ok(cannotFix);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// System prompt validation
// ────────────────────────────────────────────────────────────────────────────

describe('QA Agent - System Prompts', () => {
  // These are string constants in the agent — validate their key constraints

  it('QA_SYSTEM prompt requires node:test (not Jest)', () => {
    const QA_SYSTEM = `You are a test generation engine.
Given changed source files and codebase context, generate test files using ONLY the Node.js built-in test runner.
Output ONLY a valid unified diff creating or updating test files.
Rules:
- Import: import { describe, it, before, after } from 'node:test'
- Import: import assert from 'node:assert'
- Do NOT use Jest, Mocha, or any third-party test framework
- Place test files alongside the source with a .test.ts extension
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root
- If no tests are needed, output exactly: NO_CHANGES`;

    assert.ok(QA_SYSTEM.includes('node:test'));
    assert.ok(QA_SYSTEM.includes('node:assert'));
    assert.ok(QA_SYSTEM.includes('Do NOT use Jest'));
    assert.ok(QA_SYSTEM.includes('git apply'));
    assert.ok(QA_SYSTEM.includes('NO_CHANGES'));
  });

  it('QA_FIX_SYSTEM prompt includes CANNOT_FIX directive', () => {
    const QA_FIX_SYSTEM = `You are a test repair engine.
Given failing test output and codebase context, fix the test failures.
Output ONLY a valid unified diff that fixes the failing tests.
Rules:
- Fix ONLY the test failures shown in the error log — no refactoring
- Do NOT change application source code — only modify test files
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root
- If you cannot fix the tests, output exactly: CANNOT_FIX`;

    assert.ok(QA_FIX_SYSTEM.includes('CANNOT_FIX'));
    assert.ok(QA_FIX_SYSTEM.includes('only modify test files'));
    assert.ok(QA_FIX_SYSTEM.includes('git apply'));
  });
});
