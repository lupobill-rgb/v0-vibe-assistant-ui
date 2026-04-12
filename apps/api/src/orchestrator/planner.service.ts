import { Injectable, Logger } from '@nestjs/common';

export interface Plan {
  summary: string;
  steps: string[];
  model: string;
  usedFallback: boolean;
}

// GPT-4 circuit breaker: retries once ONLY on 429/529/timeout.
// NOT a quality fallback. Any other error throws.
export async function anthropicWithGpt4Breaker(
  prompt: string, system: string,
): Promise<{ text: string; model: string; usedFallback: boolean }> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 60_000);
  let retryable = false;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (res.ok) {
      const d: any = await res.json();
      return { text: d?.content?.[0]?.text ?? '', model: 'claude-opus-4-6', usedFallback: false };
    }
    if (res.status !== 429 && res.status !== 529) {
      throw new Error(`anthropic ${res.status}: ${await res.text()}`);
    }
    retryable = true;
  } catch (err: any) {
    if (err?.name === 'AbortError') retryable = true;
    if (!retryable) throw err;
  } finally {
    clearTimeout(to);
  }

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!r.ok) throw new Error(`gpt4 ${r.status}: ${await r.text()}`);
  const d: any = await r.json();
  return { text: d?.choices?.[0]?.message?.content ?? '', model: 'gpt-4', usedFallback: true };
}

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  async plan(userPrompt: string, teamId: string): Promise<Plan> {
    const system = 'You are a planner. Return a numbered plan of build steps.';
    const result = await anthropicWithGpt4Breaker(`Team ${teamId}: ${userPrompt}`, system);
    if (result.usedFallback) this.logger.warn(`planner used gpt-4 fallback (team=${teamId})`);
    const steps = result.text
      .split('\n')
      .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
      .filter((l) => l.length > 0)
      .slice(0, 10);
    return { summary: result.text.slice(0, 200), steps, model: result.model, usedFallback: result.usedFallback };
  }
}
