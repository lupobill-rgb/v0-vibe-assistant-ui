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

const APP_KEYWORDS = [
  "crm","contact","deal","lead","task","ticket","project tracker",
  "inventory","order","invoice","customer","kanban","issue","bug tracker",
  "helpdesk","booking","reservation","crud","full-stack","fullstack",
  "full stack","database app","manage ","management",
];

const DASHBOARD_KEYWORDS = [
  "dashboard","analytics","chart","pipeline","report","tracker",
  "metrics","kpi","visualiz",
];

const SITE_KEYWORDS = [
  "multi-page","multipage","multi page","website","site with pages",
  "about page","blog",
];

// Team default modes — used when prompt alone is ambiguous
const TEAM_MODE_DEFAULTS: Record<string, string> = {
  "sales":       "app",
  "engineering": "app",
  "operations":  "app",
  "marketing":   "dashboard",
  "product":     "dashboard",
  "finance":     "dashboard",
};

export function resolveMode(prompt: string, teamName?: string): string {
  const p = prompt.toLowerCase();
  const isApp       = APP_KEYWORDS.some(kw => p.includes(kw));
  const isDashboard = DASHBOARD_KEYWORDS.some(kw => p.includes(kw));
  const isSite      = SITE_KEYWORDS.some(kw => p.includes(kw));

  // Dashboard intent wins when explicitly present — "dashboard" keyword is unambiguous
  if (isDashboard) return "dashboard";
  if (isApp) return "app";
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
