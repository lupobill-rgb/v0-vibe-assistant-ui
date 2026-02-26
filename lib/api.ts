// API base URL — must be set via NEXT_PUBLIC_API_URL for browser access
const API_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:3001'

// Tenant ID — identifies the current user/workspace for multi-tenant isolation.
// For local dev this defaults to 'test-tenant'. Override via NEXT_PUBLIC_TENANT_ID.
export const TENANT_ID =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TENANT_ID) ||
  'test-tenant'

// ── Types ──────────────────────────────────────────────────────────────────

export interface LogEvent {
  event_id: number
  event_message: string
  severity: 'info' | 'error' | 'success' | 'warning'
  event_time: number
}

export interface Project {
  id: string
  team_id?: string
  name: string
  repository_url: string
  local_path: string
  last_synced?: number | string | null
  published_url?: string | null
  published_at?: string | null
  published_job_id?: string | null
  created_at: number | string
}

export interface Task {
  task_id: string
  user_prompt: string
  execution_state: string
  pull_request_link?: string
  preview_url?: string
  initiated_at: number
  completed_at?: number
  iteration_count: number
  project_id?: string
  repo_url?: string
  base_branch?: string
  target_branch?: string
  llm_provider?: string
  llm_prompt_tokens?: number
  llm_completion_tokens?: number
  llm_total_tokens?: number
  preflight_seconds?: number
  total_job_seconds?: number
  files_changed_count?: number
}

export interface HealthStatus {
  status: string
  timestamp: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Base headers required by every API call */
function baseHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': TENANT_ID,
    ...extra,
  }
}

/** GET headers (no Content-Type needed) */
function getHeaders(): Record<string, string> {
  return { 'X-Tenant-Id': TENANT_ID }
}

// ── Projects ───────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      headers: getHeaders(),
    })
    if (!response.ok) return []
    return response.json()
  } catch {
    return []
  }
}

export async function createProject(
  name: string,
  repositoryUrl?: string,
): Promise<{ id?: string; error?: string }> {
  const body: Record<string, string> = { name }
  if (repositoryUrl) body.repository_url = repositoryUrl
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify(body),
  })
  return response.json()
}

export async function importGithubProject(
  repoUrl: string,
): Promise<{ id?: string; error?: string }> {
  const response = await fetch(`${API_URL}/projects/import/github`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ repo_url: repoUrl }),
  })
  return response.json()
}

export async function fetchProject(id: string): Promise<Project | null> {
  try {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const response = await fetch(`${API_URL}/projects/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  return response.json()
}

export async function fetchProjectJobs(projectId: string): Promise<Task[]> {
  try {
    const response = await fetch(`${API_URL}/projects/${projectId}/jobs`, {
      headers: getHeaders(),
    })
    if (!response.ok) return []
    return response.json()
  } catch {
    return []
  }
}

// ── Jobs ───────────────────────────────────────────────────────────────────

export async function fetchJobs(): Promise<Task[]> {
  try {
    const response = await fetch(`${API_URL}/jobs`, {
      headers: getHeaders(),
    })
    if (!response.ok) return []
    return response.json()
  } catch {
    return []
  }
}

export async function createJob(params: {
  prompt: string
  project_id: string
  base_branch: string
  target_branch?: string
  llm_provider?: string
  llm_model?: string
}): Promise<{ task_id?: string; error?: string }> {
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify(params),
  })
  return response.json()
}

export async function fetchJob(taskId: string): Promise<Task | null> {
  try {
    const response = await fetch(`${API_URL}/jobs/${taskId}`, {
      headers: getHeaders(),
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

// ── Logs (SSE) ─────────────────────────────────────────────────────────────

export function getLogsSSEUrl(taskId: string): string {
  // Pass tenant ID as query parameter since EventSource cannot send custom headers
  return `${API_URL}/jobs/${taskId}/logs?tenant_id=${encodeURIComponent(TENANT_ID)}`
}

export function subscribeToLogs(
  taskId: string,
  onLog: (log: LogEvent) => void,
  onComplete: (state: string) => void,
  onError: () => void,
): () => void {
  const eventSource = new EventSource(getLogsSSEUrl(taskId))

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'complete') {
        onComplete(data.state)
        eventSource.close()
        return
      }
      // Unwrap { log: ... } format from NestJS controller if present
      const logEntry = data.log ?? data
      onLog(logEntry)
    } catch {
      // ignore parse errors
    }
  }

  eventSource.onerror = () => {
    eventSource.close()
    onError()
  }

  return () => eventSource.close()
}

// ── Health ─────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<HealthStatus | null> {
  try {
    const response = await fetch(`${API_URL}/health`)
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

// ── Project Type Detection ─────────────────────────────────────────────────

const DASHBOARD_KEYWORDS = [
  'dashboard',
  'analytics',
  'metrics',
  'kpi',
  'chart',
  'graphs',
  'reporting',
  'statistics',
]

export type ProjectType = 'dashboard' | 'website' | 'landing'

/** Detect project type from prompt keywords. */
export function detectProjectType(prompt: string): ProjectType {
  const lower = prompt.toLowerCase()
  if (DASHBOARD_KEYWORDS.some((kw) => lower.includes(kw))) return 'dashboard'
  if (/multi.?page|website|blog|portfolio|several pages/i.test(prompt)) return 'website'
  return 'landing'
}

// ── Site Generation (Supabase Edge Function) ──────────────────────────────

const GENERATE_URL =
  'https://ptaqytvztkhjpuawdxng.supabase.co/functions/v1/generate-diff'

export interface GeneratedPage {
  name: string
  html: string
}

const DASHBOARD_SYSTEM_PROMPT = `You are VIBE, an AI dashboard builder.
Return ONLY a complete, self-contained HTML page (no markdown fences, no explanation).
Requirements:
- Include <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> in the head
- Use a dark theme (background: #0f172a, text: #e2e8f0, cards: #1e293b)
- Layout: fixed sidebar navigation on the left (240px wide, dark), main content area on the right
- Top row of KPI cards (4 cards) showing key metrics with icons and trend indicators
- At least 2 Chart.js charts (e.g., line chart + bar chart or doughnut) rendered in <canvas> elements
- Responsive design using CSS grid/flexbox
- All CSS inline in a <style> tag, all JS in a <script> tag at the end of the body
- Initialize charts with realistic sample data in a DOMContentLoaded listener`

/**
 * Generate a single-page dashboard via the Supabase edge function.
 * Returns an array with exactly one GeneratedPage.
 */
export async function generateDashboard(
  prompt: string,
): Promise<GeneratedPage[]> {
  const res = await fetch(GENERATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `${DASHBOARD_SYSTEM_PROMPT}\n\nUser request: ${prompt}`,
      model: 'claude',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Dashboard generation failed')
  }

  const data: { diff: string } = await res.json()
  // The LLM returns raw HTML (not a diff) thanks to our system prompt
  return [{ name: 'Dashboard', html: data.diff }]
}

/**
 * Generate a multi-page website via the Supabase edge function.
 * Makes one call per page and returns an array of GeneratedPage objects.
 */
export async function generateMultiPageSite(
  prompt: string,
): Promise<GeneratedPage[]> {
  const pages = [
    { name: 'Home', instruction: 'Create the main landing / home page.' },
    { name: 'About', instruction: 'Create an About page with a team or mission section.' },
    { name: 'Contact', instruction: 'Create a Contact page with a form.' },
  ]

  const results = await Promise.all(
    pages.map(async (page) => {
      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are VIBE, an AI website builder. Return ONLY a complete, self-contained HTML page (no markdown fences, no explanation). Use a modern dark theme with clean typography.\n\nSite brief: ${prompt}\nPage: ${page.name} — ${page.instruction}`,
          model: 'claude',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `Failed to generate ${page.name}`)
      }

      const data: { diff: string } = await res.json()
      return { name: page.name, html: data.diff }
    }),
  )

  return results
}

// ── Billing ────────────────────────────────────────────────────────────────

export interface BillingInfo {
  plan: string
  jobs_total: number
  jobs_completed: number
  jobs_failed: number
  jobs_active: number
  tokens_used: number
  compute_seconds: number
  files_changed: number
}

/** Derives usage stats from the jobs list (no dedicated billing endpoint). */
export async function fetchBillingInfo(): Promise<BillingInfo | null> {
  try {
    const jobs = await fetchJobs()
    return {
      plan: 'free',
      jobs_total: jobs.length,
      jobs_completed: jobs.filter((j) => j.execution_state === 'completed').length,
      jobs_failed: jobs.filter((j) => j.execution_state === 'failed').length,
      jobs_active: jobs.filter((j) =>
        ['running', 'queued'].includes(j.execution_state)
      ).length,
      tokens_used: jobs.reduce((acc, j) => acc + (j.llm_total_tokens ?? 0), 0),
      compute_seconds: jobs.reduce((acc, j) => acc + (j.total_job_seconds ?? 0), 0),
      files_changed: jobs.reduce((acc, j) => acc + (j.files_changed_count ?? 0), 0),
    }
  } catch {
    return null
  }
}
