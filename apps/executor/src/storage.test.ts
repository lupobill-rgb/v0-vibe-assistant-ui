import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * Tests for storage functionality, specifically verifying that
 * projects table uses `id` as primary key (not `project_id`)
 */

describe('Storage - Project Lookup', () => {
  let testDb: Database.Database;
  let testDbPath: string;

  before(() => {
    // Create a temporary test database
    testDbPath = path.join('/tmp', `test-vibe-${Date.now()}.db`);
    testDb = new Database(testDbPath);

    // Initialize the same schema as storage.ts
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS vibe_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        repo_source TEXT NOT NULL,
        repo_dir TEXT NOT NULL,
        default_branch TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vibe_tasks (
        task_id TEXT PRIMARY KEY,
        user_prompt TEXT NOT NULL,
        project_id TEXT,
        repository_url TEXT,
        source_branch TEXT NOT NULL,
        destination_branch TEXT NOT NULL,
        execution_state TEXT NOT NULL,
        pull_request_link TEXT,
        iteration_count INTEGER DEFAULT 0,
        initiated_at INTEGER NOT NULL,
        last_modified INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES vibe_projects(id)
      );
    `);
  });

  after(() => {
    // Clean up test database
    testDb.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should insert and retrieve project using id column', () => {
    const projectId = 'test-project-123';
    const projectData = {
      id: projectId,
      name: 'Test Project',
      repo_source: 'https://github.com/test/repo',
      repo_dir: '/data/repos/test-project-123',
      default_branch: 'main',
      created_at: Date.now()
    };

    // Insert project using id column
    const insertStmt = testDb.prepare(`
      INSERT INTO vibe_projects (id, name, repo_source, repo_dir, default_branch, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      projectData.id,
      projectData.name,
      projectData.repo_source,
      projectData.repo_dir,
      projectData.default_branch,
      projectData.created_at
    );

    // Query using id column (not project_id)
    const selectStmt = testDb.prepare('SELECT * FROM vibe_projects WHERE id = ?');
    const result = selectStmt.get(projectId);

    assert.ok(result, 'Project should be retrieved');
    assert.strictEqual(result.id, projectId, 'Project id should match');
    assert.strictEqual(result.name, 'Test Project', 'Project name should match');
  });

  it('should allow tasks to reference projects via project_id foreign key', () => {
    const projectId = 'test-project-456';
    const taskId = 'test-task-123';

    // Insert a project
    const insertProject = testDb.prepare(`
      INSERT INTO vibe_projects (id, name, repo_source, repo_dir, default_branch, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertProject.run(projectId, 'Test Project 2', 'https://github.com/test/repo2', '/data/repos/test-project-456', 'main', Date.now());

    // Insert a task that references the project
    // Note: vibe_tasks.project_id is a foreign key to vibe_projects.id
    const insertTask = testDb.prepare(`
      INSERT INTO vibe_tasks (task_id, user_prompt, project_id, source_branch, destination_branch, execution_state, initiated_at, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTask.run(taskId, 'Test prompt', projectId, 'main', 'feature', 'queued', Date.now(), Date.now());

    // Verify task references correct project
    const selectTask = testDb.prepare('SELECT * FROM vibe_tasks WHERE task_id = ?');
    const task = selectTask.get(taskId);

    assert.ok(task, 'Task should be retrieved');
    assert.strictEqual(task.project_id, projectId, 'Task should reference project via project_id');

    // Verify we can join to get project info
    const joinQuery = testDb.prepare(`
      SELECT t.*, p.name as project_name
      FROM vibe_tasks t
      INNER JOIN vibe_projects p ON t.project_id = p.id
      WHERE t.task_id = ?
    `);
    const joinResult = joinQuery.get(taskId);

    assert.ok(joinResult, 'Join should return result');
    assert.strictEqual(joinResult.project_name, 'Test Project 2', 'Should join correctly via project_id -> id');
  });
});
