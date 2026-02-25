import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { ProjectContext } from './context';

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
  timestamp: number;
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

export const DEFAULT_PROVIDER: ModelProvider =
  (process.env.DEFAULT_LLM_PROVIDER as ModelProvider) || 'anthropic';

const JOB_BUDGET_LIMIT = parseFloat(process.env.JOB_BUDGET_LIMIT_USD || '5');

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

// ── Metering persistence ──────────────────────────────────────────────

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/vibe.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const meteringDb = new Database(dbPath);

meteringDb.exec(`
  CREATE TABLE IF NOT EXISTS metering_calls (
    call_id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_estimate REAL NOT NULL,
    latency_ms INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

const meteringInsert = meteringDb.prepare(
  `INSERT INTO metering_calls (call_id, job_id, team_id, model, provider, input_tokens, output_tokens, cost_estimate, latency_ms, timestamp)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const jobSpendStmt = meteringDb.prepare(
  `SELECT COALESCE(SUM(cost_estimate), 0) as total FROM metering_calls WHERE job_id = ?`
);

export function recordMetering(record: MeteringRecord): void {
  meteringInsert.run(
    record.call_id, record.job_id, record.team_id, record.model,
    record.provider, record.input_tokens, record.output_tokens,
    record.cost_estimate, record.latency_ms, record.timestamp
  );
}

export function getJobSpend(jobId: string): number {
  return (jobSpendStmt.get(jobId) as { total: number }).total;
}

// ── Unified LLM Router ───────────────────────────────────────────────

export async function callLLM(
  prompt: string,
  context: string,
  config: RouterConfig,
  jobId: string,
  teamId: string
): Promise<{ content: string; metering: MeteringRecord }> {
  const currentSpend = getJobSpend(jobId);
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
    timestamp: Date.now(),
  };
  recordMetering(metering);

  return { content, metering };
}

// ── Backward-compatible exports ───────────────────────────────────────

const SYSTEM_PROMPT = `You are a code modification engine.
Given a user prompt and repository context, output ONLY a valid unified diff (git diff format).
- Do NOT include any explanation, prose, or markdown code fences.
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root.
- If creating a new file, use /dev/null as the source path.
- If no changes are needed, output exactly: NO_CHANGES`;

const HTML_SYSTEM_PROMPT = `You are an expert web developer. Given a description, generate a single self-contained HTML file.
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

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('');
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
