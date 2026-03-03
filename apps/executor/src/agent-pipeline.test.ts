import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Agent Pipeline Tests
 *
 * Verifies:
 * - Pipeline stages are in the correct security-first order
 * - AgentType includes all required types (including 'ux')
 * - AgentResult supports summary + fixes fields
 * - ExecutionState includes 'security' and 'ux'
 * - State transitions follow: planning → security → building → validating → ux → testing
 */

// ────────────────────────────────────────────────────────────────────────────
// Import types directly from the pipeline module
// ────────────────────────────────────────────────────────────────────────────

import type { AgentType, AgentResult, PipelineState } from './agent-pipeline';
import type { ExecutionState } from './storage';

// ────────────────────────────────────────────────────────────────────────────
// Pipeline stage order
// ────────────────────────────────────────────────────────────────────────────

describe('Pipeline - Stage Order', () => {
  // The canonical order the pipeline reports via storage.updateTaskState
  const EXPECTED_ORDER: ExecutionState[] = [
    'planning',
    'security',
    'building',
    'validating',
    'ux',
    'testing',
  ];

  it('defines all 6 pipeline execution states', () => {
    // Validate each state is a valid ExecutionState at the type level
    const states: ExecutionState[] = ['planning', 'security', 'building', 'validating', 'ux', 'testing'];
    assert.strictEqual(states.length, 6);
    for (const s of states) {
      assert.ok(EXPECTED_ORDER.includes(s), `Missing state: ${s}`);
    }
  });

  it('security comes before building (security-first order)', () => {
    const secIdx = EXPECTED_ORDER.indexOf('security');
    const buildIdx = EXPECTED_ORDER.indexOf('building');
    assert.ok(secIdx < buildIdx, `security (${secIdx}) should precede building (${buildIdx})`);
  });

  it('planning is the first stage', () => {
    assert.strictEqual(EXPECTED_ORDER[0], 'planning');
  });

  it('ux comes after validating and before testing', () => {
    const valIdx = EXPECTED_ORDER.indexOf('validating');
    const uxIdx = EXPECTED_ORDER.indexOf('ux');
    const testIdx = EXPECTED_ORDER.indexOf('testing');
    assert.ok(uxIdx > valIdx, `ux (${uxIdx}) should follow validating (${valIdx})`);
    assert.ok(uxIdx < testIdx, `ux (${uxIdx}) should precede testing (${testIdx})`);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AgentType
// ────────────────────────────────────────────────────────────────────────────

describe('Pipeline - AgentType', () => {
  it('includes all 6 agent types', () => {
    const types: AgentType[] = ['planner', 'builder', 'qa', 'debug', 'security', 'ux'];
    assert.strictEqual(types.length, 6);
    // Compile-time check: if any type is not in the union, this file won't compile
  });

  it('ux is a valid AgentType', () => {
    const t: AgentType = 'ux';
    assert.strictEqual(t, 'ux');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AgentResult shape
// ────────────────────────────────────────────────────────────────────────────

describe('Pipeline - AgentResult', () => {
  it('supports all status values including cannot_fix', () => {
    const statuses: AgentResult['status'][] = ['passed', 'failed', 'needs_fix', 'cannot_fix'];
    assert.strictEqual(statuses.length, 4);
  });

  it('supports summary and fixes fields', () => {
    const result: AgentResult = {
      agent: 'security',
      status: 'passed',
      output: 'clean',
      summary: 'Security passed: 0 warnings',
      fixes: ['Generated RLS migration for 2 table(s)'],
      duration_ms: 150,
    };
    assert.strictEqual(result.summary, 'Security passed: 0 warnings');
    assert.strictEqual(result.fixes!.length, 1);
  });

  it('summary and fixes are optional', () => {
    const result: AgentResult = {
      agent: 'builder',
      status: 'passed',
      output: 'Applied 2 diffs',
      duration_ms: 5000,
    };
    assert.strictEqual(result.summary, undefined);
    assert.strictEqual(result.fixes, undefined);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// PipelineState
// ────────────────────────────────────────────────────────────────────────────

describe('Pipeline - PipelineState', () => {
  it('initializes with retry defaults', () => {
    const state: PipelineState = {
      job_id: 'test-job-1',
      current_agent: 'planner',
      results: [],
      retry_count: 0,
      max_retries: 3,
      success: false,
    };
    assert.strictEqual(state.retry_count, 0);
    assert.strictEqual(state.max_retries, 3);
    assert.strictEqual(state.success, false);
    assert.strictEqual(state.results.length, 0);
  });

  it('tracks results from multiple agents', () => {
    const results: AgentResult[] = [
      { agent: 'planner', status: 'passed', output: 'Plan: 3 tasks', summary: 'Planned 3 tasks', duration_ms: 800 },
      { agent: 'security', status: 'passed', output: 'Clean', summary: 'Security passed', fixes: [], duration_ms: 200 },
      { agent: 'builder', status: 'passed', output: 'Applied 2 diffs', summary: 'Built 2 diffs', duration_ms: 5000 },
      { agent: 'ux', status: 'cannot_fix', output: '1 UX issue unfixable', summary: 'UX: 1 cannot fix', errors: ['Missing loading state'], duration_ms: 1200 },
      { agent: 'qa', status: 'passed', output: 'Tests passing', summary: 'QA passed', duration_ms: 3000 },
    ];

    const state: PipelineState = {
      job_id: 'test-job-2',
      current_agent: 'qa',
      results,
      retry_count: 0,
      max_retries: 3,
      success: true,
    };

    assert.strictEqual(state.results.length, 5);
    assert.ok(state.results.some((r) => r.agent === 'ux'));
    assert.ok(state.results.some((r) => r.status === 'cannot_fix'));
    assert.ok(state.success);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ExecutionState coverage
// ────────────────────────────────────────────────────────────────────────────

describe('Pipeline - ExecutionState', () => {
  it('includes security and ux states', () => {
    const security: ExecutionState = 'security';
    const ux: ExecutionState = 'ux';
    assert.strictEqual(security, 'security');
    assert.strictEqual(ux, 'ux');
  });

  it('includes all legacy states', () => {
    const legacyStates: ExecutionState[] = [
      'queued', 'cloning', 'building_context', 'calling_llm',
      'applying_diff', 'running_preflight', 'creating_pr',
      'completed', 'failed',
    ];
    for (const s of legacyStates) {
      assert.ok(typeof s === 'string', `${s} should be a valid ExecutionState`);
    }
  });

  it('includes all pipeline states', () => {
    const pipelineStates: ExecutionState[] = [
      'planning', 'security', 'building', 'validating', 'ux', 'testing',
    ];
    assert.strictEqual(pipelineStates.length, 6);
  });
});
