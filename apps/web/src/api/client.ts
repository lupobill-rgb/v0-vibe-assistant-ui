const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LogEvent {
  event_id: number;
  event_message: string;
  severity: 'info' | 'error' | 'success' | 'warning';
  event_time: number;
}

export interface Project {
  id: string;
  name: string;
  repository_url: string;
  local_path: string;
  last_synced?: number;
  created_at: number;
}

export interface Task {
  task_id: string;
  user_prompt: string;
  execution_state: string;
  pull_request_link?: string;
  preview_url?: string;
  initiated_at: number;
  completed_at?: number;
  iteration_count: number;
  project_id?: string;
  repo_url?: string;
  base_branch?: string;
  target_branch?: string;
  llm_provider?: string;
  llm_prompt_tokens?: number;
  llm_completion_tokens?: number;
  llm_total_tokens?: number;
  preflight_seconds?: number;
  total_job_seconds?: number;
  files_changed_count?: number;
}

export interface HealthStatus {
  status: string;
  timestamp: number;
}

// ── Projects ───────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_URL}/projects`);
  if (!response.ok) return [];
  return response.json();
}

export async function createProject(
  name: string,
): Promise<{ id?: string; error?: string }> {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return response.json();
}

export async function importGithubProject(
  repoUrl: string,
): Promise<{ id?: string; error?: string }> {
  const response = await fetch(`${API_URL}/projects/import/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl }),
  });
  return response.json();
}

export async function deleteProject(
  id: string,
): Promise<{ error?: string }> {
  const response = await fetch(`${API_URL}/projects/${id}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function fetchProjectJobs(projectId: string): Promise<Task[]> {
  const response = await fetch(`${API_URL}/projects/${projectId}/jobs`);
  if (!response.ok) return [];
  return response.json();
}

// ── Jobs ───────────────────────────────────────────────────────────────────

export async function fetchJobs(): Promise<Task[]> {
  const response = await fetch(`${API_URL}/jobs`);
  if (!response.ok) return [];
  return response.json();
}

export async function createJob(params: {
  prompt: string;
  project_id: string;
  base_branch: string;
  target_branch?: string;
  llm_provider?: string;
  llm_model?: string;
}): Promise<{ task_id?: string; error?: string }> {
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}

export async function fetchJob(taskId: string): Promise<Task> {
  const response = await fetch(`${API_URL}/jobs/${taskId}`);
  return response.json();
}

// ── Logs (SSE) ─────────────────────────────────────────────────────────────

export function subscribeToLogs(
  taskId: string,
  onLog: (log: LogEvent) => void,
  onComplete: (state: string) => void,
  onError: () => void,
): () => void {
  const eventSource = new EventSource(`${API_URL}/jobs/${taskId}/logs`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'complete') {
        onComplete(data.state);
        eventSource.close();
        return;
      }
      onLog(data);
    } catch {
      // ignore parse errors
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    onError();
  };

  return () => eventSource.close();
}

export function getLogsSSEUrl(taskId: string): string {
  return `${API_URL}/jobs/${taskId}/logs`;
}

// ── Diff ───────────────────────────────────────────────────────────────────

export async function fetchDiff(taskId: string): Promise<{ diff: string | null }> {
  const response = await fetch(`${API_URL}/jobs/${taskId}/diff`);
  if (!response.ok) {
    const status = response.status;
    throw new Error(status === 404 ? 'No diff available for this task' : 'Failed to fetch diff');
  }
  return response.json();
}

export async function applyDiff(
  taskId: string,
  diff: string,
): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(`${API_URL}/jobs/${taskId}/diff/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diff }),
  });
  const data = await response.json();
  return { ok: response.ok, message: data.message || data.error || 'Done' };
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function authLogin(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function authRegister(
  email: string,
  password: string,
  name: string,
): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

// ── Health ─────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<HealthStatus | null> {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
