const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "test-tenant"

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": TENANT_ID,
    ...extra,
  }
}

export interface Project {
  id: string
  name: string
  repository_url: string
  created_at?: string
  updated_at?: string
}

export interface Job {
  task_id: string
  status: "pending" | "running" | "completed" | "failed"
  execution_state?: string
  logs?: string[]
  pull_request_link?: string
  preview_url?: string
  project_id?: string
  prompt?: string
  created_at?: string
}

export async function createProject(name: string): Promise<Project> {
  const res = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name,
      repository_url: "https://github.com/UbiGrowth/VIBE",
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create project: ${res.status} ${text}`)
  }
  return res.json()
}

export async function createJob(prompt: string, projectId: string): Promise<Job> {
  const res = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      prompt,
      project_id: projectId,
      base_branch: "main",
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create job: ${res.status} ${text}`)
  }
  return res.json()
}

export async function getJob(taskId: string): Promise<Job> {
  const res = await fetch(`${API_URL}/jobs/${taskId}`, {
    headers: headers(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get job: ${res.status} ${text}`)
  }
  return res.json()
}

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`, {
    headers: headers(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get projects: ${res.status} ${text}`)
  }
  return res.json()
}

// ── Generate Diff (Supabase Edge Function) ──────────────────────────

const GENERATE_DIFF_URL =
  "https://ptaqytvztkhjpuawdxng.supabase.co/functions/v1/generate-diff"

const GENERATE_DIFF_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YXF5dHZ6dGtoanB1YXdkeG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDAwNjYsImV4cCI6MjA4NzUxNjA2Nn0.V9lzpPsCZX3X9rdTTa0cTz6Al47wDeMNiVC7WXbTfq4"

export interface GenerateDiffResponse {
  diff: string
  usage: Record<string, unknown>
}

export async function generateDiff(prompt: string): Promise<GenerateDiffResponse> {
  const res = await fetch(GENERATE_DIFF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GENERATE_DIFF_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      model: "claude",
      system:
        "You are an expert web developer. Generate a COMPLETE, modern, beautiful HTML page. Always include: <!DOCTYPE html>, <html>, <head> with <meta viewport>, <title>, and a <style> tag with embedded CSS (use modern CSS with flexbox/grid, nice typography, gradients, shadows, rounded corners). Make it fully responsive and visually polished. Use a professional color scheme. Do NOT use Tailwind CDN or external stylesheets - embed all CSS inline in a <style> tag. Return ONLY a unified diff creating index.html with the complete file.",
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Generation failed (${res.status}): ${text}`)
  }

  return res.json()
}

/**
 * Extract HTML content from a unified diff string.
 * Keeps lines starting with "+" (added lines) but not "+++" (file header).
 * Strips the leading "+" character from each line.
 * Deduplicates content if the same HTML appears twice (a common LLM artifact).
 */
export function extractHtmlFromDiff(diff: string): string {
  const html = diff
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n")
    .trim()

  // Deduplicate: if the HTML contains itself repeated, keep only the first copy.
  // We detect this by looking for a second <!DOCTYPE or <html tag after the first.
  const lower = html.toLowerCase()
  const firstDoctype = lower.indexOf("<!doctype")
  const secondDoctype = lower.indexOf("<!doctype", firstDoctype + 1)
  if (secondDoctype !== -1) {
    return html.slice(0, secondDoctype).trim()
  }

  const firstHtml = lower.indexOf("<html")
  const secondHtml = lower.indexOf("<html", firstHtml + 1)
  if (secondHtml !== -1) {
    return html.slice(0, secondHtml).trim()
  }

  return html
}
