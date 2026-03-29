/**
 * VIBE LLM Failover Orchestrator
 *
 * Implements multi-provider failover with:
 * - Tiered provider chains (Anthropic → OpenAI → Google → Fireworks)
 * - Context window pre-check (skip providers that can't fit the request)
 * - JSON validation layer (retry/failover on malformed JSON)
 * - Cost circuit breakers (per-provider daily caps)
 * - Pre-stream failover only (no mid-stream provider switches)
 *
 * See docs/llm-redundancy-plan.md for architecture details.
 */

// ── Provider definitions ─────────────────────────────────────────────

export type ProviderName = 'anthropic' | 'openai' | 'google' | 'fireworks';

export interface ProviderConfig {
  name: ProviderName;
  model: string;
  maxContextTokens: number;
  maxOutputTokens: number;
  costPer1MInput: number;
  costPer1MOutput: number;
  dailyBudgetCap: number;
}

/** Page building — primary pipeline */
export const BUILDER_CHAIN: ProviderConfig[] = [
  {
    name: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    maxContextTokens: 200_000,
    maxOutputTokens: 16_384,
    costPer1MInput: 3,
    costPer1MOutput: 15,
    dailyBudgetCap: 300,
  },
  {
    name: 'openai',
    model: 'gpt-4o',
    maxContextTokens: 128_000,
    maxOutputTokens: 16_384,
    costPer1MInput: 2.5,
    costPer1MOutput: 10,
    dailyBudgetCap: 200,
  },
  {
    name: 'google',
    model: 'gemini-2.0-flash',
    maxContextTokens: 1_000_000,
    maxOutputTokens: 16_384,
    costPer1MInput: 0.1,
    costPer1MOutput: 0.4,
    dailyBudgetCap: 100,
  },
  {
    name: 'fireworks',
    model: 'accounts/fireworks/models/deepseek-v3',
    maxContextTokens: 128_000,
    maxOutputTokens: 16_384,
    costPer1MInput: 0.9,
    costPer1MOutput: 0.9,
    dailyBudgetCap: 50,
  },
];

/** NLP edits — lightweight operations */
export const EDITOR_CHAIN: ProviderConfig[] = [
  {
    name: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    maxContextTokens: 200_000,
    maxOutputTokens: 4_096,
    costPer1MInput: 0.8,
    costPer1MOutput: 4,
    dailyBudgetCap: 300,
  },
  {
    name: 'openai',
    model: 'gpt-4o-mini',
    maxContextTokens: 128_000,
    maxOutputTokens: 4_096,
    costPer1MInput: 0.15,
    costPer1MOutput: 0.6,
    dailyBudgetCap: 200,
  },
  {
    name: 'google',
    model: 'gemini-2.0-flash',
    maxContextTokens: 1_000_000,
    maxOutputTokens: 4_096,
    costPer1MInput: 0.1,
    costPer1MOutput: 0.4,
    dailyBudgetCap: 100,
  },
];

// ── Token estimation ─────────────────────────────────────────────────

/**
 * Rough token estimate: ~4 characters per token for English text.
 * Conservative (overestimates) to prevent silent truncation.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 3.5);
}

// ── Context window check (Section 6.3) ───────────────────────────────

/**
 * Returns true if the estimated request token count fits within
 * the provider's context window (with room for output tokens).
 */
export function fitsContextWindow(
  provider: ProviderConfig,
  estimatedInputTokens: number,
): boolean {
  return estimatedInputTokens < provider.maxContextTokens - provider.maxOutputTokens;
}

// ── JSON validation layer (Section 6.1) ──────────────────────────────

export interface JsonValidationResult {
  valid: boolean;
  parsed?: unknown;
  error?: string;
}

/**
 * Validates that LLM output is valid JSON when expected.
 * Attempts to extract JSON from markdown code fences if raw parse fails.
 */
export function validateJsonOutput(output: string): JsonValidationResult {
  // Try direct parse first
  try {
    const parsed = JSON.parse(output);
    return { valid: true, parsed };
  } catch {
    // noop — try extraction
  }

  // Try extracting from markdown code fences
  const fenceMatch = output.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1]);
      return { valid: true, parsed };
    } catch {
      // noop
    }
  }

  // Try finding first { ... } or [ ... ] block
  const braceStart = output.indexOf('{');
  const bracketStart = output.indexOf('[');
  const start = braceStart === -1 ? bracketStart
    : bracketStart === -1 ? braceStart
    : Math.min(braceStart, bracketStart);

  if (start !== -1) {
    const closer = output[start] === '{' ? '}' : ']';
    const end = output.lastIndexOf(closer);
    if (end > start) {
      try {
        const parsed = JSON.parse(output.slice(start, end + 1));
        return { valid: true, parsed };
      } catch {
        // noop
      }
    }
  }

  return { valid: false, error: 'Output is not valid JSON and no JSON block could be extracted' };
}

// ── Cost circuit breaker (Section 6.6) ───────────────────────────────

/** In-memory spend tracking per provider per day. Reset daily. */
const _dailySpend: Record<string, { amount: number; date: string }> = {};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordProviderSpend(provider: ProviderName, amount: number): void {
  const today = todayKey();
  const entry = _dailySpend[provider];
  if (!entry || entry.date !== today) {
    _dailySpend[provider] = { amount, date: today };
  } else {
    entry.amount += amount;
  }
}

export function getProviderDailySpend(provider: ProviderName): number {
  const entry = _dailySpend[provider];
  if (!entry || entry.date !== todayKey()) return 0;
  return entry.amount;
}

export function isProviderOverBudget(provider: ProviderConfig): boolean {
  return getProviderDailySpend(provider.name) >= provider.dailyBudgetCap;
}

export function isProviderNearBudget(provider: ProviderConfig, threshold = 0.8): boolean {
  return getProviderDailySpend(provider.name) >= provider.dailyBudgetCap * threshold;
}

// ── Failover orchestrator ────────────────────────────────────────────

export interface FailoverCallOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  /** If true, validate response as JSON and retry/failover on invalid JSON */
  expectJson?: boolean;
  /** Which chain to use: 'builder' for page building, 'editor' for edits */
  chain?: 'builder' | 'editor';
}

export interface FailoverResult {
  content: string;
  provider: ProviderName;
  model: string;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number };
  fallbackUsed: boolean;
  originalProvider?: ProviderName;
  latencyMs: number;
}

export type LLMCallFn = (
  provider: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
) => Promise<{
  content: string;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number };
}>;

/**
 * Execute an LLM call with multi-provider failover.
 *
 * Failover rules:
 * - Retry 2x on primary provider, then cascade to next
 * - Skip providers over daily budget cap
 * - Skip providers whose context window is too small
 * - If expectJson=true, retry once on same provider for invalid JSON, then failover
 * - Failover only occurs PRE-stream (no mid-stream switching)
 */
export async function executeWithFailover(
  callFn: LLMCallFn,
  options: FailoverCallOptions,
): Promise<FailoverResult> {
  const chain = options.chain === 'editor' ? EDITOR_CHAIN : BUILDER_CHAIN;
  const estimatedInputTokens = estimateTokenCount(options.systemPrompt + options.userPrompt);
  const maxTokens = options.maxTokens || chain[0].maxOutputTokens;

  const errors: Array<{ provider: ProviderName; error: string }> = [];
  const primaryProvider = chain[0].name;

  for (const provider of chain) {
    // Skip providers over budget (Section 6.6)
    if (isProviderOverBudget(provider)) {
      errors.push({ provider: provider.name, error: 'Daily budget cap exceeded' });
      continue;
    }

    // Skip providers whose context window can't fit the request (Section 6.3)
    if (!fitsContextWindow(provider, estimatedInputTokens)) {
      errors.push({
        provider: provider.name,
        error: `Request (~${estimatedInputTokens} tokens) exceeds context window (${provider.maxContextTokens})`,
      });
      continue;
    }

    const start = Date.now();

    // Retry up to 2x on this provider
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await callFn(provider, options.systemPrompt, options.userPrompt, maxTokens);

        // JSON validation (Section 6.1)
        if (options.expectJson) {
          const validation = validateJsonOutput(result.content);
          if (!validation.valid) {
            if (attempt === 0) {
              // Retry once on same provider
              errors.push({
                provider: provider.name,
                error: `Invalid JSON (attempt ${attempt + 1}): ${validation.error}`,
              });
              continue;
            }
            // Second attempt also invalid — failover to next provider
            errors.push({
              provider: provider.name,
              error: `Invalid JSON after retry: ${validation.error}`,
            });
            break;
          }
        }

        // Track spend
        const cost =
          (result.usage.input_tokens / 1_000_000) * provider.costPer1MInput +
          (result.usage.output_tokens / 1_000_000) * provider.costPer1MOutput;
        recordProviderSpend(provider.name, cost);

        const latencyMs = Date.now() - start;
        const fallbackUsed = provider.name !== primaryProvider;

        // Log budget warnings
        if (isProviderNearBudget(provider)) {
          console.warn(
            `[LLM Failover] Provider ${provider.name} at ${Math.round(
              (getProviderDailySpend(provider.name) / provider.dailyBudgetCap) * 100,
            )}% of daily budget cap ($${provider.dailyBudgetCap})`,
          );
        }

        return {
          content: result.content,
          provider: provider.name,
          model: provider.model,
          usage: result.usage,
          fallbackUsed,
          originalProvider: fallbackUsed ? primaryProvider : undefined,
          latencyMs,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ provider: provider.name, error: `Attempt ${attempt + 1}: ${message}` });

        // If rate limited (429/529), don't retry on same provider — go to next
        if (message.includes('429') || message.includes('529') || message.includes('rate')) {
          break;
        }
      }
    }
  }

  // All providers exhausted — check if it's a budget issue
  const allOverBudget = chain.every((p) => isProviderOverBudget(p));
  if (allOverBudget) {
    throw new Error(
      'All LLM providers have exceeded daily budget caps. Please retry in a few minutes. ' +
      `Errors: ${errors.map((e) => `${e.provider}: ${e.error}`).join(' | ')}`,
    );
  }

  throw new Error(
    `All LLM providers failed. ${errors.map((e) => `${e.provider}: ${e.error}`).join(' | ')}`,
  );
}

// ── LiteLLM Proxy Client ─────────────────────────────────────────────

const LITELLM_PROXY_URL = process.env.LITELLM_PROXY_URL || 'http://localhost:4000';

/**
 * Call LiteLLM proxy (OpenAI-compatible endpoint).
 * LiteLLM handles provider selection, retries, and failover transparently.
 * Use this when the LiteLLM proxy is deployed alongside the API on Railway.
 */
export async function callLiteLLMProxy(
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<{
  content: string;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number };
  model: string;
}> {
  const response = await fetch(`${LITELLM_PROXY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LiteLLM proxy error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model: string;
  };

  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    },
    model: data.model || modelName,
  };
}

/**
 * Determine whether to use LiteLLM proxy or direct failover.
 * If LITELLM_PROXY_URL is set and reachable, use the proxy.
 * Otherwise, fall back to direct multi-provider failover.
 */
export async function isLiteLLMAvailable(): Promise<boolean> {
  if (!process.env.LITELLM_PROXY_URL) return false;
  try {
    const res = await fetch(`${LITELLM_PROXY_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
