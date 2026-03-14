export const VIBE_SYSTEM_RULES = `VIBE PLATFORM — GOVERNING RULES (NON-NEGOTIABLE)
Mission: Convert user intent into deployed, production-grade software.
Stack: Next.js + NestJS + Supabase + Vercel + Docker executor.
LLM: You are the primary Claude execution engine. GPT-4 is infrastructure fallback only.

Rules — apply to every output:
0. COLORS — MANDATORY:
a) The FIRST block inside every <style> tag MUST be a :root block using the color_scheme from the plan:
   :root {
     --bg: [color_scheme.bg];
     --text: [color_scheme.text];
     --primary: [color_scheme.primary];
     --surface: [color_scheme.surface];
     --border: [color_scheme.border];
   }
b) Set body background and text:
   body { background: var(--bg); color: var(--text); }
c) FORBIDDEN — these Tailwind classes are BANNED:
   bg-slate-900, bg-slate-950, bg-gray-900, bg-gray-950, bg-zinc-900,
   bg-zinc-950, bg-neutral-900, text-white, bg-purple-600, bg-violet-600.
   Use bg-[var(--bg)], text-[var(--text)], bg-[var(--primary)] instead.
d) FORBIDDEN — never set background-color or color as raw hex values in CSS. Only use var(--) references.
1. Reliability over cleverness. Working output beats clever broken output.
2. Atomic diffs only. Never whole-file rewrites unless explicitly instructed.
3. Secure by default: no secrets in output, RLS on, least privilege.
4. Never silently fail. Return plain-English explanation if task cannot complete.
5. No raw stack traces in user-facing output. Ever.
6. OSS patterns first. No custom primitives when a standard approach exists.
7. Every change must be scoped, minimal, and purposeful.
8. Every generated HTML page must include: favicon, OG meta tags, working forms that POST to Supabase, scroll animations, hover/active/focus states on all interactive elements.
9. Never generate a form that submits nowhere. All forms MUST POST to the project's Supabase instance using the injected SUPABASE_URL and SUPABASE_ANON_KEY (see SUPABASE FORM INTEGRATION below).
10. Output starts with <!DOCTYPE html> and nothing else. No explanation. No preamble. No markdown.
11. ALL interactive elements (buttons, cards, nav links, dropdowns, filters, tabs, toggles, configurators) must have complete JavaScript event handlers — addEventListener or inline onclick. No placeholder comments. No TODO. No empty functions. Every handler must produce a visible change in the DOM when triggered (filter data, toggle visibility, update a value, navigate, submit). Zero non-functional interactive elements.

SUPABASE FORM INTEGRATION — required on every page with a form:
Inject this script in <head> (the API server will replace __SUPABASE_URL__ and __SUPABASE_ANON_KEY__ with real values):
<script>
window.__VIBE_SUPABASE_URL__="__SUPABASE_URL__";
window.__VIBE_SUPABASE_ANON_KEY__="__SUPABASE_ANON_KEY__";
</script>
Every <form> must use this pattern instead of action="...formspree...":
<form onsubmit="return vibeSubmitForm(event, this)">
Add this script before </body>:
<script>
async function vibeSubmitForm(e, form) {
  e.preventDefault();
  const btn = form.querySelector('[type=submit]');
  const origText = btn.textContent;
  btn.textContent = 'Sending...'; btn.disabled = true;
  const data = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch(window.__VIBE_SUPABASE_URL__ + '/rest/v1/form_submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.__VIBE_SUPABASE_ANON_KEY__,
        'Authorization': 'Bearer ' + window.__VIBE_SUPABASE_ANON_KEY__,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ project_id: document.body.dataset.projectId || '', page_route: location.pathname, form_name: form.dataset.formName || 'contact', payload: data })
    });
    if (res.ok) { form.reset(); const msg = form.querySelector('.form-success'); if (msg) msg.classList.remove('hidden'); }
    else { alert('Something went wrong. Please try again.'); }
  } catch { alert('Network error. Please try again.'); }
  finally { btn.textContent = origText; btn.disabled = false; }
  return false;
}
</script>`;

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { ProjectContext } from './context';
import { getSupabaseClient } from './supabase-client';

// ── Provider types & config ───────────────────────────────────────────

export type ModelProvider = 'openai' | 'anthropic';

export interface RouterConfig {
  model: string;
  provider: ModelProvider;
  maxTokens: number;
  temperature: number;
}

export interface MeteringRecord {
  call_id: string;
  job_id: string;
  team_id: string;
  model: string;
  provider: ModelProvider;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  latency_ms: number;
  timestamp: string;
}

// ── Cost rates (USD per 1M tokens) ────────────────────────────────────

const COST_RATES: Record<ModelProvider, { input: number; output: number }> = {
  openai: { input: 2.5, output: 10 },
  anthropic: { input: 3, output: 15 },
};

function calculateCost(provider: ModelProvider, inputTokens: number, outputTokens: number): number {
  const rates = COST_RATES[provider];
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

// ── Environment ───────────────────────────────────────────────────────

const _envProvider = process.env.DEFAULT_LLM_PROVIDER;
export const DEFAULT_PROVIDER: ModelProvider =
  _envProvider === 'openai' || _envProvider === 'anthropic' ? _envProvider : 'anthropic';

const _parsedBudget = parseFloat(process.env.JOB_BUDGET_LIMIT_USD || '5');
const JOB_BUDGET_LIMIT = Number.isFinite(_parsedBudget) && _parsedBudget > 0 ? _parsedBudget : 5;

// ── Lazy-initialized SDK clients ──────────────────────────────────────

let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    _anthropic = new Anthropic({ apiKey: key });
  }
  return _anthropic;
}

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY environment variable is not set');
    _openai = new OpenAI({ apiKey: key });
  }
  return _openai;
}

// ── Metering persistence (Supabase) ──────────────────────────────────

export async function recordMetering(record: MeteringRecord): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('metering_calls').insert({
    call_id: record.call_id,
    job_id: record.job_id,
    team_id: record.team_id,
    model: record.model,
    provider: record.provider,
    input_tokens: record.input_tokens,
    output_tokens: record.output_tokens,
    cost_estimate: record.cost_estimate,
    latency_ms: record.latency_ms,
    timestamp: record.timestamp,
  });
  if (error) {
    console.error('Metering insert failed:', error.message);
  }
}

export async function getJobSpend(jobId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('metering_calls')
    .select('cost_estimate')
    .eq('job_id', jobId);
  if (error) {
    console.error('Metering spend query failed:', error.message);
    return 0;
  }
  return (data || []).reduce((sum, row) => sum + (row.cost_estimate || 0), 0);
}

// ── Unified LLM Router ───────────────────────────────────────────────

export async function callLLM(
  prompt: string,
  context: string,
  config: RouterConfig,
  jobId: string,
  teamId: string
): Promise<{ content: string; metering: MeteringRecord }> {
  const currentSpend = await getJobSpend(jobId);
  if (currentSpend >= JOB_BUDGET_LIMIT) {
    throw new Error(`Job ${jobId} budget exceeded: $${currentSpend.toFixed(4)} >= $${JOB_BUDGET_LIMIT}`);
  }

  const start = Date.now();
  let content: string;
  let inputTokens: number;
  let outputTokens: number;

  if (config.provider === 'openai') {
    const client = getOpenAIClient();
    const res = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: context },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });
    content = res.choices[0]?.message?.content || '';
    inputTokens = res.usage?.prompt_tokens || 0;
    outputTokens = res.usage?.completion_tokens || 0;
  } else {
    const client = getAnthropicClient();
    const res = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: context,
      messages: [{ role: 'user', content: prompt }],
    });
    content = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');
    inputTokens = res.usage.input_tokens;
    outputTokens = res.usage.output_tokens;
  }

  const latencyMs = Date.now() - start;
  const metering: MeteringRecord = {
    call_id: randomUUID(),
    job_id: jobId,
    team_id: teamId,
    model: config.model,
    provider: config.provider,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_estimate: calculateCost(config.provider, inputTokens, outputTokens),
    latency_ms: latencyMs,
    timestamp: new Date().toISOString(),
  };
  await recordMetering(metering);

  return { content, metering };
}

// ── Backward-compatible exports ───────────────────────────────────────

const SYSTEM_PROMPT = `${VIBE_SYSTEM_RULES}
You are a code modification engine.
Given a user prompt and repository context, output ONLY a valid unified diff (git diff format).
- Do NOT include any explanation, prose, or markdown code fences.
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root.
- If creating a new file, use /dev/null as the source path.
- If no changes are needed, output exactly: NO_CHANGES`;

const HTML_SYSTEM_PROMPT = `${VIBE_SYSTEM_RULES}
You are an expert web developer. Given a description, generate a single self-contained HTML file.
Requirements:
- Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no code fences, no explanation.
- All CSS must be embedded in a <style> tag inside <head>.
- All JavaScript must be embedded in a <script> tag before </body>.
- No external dependencies — no CDN links, no imports. Use only vanilla HTML/CSS/JS.
- The page must look polished and modern with a clean design.
- Use CSS custom properties for colors and a cohesive color palette.`;

export async function generateHtmlPage(prompt: string): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8096,
    system: HTML_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  let html = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('');
  // Strip markdown code fences if LLM wrapped output
  html = html.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  // If LLM returned a unified diff instead of raw HTML, extract the added lines
  if (!html.trimStart().startsWith('<!DOCTYPE') && html.includes('+<!DOCTYPE')) {
    html = html
      .split('\n')
      .filter((line: string) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line: string) => line.slice(1))
      .join('\n');
  }
  return html;
}

export interface LLMUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface DiffResult {
  diff: string;
  usage: LLMUsage;
}

export async function generateDiff(
  prompt: string,
  context: ProjectContext,
  previousError?: string
): Promise<DiffResult> {
  const contextBlock = Object.entries(context.files)
    .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n');

  const userMessage = previousError
    ? `Original prompt: ${prompt}\n\nPrevious diff failed preflight with this error:\n${previousError}\n\nPlease fix the diff.`
    : `Prompt: ${prompt}`;

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${userMessage}\n\n## Repository Context\n${contextBlock}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('');

  return {
    diff: text.trim(),
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}
