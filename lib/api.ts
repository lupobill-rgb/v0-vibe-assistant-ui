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
