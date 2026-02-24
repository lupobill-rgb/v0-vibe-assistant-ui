import type { MultiPageSite } from "./api"

export interface SavedProject {
  id: string
  name: string
  prompt: string
  pages: Record<string, string>
  pageOrder: string[]
  createdAt: string
  lastModified: string
}

const STORAGE_KEY = "vibe-projects"

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function readAll(): SavedProject[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedProject[]
  } catch {
    return []
  }
}

function writeAll(projects: SavedProject[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

/** Get all saved projects, sorted by lastModified descending. */
export function getAllProjects(): SavedProject[] {
  return readAll().sort(
    (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
  )
}

/** Get the N most recent projects. */
export function getRecentProjects(count = 3): SavedProject[] {
  return getAllProjects().slice(0, count)
}

/** Get a single project by ID. */
export function getProject(id: string): SavedProject | undefined {
  return readAll().find((p) => p.id === id)
}

/** Save a new project. Returns the created project with its ID. */
export function saveProject(
  name: string,
  prompt: string,
  site: MultiPageSite,
): SavedProject {
  const now = new Date().toISOString()
  const project: SavedProject = {
    id: generateId(),
    name,
    prompt,
    pages: site.pages,
    pageOrder: site.pageOrder,
    createdAt: now,
    lastModified: now,
  }
  const all = readAll()
  all.push(project)
  writeAll(all)
  return project
}

/** Update an existing project (pages, name, etc). */
export function updateProject(
  id: string,
  updates: Partial<Pick<SavedProject, "name" | "pages" | "pageOrder" | "prompt">>,
): SavedProject | undefined {
  const all = readAll()
  const idx = all.findIndex((p) => p.id === id)
  if (idx === -1) return undefined

  all[idx] = {
    ...all[idx],
    ...updates,
    lastModified: new Date().toISOString(),
  }
  writeAll(all)
  return all[idx]
}

/** Delete a project by ID. Returns true if found and deleted. */
export function deleteProject(id: string): boolean {
  const all = readAll()
  const filtered = all.filter((p) => p.id !== id)
  if (filtered.length === all.length) return false
  writeAll(filtered)
  return true
}

/** Derive a project name from the user's prompt. */
export function deriveProjectName(prompt: string): string {
  // Take the first sentence or first 50 chars, whichever is shorter
  const cleaned = prompt.replace(/\n/g, " ").trim()
  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim() || cleaned
  if (firstSentence.length <= 50) return firstSentence
  return firstSentence.slice(0, 47) + "..."
}
