// API base URL — must be set via NEXT_PUBLIC_API_URL for browser access
const API_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:3001'

// Tenant ID — identifies the current user/workspace for multi-tenant isolation.
// For local dev this defaults to 'local'. Override via NEXT_PUBLIC_TENANT_ID.
export const TENANT_ID =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TENANT_ID) ||
  'local'

// ── Types ──────────────────────────────────────────────────────────────────

export interface LogEvent {
  event_id: number
  event_message: string
  severity: 'info' | 'error' | 'success' | 'warning'
  event_time: number
}

export interface Project {
  id: string
  name: string
  repository_url: string
  local_path: string
  last_synced?: number
  created_at: number
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
): Promise<{ id?: string; error?: string }> {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ name }),
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

// ── Site Generation Types ─────────────────────────────────────────────────

export interface PageProgress {
  pageName: string
  index: number
  total: number
}

export interface MultiPageSite {
  pages: Record<string, string>
  pageOrder: string[]
}

// ── Dashboard Generation ──────────────────────────────────────────────────

const DASHBOARD_SYSTEM_PROMPT = `You are an expert HTML dashboard generator.
Given a user description, generate a single, complete, self-contained HTML file that implements the described dashboard.

REQUIREMENTS:
- Output a COMPLETE HTML document with <!DOCTYPE html>, <html>, <head>, and <body> tags.
- Include all CSS inline within a <style> tag in the <head>.
- Include all JavaScript inline within a <script> tag before </body>.
- Use a modern, clean design with a dark theme background (#1a1a2e or similar).
- Use CSS Grid or Flexbox for layout.
- Include responsive breakpoints for mobile and tablet.
- Use placeholder/sample data to populate charts and metrics.
- Include Chart.js via inline script for charts — do NOT reference external CDN libraries.
- Include sidebar navigation, KPI cards, charts, and a data table.
- The dashboard must look complete and professional with realistic sample data.
- Do NOT use any external resources, CDNs, or imports — everything must be self-contained.

OUTPUT FORMAT:
Output ONLY the raw HTML. No markdown fences, no explanations, no diff format.
Start with <!DOCTYPE html> and end with </html>.`

// ── Internal Generation Helpers ───────────────────────────────────────────

async function generateDiff(
  prompt: string,
  context?: string,
  options?: unknown,
  systemPrompt?: string,
): Promise<{ diff: string }> {
  const response = await fetch(`${API_URL}/api/generate`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      prompt,
      context: context ?? undefined,
      options: options ?? undefined,
      system_prompt: systemPrompt ?? undefined,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Generation failed' }))
    throw new Error(err.error || `Generate request failed with status ${response.status}`)
  }

  return response.json()
}

function extractHtmlFromDiff(diff: string): string {
  const trimmed = diff.trim()

  // If the response is already raw HTML, return as-is
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    return trimmed
  }

  // Try to extract HTML from markdown code fences
  const fenceMatch = trimmed.match(/```(?:html)?\s*\n([\s\S]*?)```/)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  // Try to extract from a unified diff (new file content after +++ lines)
  const lines = trimmed.split('\n')
  const htmlLines: string[] = []
  let inDiff = false

  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('@@')) {
      inDiff = true
      continue
    }
    if (line.startsWith('---') || line.startsWith('diff --git')) {
      continue
    }
    if (inDiff && line.startsWith('+')) {
      htmlLines.push(line.slice(1))
    } else if (inDiff && !line.startsWith('-') && !line.startsWith('\\')) {
      htmlLines.push(line)
    }
  }

  if (htmlLines.length > 0) {
    return htmlLines.join('\n').trim()
  }

  // Fallback: return the raw content
  return trimmed
}

function detectProjectType(prompt: string): string {
  const lower = prompt.toLowerCase()

  const dashboardKeywords = [
    'dashboard', 'analytics dashboard', 'admin panel', 'admin dashboard',
    'metrics dashboard', 'monitoring dashboard', 'kpi', 'data dashboard',
    'reporting dashboard', 'stats dashboard',
  ]
  for (const keyword of dashboardKeywords) {
    if (lower.includes(keyword)) return 'dashboard'
  }

  const landingKeywords = [
    'landing page', 'homepage', 'marketing page', 'sales page',
    'hero section', 'coming soon', 'waitlist',
  ]
  for (const keyword of landingKeywords) {
    if (lower.includes(keyword)) return 'landing'
  }

  const portfolioKeywords = ['portfolio', 'personal site', 'resume site', 'cv site']
  for (const keyword of portfolioKeywords) {
    if (lower.includes(keyword)) return 'portfolio'
  }

  const blogKeywords = ['blog', 'articles', 'news site', 'magazine']
  for (const keyword of blogKeywords) {
    if (lower.includes(keyword)) return 'blog'
  }

  const ecomKeywords = ['e-commerce', 'ecommerce', 'shop', 'store', 'product page', 'checkout']
  for (const keyword of ecomKeywords) {
    if (lower.includes(keyword)) return 'ecommerce'
  }

  return 'generic'
}

// ── Single-page Dashboard Generation ────────────────────────────────────
async function generateDashboard(
  prompt: string,
  onPageStart?: (progress: PageProgress) => void,
  onPageDone?: (progress: PageProgress) => void,
): Promise<MultiPageSite> {
  onPageStart?.({ pageName: "dashboard", index: 0, total: 1 })
  const dashboardPrompt =
    `Build a complete, interactive analytics dashboard for: ${prompt}\n\n` +
    `Include sidebar navigation, KPI cards, Chart.js charts, and a data table. ` +
    `Use realistic sample data. Return ONLY raw HTML.`
  const response = await generateDiff(
    dashboardPrompt,
    undefined,
    undefined,
    DASHBOARD_SYSTEM_PROMPT,
  )
  const html = extractHtmlFromDiff(response.diff)
  if (!html.trim()) {
    throw new Error("Dashboard generation produced no HTML. Try a more specific prompt.")
  }
  onPageDone?.({ pageName: "dashboard", index: 0, total: 1 })
  return {
    pages: { dashboard: html },
    pageOrder: ["dashboard"],
  }
}

// ── Multi-Page Site Generation ────────────────────────────────────────────

function getPageNamesForType(projectType: string): string[] {
  switch (projectType) {
    case 'landing':
      return ['home', 'features', 'pricing', 'contact']
    case 'portfolio':
      return ['home', 'projects', 'about', 'contact']
    case 'blog':
      return ['home', 'articles', 'about']
    case 'ecommerce':
      return ['home', 'products', 'cart', 'checkout']
    case 'dashboard':
      return ['dashboard']
    default:
      return ['home', 'about', 'contact']
  }
}

export async function generateMultiPageSite(
  prompt: string,
  projectType?: string,
  onPageStart?: (progress: PageProgress) => void,
  onPageDone?: (progress: PageProgress) => void,
): Promise<MultiPageSite> {
  const detectedType = projectType || detectProjectType(prompt)
  // Dashboard: skip multi-page planning, generate single page directly
  if (detectedType === "dashboard") {
    return generateDashboard(prompt, onPageStart, onPageDone)
  }

  const pages: Record<string, string> = {}
  const pageOrder: string[] = []
  const pageNames = getPageNamesForType(detectedType)

  for (let i = 0; i < pageNames.length; i++) {
    const pageName = pageNames[i]
    const progress: PageProgress = { pageName, index: i, total: pageNames.length }

    onPageStart?.(progress)

    const pagePrompt = `Generate the "${pageName}" page for: ${prompt}\nReturn ONLY raw HTML.`
    const response = await generateDiff(pagePrompt)
    const html = extractHtmlFromDiff(response.diff)

    pages[pageName] = html
    pageOrder.push(pageName)

    onPageDone?.(progress)
  }

  return { pages, pageOrder }
}
