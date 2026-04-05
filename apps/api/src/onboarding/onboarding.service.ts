import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly sb = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  );

  /**
   * Advance onboarding from step 3 (Data Analysis) to step 4 (Dashboard Build).
   * Queues two dashboard-build jobs and calls the advance_onboarding_step RPC.
   */
  async advanceToStep4(sessionId: string, projectId: string): Promise<{ jobIds: string[]; advanced: boolean }> {
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
      this.logger.warn(`Session ${sessionId} is on step ${session.current_step}, not 3 — skipping`);
      return { jobIds: [], advanced: false };
    }

    const jobIds: string[] = [];

    const templates = [
      'executive-command-dashboard',
      'operations-command-center',
    ];

    for (const key of templates) {
      const jobId = crypto.randomUUID();
      const branch = `onboarding/${key}-${jobId.slice(0, 8)}`;
      const { error } = await this.sb.from('jobs').insert({
        id: jobId,
        project_id: projectId,
        user_prompt: `Build the ${key} using connected data sources`,
        execution_state: 'queued',
        destination_branch: branch,
      });

      if (error) {
        this.logger.error(`Failed to queue ${key}: ${error.message}`);
      } else {
        jobIds.push(jobId);
      }
    }

    const { data: advanced, error: rpcErr } = await this.sb.rpc<boolean>('advance_onboarding_step', {
      p_session_id: sessionId,
      p_from_step: 3,
      p_verdict: 'good',
      p_verdict_message: 'Data profiling complete. Building dashboards.',
      p_recommendation: 'Executive and Operations dashboards generating now.',
    });

    if (rpcErr) {
      this.logger.error(`Failed to advance session ${sessionId} to step 4: ${rpcErr.message}`);
      return { jobIds, advanced: false };
    }

    this.logger.log(`Session ${sessionId} advanced to step 4. Jobs: ${jobIds.join(', ')}`);
    return { jobIds, advanced: advanced ?? false };
  }
}
