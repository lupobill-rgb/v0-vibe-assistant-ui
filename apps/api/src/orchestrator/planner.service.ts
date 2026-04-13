import { Injectable, Logger } from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';

/**
 * Shape of a single step in an ExecutionPlan.
 * A step maps a composable skill to concrete inputs chosen by the planner.
 */
export interface ExecutionStep {
  skill_slug: string;
  inputs: Record<string, unknown>;
  rationale?: string;
}

/**
 * Strict shape returned by ClaudePlanner. Anything else is rejected.
 */
export interface ExecutionPlan {
  steps: ExecutionStep[];
  summary?: string;
}

/**
 * Planner contract. Other orchestrator components depend on this interface,
 * not on ClaudePlanner directly, so the implementation can be swapped.
 */
export interface IPlanner {
  plan(userPrompt: string, context?: Record<string, unknown>): Promise<ExecutionPlan>;
}

/**
 * Thrown when the LLM returns a response that cannot be parsed into an
 * ExecutionPlan. Callers (Prompt 6 circuit breaker) should treat this as
 * a terminal planner failure, not a transport error.
 */
export class PlannerMalformedResponseError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message);
    this.name = 'PlannerMalformedResponseError';
  }
}

interface ComposableSkillRow {
  slug: string;
  name: string;
  mode: string;
  inputs_schema: unknown;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const PLANNER_MODEL = 'claude-haiku-4-5-20251001';

/**
 * 5-line wrapper. No prescriptive rules, no examples, no chain-of-thought
 * scaffolding. Claude chooses which skills to invoke.
 */
const WRAPPER_SYSTEM_PROMPT = [
  'You are the VIBE planner.',
  'Given a user request and a list of composable skills, choose which skills to run and with what inputs.',
  'Each step must reference a skill by its exact slug and supply inputs matching that skill inputs_schema.',
  'Respond with a single JSON object: {"steps":[{"skill_slug":"...","inputs":{...},"rationale":"..."}],"summary":"..."}',
  'Return JSON only. No prose. No markdown fences.',
].join('\n');

/** Aliases consumed by OrchestratorController — keep in sync with controller imports. */
export interface Plan {
  steps: ExecutionStep[];
  summary?: string;
  usedFallback: boolean;
}

export { ClaudePlanner as PlannerService };

@Injectable()
export class ClaudePlanner implements IPlanner {
  private readonly logger = new Logger(ClaudePlanner.name);
  private get sb() {
    return getPlatformSupabaseClient();
  }

  async plan(
    userPrompt: string,
    context: string | Record<string, unknown> = {},
  ): Promise<ExecutionPlan & { usedFallback: boolean }> {
    // When called from controller with team_id string, normalize to context object.
    const ctx = typeof context === 'string' ? { team_id: context } : context;
    const skills = await this.fetchComposableSkills();
    const systemPrompt = this.buildSystemPrompt(skills);
    const userMessage = this.buildUserMessage(userPrompt, ctx);
    const raw = await this.callClaude(systemPrompt, userMessage);
    const parsed = this.parseStrictJson(raw);
    return { ...this.validatePlan(parsed, raw), usedFallback: false };
  }

  private async fetchComposableSkills(): Promise<ComposableSkillRow[]> {
    const { data, error } = await this.sb
      .from('skill_registry')
      .select('slug, name, mode, inputs_schema')
      .eq('composable', true);
    if (error) {
      this.logger.error(`Failed to load composable skills: ${error.message}`);
      throw new Error(`Planner could not load composable skills: ${error.message}`);
    }
    return (data ?? []) as ComposableSkillRow[];
  }

  private buildSystemPrompt(skills: ComposableSkillRow[]): string {
    const manifest = skills.map((s) => ({
      slug: s.slug,
      name: s.name,
      mode: s.mode,
      inputs_schema: s.inputs_schema ?? {},
    }));
    return `${WRAPPER_SYSTEM_PROMPT}\n\nAvailable skills:\n${JSON.stringify(manifest)}`;
  }

  private buildUserMessage(userPrompt: string, context: Record<string, unknown>): string {
    if (!context || Object.keys(context).length === 0) return userPrompt;
    return `${userPrompt}\n\nContext:\n${JSON.stringify(context)}`;
  }

  private async callClaude(systemPrompt: string, userMessage: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: PLANNER_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 500)}`);
    }
    const data: any = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== 'string' || text.length === 0) {
      throw new PlannerMalformedResponseError('Empty response from Claude', JSON.stringify(data));
    }
    return text;
  }

  private parseStrictJson(raw: string): unknown {
    const stripped = this.stripFences(raw).trim();
    try {
      return JSON.parse(stripped);
    } catch (err) {
      throw new PlannerMalformedResponseError(
        `Planner response was not valid JSON: ${(err as Error).message}`,
        raw,
      );
    }
  }

  private stripFences(raw: string): string {
    let s = raw.trim();
    if (s.startsWith('```')) {
      s = s.replace(/^```(?:json)?\s*/i, '');
      const end = s.lastIndexOf('```');
      if (end !== -1) s = s.slice(0, end);
    }
    return s;
  }

  private validatePlan(parsed: unknown, raw: string): ExecutionPlan {
    if (!parsed || typeof parsed !== 'object') {
      throw new PlannerMalformedResponseError('Plan must be an object', raw);
    }
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.steps)) {
      throw new PlannerMalformedResponseError('Plan.steps must be an array', raw);
    }
    const steps: ExecutionStep[] = obj.steps.map((step, i) => {
      if (!step || typeof step !== 'object') {
        throw new PlannerMalformedResponseError(`steps[${i}] must be an object`, raw);
      }
      const s = step as Record<string, unknown>;
      if (typeof s.skill_slug !== 'string' || s.skill_slug.length === 0) {
        throw new PlannerMalformedResponseError(`steps[${i}].skill_slug must be a non-empty string`, raw);
      }
      if (!s.inputs || typeof s.inputs !== 'object' || Array.isArray(s.inputs)) {
        throw new PlannerMalformedResponseError(`steps[${i}].inputs must be an object`, raw);
      }
      return {
        skill_slug: s.skill_slug,
        inputs: s.inputs as Record<string, unknown>,
        rationale: typeof s.rationale === 'string' ? s.rationale : undefined,
      };
    });
    return {
      steps,
      summary: typeof obj.summary === 'string' ? obj.summary : undefined,
    };
  }
}
