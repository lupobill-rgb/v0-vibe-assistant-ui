import Database from 'better-sqlite3';
import path from 'path';

const storePath = process.env.DATABASE_PATH || './data/vibe.db';
const vibeDb = new Database(storePath);

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
  project_id: string;
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

class ExecutorStorage {
  private projectSelect = vibeDb.prepare(`SELECT * FROM projects WHERE project_id = ?`);
  private projectUpdateSync = vibeDb.prepare(`
    UPDATE projects 
    SET last_synced = ? 
    WHERE project_id = ?
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

  private tasksQueued = vibeDb.prepare(`
    SELECT * FROM vibe_tasks 
    WHERE execution_state = 'queued' 
    ORDER BY initiated_at ASC 
    LIMIT 1
  `);

  private eventInsert = vibeDb.prepare(`
    INSERT INTO vibe_events (task_id, event_message, severity, event_time)
    VALUES (?, ?, ?, ?)
  `);

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

  getNextQueuedTask(): VibeTask | undefined {
    return this.tasksQueued.get() as VibeTask | undefined;
  }

  getProject(projectId: string): Project | undefined {
    return this.projectSelect.get(projectId) as Project | undefined;
  }

  updateProjectSync(projectId: string): void {
    this.projectUpdateSync.run(Date.now(), projectId);
  }

  logEvent(taskId: string, message: string, severity: EventSeverity): void {
    this.eventInsert.run(taskId, message, severity, Date.now());
    console.log(`[${severity.toUpperCase()}] ${taskId}: ${message}`);
  }
}

export const storage = new ExecutorStorage();
export default vibeDb;
