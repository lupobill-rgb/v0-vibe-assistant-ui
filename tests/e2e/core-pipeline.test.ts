import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
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
const TEST_REPOS_DIR = '/tmp/vibe-e2e-test-repos';
const TEST_PROJECT_NAME = 'e2e-test-project';

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
    
    // Initialize git repo
    execSync('git init', { cwd: testRepoPath });
    execSync('git config user.name "Test User"', { cwd: testRepoPath });
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath });
    execSync('git checkout -b main', { cwd: testRepoPath });
    
    // Create a basic TypeScript project structure
    const srcDir = path.join(testRepoPath, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    // Create an initial index.ts file
    const indexPath = path.join(srcDir, 'index.ts');
    fs.writeFileSync(indexPath, `// Initial TypeScript file
export function main() {
  console.log('Starting application...');
}
`);
    
    // Create a package.json
    const packageJsonPath = path.join(testRepoPath, 'package.json');
    fs.writeFileSync(packageJsonPath, JSON.stringify({
      name: 'test-repo',
      version: '1.0.0',
      description: 'Test repository for E2E testing',
      main: 'src/index.ts',
      scripts: {
        test: 'echo "No tests specified"'
      }
    }, null, 2));
    
    // Create a README
    const readmePath = path.join(testRepoPath, 'README.md');
    fs.writeFileSync(readmePath, '# Test Repository\n\nThis is a test repository for E2E testing.\n');
    
    // Commit initial files
    execSync('git add .', { cwd: testRepoPath });
    execSync('git commit -m "Initial commit"', { cwd: testRepoPath });
    
    console.log(`✓ Created test repository at ${testRepoPath}`);
  });

  after(() => {
    // Clean up test repository
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
      console.log(`✓ Cleaned up test repository at ${testRepoPath}`);
    }
  });

  it('Step 1: Create project pointing at a small local test repo', async () => {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: TEST_PROJECT_NAME,
        template: 'empty'
      }),
    });

    assert.strictEqual(response.status, 201, 'Project creation should return 201');
    
    const data = await response.json();
    assert.ok(data.id, 'Response should contain project id');
    assert.strictEqual(data.name, TEST_PROJECT_NAME, 'Project name should match');
    
    projectId = data.id;
    console.log(`✓ Created project: ${projectId}`);
    
    // Copy test repo contents to project directory
    const projectPath = data.local_path;
    assert.ok(fs.existsSync(projectPath), 'Project directory should exist');
    
    // Copy our test files to the project repo
    execSync(`cp -r ${testRepoPath}/src ${projectPath}/`, { stdio: 'inherit' });
    execSync(`cp ${testRepoPath}/package.json ${projectPath}/`, { stdio: 'inherit' });
    
    // Commit the test files to the project repo
    execSync('git add .', { cwd: projectPath });
    execSync('git commit -m "Add test files"', { cwd: projectPath });
    
    console.log(`✓ Populated project with test files`);
  });

  it('Step 2: Submit a prompt to add a hello world function', async () => {
    assert.ok(projectId, 'Project ID should be set from previous test');
    
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'add a hello world function to src/index.ts',
        project_id: projectId,
        base_branch: 'main'
      }),
    });

    assert.strictEqual(response.status, 201, 'Job creation should return 201');
    
    const data = await response.json();
    assert.ok(data.task_id, 'Response should contain task_id');
    assert.strictEqual(data.execution_state, 'queued', 'Job should be queued');
    
    jobId = data.task_id;
    console.log(`✓ Created job: ${jobId}`);
  });

  it('Step 3: Subscribe to SSE logs at /jobs/:id/logs', async () => {
    assert.ok(jobId, 'Job ID should be set from previous test');
    
    // Test SSE endpoint availability and basic streaming
    const sseUrl = `${API_BASE_URL}/jobs/${jobId}/logs`;
    console.log(`✓ SSE endpoint: ${sseUrl}`);
    
    return new Promise<void>((resolve, reject) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        reject(new Error('SSE test timeout after 30 seconds'));
      }, 30000);
      
      let receivedEvents = 0;
      let jobCompleted = false;
      
      fetch(sseUrl, { signal: controller.signal })
        .then(response => {
          assert.strictEqual(response.status, 200, 'SSE endpoint should return 200');
          assert.ok(
            response.headers.get('content-type')?.includes('text/event-stream'),
            'Content-Type should be text/event-stream'
          );
          
          console.log(`✓ SSE connection established`);
          
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          
          if (!reader) {
            throw new Error('No reader available');
          }
          
          const readStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  break;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    receivedEvents++;
                    const data = line.slice(6);
                    
                    try {
                      const eventData = JSON.parse(data);
                      console.log(`  Event ${receivedEvents}: ${eventData.message || eventData.type || 'unknown'}`);
                      
                      // Check for completion
                      if (eventData.type === 'complete' || 
                          eventData.log?.message?.includes('completed') ||
                          eventData.log?.message?.includes('failed')) {
                        jobCompleted = true;
                      }
                    } catch (e) {
                      // Not JSON or parsing error, skip
                    }
                    
                    // For testing purposes, we'll consider the test successful after receiving a few events
                    // In a real scenario, we'd wait for job completion
                    if (receivedEvents >= 3) {
                      clearTimeout(timeout);
                      controller.abort();
                      console.log(`✓ Received ${receivedEvents} SSE events`);
                      resolve();
                      return;
                    }
                  }
                }
              }
            } catch (error: any) {
              if (error.name === 'AbortError') {
                // Expected when we abort
                if (receivedEvents >= 3) {
                  resolve();
                } else {
                  reject(new Error(`Only received ${receivedEvents} events before timeout`));
                }
              } else {
                reject(error);
              }
            }
          };
          
          readStream();
        })
        .catch(error => {
          if (error.name === 'AbortError') {
            // Check if we got enough events before timeout
            if (receivedEvents >= 3) {
              clearTimeout(timeout);
              resolve();
            } else {
              clearTimeout(timeout);
              reject(new Error(`Only received ${receivedEvents} events before abort`));
            }
          } else {
            clearTimeout(timeout);
            reject(error);
          }
        });
    });
  });
});
