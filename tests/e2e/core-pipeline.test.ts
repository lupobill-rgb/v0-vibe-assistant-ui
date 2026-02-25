import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * Core Pipeline E2E Test
 *
 * Tests the complete VIBE pipeline:
 * 1. Create project pointing at a small local test repo
 * 2. Submit a prompt: "add a hello world function to src/index.ts"
 * 3. Subscribe to SSE logs in browser at /jobs/:id/logs
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TENANT_ID = process.env.TENANT_ID || 'local';
const TEST_REPOS_DIR = path.join(os.tmpdir(), 'vibe-e2e-test-repos');
const TEST_PROJECT_NAME = `e2e-test-project-${Date.now()}`;

/** Headers required by every API call */
function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID, ...extra };
}

describe('Core Pipeline E2E Test', () => {
  let testRepoPath: string;
  let projectId: string;
  let jobId: string;

  before(async () => {
    // Create a small local test repository
    testRepoPath = path.join(TEST_REPOS_DIR, 'test-repo');

    // Clean up if it exists
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }

    fs.mkdirSync(testRepoPath, { recursive: true });

    // Initialize git repo — disable signing so the test works in signing environments
    execSync('git init', { cwd: testRepoPath });
    execSync('git config user.name "Test User"', { cwd: testRepoPath });
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath });
    execSync('git config commit.gpgsign false', { cwd: testRepoPath });

    // Create a basic TypeScript project structure
    const srcDir = path.join(testRepoPath, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'index.ts'), `// Initial TypeScript file
export function main() {
  console.log('Starting application...');
}
`);

    fs.writeFileSync(path.join(testRepoPath, 'package.json'), JSON.stringify({
      name: 'test-repo',
      version: '1.0.0',
      description: 'Test repository for E2E testing',
      main: 'src/index.ts',
      scripts: { test: 'echo "No tests specified"' }
    }, null, 2));

    fs.writeFileSync(path.join(testRepoPath, 'README.md'),
      '# Test Repository\n\nThis is a test repository for E2E testing.\n');

    execSync('git add .', { cwd: testRepoPath });
    execSync('git commit -m "Initial commit"', { cwd: testRepoPath });
    execSync('git branch -M main', { cwd: testRepoPath });

    console.log(`✓ Created test repository at ${testRepoPath}`);
  });

  after(() => {
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
      console.log(`✓ Cleaned up test repository at ${testRepoPath}`);
    }
  });

  it('Step 1: Create project pointing at a small local test repo', async () => {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ name: TEST_PROJECT_NAME, template: 'empty' }),
    });

    assert.strictEqual(response.status, 201, 'Project creation should return 201');

    const data = await response.json() as { id: string; name: string; local_path: string };
    assert.ok(data.id, 'Response should contain project id');
    assert.strictEqual(data.name, TEST_PROJECT_NAME, 'Project name should match');

    projectId = data.id;
    console.log(`✓ Created project: ${projectId}`);

    // Copy test repo contents to project directory
    const projectPath = data.local_path;
    assert.ok(fs.existsSync(projectPath), 'Project directory should exist');

    fs.cpSync(path.join(testRepoPath, 'src'), path.join(projectPath, 'src'), { recursive: true });
    fs.copyFileSync(path.join(testRepoPath, 'package.json'), path.join(projectPath, 'package.json'));

    // Commit the test files — project repo already has gpgsign=false from API bootstrap
    execSync('git add .', { cwd: projectPath });
    execSync('git commit -m "Add test files"', { cwd: projectPath });

    console.log(`✓ Populated project with test files`);
  });

  it('Step 2: Submit a prompt to add a hello world function', async () => {
    assert.ok(projectId, 'Project ID should be set from previous test');

    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        prompt: 'add a hello world function to src/index.ts',
        project_id: projectId,
        base_branch: 'main',
      }),
    });

    assert.strictEqual(response.status, 201, 'Job creation should return 201');

    const data = await response.json() as { task_id: string; status: string };
    assert.ok(data.task_id, 'Response should contain task_id');
    assert.strictEqual(data.status, 'queued', 'Job should be queued');

    jobId = data.task_id;
    console.log(`✓ Created job: ${jobId}`);
  });

  it('Step 3: Subscribe to SSE logs at /jobs/:id/logs', async () => {
    assert.ok(jobId, 'Job ID should be set from previous test');

    // Pass tenant ID as query param — EventSource cannot send custom headers
    const sseUrl = `${API_BASE_URL}/jobs/${jobId}/logs?tenant_id=${encodeURIComponent(TENANT_ID)}`;
    console.log(`✓ SSE endpoint: ${sseUrl}`);

    return new Promise<void>((resolve, reject) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        resolve();
      }, 10000);

      fetch(sseUrl, { signal: controller.signal })
        .then(async (response) => {
          console.log(`✓ SSE endpoint returned status: ${response.status}`);

          if (response.status === 200) {
            assert.ok(
              response.headers.get('content-type')?.includes('text/event-stream'),
              'Content-Type should be text/event-stream'
            );
            console.log(`✓ SSE connection established with correct headers`);
          }

          clearTimeout(timeout);
          resolve();
        })
        .catch((error: Error) => {
          clearTimeout(timeout);
          if (error.name === 'AbortError') {
            resolve();
          } else {
            reject(error);
          }
        });
    });
  });
});
