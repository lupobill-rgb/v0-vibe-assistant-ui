import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly sb = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  );

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
      this.logger.warn(`Session ${sessionId} is on step ${session.current_step}, not 3`);
      return { jobIds: [], advanced: false };
    }

    const jobIds: string[] = [];
    const templates = [
      { key: 'executive-command-dashboard', column: 'executive_dashboard_job_id' },
      { key: 'operations-command-center',   column: 'operations_dashboard_job_id' },
    ];

    for (const { key, column } of templates) {
      const jobId = crypto.randomUUID();
      const { error } = await this.sb.from('jobs').insert({
        id: jobId,
        user_prompt: `Build the ${key} using connected data sources`,
        execution_state: 'queued',
        agent_results: { template: key, onboarding_session_id: sessionId },
      });

      if (error) {
        this.logger.error(`Failed to queue ${key}: ${error.message}`);
      } else {
        jobIds.push(jobId);
        await this.sb.from('onboarding_sessions')
          .update({ [column]: jobId })
          .eq('id', sessionId);
      }
    }

    const { data: advanced } = await this.sb.rpc('advance_onboarding_step', {
      p_session_id: sessionId,
      p_from_step: 3,
      p_verdict: 'good',
      p_verdict_message: 'GREEN — Data profiling complete. Building dashboards.',
      p_recommendation: 'Executive and Operations dashboards generating now.',
    });

    this.logger.log(`Session ${sessionId} advanced to step 4. Jobs: ${jobIds.join(', ')}`);
    return { jobIds, advanced: advanced ?? false };
  }
}
