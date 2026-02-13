import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';

const storePath = process.env.DATABASE_PATH || '/app/data/vibe.db';
const storeDir = path.dirname(storePath);

if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
}

const vibeDb = new Database(storePath);

// Initialize VIBE storage schema with defined lifecycle states
vibeDb.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    repository_url TEXT NOT NULL,
    local_path TEXT NOT NULL,
    last_synced INTEGER,
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
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS vibe_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    event_message TEXT NOT NULL,
    severity TEXT NOT NULL,
    event_time INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES vibe_tasks(task_id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_by_task ON vibe_events(task_id, event_time);
  CREATE INDEX IF NOT EXISTS idx_tasks_by_project ON vibe_tasks(project_id);
`);

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
  repository_url: string;
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
    INSERT INTO projects (id, name, repository_url, local_path, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  private projectSelect = vibeDb.prepare(`SELECT * FROM projects WHERE id = ?`);
  private projectSelectByName = vibeDb.prepare(`SELECT * FROM projects WHERE name = ?`);
  private projectsList = vibeDb.prepare(`SELECT * FROM projects ORDER BY created_at DESC`);
  
  private projectUpdateSync = vibeDb.prepare(`
    UPDATE projects 
    SET last_synced = ? 
    WHERE id = ?
  `);

  private projectDelete = vibeDb.prepare(`DELETE FROM projects WHERE id = ?`);

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
    const event = {
      task_id: taskId,
      event_message: message,
      severity,
      event_time: Date.now()
    };
    this.eventInsert.run(taskId, message, severity, event.event_time);
    
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
}

export const storage = new VibeStorage();
export default vibeDb;
