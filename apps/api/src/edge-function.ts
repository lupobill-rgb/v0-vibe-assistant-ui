/**
 * Client for the Supabase Edge Function that generates diffs via LLM.
 * Replaces the old executor-based LLM pipeline.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ptaqytvztkhjpuawdxng.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// ── MODE RESOLUTION ──────────────────────────────────────────────────────────
// Resolves the correct Edge Function mode from prompt text + team context.
// Team bias breaks ties when the prompt is ambiguous.
// Priority: explicit mode arg > app keywords > dashboard keywords > team default

// Strong app signals — always indicate a multi-page CRUD app
const STRONG_APP_KEYWORDS = [
  "crm","crud","full-stack","fullstack","full stack","database app",
  "kanban","helpdesk","bug tracker","project tracker",
];

// Weaker app signals — only count when prompt is complex enough
const WEAK_APP_KEYWORDS = [
  "contact","contacts","deal","deals","lead","leads","task","tasks",
  "ticket","tickets","inventory","order","orders",
  "invoice","invoices","customer","customers","issue",
  "booking","bookings","reservation","manage","management","track",
];

const DASHBOARD_KEYWORDS = [
  "dashboard","analytics","chart","report","tracker",
  "metrics","kpi","visualiz","table","scorecard","monitor","list","view",
];

const SITE_KEYWORDS = [
  "multi-page","multipage","multi page","website","site with pages",
  "about page","blog",
];

// Simple single-purpose prompts should never trigger app mode
const SIMPLE_OUTPUT_KEYWORDS = [
  "table","dashboard","chart","report","scorecard",
  "tracker","monitor","list","view",
];

// Team default modes — used when prompt alone is ambiguous
const TEAM_MODE_DEFAULTS: Record<string, string> = {
  "sales":       "dashboard",
  "engineering": "app",
  "operations":  "dashboard",
  "marketing":   "dashboard",
  "product":     "dashboard",
  "finance":     "dashboard",
};

/** Check if keyword matches as a whole word (not a substring of another word) */
function matchesWholeWord(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[\\s,._\\-/])${escaped}(?:$|[\\s,._\\-/])`, 'i');
  return re.test(text);
}

export function resolveMode(prompt: string, teamName?: string): string {
  const p = prompt.toLowerCase();
  const wordCount = p.split(/\s+/).filter(Boolean).length;

  const isDashboard = DASHBOARD_KEYWORDS.some(kw => p.includes(kw));
  const isSite      = SITE_KEYWORDS.some(kw => p.includes(kw));
  const isStrongApp = STRONG_APP_KEYWORDS.some(kw => p.includes(kw));
  const isWeakApp   = WEAK_APP_KEYWORDS.some(kw => matchesWholeWord(p, kw));

  // Simple/short prompts never trigger app mode — route to dashboard or default
  const isSimple = SIMPLE_OUTPUT_KEYWORDS.some(kw => p.includes(kw));
  if (isSimple && !isStrongApp && wordCount < 20) {
    if (isDashboard || isSimple) return "dashboard";
  }

  // Strong app signals always win (crm, crud, full-stack, kanban, etc.)
  if (isStrongApp) return "app";

  // Dashboard keywords beat weak app keywords
  if (isDashboard) return "dashboard";

  // Weak app keywords only trigger app mode for longer, complex prompts
  if (isWeakApp && wordCount >= 20) return "app";

  if (isSite) return "site";

  // Fall back to team default
  const teamKey = (teamName || "").toLowerCase();
  if (TEAM_MODE_DEFAULTS[teamKey]) return TEAM_MODE_DEFAULTS[teamKey];

  // Final fallback — landing page
  return "page";
}

// ─────────────────────────────────────────────────────────────────────────────

export interface DiffResult {
  diff: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  mode?: string;
  fast_path?: boolean;
  version?: string;
}

export async function generateDiff(
  prompt: string,
  context?: string,
  model: string = "claude",
  teamName?: string,
  teamId?: string,
): Promise<DiffResult> {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_ANON_KEY is not configured");
  }

  const mode = resolveMode(prompt, teamName);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-diff`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, context, model, mode, team_id: teamId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Edge Function returned ${res.status}` })) as { error?: string };
    throw new Error(err.error || "Edge Function call failed");
  }

  return res.json() as Promise<DiffResult>;
}
