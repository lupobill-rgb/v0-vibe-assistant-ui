import fs from 'node:fs';
import path from 'node:path';

export const MAX_INITIAL_PAGES = 4;

export const INITIAL_BUILD_BUDGETS = {
  maxWallTimeMs: 180_000,
  maxModelCalls: 12,
  maxTokensOut: 12_000,
  stepDeadlinesMs: {
    planning: 20_000,
    building: 120_000,
    validating: 120_000,
    security: 20_000,
    ux: 30_000,
    'self-healing': 20_000,
  },
  buildConcurrency: 3,
} as const;

export const DASHBOARD_BUILD_BUDGETS = {
  maxWallTimeMs: 240_000,       // 4 min total (3-phase pipeline is slower)
  maxModelCalls: 24,
  maxTokensOut: 30_000,
  stepDeadlinesMs: {
    planning: 30_000,           // 30s
    building: 180_000,          // 3 min (includes 2 design phase calls)
    validating: 120_000,        // 2 min
    security: 20_000,           // 20s
    ux: 30_000,                 // 30s
    'self-healing': 20_000,     // 20s
  },
  buildConcurrency: 2,
} as const;

export type PlannedPage = { name: string; title: string; description: string; route: string };
export type ColorScheme = { bg: string; text: string; primary: string; surface: string; border: string; mode: 'light' | 'dark' };
export type StarterSitePlan = { pages: PlannedPage[]; notes: string[]; colorScheme: ColorScheme };
export type JobTimelineStep = {
  step: 'planning' | 'building' | 'validating' | 'security' | 'ux' | 'self-healing';
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: 'completed' | 'failed' | 'deferred';
};

const DEFAULT_PAGES: PlannedPage[] = [
  { name: 'Home', title: 'Home', description: 'Create a compelling homepage with hero, benefits, and call-to-action.', route: '/' },
  { name: 'Services', title: 'Services', description: 'Describe core services, process, and outcomes with a clear CTA.', route: '/services' },
  { name: 'About', title: 'About', description: 'Explain mission, team credibility, and brand story with CTA.', route: '/about' },
  { name: 'Contact', title: 'Contact', description: 'Provide contact options, form section, and clear CTA.', route: '/contact' },
];

const LIGHT_DEFAULTS: ColorScheme = { bg: '#ffffff', text: '#111827', primary: '#7c3aed', surface: '#f8fafc', border: '#e2e8f0', mode: 'light' };
const DARK_DEFAULTS: ColorScheme = { bg: '#0f172a', text: '#f8fafc', primary: '#7c3aed', surface: '#1e293b', border: '#334155', mode: 'dark' };

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Deterministic, server-side color scheme resolution.
 * Priority: LLM plan color_scheme > prompt keyword detection > light defaults.
 */
export function resolveColorScheme(
  prompt: string,
  llmScheme?: Partial<ColorScheme> | null,
): ColorScheme {
  // Start from defaults based on mode detection
  const wantsDark = /\bdark\s*(mode|theme)?\b/i.test(prompt);
  const base: ColorScheme = { ...(wantsDark ? DARK_DEFAULTS : LIGHT_DEFAULTS) };

  // If the plan LLM returned a color_scheme, overlay valid hex values
  if (llmScheme) {
    for (const key of ['bg', 'text', 'primary', 'surface', 'border'] as const) {
      if (typeof llmScheme[key] === 'string' && HEX_RE.test(llmScheme[key]!)) {
        base[key] = llmScheme[key]!;
      }
    }
    if (llmScheme.mode === 'dark' || llmScheme.mode === 'light') {
      base.mode = llmScheme.mode;
    }
  }

  return base;
}

/**
 * Build the literal <style> block that the LLM must not modify.
 * This is injected server-side so the LLM never decides colors.
 */
export function buildColorBlock(scheme: ColorScheme): string {
  return `<style>:root{--bg:${scheme.bg};--text:${scheme.text};--primary:${scheme.primary};--surface:${scheme.surface};--border:${scheme.border}}body{background:var(--bg);color:var(--text)}</style>`;
}

export function buildStarterSitePlan(rawPlan: Array<{ name: string; title: string; description: string }> | null, prompt: string, llmColorScheme?: Partial<ColorScheme> | null): StarterSitePlan {
  const notes: string[] = [];
  const multiIntent = /multi[ -]?page|multiple pages|website|site|pages/i.test(prompt);
  let normalized = (rawPlan ?? []).map((p) => normalizePage(p.name, p.title, p.description)).filter(Boolean) as PlannedPage[];

  if (normalized.length === 0 && multiIntent) normalized = [...DEFAULT_PAGES];
  if (normalized.length === 0) normalized = [DEFAULT_PAGES[0]];

  if (normalized.length > MAX_INITIAL_PAGES) {
    normalized = normalized.slice(0, MAX_INITIAL_PAGES);
    notes.push('Initial build limited to 4 pages; add more pages after.');
  }

  const colorScheme = resolveColorScheme(prompt, llmColorScheme);
  return { pages: normalized, notes, colorScheme };
}

function normalizePage(name: string, title: string, description: string): PlannedPage | null {
  const value = (name || title || '').toLowerCase().trim();
  if (!value) return null;
  if (value === 'home' || value === 'index' || value === '/') return { name: 'Home', title: title || 'Home', description, route: '/' };
  if (value.includes('service')) return { name: 'Services', title: title || 'Services', description, route: '/services' };
  if (value.includes('about')) return { name: 'About', title: title || 'About', description, route: '/about' };
  if (value.includes('contact')) return { name: 'Contact', title: title || 'Contact', description, route: '/contact' };
  const slug = value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { name: name || title || slug, title: title || name || slug, description, route: `/${slug}` };
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
}

export function validateStarterSiteQuality(files: Array<{ route: string; html: string }>, allowPlaceholders = false): { ok: boolean; failingRoutes: string[]; reasons: string[] } {
  const reasons: string[] = [];
  const routeSet = new Set(files.map(f => f.route));

  for (const file of files) {
    const html = file.html.toLowerCase();
    if (!/<h1[\s>]/.test(html)) reasons.push(`${file.route}: missing H1`);
    if ((html.match(/<section[\s>]/g) || []).length < 2) reasons.push(`${file.route}: requires at least 2 sections`);
    if (!/(<a[^>]+class="[^"]*cta|<button[^>]*>.*(start|get|contact|book|learn))/i.test(file.html)) reasons.push(`${file.route}: missing CTA`);
    if (!/<nav[\s>]/.test(html)) reasons.push(`${file.route}: missing navbar`);
    if (!/<title>.+<\/title>/.test(html) || !/name="description"/.test(html)) reasons.push(`${file.route}: missing SEO metadata`);
    if (!allowPlaceholders && /lorem ipsum/i.test(file.html)) reasons.push(`${file.route}: placeholder text found`);
  }

  const normalizeHref = (h: string) => h.replace(/^\//, '').replace(/\.html$/, '') || 'index';
  const requiredRoutes = ['/', ...[...routeSet].filter(r => r !== '/')];
  for (const route of requiredRoutes) {
    for (const checkRoute of requiredRoutes) {
      if (route === checkRoute) continue;
      const expected = normalizeHref(checkRoute === '/' ? 'index' : checkRoute);
      const page = files.find(f => f.route === route);
      if (page) {
        const hrefs = [...page.html.matchAll(/href="([^"]*?)"/gi)].map(m => normalizeHref(m[1]));
        if (!hrefs.some(h => h === expected)) reasons.push(`${route}: missing nav link to ${checkRoute}`);
      }
    }
  }

  return { ok: reasons.length === 0, failingRoutes: [...new Set(reasons.map(r => r.split(':')[0]))], reasons };
}

export function writePagePlanArtifact(previewDir: string, plan: StarterSitePlan): void {
  fs.writeFileSync(path.join(previewDir, 'page-plan.json'), JSON.stringify(plan, null, 2));
}

