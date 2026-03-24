// Thin wrapper around executor's debug-agent to avoid cross-package TS rootDir import error.
// At runtime the require() path resolves identically to the old relative import.

/* eslint-disable @typescript-eslint/no-var-requires */
const _debugAgent = require('../../../../executor/src/agents/debug-agent');

export interface DebugAgentResult {
  success: boolean;
  cannotFix?: boolean;
  buildOutput: string;
  summary: string;
  iterations: number;
  healedIssues?: number;
}

export interface ComponentIssue {
  file: string;
  line: number;
  type: 'dead_button' | 'empty_chart' | 'dead_filter' | 'dead_input';
  description: string;
}

export const runDebugAgent: (
  taskId: string,
  repoPath: string,
  errorLog: string,
) => Promise<DebugAgentResult> = _debugAgent.runDebugAgent;

export const runSelfHealingScan: (
  taskId: string,
  repoPath: string,
) => Promise<{ healed: number; remaining: ComponentIssue[] }> = _debugAgent.runSelfHealingScan;
