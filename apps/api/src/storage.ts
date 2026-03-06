import { EventEmitter } from 'events';
import dotenv from 'dotenv';
import path from 'path';
import { getPlatformSupabaseClient } from './supabase/client';

// Load .env from the repository root (go up from apps/api/src to root)
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

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
  | 'testing';

export type EventSeverity = 'info' | 'error' | 'success' | 'warning';

// ── New hierarchical types ──

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Team {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

// ── Existing types (updated for Supabase) ──

export interface Project {
  id: string;
  name: string;
  team_id: string;
  repository_url: string | null;
  local_path: string;
  last_synced?: string | null;
  created_at: string;
  published_url?: string | null;
  published_at?: string | null;
  published_job_id?: string | null;
  // Backwards-compat: callers that use tenant_id can derive it from the org
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
  last_diff?: string;
  agent_results?: AgentResultSummary[];
}

// Minimal shape stored in DB — enough for UI display, not the full diff payload
export interface AgentResultSummary {
  agent: string;
  status: 'passed' | 'failed' | 'needs_fix' | 'cannot_fix';
  summary?: string;
  duration_ms: number;
  fixes?: { category: string; description: string; diff?: string }[];
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
    last_diff: row.last_diff ?? undefined,
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

class VibeStorage {
  // EventEmitters for real-time log streaming (in-memory, not stored in DB)
  private logEmitters = new Map<string, EventEmitter>();

  private get sb() {
    return getPlatformSupabaseClient();
  }

  // ── Organization methods ──

  async createOrganization(org: { name: string; slug: string }): Promise<Organization> {
    const { data, error } = await this.sb
      .from('organizations')
      .insert({ name: org.name, slug: org.slug })
      .select()
      .single();
    if (error) throw new Error(`Failed to create organization: ${error.message}`);
    return data as Organization;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const { data, error } = await this.sb
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return undefined;
    return data as Organization;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const { data, error } = await this.sb
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return undefined;
    return data as Organization;
  }

  async listOrganizations(): Promise<Organization[]> {
    const { data, error } = await this.sb
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list organizations: ${error.message}`);
    return (data || []) as Organization[];
  }

  // ── Team methods ──

  async createTeam(team: { org_id: string; name: string; slug: string }): Promise<Team> {
    const { data, error } = await this.sb
      .from('teams')
      .insert({ org_id: team.org_id, name: team.name, slug: team.slug })
      .select()
      .single();
    if (error) throw new Error(`Failed to create team: ${error.message}`);
    return data as Team;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const { data, error } = await this.sb
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return undefined;
    return data as Team;
  }

  async listTeams(orgId: string): Promise<Team[]> {
    const { data, error } = await this.sb
      .from('teams')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list teams: ${error.message}`);
    return (data || []) as Team[];
  }

  async addTeamMember(teamId: string, userId: string, role: string = 'member'): Promise<void> {
    const { error } = await this.sb
      .from('team_members')
      .upsert(
        { team_id: teamId, user_id: userId, role },
        { onConflict: 'team_id,user_id' }
      );
    if (error) throw new Error(`Failed to add team member: ${error.message}`);
  }

  async listTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await this.sb
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);
    if (error) throw new Error(`Failed to list team members: ${error.message}`);
    return (data || []) as TeamMember[];
  }

  // ── Project methods ──

  async createProject(project: {
    id?: string;
    name: string;
    team_id: string;
    repository_url?: string | null;
    local_path: string;
  }): Promise<Project> {
    const insert: Record<string, unknown> = {
      name: project.name,
      team_id: project.team_id,
      repository_url: project.repository_url ?? null,
      local_path: project.local_path,
    };
    if (project.id) insert.id = project.id;

    const { data, error } = await this.sb
      .from('projects')
      .insert(insert)
      .select()
      .single();
    if (error) throw new Error(`Failed to create project: ${error.message}`);
    return data as Project;
  }

  async getProject(projectId: string): Promise<Project | undefined> {
    const { data, error } = await this.sb
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (error) return undefined;
    return data as Project;
  }

  async getProjectByName(name: string): Promise<Project | undefined> {
    const { data, error } = await this.sb
      .from('projects')
      .select('*')
      .eq('name', name)
      .single();
    if (error) return undefined;
    return data as Project;
  }

  async listProjects(teamId: string): Promise<Project[]> {
    const { data, error } = await this.sb
      .from('projects')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list projects: ${error.message}`);
    return (data || []) as Project[];
  }

  async listProjectsByOrg(orgId: string): Promise<Project[]> {
    // Join through teams to filter by org; strip the nested teams data from result
    const { data, error } = await this.sb
      .from('projects')
      .select('*, teams!inner(org_id)')
      .eq('teams.org_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list projects by org: ${error.message}`);
    // Strip the nested `teams` join data before returning
    return (data || []).map((row: any) => {
      const { teams: _teams, ...project } = row;
      return project as Project;
    });
  }

  async updateProjectSync(projectId: string): Promise<void> {
    const { error } = await this.sb
      .from('projects')
      .update({ last_synced: new Date().toISOString() })
      .eq('id', projectId);
    if (error) throw new Error(`Failed to update project sync: ${error.message}`);
  }

  async deleteProject(projectId: string): Promise<void> {
    // Cascade is handled by ON DELETE CASCADE in the DB schema
    const { error } = await this.sb
      .from('projects')
      .delete()
      .eq('id', projectId);
    if (error) throw new Error(`Failed to delete project: ${error.message}`);
  }

  async publishProject(projectId: string, jobId: string, publishedUrl: string): Promise<void> {
    const { error } = await this.sb
      .from('projects')
      .update({
        published_url: publishedUrl,
        published_at: new Date().toISOString(),
        published_job_id: jobId,
      })
      .eq('id', projectId);
    if (error) throw new Error(`Failed to publish project: ${error.message}`);
  }

  // ── Task (Job) methods ──

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
      .single();
    if (error) return undefined;
    return jobRowToVibeTask(data as JobRow);
  }

  async updateTaskState(taskId: string, newState: ExecutionState): Promise<void> {
    const { error } = await this.sb
      .from('jobs')
      .update({
        execution_state: newState,
        last_modified: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) throw new Error(`Failed to update task state: ${error.message}`);

    // Schedule EventEmitter cleanup for terminal states (delay to let SSE clients drain)
    if (newState === 'completed' || newState === 'failed') {
      setTimeout(() => this.removeLogEmitter(taskId), 30_000);
    }
  }

  async incrementIteration(taskId: string): Promise<void> {
    // Read-then-write; safe because only one executor processes a task at a time
    const { data, error: readErr } = await this.sb
      .from('jobs')
      .select('iteration_count')
      .eq('id', taskId)
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

  async listRecentTasks(projectId: string): Promise<VibeTask[]> {
    const { data, error } = await this.sb
      .from('jobs')
      .select('*')
      .eq('project_id', projectId)
      .order('initiated_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(`Failed to list recent tasks: ${error.message}`);
    return (data || []).map((row) => jobRowToVibeTask(row as JobRow));
  }

  async listRecentTasksByOrg(orgId: string): Promise<VibeTask[]> {
    // Two-query approach: nested PostgREST joins are unreliable for filtering
    const projectIds = await this.getProjectIdsForOrg(orgId);
    if (projectIds.length === 0) return [];

    const { data, error } = await this.sb
      .from('jobs')
      .select('*')
      .in('project_id', projectIds)
      .order('initiated_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(`Failed to list recent tasks by org: ${error.message}`);
    return (data || []).map((row) => jobRowToVibeTask(row as JobRow));
  }

  async getQueuedTasks(): Promise<VibeTask[]> {
    const { data, error } = await this.sb
      .from('jobs')
      .select('*')
      .eq('execution_state', 'queued')
      .order('initiated_at', { ascending: true });
    if (error) throw new Error(`Failed to get queued tasks: ${error.message}`);
    return (data || []).map((row) => jobRowToVibeTask(row as JobRow));
  }

  async listTasksByProject(projectId: string, limit: number = 20): Promise<VibeTask[]> {
    const { data, error } = await this.sb
      .from('jobs')
      .select('*')
      .eq('project_id', projectId)
      .order('initiated_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to list tasks by project: ${error.message}`);
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
    if (error) throw new Error(`Failed to log event: ${error.message}`);

    // Emit the event in real-time to any listeners (matches VibeEvent shape)
    const emitter = this.logEmitters.get(taskId);
    if (emitter) {
      emitter.emit('log', {
        event_id: 0,
        task_id: taskId,
        event_message: message,
        severity,
        event_time: now,
      } satisfies VibeEvent);
    }
  }

  async getTaskEvents(taskId: string): Promise<VibeEvent[]> {
    const { data, error } = await this.sb
      .from('job_events')
      .select('*')
      .eq('job_id', taskId)
      .order('event_time', { ascending: true });
    if (error) throw new Error(`Failed to get task events: ${error.message}`);
    return (data || []).map((row) => eventRowToVibeEvent(row as JobEventRow));
  }

  async getEventsAfter(taskId: string, afterTime: string): Promise<VibeEvent[]> {
    const { data, error } = await this.sb
      .from('job_events')
      .select('*')
      .eq('job_id', taskId)
      .gt('event_time', afterTime)
      .order('event_time', { ascending: true });
    if (error) throw new Error(`Failed to get events after time: ${error.message}`);
    return (data || []).map((row) => eventRowToVibeEvent(row as JobEventRow));
  }

  // Get or create an EventEmitter for a task's log stream (in-memory only)
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

  // ── Diff storage ──

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

  async getTaskDiff(taskId: string): Promise<string | undefined> {
    const { data, error } = await this.sb
      .from('jobs')
      .select('last_diff')
      .eq('id', taskId)
      .single();
    if (error) return undefined;
    return (data as { last_diff: string | null })?.last_diff ?? undefined;
  }

  // ── Analytics ──

  async getAnalyticsOverview(orgId: string): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalProjects: number;
    avgIterations: number;
  }> {
    // Get all project IDs for this org
    const projectIds = await this.getProjectIdsForOrg(orgId);
    if (projectIds.length === 0) {
      return { totalJobs: 0, completedJobs: 0, failedJobs: 0, totalProjects: 0, avgIterations: 0 };
    }

    const { data: jobs, error: jobErr } = await this.sb
      .from('jobs')
      .select('execution_state, iteration_count')
      .in('project_id', projectIds);
    if (jobErr) throw new Error(`Failed to get analytics: ${jobErr.message}`);

    type StatsRow = { execution_state: string; iteration_count: number };
    const allJobs = (jobs || []) as StatsRow[];
    const totalJobs = allJobs.length;
    const completedJobs = allJobs.filter((j) => j.execution_state === 'completed').length;
    const failedJobs = allJobs.filter((j) => j.execution_state === 'failed').length;
    const avgIterations = totalJobs > 0
      ? Math.round((allJobs.reduce((sum, j) => sum + (j.iteration_count || 0), 0) / totalJobs) * 10) / 10
      : 0;

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      totalProjects: projectIds.length,
      avgIterations,
    };
  }

  // ── Billing ──

  private static readonly MODEL_RATES: Record<string, { input: number; output: number }> = {
    claude: { input: 3.0, output: 15.0 },
    gpt:    { input: 10.0, output: 30.0 },
  };

  private static costUsd(model: string, promptTokens: number, completionTokens: number): number {
    const rates = VibeStorage.MODEL_RATES[model] ?? VibeStorage.MODEL_RATES.claude;
    return (promptTokens / 1_000_000) * rates.input + (completionTokens / 1_000_000) * rates.output;
  }

  async getBillingUsage(orgId: string): Promise<{
    date: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    job_count: number;
  }[]> {
    // Get all project IDs for this org
    const projectIds = await this.getProjectIdsForOrg(orgId);
    if (projectIds.length === 0) return [];

    const { data: jobs, error } = await this.sb
      .from('jobs')
      .select('initiated_at, llm_model, llm_prompt_tokens, llm_completion_tokens')
      .in('project_id', projectIds)
      .not('llm_prompt_tokens', 'is', null);
    if (error) throw new Error(`Failed to get billing usage: ${error.message}`);

    // Group by date + model
    const groups = new Map<string, { input_tokens: number; output_tokens: number; job_count: number }>();
    type BillingRow = { initiated_at: string; llm_model: string | null; llm_prompt_tokens: number | null; llm_completion_tokens: number | null };
    for (const job of (jobs || []) as BillingRow[]) {
      const date = job.initiated_at.split('T')[0];
      const model = job.llm_model || 'claude';
      const key = `${date}|${model}`;
      const existing = groups.get(key) || { input_tokens: 0, output_tokens: 0, job_count: 0 };
      existing.input_tokens += job.llm_prompt_tokens || 0;
      existing.output_tokens += job.llm_completion_tokens || 0;
      existing.job_count += 1;
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).map(([key, val]) => {
      const [date, model] = key.split('|');
      return {
        date,
        model,
        input_tokens: val.input_tokens,
        output_tokens: val.output_tokens,
        cost_usd: VibeStorage.costUsd(model, val.input_tokens, val.output_tokens),
        job_count: val.job_count,
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  async getBillingExport(orgId: string): Promise<{
    task_id: string;
    initiated_at: string;
    llm_model: string;
    llm_prompt_tokens: number;
    llm_completion_tokens: number;
  }[]> {
    const projectIds = await this.getProjectIdsForOrg(orgId);
    if (projectIds.length === 0) return [];

    const { data, error } = await this.sb
      .from('jobs')
      .select('id, initiated_at, llm_model, llm_prompt_tokens, llm_completion_tokens')
      .in('project_id', projectIds)
      .not('llm_prompt_tokens', 'is', null)
      .order('initiated_at', { ascending: false });
    if (error) throw new Error(`Failed to get billing export: ${error.message}`);

    type ExportRow = { id: string; initiated_at: string; llm_model: string | null; llm_prompt_tokens: number | null; llm_completion_tokens: number | null };
    return (data || []).map((row: ExportRow) => ({
      task_id: row.id,
      initiated_at: row.initiated_at,
      llm_model: row.llm_model || 'claude',
      llm_prompt_tokens: row.llm_prompt_tokens || 0,
      llm_completion_tokens: row.llm_completion_tokens || 0,
    }));
  }

  async getTenantSpend(orgId: string): Promise<number> {
    const usage = await this.getBillingUsage(orgId);
    return usage.reduce((sum, r) => sum + r.cost_usd, 0);
  }

  async getTenantBudget(orgId: string): Promise<number | null> {
    const { data, error } = await this.sb
      .from('tenant_budgets')
      .select('limit_usd')
      .eq('org_id', orgId)
      .single();
    if (error) return null;
    return (data as { limit_usd: number })?.limit_usd ?? null;
  }

  async setTenantBudget(orgId: string, limitUsd: number): Promise<void> {
    const { error } = await this.sb
      .from('tenant_budgets')
      .upsert(
        { org_id: orgId, limit_usd: limitUsd, updated_at: new Date().toISOString() },
        { onConflict: 'org_id' }
      );
    if (error) throw new Error(`Failed to set tenant budget: ${error.message}`);
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

  // ── Supabase connections ──

  async getSupabaseConnection(projectId: string): Promise<{
    project_id: string;
    url: string;
    anon_key: string;
    service_key_enc: string;
    connected_at: string;
  } | undefined> {
    const { data, error } = await this.sb
      .from('supabase_connections')
      .select('*')
      .eq('project_id', projectId)
      .single();
    if (error) return undefined;
    return data as {
      project_id: string;
      url: string;
      anon_key: string;
      service_key_enc: string;
      connected_at: string;
    };
  }

  async upsertSupabaseConnection(
    projectId: string,
    url: string,
    anonKey: string,
    serviceKeyEnc: string,
  ): Promise<void> {
    const { error } = await this.sb
      .from('supabase_connections')
      .upsert(
        {
          project_id: projectId,
          url,
          anon_key: anonKey,
          service_key_enc: serviceKeyEnc,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'project_id' }
      );
    if (error) throw new Error(`Failed to upsert Supabase connection: ${error.message}`);
  }

  // ── Helpers ──

  private async getProjectIdsForOrg(orgId: string): Promise<string[]> {
    const { data, error } = await this.sb
      .from('projects')
      .select('id, teams!inner(org_id)')
      .eq('teams.org_id', orgId);
    if (error) throw new Error(`Failed to get project IDs for org: ${error.message}`);
    return (data || []).map((p: Record<string, unknown>) => p.id as string);
  }

  async getOrgForProject(projectId: string): Promise<Organization | undefined> {
    // Two-step: project → team → org (avoids double-nested PostgREST join)
    const project = await this.getProject(projectId);
    if (!project) return undefined;

    const team = await this.getTeam(project.team_id);
    if (!team) return undefined;

    return this.getOrganization(team.org_id);
  }
}

export const storage = new VibeStorage();
