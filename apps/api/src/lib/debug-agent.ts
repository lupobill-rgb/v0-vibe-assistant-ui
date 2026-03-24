// Thin wrapper around executor's debug-agent with safe fallback.
// The executor package may not be present in the Docker container,
// so we catch the require() failure and provide no-op stubs.

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

/* eslint-disable @typescript-eslint/no-var-requires */
let _debugAgent: any = null;
try {
  _debugAgent = require('../../../../executor/src/agents/debug-agent');
} catch {
  console.warn('Debug agent not available (executor not in container)');
}

export const runDebugAgent = async (
  taskId: string,
  repoPath: string,
  errorLog: string,
): Promise<DebugAgentResult> => {
  if (_debugAgent?.runDebugAgent) {
    return _debugAgent.runDebugAgent(taskId, repoPath, errorLog);
  }
  return {
    success: false,
    buildOutput: '',
    summary: 'Debug agent not available in this environment',
    iterations: 0,
  };
};

export const runSelfHealingScan = async (
  taskId: string,
  repoPath: string,
): Promise<{ healed: number; remaining: ComponentIssue[] }> => {
  if (_debugAgent?.runSelfHealingScan) {
    return _debugAgent.runSelfHealingScan(taskId, repoPath);
  }
  return { healed: 0, remaining: [] };
};
