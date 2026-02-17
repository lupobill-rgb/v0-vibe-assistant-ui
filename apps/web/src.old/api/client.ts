const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  execution_state: string;
  pull_request_link?: string;
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_URL}/projects`);
  if (!response.ok) return [];
  return response.json();
}

export async function createProject(name: string): Promise<{ id?: string; error?: string }> {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return response.json();
}

export async function createJob(params: {
  prompt: string;
  project_id: string;
  base_branch: string;
  target_branch?: string;
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
