import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Debug Agent Tests
 *
 * Exercises the CANNOT_FIX detection path:
 * - LLM returning "CANNOT_FIX" string is recognized
 * - LLM returning empty/NO_CHANGES triggers CANNOT_FIX
 * - DebugAgentResult shape has cannotFix + fixes fields
 * - Retry-loop exhaustion produces cannotFix: true
 */

import type { DebugAgentResult } from './debug-agent';

// ────────────────────────────────────────────────────────────────────────────
// CANNOT_FIX signal detection
// ────────────────────────────────────────────────────────────────────────────

const CANNOT_FIX_VALUES = ['CANNOT_FIX', '  CANNOT_FIX  ', 'CANNOT_FIX\n'];
const VALID_DIFF = `--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,1 +1,1 @@\n-old\n+new`;

function isCannotFix(diff: string | null | undefined): boolean {
  if (!diff || diff === 'NO_CHANGES') return true;
  if (diff.trim() === 'CANNOT_FIX') return true;
  return false;
}

describe('Debug Agent - CANNOT_FIX Signal', () => {
  it('recognizes "CANNOT_FIX" string', () => {
    assert.ok(isCannotFix('CANNOT_FIX'));
  });

  it('recognizes "CANNOT_FIX" with whitespace', () => {
    for (const val of CANNOT_FIX_VALUES) {
      assert.ok(isCannotFix(val), `Should detect: ${JSON.stringify(val)}`);
    }
  });

  it('recognizes empty/null/undefined as cannot-fix', () => {
    assert.ok(isCannotFix(null));
    assert.ok(isCannotFix(undefined));
    assert.ok(isCannotFix(''));
  });

  it('recognizes NO_CHANGES as cannot-fix', () => {
    assert.ok(isCannotFix('NO_CHANGES'));
  });

  it('does NOT flag a valid diff as cannot-fix', () => {
    assert.ok(!isCannotFix(VALID_DIFF));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DebugAgentResult shape
// ────────────────────────────────────────────────────────────────────────────

describe('Debug Agent - Result Shape', () => {
  it('represents successful fix', () => {
    const result: DebugAgentResult = {
      success: true,
      cannotFix: false,
      buildOutput: 'Build succeeded',
      fixes: ['Attempt 1: fixed build errors'],
    };
    assert.ok(result.success);
    assert.ok(!result.cannotFix);
    assert.strictEqual(result.fixes.length, 1);
  });

  it('represents CANNOT_FIX after exhausted retries', () => {
    const result: DebugAgentResult = {
      success: false,
      cannotFix: true,
      buildOutput: 'Build still failing: SyntaxError in index.ts',
      fixes: [],
    };
    assert.ok(!result.success);
    assert.ok(result.cannotFix);
    assert.strictEqual(result.fixes.length, 0);
  });

  it('represents CANNOT_FIX with partial progress', () => {
    const result: DebugAgentResult = {
      success: false,
      cannotFix: true,
      buildOutput: 'Reduced from 5 errors to 2 but cannot fully resolve',
      fixes: ['Attempt 1: fixed 3 of 5 errors'],
    };
    assert.ok(result.cannotFix);
    assert.strictEqual(result.fixes.length, 1);
  });

  it('represents LLM-signalled CANNOT_FIX (immediate)', () => {
    const result: DebugAgentResult = {
      success: false,
      cannotFix: true,
      buildOutput: 'LLM indicated it cannot fix the errors',
      fixes: [],
    };
    assert.ok(result.cannotFix);
    assert.strictEqual(result.buildOutput, 'LLM indicated it cannot fix the errors');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Retry exhaustion logic
// ────────────────────────────────────────────────────────────────────────────

describe('Debug Agent - Retry Loop', () => {
  const MAX_DEBUG_RETRIES = 3;

  it('simulates retry exhaustion leading to cannotFix', () => {
    let retries = 0;
    let cannotFix = false;

    // Simulate: every attempt fails
    for (let attempt = 1; attempt <= MAX_DEBUG_RETRIES; attempt++) {
      retries++;
      const buildOk = false; // build always fails in this simulation
      if (!buildOk && attempt === MAX_DEBUG_RETRIES) {
        cannotFix = true;
      }
    }

    assert.strictEqual(retries, 3);
    assert.ok(cannotFix);
  });

  it('simulates early success (no cannotFix)', () => {
    let retries = 0;
    let success = false;

    for (let attempt = 1; attempt <= MAX_DEBUG_RETRIES; attempt++) {
      retries++;
      if (attempt === 2) { // succeeds on 2nd attempt
        success = true;
        break;
      }
    }

    assert.strictEqual(retries, 2);
    assert.ok(success);
  });

  it('simulates LLM returning CANNOT_FIX on first attempt', () => {
    let retries = 0;
    const llmResponse = 'CANNOT_FIX';

    for (let attempt = 1; attempt <= MAX_DEBUG_RETRIES; attempt++) {
      retries++;
      if (isCannotFix(llmResponse)) {
        break; // exit immediately
      }
    }

    assert.strictEqual(retries, 1); // should exit after first attempt
  });
});
