import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PREFLIGHT_TIMEOUT = parseInt(process.env.PREFLIGHT_TIMEOUT || '300000', 10);

export interface PreflightStage {
  name: string;
  command: string;
  timeout: number;
}

export interface PreflightResult {
  success: boolean;
  stage: string;
  output: string;
  error?: string;
}

// Define the 4-stage preflight pipeline
// Only includes stages where the environment variable is explicitly set.
// Stages without a configured command are skipped entirely.
export function getPreflightStages(): PreflightStage[] {
  const stageDefinitions = [
    { name: 'lint', envVar: 'LINT_COMMAND' },
    { name: 'typecheck', envVar: 'TYPECHECK_COMMAND' },
    { name: 'test', envVar: 'TEST_COMMAND' },
    { name: 'smoke', envVar: 'SMOKE_COMMAND' },
  ];

  return stageDefinitions
    .filter(def => !!process.env[def.envVar])
    .map(def => ({
      name: def.name,
      command: process.env[def.envVar]!,
      timeout: PREFLIGHT_TIMEOUT,
    }));
}

// Run preflight checks (fail-fast)
export async function runPreflightChecks(
  repoPath: string,
  onProgress: (stage: string, output: string) => void
): Promise<PreflightResult> {
  const stages = getPreflightStages();

  if (stages.length === 0) {
    onProgress('preflight', 'No preflight commands configured — skipping all checks');
    return {
      success: true,
      stage: 'all',
      output: 'No preflight commands configured'
    };
  }

  for (const stage of stages) {
    onProgress(stage.name, `Starting ${stage.name} check...`);

    try {
      const { stdout, stderr } = await execAsync(stage.command, {
        cwd: repoPath,
        timeout: stage.timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      const output = stdout + stderr;
      onProgress(stage.name, output);

      // Check if command succeeded (exit code 0)
      onProgress(stage.name, `✓ ${stage.name} passed`);

    } catch (error: any) {
      // Command failed or timed out
      const output = (error.stdout || '') + (error.stderr || '');
      const errorMsg = error.killed 
        ? `Timeout after ${stage.timeout}ms`
        : `Exit code ${error.code}`;

      onProgress(stage.name, output);
      onProgress(stage.name, `✗ ${stage.name} failed: ${errorMsg}`);

      return {
        success: false,
        stage: stage.name,
        output,
        error: errorMsg
      };
    }
  }

  // All stages passed
  return {
    success: true,
    stage: 'all',
    output: 'All preflight checks passed'
  };
}

// Docker-based preflight (future enhancement - for now, run commands directly)
export async function runDockerPreflight(
  repoPath: string,
  onProgress: (stage: string, output: string) => void
): Promise<PreflightResult> {
  // For now, just run commands directly
  // In production, would run each stage in a Docker container
  return runPreflightChecks(repoPath, onProgress);
}
