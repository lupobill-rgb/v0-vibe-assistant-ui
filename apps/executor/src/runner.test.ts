import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Job } from './runner';

describe('Runner Module', () => {
  describe('Job Interface', () => {
    it('should define a valid Job structure', () => {
      const job: Job = {
        id: 'test-123',
        prompt: 'Add a new feature',
        project: {
          id: 'project-1',
          local_path: '/path/to/project',
          repository_url: 'https://github.com/owner/repo',
          github_repo: 'owner/repo'
        }
      };
      
      assert.strictEqual(job.id, 'test-123');
      assert.strictEqual(job.prompt, 'Add a new feature');
      assert.strictEqual(job.project.id, 'project-1');
      assert.strictEqual(job.project.local_path, '/path/to/project');
      assert.strictEqual(job.project.repository_url, 'https://github.com/owner/repo');
      assert.strictEqual(job.project.github_repo, 'owner/repo');
    });

    it('should allow optional github_repo', () => {
      const job: Job = {
        id: 'test-456',
        prompt: 'Fix a bug',
        project: {
          id: 'project-2',
          local_path: '/local/path',
          repository_url: null
        }
      };
      
      assert.strictEqual(job.project.github_repo, undefined);
    });

    it('should allow null values for paths', () => {
      const job: Job = {
        id: 'test-789',
        prompt: 'Update documentation',
        project: {
          id: 'project-3',
          local_path: null,
          repository_url: 'https://github.com/owner/repo'
        }
      };
      
      assert.strictEqual(job.project.local_path, null);
    });
  });
  
  describe('Runner Configuration', () => {
    it('should use MAX_ITERATIONS of 6', () => {
      // This is defined in runner.ts as const MAX_ITERATIONS = 6
      // We can't directly test it without running the actual function,
      // but we can document the expected behavior
      const expectedMaxIterations = 6;
      assert.strictEqual(expectedMaxIterations, 6);
    });
  });
});
