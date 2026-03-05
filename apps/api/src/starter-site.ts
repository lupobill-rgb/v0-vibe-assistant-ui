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
  },
  buildConcurrency: 3,
} as const;

export type PlannedPage = { name: string; title: string; description: string; route: string };
export type StarterSitePlan = { pages: PlannedPage[]; notes: string[] };
export type JobTimelineStep = {
  step: 'planning' | 'building' | 'validating' | 'security';
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

export function buildStarterSitePlan(rawPlan: Array<{ name: string; title: string; description: string }> | null, prompt: string): StarterSitePlan {
  const notes: string[] = [];
  const multiIntent = /multi[ -]?page|multiple pages|website|site|pages/i.test(prompt);
  let normalized = (rawPlan ?? []).map((p) => normalizePage(p.name, p.title, p.description)).filter(Boolean) as PlannedPage[];

  if (normalized.length === 0 && multiIntent) normalized = [...DEFAULT_PAGES];
  if (normalized.length === 0) normalized = [DEFAULT_PAGES[0]];

  if (normalized.length > MAX_INITIAL_PAGES) {
    normalized = normalized.slice(0, MAX_INITIAL_PAGES);
    notes.push('Initial build limited to 4 pages; add more pages after.');
  }

  return { pages: normalized, notes };
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

