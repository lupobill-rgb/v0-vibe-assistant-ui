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

const SYSTEM_PROMPT =
  "You are a world-class web designer building production-ready websites. CRITICAL RULES: " +
  "1) Use Google Fonts (Inter for body, Space Grotesk for headings) via <link> tag. " +
  "2) Use CSS custom properties for a cohesive color scheme. " +
  "3) Every section needs generous padding (80px+ vertical). " +
  "4) Use subtle animations (CSS @keyframes for fade-in on scroll using IntersectionObserver in a <script> tag). " +
  "5) Hero section must have a gradient or image background with overlay text. " +
  "6) Buttons must have hover transforms (scale + shadow). " +
  "7) Include at least 5 sections: hero, features/benefits, social proof/testimonials, pricing or CTA, footer. " +
  "8) Use real compelling copy, never lorem ipsum. " +
  "9) All images use picsum.photos or solid CSS gradients. " +
  "10) Mobile responsive with @media queries. " +
  "11) Add smooth scroll behavior. " +
  "12) Inputs must have focus ring styles. " +
  "Return a complete HTML file, not a diff. Just the raw HTML starting with <!DOCTYPE html>."

export async function generateDiff(
  prompt: string,
  existingHtml?: string,
  refinement?: string,
): Promise<GenerateDiffResponse> {
  let fullPrompt = prompt
  if (existingHtml && refinement) {
    fullPrompt =
      `Original request: ${prompt}\n\n` +
      `Current HTML:\n\`\`\`html\n${existingHtml}\n\`\`\`\n\n` +
      `Refinement instructions: ${refinement}\n\n` +
      `Apply the refinement to the current HTML and return the full updated HTML file starting with <!DOCTYPE html>.`
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  let res: Response
  try {
    res = await fetch(GENERATE_DIFF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GENERATE_DIFF_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        model: "claude",
        system: SYSTEM_PROMPT,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Generation took too long. Try a simpler prompt.")
    }
    throw err
  }

  clearTimeout(timeout)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Generation failed (${res.status}): ${text}`)
  }

  return res.json()
}

// ── Multi-Page Site Generation ──────────────────────────────────────

export interface MultiPageSite {
  pages: Record<string, string> // pageName -> html
  pageOrder: string[] // preserve order
}

export interface PageProgress {
  pageName: string
  index: number
  total: number
}

/**
 * Generate a multi-page website.
 * 1. Ask the LLM for a JSON array of page names.
 * 2. Generate each page in parallel with consistent navigation.
 * 3. Return all pages as a { pages, pageOrder } object.
 */
export async function generateMultiPageSite(
  prompt: string,
  onPageStart?: (progress: PageProgress) => void,
  onPageDone?: (progress: PageProgress) => void,
): Promise<MultiPageSite> {
  // Step 1: Get the list of page names
  const planPrompt =
    `Based on this request, list ONLY the page names needed as a JSON array. ` +
    `Example: ["index", "about", "pricing", "contact"]. Maximum 5 pages. ` +
    `Return ONLY the JSON array, nothing else.\n\nRequest: ${prompt}`

  const planResponse = await generateDiff(planPrompt)
  const planText = planResponse.diff.trim()

  // Parse JSON array from the response (may be wrapped in markdown code fences)
  let pageNames: string[]
  try {
    const jsonMatch = planText.match(/\[[\s\S]*?\]/)
    if (!jsonMatch) throw new Error("No JSON array found")
    pageNames = JSON.parse(jsonMatch[0])
    if (!Array.isArray(pageNames) || pageNames.length === 0) {
      throw new Error("Empty array")
    }
  } catch {
    // Fallback: single-page site
    pageNames = ["index"]
  }

  // Cap at 5 pages
  pageNames = pageNames.slice(0, 5).map((n) => n.toLowerCase().replace(/\s+/g, "-"))

  // Ensure "index" is always first
  if (!pageNames.includes("index")) {
    pageNames.unshift("index")
  }

  const total = pageNames.length
  const navLinks = pageNames.map((p) => `${p}.html`).join(", ")

  // Step 2: Generate all pages in parallel
  const pagePromises = pageNames.map(async (pageName, index) => {
    onPageStart?.({ pageName, index, total })

    const pagePrompt =
      `Generate the ${pageName} page for: ${prompt}. ` +
      `Use consistent navbar on every page with links to: ${navLinks}. ` +
      `Use the same color scheme, fonts, and design system across all pages. ` +
      `Current page (${pageName}.html) should be highlighted/active in the navbar. ` +
      `Return ONLY the raw HTML.`

    const response = await generateDiff(pagePrompt)
    const html = extractHtmlFromDiff(response.diff)

    onPageDone?.({ pageName, index, total })
    return { pageName, html }
  })

  const results = await Promise.all(pagePromises)

  const pages: Record<string, string> = {}
  for (const { pageName, html } of results) {
    pages[pageName] = html
  }

  return { pages, pageOrder: pageNames }
}

/**
 * Extract HTML content from either raw HTML or a unified diff string.
 * - If the response starts with "<!DOCTYPE" or "<html", treat it as raw HTML.
 * - If it starts with "diff --git", extract added lines from the diff.
 * Deduplicates content if the same HTML appears twice (a common LLM artifact).
 */
export function extractHtmlFromDiff(input: string): string {
  const trimmed = input.trim()
  const lower = trimmed.toLowerCase()

  // Raw HTML mode: response is already a complete HTML file
  if (lower.startsWith("<!doctype") || lower.startsWith("<html")) {
    return deduplicateHtml(trimmed)
  }

  // Diff mode: extract added lines
  const html = trimmed
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n")
    .trim()

  return deduplicateHtml(html)
}

/**
 * If the HTML contains itself repeated, keep only the first copy.
 */
function deduplicateHtml(html: string): string {
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
