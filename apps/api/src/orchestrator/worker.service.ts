/**
 * ClaudeWorker — executes a single PlanStep with skill-scoped tools.
 * Loads skill row, composes thin-wrapper + skill.system_prompt, dispatches by
 * mode. Provider-agnostic; runtime dispatch is stubbed until a later sprint.
 * Not yet registered in app.module.ts.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type StepMode = 'build' | 'runtime' | 'hybrid';

export interface PlanStep {
  id: string;
  plan_id?: string;
  skill_id: string;
  mode: StepMode;
  prompt: string;
  context?: Record<string, unknown>;
  team_id?: string;
}

export interface SkillRow {
  id: string;
  skill_name: string;
  system_prompt: string | null;
  team_function?: string | null;
}

export interface WorkerResult {
  step_id: string;
  skill_id: string;
  mode: StepMode;
  output: unknown;
  duration_ms: number;
  ok: boolean;
  error?: string;
}

export interface IWorker {
  executeStep(step: PlanStep): Promise<WorkerResult>;
}

// Thin wrapper — replaces VIBE_SYSTEM_RULES (Sprint 1A). Skills own domain.
const THIN_WRAPPER = [
  'You are a VIBE skill worker. Execute exactly one step of a larger plan.',
  'Reliability over cleverness. Working output beats clever broken output.',
  'Scope: atomic, minimal, traceable. No whole-file rewrites unless instructed.',
  'Security: no secrets in output, RLS assumed, least privilege by default.',
  'Silent failure is forbidden. Return plain-English reason if you cannot proceed.',
].join('\n');

export class ClaudeWorker implements IWorker {
  private readonly model: string;
  private readonly apiKey: string;

  constructor(
    private readonly supabase: SupabaseClient,
    opts: { model?: string; apiKey?: string } = {},
  ) {
    this.model = opts.model || 'claude-sonnet-4-6';
    this.apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY || '';
  }

  async executeStep(step: PlanStep): Promise<WorkerResult> {
    const start = Date.now();
    try {
      const skill = await this.loadSkill(step.skill_id);
      const systemPrompt = this.composeSystemPrompt(skill);

      let output: unknown;
      switch (step.mode) {
        case 'build':
          output = await this.runBuild(step, systemPrompt);
          break;
        case 'runtime':
          output = this.runRuntime(step);
          break;
        case 'hybrid':
          output = await this.runHybrid(step, systemPrompt);
          break;
        default:
          throw new Error(`Unknown step mode: ${String((step as PlanStep).mode)}`);
      }

      return {
        step_id: step.id,
        skill_id: step.skill_id,
        mode: step.mode,
        output,
        duration_ms: Date.now() - start,
        ok: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        step_id: step.id,
        skill_id: step.skill_id,
        mode: step.mode,
        output: null,
        duration_ms: Date.now() - start,
        ok: false,
        error: message,
      };
    }
  }

  private async loadSkill(skillId: string): Promise<SkillRow> {
    const { data, error } = await this.supabase
      .from('skill_registry')
      .select('id, skill_name, system_prompt, team_function')
      .eq('id', skillId)
      .maybeSingle();

    if (error) throw new Error(`skill_registry lookup failed: ${error.message}`);
    if (!data) throw new Error(`skill_registry: no row for id ${skillId}`);
    return data as SkillRow;
  }

  private composeSystemPrompt(skill: SkillRow): string {
    const skillPrompt = (skill.system_prompt || '').trim();
    return skillPrompt ? `${THIN_WRAPPER}\n\n${skillPrompt}` : THIN_WRAPPER;
  }

  private async runBuild(
    step: PlanStep,
    systemPrompt: string,
  ): Promise<{ content: string; tokens_in: number; tokens_out: number }> {
    const { text, tokens_in, tokens_out } = await this.callClaude(systemPrompt, step.prompt);
    return { content: text, tokens_in, tokens_out };
  }

  private runRuntime(step: PlanStep): { stub: true; reason: string; step_id: string } {
    // TODO(sprint-runtime): Wire provider-agnostic runtime dispatch.
    // Runtime tools (Nango-backed connectors, internal skills, etc.) arrive in
    // a later sprint. Until then this path is an intentional no-op so the
    // orchestrator can flow through hybrid plans without blocking on live
    // connectors. Do NOT hardcode provider names here when implementing.
    return {
      stub: true,
      reason: 'runtime dispatch not yet implemented — see worker.service.ts TODO',
      step_id: step.id,
    };
  }

  private async runHybrid(
    step: PlanStep,
    systemPrompt: string,
  ): Promise<{ build: unknown; runtime: unknown }> {
    const build = await this.runBuild(step, systemPrompt);
    // TODO(sprint-runtime): attach real runtime hooks produced by build output.
    const runtime = this.runRuntime(step);
    return { build, runtime };
  }

  private async callClaude(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ text: string; tokens_in: number; tokens_out: number }> {
    if (!this.apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Claude ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    return {
      text: data.content?.[0]?.text ?? '',
      tokens_in: data.usage?.input_tokens ?? 0,
      tokens_out: data.usage?.output_tokens ?? 0,
    };
  }
}
