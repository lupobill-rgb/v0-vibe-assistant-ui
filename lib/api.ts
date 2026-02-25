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

// ── Project-type detection & specialised system prompts ─────────────

export type ProjectType = "landing" | "website" | "dashboard"

/**
 * Detect the project type from the user's prompt and an optional selected template.
 *
 * - "dashboard" – prompt or template contains dashboard / analytics / metrics / KPI / reporting / charts
 * - "website"   – prompt mentions multiple pages
 * - "landing"   – everything else (default)
 */
export function detectProjectType(
  prompt: string,
  selectedTemplate?: string,
): ProjectType {
  const lower = prompt.toLowerCase()
  const templateLower = selectedTemplate?.toLowerCase() ?? ""

  // Dashboard signals
  const dashboardKeywords = /\b(dashboard|analytics|metrics|kpi|reporting|charts)\b/
  if (dashboardKeywords.test(lower) || dashboardKeywords.test(templateLower)) {
    return "dashboard"
  }

  // Website signals – prompt mentions multiple pages
  if (/\bmultiple\s+pages\b/.test(lower)) {
    return "website"
  }

  return "landing"
}

const LANDING_SYSTEM_PROMPT =
  "You are an elite conversion-focused web designer. Build a high-converting landing page with Tailwind CSS.\n" +
  "Include: <script src='https://cdn.tailwindcss.com'></script> and Google Fonts Inter + Space Grotesk.\n" +
  "REQUIRED SECTIONS: sticky navbar, full-screen hero with gradient bg (from-slate-900 via-purple-900 to-slate-900) and white text, trust logos bar, 3-4 feature cards with icons, social proof/testimonials, stats section, email capture CTA, footer.\n" +
  "DESIGN: gradient text on headlines, glass morphism navbar, cards with hover:shadow-lg hover:scale-[1.02], buttons with shadow-lg shadow-indigo-500/25, floating decorative blur circles, fade-in animations with IntersectionObserver.\n" +
  "Real compelling copy. Never lorem ipsum. Under 250 lines. Return ONLY raw HTML."

function getWebsiteSystemPrompt(pageLinks: string): string {
  return (
    "You are an elite web designer building a multi-page site with Tailwind CSS.\n" +
    "Include: <script src='https://cdn.tailwindcss.com'></script> and Google Fonts Inter + Space Grotesk.\n" +
    `CRITICAL: This is one page of a multi-page site. Use consistent navbar with links to: ${pageLinks}. Highlight the current page in the nav. Use consistent color scheme and footer across all pages.\n` +
    "DESIGN: Same as a high-end landing page but adapt sections per page type – About pages get team/mission sections, Pricing gets tiered cards, Contact gets a form with map placeholder.\n" +
    "Real compelling copy. Under 250 lines per page. Return ONLY raw HTML."
  )
}

const DASHBOARD_SYSTEM_PROMPT =
  "You are an elite dashboard designer. Build an interactive analytics dashboard.\n" +
  "Include: <script src='https://cdn.tailwindcss.com'></script>, <script src='https://cdn.jsdelivr.net/npm/chart.js'></script>, and Google Fonts Inter.\n" +
  "LAYOUT: Dark theme (bg-slate-950). Sidebar nav (w-64 bg-slate-900) with logo and menu items. Top bar with search and user avatar. Main content area with grid layout.\n" +
  "REQUIRED: 4 KPI stat cards at top (with trend arrows and percentages), 2 large charts (one line/area chart, one bar chart) using Chart.js with custom colors matching the dark theme, a data table with alternating row colors and hover states, filter dropdowns.\n" +
  "CHARTS: Use Chart.js with these colors: ['#6366f1','#8b5cf6','#a855f7','#c084fc','#818cf8']. Dark grid lines. Tooltips enabled. Responsive.\n" +
  "DATA: Generate realistic sample data embedded as JavaScript const arrays. If CSV data is provided, use that data instead.\n" +
  "INTERACTIVITY: Chart tooltips, table row hover, sidebar toggle, responsive.\n" +
  "Under 300 lines. Return ONLY raw HTML."

/**
 * Return the correct system prompt for a given project type.
 * For "website" pass in the page links string to embed in the prompt.
 */
export function getSystemPrompt(projectType: ProjectType, pageLinks?: string): string {
  switch (projectType) {
    case "dashboard":
      return DASHBOARD_SYSTEM_PROMPT
    case "website":
      return getWebsiteSystemPrompt(pageLinks || "index.html")
    case "landing":
    default:
      return LANDING_SYSTEM_PROMPT
  }
}

// Legacy constant kept for any direct imports (now points to the default landing prompt)
const SYSTEM_PROMPT = LANDING_SYSTEM_PROMPT

export async function generateDiff(
  prompt: string,
  existingHtml?: string,
  refinement?: string,
  systemOverride?: string,
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
        system: systemOverride || SYSTEM_PROMPT,
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
  projectType?: ProjectType,
): Promise<MultiPageSite> {
  // Auto-detect project type from the prompt if not explicitly provided
  const detectedType = projectType || detectProjectType(prompt)
  // Step 1: Get the list of page names
  const planPrompt =
    `Based on this request, list ONLY the page names needed as a JSON array. ` +
    `Example: ["index", "about", "pricing", "contact"]. Maximum 5 pages. ` +
    `Return ONLY the JSON array, nothing else.\n\nRequest: ${prompt}`

  const planSystemPrompt =
    "You are a helpful assistant. Return ONLY a JSON array of page names needed for this website. " +
    'Example: ["index", "pricing", "about", "contact"]. Maximum 5 pages. ' +
    "Return ONLY the raw JSON array, no explanation, no markdown."

  const planResponse = await generateDiff(planPrompt, undefined, undefined, planSystemPrompt)
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

  // Build the correct system prompt based on project type
  const PAGE_SYSTEM_PROMPT = getSystemPrompt(detectedType, navLinks)

  // Step 2: Generate all pages in parallel
  const pagePromises = pageNames.map(async (pageName, index) => {
    onPageStart?.({ pageName, index, total })

    const pagePrompt =
      `Generate the ${pageName} page for: ${prompt}. ` +
      `Use consistent navbar on every page with links to: ${navLinks}. ` +
      `Use the same color scheme, fonts, and design system across all pages. ` +
      `Current page (${pageName}.html) should be highlighted/active in the navbar. ` +
      `Return ONLY the raw HTML.`

    const response = await generateDiff(pagePrompt, undefined, undefined, PAGE_SYSTEM_PROMPT)
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
 * Extract HTML content from a variety of LLM response formats.
 *
 * Tried in order (first match wins):
 * 1. Raw HTML – response starts with <!DOCTYPE or <html
 * 2. Markdown fenced code block – ```html … ``` or ``` … ```
 * 3. Text before the HTML – find first <!DOCTYPE or <html occurrence
 * 4. Unified diff with + prefixed lines
 *
 * After extraction the result is trimmed and deduplicated.
 */
export function extractHtmlFromDiff(input: string): string {
  const trimmed = input.trim()
  const lower = trimmed.toLowerCase()

  // Debug: log the first 200 chars of the raw response so we can inspect in the browser console
  console.log(
    "[v0] extractHtmlFromDiff raw input (first 200 chars):",
    trimmed.slice(0, 200),
  )

  // 1. Raw HTML – response starts directly with the HTML document
  if (lower.startsWith("<!doctype") || lower.startsWith("<html")) {
    return deduplicateHtml(trimmed)
  }

  // 2. Markdown fenced code block – ```html\n…\n``` or ```\n…\n```
  const codeBlockMatch = trimmed.match(/```(?:html)?\s*\n([\s\S]*?)```/)
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim()
    const innerLower = inner.toLowerCase()
    if (innerLower.startsWith("<!doctype") || innerLower.startsWith("<html")) {
      return deduplicateHtml(inner)
    }
  }

  // 3. Text before HTML – find the first <!DOCTYPE or <html tag anywhere in the response
  const doctypeIdx = lower.indexOf("<!doctype")
  const htmlTagIdx = lower.indexOf("<html")
  const startIdx =
    doctypeIdx !== -1 && htmlTagIdx !== -1
      ? Math.min(doctypeIdx, htmlTagIdx)
      : doctypeIdx !== -1
        ? doctypeIdx
        : htmlTagIdx

  if (startIdx !== -1) {
    return deduplicateHtml(trimmed.slice(startIdx).trim())
  }

  // 4. Unified diff mode – extract added lines (lines starting with + but not +++)
  const diffLines = trimmed.split("\n")
  const addedLines = diffLines
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))

  if (addedLines.length > 0) {
    const joined = addedLines.join("\n").trim()
    if (joined.length > 0) {
      return deduplicateHtml(joined)
    }
  }

  // 5. Nothing worked – return the trimmed input as-is so the caller can decide
  console.warn(
    "[v0] extractHtmlFromDiff: could not detect HTML in response. Full input:",
    trimmed.slice(0, 500),
  )
  return trimmed
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
