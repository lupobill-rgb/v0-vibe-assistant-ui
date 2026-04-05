import { Injectable, Logger } from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  private get sb() {
    return getPlatformSupabaseClient();
  }

  async advanceToStep4(sessionId: string): Promise<{ jobIds: string[]; advanced: boolean }> {
    const { data: session, error: sessionErr } = await this.sb
      .from('onboarding_sessions')
      .select('id, organization_id, current_step')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      this.logger.error(`Session not found: ${sessionId}`);
      return { jobIds: [], advanced: false };
    }

    if (session.current_step !== 3) {
      return { jobIds: [], advanced: false };
    }

    const jobIds: string[] = [];

    for (const key of ['executive-command-dashboard', 'operations-command-center']) {
      const jobId = crypto.randomUUID();
      const { error } = await this.sb.from('jobs').insert({
        id: jobId,
        user_prompt: `Build the ${key} using connected data sources`,
        execution_state: 'queued',
        agent_results: { template: key, onboarding_session_id: sessionId },
      });
      if (!error) jobIds.push(jobId);
    }

    await this.sb.rpc('advance_onboarding_step', {
      p_session_id: sessionId,
      p_from_step: 3,
      p_verdict: 'good',
      p_verdict_message: 'Data profiling complete.',
      p_recommendation: 'Dashboards generating now.',
    });

    return { jobIds, advanced: true };
  }
}
