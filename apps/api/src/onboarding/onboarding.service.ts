import { Injectable, Logger } from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';
import { TRIAL_DURATION_DAYS, getSeatPriceCents, INCLUDED_TOKENS_PER_USER } from '../billing/tiers';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  private get sb() {
    return getPlatformSupabaseClient();
  }

  /**
   * Initialize a free trial for an organization.
   * Called when the org first begins onboarding.
   * Sets trial_started_at and trial_ends_at on the organizations row.
   */
  async initializeTrial(orgId: string): Promise<{ trialEndsAt: string }> {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000);

    const { error } = await this.sb
      .from('organizations')
      .update({
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        billing_model: 'seat_token',
        subscription_status: 'trialing',
        tokens_used_this_period: 0,
        tokens_included_this_period: INCLUDED_TOKENS_PER_USER,
        current_period_start: now.toISOString(),
      })
      .eq('id', orgId);

    if (error) {
      this.logger.error(`Failed to initialize trial for org ${orgId}: ${error.message}`);
    } else {
      this.logger.log(`Trial initialized for org ${orgId}, ends ${trialEnd.toISOString()}`);
    }

    return { trialEndsAt: trialEnd.toISOString() };
  }

  /**
   * Check if an org's trial has expired and trigger seat billing.
   * Should be called periodically or on login/activity events.
   * Returns true if the org transitioned from trial to paid.
   */
  async checkTrialExpiry(orgId: string): Promise<{
    expired: boolean;
    seatPriceCents: number;
    activeUsers: number;
  }> {
    const { data: org, error } = await this.sb
      .from('organizations')
      .select('trial_ends_at, subscription_status, active_user_count, billing_model')
      .eq('id', orgId)
      .single();

    if (error || !org) {
      return { expired: false, seatPriceCents: 0, activeUsers: 0 };
    }

    // Skip if not in trial or already converted
    if (org.subscription_status !== 'trialing' || !org.trial_ends_at) {
      return { expired: false, seatPriceCents: 0, activeUsers: org.active_user_count || 0 };
    }

    const trialEnd = new Date(org.trial_ends_at);
    if (trialEnd.getTime() > Date.now()) {
      // Trial still active
      return { expired: false, seatPriceCents: 0, activeUsers: org.active_user_count || 0 };
    }

    // Trial expired — transition to seat billing
    const activeUsers = Math.max(1, org.active_user_count || 1);
    const seatPrice = getSeatPriceCents(activeUsers);

    await this.sb
      .from('organizations')
      .update({
        subscription_status: 'requires_payment',
        tokens_included_this_period: INCLUDED_TOKENS_PER_USER * activeUsers,
      })
      .eq('id', orgId);

    this.logger.log(
      `Trial expired for org ${orgId}: ${activeUsers} users at $${(seatPrice / 100).toFixed(2)}/user/month`,
    );

    return { expired: true, seatPriceCents: seatPrice, activeUsers };
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

    // Initialize trial when reaching step 4 (first substantive use)
    await this.initializeTrial(session.organization_id);

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
