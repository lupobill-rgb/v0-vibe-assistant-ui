import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the repository root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

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
  | 'failed'
  // Agent pipeline states
  | 'planning'
  | 'security'
  | 'building'
  | 'validating'
  | 'ux'
  | 'self-healing'
  | 'testing';

export type EventSeverity = 'info' | 'error' | 'success' | 'warning';

export interface Project {
  id: string;
  name: string;
  team_id: string;
  repository_url: string | null;
  local_path: string;
  last_synced?: string | null;
  created_at: string;
  tenant_id?: string;
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
  preview_url?: string;
  iteration_count: number;
  initiated_at: string;
  last_modified: string;
  tenant_id?: string;
  llm_model?: string;
  llm_prompt_tokens?: number;
  llm_completion_tokens?: number;
  llm_total_tokens?: number;
  preflight_seconds?: number;
  total_job_seconds?: number;
  files_changed_count?: number;
  agent_results?: AgentResultSummary[];
}

// Canonical definition — keep in sync with apps/api/src/storage.ts
export interface AgentResultSummary {
  agent: string;
  status: 'passed' | 'failed' | 'needs_fix' | 'cannot_fix';
  summary?: string;
  duration_ms: number;
  fixes?: { category: string; description: string }[];
}

export interface VibeEvent {
  event_id: number;
  task_id: string;
  event_message: string;
  severity: EventSeverity;
  event_time: string;
}

// ── Row types from Supabase (DB column names) ──

interface JobRow {
  id: string;
  project_id: string;
  user_prompt: string;
  repository_url: string | null;
  source_branch: string;
  destination_branch: string;
  execution_state: string;
  pull_request_link: string | null;
  preview_url: string | null;
  iteration_count: number;
  llm_model: string | null;
  llm_prompt_tokens: number | null;
  llm_completion_tokens: number | null;
  llm_total_tokens: number | null;
  preflight_seconds: number | null;
  total_job_seconds: number | null;
  files_changed_count: number | null;
  last_diff: string | null;
  initiated_at: string;
  last_modified: string;
  agent_results: AgentResultSummary[] | null;
}

interface JobEventRow {
  id: number;
  job_id: string;
  event_message: string;
  severity: string;
  event_time: string;
}

// ── Mappers ──

function jobRowToVibeTask(row: JobRow): VibeTask {
  return {
    task_id: row.id,
    user_prompt: row.user_prompt,
    project_id: row.project_id,
    repository_url: row.repository_url || undefined,
    source_branch: row.source_branch,
    destination_branch: row.destination_branch,
    execution_state: row.execution_state as ExecutionState,
    pull_request_link: row.pull_request_link || undefined,
    preview_url: row.preview_url || undefined,
    iteration_count: row.iteration_count,
    initiated_at: row.initiated_at,
    last_modified: row.last_modified,
    llm_model: row.llm_model || undefined,
    llm_prompt_tokens: row.llm_prompt_tokens ?? undefined,
    llm_completion_tokens: row.llm_completion_tokens ?? undefined,
    llm_total_tokens: row.llm_total_tokens ?? undefined,
    preflight_seconds: row.preflight_seconds ?? undefined,
    total_job_seconds: row.total_job_seconds ?? undefined,
    files_changed_count: row.files_changed_count ?? undefined,
    agent_results: row.agent_results ?? undefined,
  };
}

function eventRowToVibeEvent(row: JobEventRow): VibeEvent {
  return {
    event_id: row.id,
    task_id: row.job_id,
    event_message: row.event_message,
    severity: row.severity as EventSeverity,
    event_time: row.event_time,
  };
}

// ── Supabase client singleton ──

let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for executor storage'
    );
  }
  _client = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _client;
}

class ExecutorStorage {
  private get sb() {
    return getSupabaseClient();
  }

  // ── Task methods ──

  async createTask(task: Omit<VibeTask, 'iteration_count'>): Promise<void> {
    const insert: Record<string, unknown> = {
      id: task.task_id,
      user_prompt: task.user_prompt,
      project_id: task.project_id || null,
      repository_url: task.repository_url || null,
      source_branch: task.source_branch,
      destination_branch: task.destination_branch,
      execution_state: task.execution_state,
      iteration_count: 0,
      initiated_at: task.initiated_at || new Date().toISOString(),
      last_modified: task.last_modified || new Date().toISOString(),
      llm_model: task.llm_model || 'claude',
    };

    const { error } = await this.sb
      .from('jobs')
      .insert(insert);
    if (error) throw new Error(`Failed to create task: ${error.message}`);
  }

  async getTask(taskId: string): Promise<VibeTask | undefined> {
    const { data, error } = await this.sb
      .from('jobs')
      .select('*')
      .eq('id', taskId)
      .limit(1)
      .single();
    if (error) return undefined;
    return jobRowToVibeTask(data as JobRow);
  }

  async updateTaskState(taskId: string, state: ExecutionState): Promise<void> {
    const { error } = await this.sb
      .from('jobs')
      .update({
        execution_state: state,
        last_modified: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw new Error(`Failed to update task state: ${error.message}`);
  }

  async incrementIteration(taskId: string): Promise<void> {
    // Read-then-write; safe because only one executor processes a task at a time
    const { data, error: readErr } = await this.sb
      .from('jobs')
      .select('iteration_count')
      .eq('id', taskId)
      .limit(1)
      .single();
    if (readErr) throw new Error(`Failed to read iteration count: ${readErr.message}`);

    const current = (data as { iteration_count: number }).iteration_count || 0;
    const { error } = await this.sb
      .from('jobs')
      .update({
        iteration_count: current + 1,
        last_modified: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw new Error(`Failed to increment iteration: ${error.message}`);
  }

  async setPrUrl(taskId: string, prUrl: string): Promise<void> {
    const { error } = await this.sb
      .from('jobs')
      .update({
        pull_request_link: prUrl,
        last_modified: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw new Error(`Failed to set PR URL: ${error.message}`);
  }

  async setPreviewUrl(taskId: string, previewUrl: string): Promise<void> {
    const { error } = await this.sb
      .from('jobs')
      .update({
        preview_url: previewUrl,
        last_modified: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw new Error(`Failed to set preview URL: ${error.message}`);
  }

  async setTaskDiff(taskId: string, diff: string): Promise<void> {
    const { error } = await this.sb
      .from('jobs')
      .update({
        last_diff: diff,
        last_modified: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw new Error(`Failed to set task diff: ${error.message}`);
  }

  async getRecentTasks(): Promise<VibeTask[]> {
    const { data, error } = await this.sb
      .from('jobs')
      .select('*')
      .order('initiated_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(`Failed to list recent tasks: ${error.message}`);
    return (data || []).map((row) => jobRowToVibeTask(row as JobRow));
  }

  async getNextQueuedTask(): Promise<VibeTask | undefined> {
    const { data, error } = await this.sb
      .from('jobs')
      .select('*')
      .eq('execution_state', 'queued')
      .order('initiated_at', { ascending: true })
      .limit(1)
      .single();
    if (error) return undefined;
    return jobRowToVibeTask(data as JobRow);
  }

  async getProject(projectId: string, _tenantId?: string): Promise<Project | undefined> {
    const { data, error } = await this.sb
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (error) return undefined;
    return data as Project;
  }

  // ── Event methods ──

  async logEvent(taskId: string, message: string, severity: EventSeverity): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.sb
      .from('job_events')
      .insert({
        job_id: taskId,
        event_message: message,
        severity,
        event_time: now,
      });
    if (error) {
      // Log to console but don't throw — logging failures shouldn't crash execution
      console.error(`Failed to log event to Supabase: ${error.message}`);
    }
    console.log(`[${severity.toUpperCase()}] ${taskId}: ${message}`);
  }

  async getEventsForTask(taskId: string): Promise<VibeEvent[]> {
    const { data, error } = await this.sb
      .from('job_events')
      .select('*')
      .eq('job_id', taskId)
      .order('event_time', { ascending: true });
    if (error) throw new Error(`Failed to get task events: ${error.message}`);
    return (data || []).map((row) => eventRowToVibeEvent(row as JobEventRow));
  }

  async getEventsAfterTime(taskId: string, afterTime: string): Promise<VibeEvent[]> {
    const { data, error } = await this.sb
      .from('job_events')
      .select('*')
      .eq('job_id', taskId)
      .gt('event_time', afterTime)
      .order('event_time', { ascending: true });
    if (error) throw new Error(`Failed to get events after time: ${error.message}`);
    return (data || []).map((row) => eventRowToVibeEvent(row as JobEventRow));
  }

  // ── Agent results ──

  async updateTaskAgentResults(taskId: string, agentResults: AgentResultSummary[]): Promise<void> {
    const { error } = await this.sb
      .from('jobs')
      .update({
        agent_results: agentResults,
        last_modified: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw new Error(`Failed to update agent results: ${error.message}`);
  }

  // ── Usage metrics ──

  async updateTaskUsageMetrics(taskId: string, metrics: {
    llm_prompt_tokens?: number;
    llm_completion_tokens?: number;
    llm_total_tokens?: number;
    preflight_seconds?: number;
    total_job_seconds?: number;
    files_changed_count?: number;
  }): Promise<void> {
    const updates: Record<string, unknown> = {
      last_modified: new Date().toISOString(),
    };

    if (metrics.llm_prompt_tokens !== undefined) updates.llm_prompt_tokens = metrics.llm_prompt_tokens;
    if (metrics.llm_completion_tokens !== undefined) updates.llm_completion_tokens = metrics.llm_completion_tokens;
    if (metrics.llm_total_tokens !== undefined) updates.llm_total_tokens = metrics.llm_total_tokens;
    if (metrics.preflight_seconds !== undefined) updates.preflight_seconds = metrics.preflight_seconds;
    if (metrics.total_job_seconds !== undefined) updates.total_job_seconds = metrics.total_job_seconds;
    if (metrics.files_changed_count !== undefined) updates.files_changed_count = metrics.files_changed_count;

    const { error } = await this.sb
      .from('jobs')
      .update(updates)
      .eq('id', taskId);
    if (error) throw new Error(`Failed to update usage metrics: ${error.message}`);
  }

}

export const storage = new ExecutorStorage();
