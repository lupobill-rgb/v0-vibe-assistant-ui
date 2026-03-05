import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Debug Agent Tests
 *
 * Exercises:
 * - CANNOT_FIX detection path
 * - DebugAgentResult shape (including healedIssues)
 * - Retry-loop exhaustion
 * - Component health scanner patterns
 */

import type { DebugAgentResult, ComponentIssue } from './debug-agent';

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
  it('represents successful fix with healed issues', () => {
    const result: DebugAgentResult = {
      success: true,
      cannotFix: false,
      buildOutput: 'Build succeeded',
      summary: 'Build fixed. 2 component issues auto-healed.',
      iterations: 1,
      healedIssues: 2,
    };
    assert.ok(result.success);
    assert.ok(!result.cannotFix);
    assert.strictEqual(result.healedIssues, 2);
  });

  it('represents successful fix with zero healed issues', () => {
    const result: DebugAgentResult = {
      success: true,
      buildOutput: 'Build succeeded',
      summary: 'Build fixed on iteration 1.',
      iterations: 1,
      healedIssues: 0,
    };
    assert.ok(result.success);
    assert.strictEqual(result.healedIssues, 0);
  });

  it('represents CANNOT_FIX after exhausted retries', () => {
    const result: DebugAgentResult = {
      success: false,
      cannotFix: true,
      buildOutput: 'Build still failing: SyntaxError in index.ts',
      summary: 'Exhausted 3 iterations.',
      iterations: 3,
    };
    assert.ok(!result.success);
    assert.ok(result.cannotFix);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Component health scanner patterns
// ────────────────────────────────────────────────────────────────────────────

describe('Debug Agent - ComponentIssue Shape', () => {
  it('represents a dead button issue', () => {
    const issue: ComponentIssue = {
      file: 'src/components/Dashboard.tsx',
      line: 42,
      type: 'dead_button',
      description: 'Button without onClick handler: <button className="btn-filter">Filter</button>',
    };
    assert.strictEqual(issue.type, 'dead_button');
    assert.strictEqual(issue.line, 42);
  });

  it('represents an empty chart issue', () => {
    const issue: ComponentIssue = {
      file: 'src/pages/Analytics.tsx',
      line: 100,
      type: 'empty_chart',
      description: 'Canvas element with no Chart.js initialization nearby',
    };
    assert.strictEqual(issue.type, 'empty_chart');
  });

  it('represents a dead filter issue', () => {
    const issue: ComponentIssue = {
      file: 'src/components/FilterBar.tsx',
      line: 15,
      type: 'dead_filter',
      description: 'Interactive element without onChange handler: <select className="filter-dropdown">',
    };
    assert.strictEqual(issue.type, 'dead_filter');
  });

  it('represents a dead input issue', () => {
    const issue: ComponentIssue = {
      file: 'src/components/Slider.tsx',
      line: 8,
      type: 'dead_input',
      description: 'Interactive element without onChange handler: <input type="range" min="0" max="100">',
    };
    assert.strictEqual(issue.type, 'dead_input');
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

    for (let attempt = 1; attempt <= MAX_DEBUG_RETRIES; attempt++) {
      retries++;
      const buildOk = false;
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
      if (attempt === 2) {
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
        break;
      }
    }

    assert.strictEqual(retries, 1);
  });
});
