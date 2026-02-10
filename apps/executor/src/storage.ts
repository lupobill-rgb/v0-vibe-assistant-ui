import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const storePath = process.env.DATABASE_PATH || './data/vibe.db';
const storeDir = path.dirname(storePath);

if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
}

const vibeDb = new Database(storePath);

// Initialize VIBE storage schema with defined lifecycle states
vibeDb.exec(`
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

  CREATE TABLE IF NOT EXISTS vibe_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    event_message TEXT NOT NULL,
    severity TEXT NOT NULL,
    event_time INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES vibe_tasks(task_id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_by_task ON vibe_events(task_id, event_time);
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

export type RepoSource = 'template' | 'github_import';

export interface VibeProject {
  id: string;
  name: string;
  repo_source: RepoSource;
  repo_dir: string;
  default_branch: string;
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
  // Project statements
  private projectInsert = vibeDb.prepare(`
    INSERT INTO vibe_projects (id, name, repo_source, repo_dir, default_branch, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  private projectSelect = vibeDb.prepare(`SELECT * FROM vibe_projects WHERE id = ?`);

  private projectsAll = vibeDb.prepare(`
    SELECT * FROM vibe_projects 
    ORDER BY created_at DESC
  `);

  // Task statements
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

  // Project methods
  createProject(project: VibeProject): void {
    this.projectInsert.run(
      project.id,
      project.name,
      project.repo_source,
      project.repo_dir,
      project.default_branch,
      project.created_at
    );
  }

  getProject(projectId: string): VibeProject | undefined {
    return this.projectSelect.get(projectId) as VibeProject | undefined;
  }

  listProjects(): VibeProject[] {
    return this.projectsAll.all() as VibeProject[];
  }

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
    this.eventInsert.run(taskId, message, severity, Date.now());
  }

  getTaskEvents(taskId: string): VibeEvent[] {
    return this.eventsForTask.all(taskId) as VibeEvent[];
  }

  getEventsAfter(taskId: string, afterTime: number): VibeEvent[] {
    return this.eventsAfterTime.all(taskId, afterTime) as VibeEvent[];
  }
}

export const storage = new VibeStorage();
export default vibeDb;
