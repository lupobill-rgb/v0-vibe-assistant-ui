import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';
import { runMigrations } from './migrations';

// Load .env from the repository root (go up from apps/api/src to root)
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const storePath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/vibe.db');
const storeDir = path.dirname(storePath);

if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
}

const vibeDb = new Database(storePath);

// Run migrations (creates all tables and applies schema changes)
runMigrations(vibeDb);

// Lifecycle states as defined in requirements
export type ExecutionState = 
  | 'queued'
  | 'cloning'
  | 'building_context'
  | 'calling_llm'
  | 'applying_diff'
  | 'running_preflight'
  | 'creating_pr'
  | 'completed'
  | 'failed';

export type EventSeverity = 'info' | 'error' | 'success' | 'warning';

export interface Project {
  id: string;
  name: string;
  repository_url: string | null;
  local_path: string;
  last_synced?: number;
  created_at: number;
}

export interface VibeTask {
  task_id: string;
  user_prompt: string;
  project_id?: string;
  repository_url?: string;
  source_branch: string;
  destination_branch: string;
  execution_state: ExecutionState;
  pull_request_link?: string;
  iteration_count: number;
  initiated_at: number;
  last_modified: number;
}

export interface VibeEvent {
  event_id: number;
  task_id: string;
  event_message: string;
  severity: EventSeverity;
  event_time: number;
}

class VibeStorage {
  // EventEmitters for real-time log streaming
  private logEmitters = new Map<string, EventEmitter>();

  // Project statements
  private projectInsert = vibeDb.prepare(`
    INSERT INTO vibe_projects (id, name, repository_url, local_path, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  private projectSelect = vibeDb.prepare(`SELECT * FROM vibe_projects WHERE id = ?`);
  private projectSelectByName = vibeDb.prepare(`SELECT * FROM vibe_projects WHERE name = ?`);
  private projectsList = vibeDb.prepare(`SELECT * FROM vibe_projects ORDER BY created_at DESC`);
  
  private projectUpdateSync = vibeDb.prepare(`
    UPDATE vibe_projects 
    SET last_synced = ? 
    WHERE id = ?
  `);

  private projectDelete = vibeDb.prepare(`DELETE FROM vibe_projects WHERE id = ?`);

  // Task statements - updated to support project_id
  private taskInsert = vibeDb.prepare(`
    INSERT INTO vibe_tasks (
      task_id, user_prompt, project_id, repository_url, source_branch, 
      destination_branch, execution_state, iteration_count, 
      initiated_at, last_modified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  private taskSelect = vibeDb.prepare(`SELECT * FROM vibe_tasks WHERE task_id = ?`);
  
  private taskStateUpdate = vibeDb.prepare(`
    UPDATE vibe_tasks 
    SET execution_state = ?, last_modified = ? 
    WHERE task_id = ?
  `);
  
  private taskIterationIncrement = vibeDb.prepare(`
    UPDATE vibe_tasks 
    SET iteration_count = iteration_count + 1, last_modified = ? 
    WHERE task_id = ?
  `);
  
  private taskPrUpdate = vibeDb.prepare(`
    UPDATE vibe_tasks 
    SET pull_request_link = ?, last_modified = ? 
    WHERE task_id = ?
  `);
  
  private tasksRecent = vibeDb.prepare(`
    SELECT * FROM vibe_tasks 
    ORDER BY initiated_at DESC 
    LIMIT 100
  `);

  private tasksQueued = vibeDb.prepare(`
    SELECT * FROM vibe_tasks 
    WHERE execution_state = 'queued' 
    ORDER BY initiated_at ASC
  `);

  private eventInsert = vibeDb.prepare(`
    INSERT INTO vibe_events (task_id, event_message, severity, event_time)
    VALUES (?, ?, ?, ?)
  `);
  
  private eventsForTask = vibeDb.prepare(`
    SELECT * FROM vibe_events 
    WHERE task_id = ? 
    ORDER BY event_time ASC
  `);
  
  private eventsAfterTime = vibeDb.prepare(`
    SELECT * FROM vibe_events 
    WHERE task_id = ? AND event_time > ? 
    ORDER BY event_time ASC
  `);

  // Task methods
  createTask(task: Omit<VibeTask, 'iteration_count'>): void {
    this.taskInsert.run(
      task.task_id,
      task.user_prompt,
      task.project_id || null,
      task.repository_url || null,
      task.source_branch,
      task.destination_branch,
      task.execution_state,
      0, // iteration_count starts at 0
      task.initiated_at,
      task.last_modified
    );
  }

  getTask(taskId: string): VibeTask | undefined {
    return this.taskSelect.get(taskId) as VibeTask | undefined;
  }

  updateTaskState(taskId: string, newState: ExecutionState): void {
    this.taskStateUpdate.run(newState, Date.now(), taskId);
    
    // Clean up EventEmitter for terminal states if no active listeners
    if (newState === 'completed' || newState === 'failed') {
      const emitter = this.logEmitters.get(taskId);
      if (emitter && emitter.listenerCount('log') === 0) {
        this.removeLogEmitter(taskId);
      }
    }
  }

  incrementIteration(taskId: string): void {
    this.taskIterationIncrement.run(Date.now(), taskId);
  }

  setPrUrl(taskId: string, prUrl: string): void {
    this.taskPrUpdate.run(prUrl, Date.now(), taskId);
  }

  listRecentTasks(): VibeTask[] {
    return this.tasksRecent.all() as VibeTask[];
  }

  getQueuedTasks(): VibeTask[] {
    return this.tasksQueued.all() as VibeTask[];
  }

  logEvent(taskId: string, message: string, severity: EventSeverity): void {
    const eventTime = Date.now();
    const event = {
      task_id: taskId,
      event_message: message,
      severity,
      event_time: eventTime
    };
    this.eventInsert.run(taskId, message, severity, eventTime);
    
    // Emit the event in real-time to any listeners
    const emitter = this.logEmitters.get(taskId);
    if (emitter) {
      emitter.emit('log', event);
    }
  }

  getTaskEvents(taskId: string): VibeEvent[] {
    return this.eventsForTask.all(taskId) as VibeEvent[];
  }

  getEventsAfter(taskId: string, afterTime: number): VibeEvent[] {
    return this.eventsAfterTime.all(taskId, afterTime) as VibeEvent[];
  }

  // Get or create an EventEmitter for a task's log stream
  getLogEmitter(taskId: string): EventEmitter {
    let emitter = this.logEmitters.get(taskId);
    if (!emitter) {
      emitter = new EventEmitter();
      this.logEmitters.set(taskId, emitter);
    }
    return emitter;
  }

  // Clean up EventEmitter when no longer needed
  removeLogEmitter(taskId: string): void {
    const emitter = this.logEmitters.get(taskId);
    if (emitter) {
      emitter.removeAllListeners();
      this.logEmitters.delete(taskId);
    }
  }

  // Project management methods
  createProject(project: Omit<Project, 'last_synced'>): void {
    this.projectInsert.run(
      project.id,
      project.name,
      project.repository_url,
      project.local_path,
      project.created_at
    );
  }

  getProject(projectId: string): Project | undefined {
    return this.projectSelect.get(projectId) as Project | undefined;
  }

  getProjectByName(name: string): Project | undefined {
    return this.projectSelectByName.get(name) as Project | undefined;
  }

  listProjects(): Project[] {
    return this.projectsList.all() as Project[];
  }

  updateProjectSync(projectId: string): void {
    this.projectUpdateSync.run(Date.now(), projectId);
  }

  deleteProject(projectId: string): void {
    this.projectDelete.run(projectId);
  }

  // ── User / Auth methods ──

  createUser(id: string, email: string, passwordHash: string, name: string): void {
    vibeDb.prepare(
      'INSERT INTO vibe_users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, email, passwordHash, name, Date.now());
  }

  getUserByEmail(email: string): { id: string; email: string; password_hash: string; name: string } | undefined {
    return vibeDb.prepare('SELECT id, email, password_hash, name FROM vibe_users WHERE email = ?').get(email) as any;
  }

  getUserById(id: string): { id: string; email: string; name: string } | undefined {
    return vibeDb.prepare('SELECT id, email, name FROM vibe_users WHERE id = ?').get(id) as any;
  }

  createAuthToken(token: string, userId: string, expiresAt: number): void {
    vibeDb.prepare(
      'INSERT INTO vibe_auth_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
    ).run(token, userId, Date.now(), expiresAt);
  }

  lookupAuthToken(token: string): { user_id: string; email: string; expires_at: number } | undefined {
    return vibeDb.prepare(`
      SELECT t.user_id, u.email, t.expires_at
      FROM vibe_auth_tokens t JOIN vibe_users u ON t.user_id = u.id
      WHERE t.token = ?
    `).get(token) as any;
  }

  deleteAuthToken(token: string): void {
    vibeDb.prepare('DELETE FROM vibe_auth_tokens WHERE token = ?').run(token);
  }

  // ── Workspace methods ──

  createWorkspace(id: string, name: string, ownerId: string): void {
    const now = Date.now();
    vibeDb.prepare(
      'INSERT INTO vibe_workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)'
    ).run(id, name, ownerId, now);
    vibeDb.prepare(
      'INSERT INTO vibe_workspace_members (workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
    ).run(id, ownerId, 'owner', now);
  }

  getWorkspace(id: string): { id: string; name: string; owner_id: string; created_at: number } | undefined {
    return vibeDb.prepare('SELECT * FROM vibe_workspaces WHERE id = ?').get(id) as any;
  }

  listWorkspacesForUser(userId: string): { id: string; name: string; role: string }[] {
    return vibeDb.prepare(`
      SELECT w.id, w.name, m.role
      FROM vibe_workspaces w JOIN vibe_workspace_members m ON w.id = m.workspace_id
      WHERE m.user_id = ?
      ORDER BY w.created_at DESC
    `).all(userId) as any[];
  }

  addWorkspaceMember(workspaceId: string, userId: string, role: string = 'member'): void {
    vibeDb.prepare(
      'INSERT OR IGNORE INTO vibe_workspace_members (workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
    ).run(workspaceId, userId, role, Date.now());
  }

  listProjectsByWorkspace(workspaceId: string): Project[] {
    return vibeDb.prepare(
      'SELECT * FROM vibe_projects WHERE workspace_id = ? ORDER BY created_at DESC'
    ).all(workspaceId) as Project[];
  }

  setProjectWorkspace(projectId: string, workspaceId: string): void {
    vibeDb.prepare('UPDATE vibe_projects SET workspace_id = ? WHERE id = ?').run(workspaceId, projectId);
  }

  // ── Diff storage ──

  setTaskDiff(taskId: string, diff: string): void {
    vibeDb.prepare('UPDATE vibe_tasks SET last_diff = ?, last_modified = ? WHERE task_id = ?').run(diff, Date.now(), taskId);
  }

  getTaskDiff(taskId: string): string | undefined {
    const row = vibeDb.prepare('SELECT last_diff FROM vibe_tasks WHERE task_id = ?').get(taskId) as any;
    return row?.last_diff || undefined;
  }

  // ── Analytics ──

  getAnalyticsOverview(): {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalProjects: number;
    avgIterations: number;
  } {
    const total = (vibeDb.prepare('SELECT COUNT(*) as c FROM vibe_tasks').get() as any).c;
    const completed = (vibeDb.prepare("SELECT COUNT(*) as c FROM vibe_tasks WHERE execution_state = 'completed'").get() as any).c;
    const failed = (vibeDb.prepare("SELECT COUNT(*) as c FROM vibe_tasks WHERE execution_state = 'failed'").get() as any).c;
    const projects = (vibeDb.prepare('SELECT COUNT(*) as c FROM vibe_projects').get() as any).c;
    const avgIter = (vibeDb.prepare('SELECT AVG(iteration_count) as a FROM vibe_tasks').get() as any).a || 0;
    return { totalJobs: total, completedJobs: completed, failedJobs: failed, totalProjects: projects, avgIterations: Math.round(avgIter * 10) / 10 };
  }

  getNextQueuedTask(): VibeTask | undefined {
    const tasks = vibeDb.prepare("SELECT * FROM vibe_tasks WHERE execution_state = 'queued' ORDER BY initiated_at ASC").all() as VibeTask[];
    return tasks.length > 0 ? tasks[0] : undefined;
  }
}

export const storage = new VibeStorage();
export default vibeDb;
