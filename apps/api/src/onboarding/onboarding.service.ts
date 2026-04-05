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
   * Initialize an onboarding session for an organization.
   * Calls the initialize_onboarding RPC which is idempotent — returns
   * the existing session ID if one already exists.
   */
  async initSession(organizationId: string): Promise<{ sessionId: string | null }> {
    const { data, error } = await this.sb.rpc('initialize_onboarding', {
      p_org_id: organizationId,
    });

    if (error) {
      this.logger.error(`Failed to init onboarding for org ${organizationId}: ${error.message}`);
      return { sessionId: null };
    }

    this.logger.log(`Onboarding session initialized for org ${organizationId}: ${data}`);
    return { sessionId: data };
  }

  /**
   * Resolve (or create) the default project for an organization.
   * Uses upsert semantics to handle concurrent calls and retries safely.
   */
  private async resolveProjectId(organizationId: string): Promise<string | null> {
    // Find existing team first
    const { data: teams } = await this.sb
      .from('teams')
      .select('id')
      .eq('org_id', organizationId)
      .limit(1);

    let teamId: string;

    if (teams && teams.length > 0) {
      teamId = teams[0].id;
    } else {
      // Create default team — use ON CONFLICT via upsert
      const { data: newTeam, error: teamErr } = await this.sb
        .from('teams')
        .upsert(
          { org_id: organizationId, name: 'Default', slug: 'default' },
          { onConflict: 'org_id,slug' },
        )
        .select('id')
        .single();
      if (teamErr || !newTeam) {
        this.logger.error(`Failed to resolve team for org ${organizationId}: ${teamErr?.message}`);
        return null;
      }
      teamId = newTeam.id;
    }

    // Find existing project
    const { data: projects } = await this.sb
      .from('projects')
      .select('id')
      .eq('team_id', teamId)
      .limit(1);

    if (projects && projects.length > 0) {
      return projects[0].id;
    }

    // Create default project
    const { data: newProject, error: projErr } = await this.sb
      .from('projects')
      .insert({ team_id: teamId, name: 'Onboarding', local_path: '/tmp/onboarding' })
      .select('id')
      .single();

    if (projErr || !newProject) {
      this.logger.error(`Failed to create project for team ${teamId}: ${projErr?.message}`);
      return null;
    }

    return newProject.id;
  }

  /**
   * Generic step advancement. Validates step, calls the RPC, and returns the result.
   */
  async advanceStep(
    sessionId: string,
    fromStep: number,
    verdict = 'good',
    verdictMessage?: string,
    recommendation?: string,
  ): Promise<{ advanced: boolean }> {
    const { data, error } = await this.sb.rpc<boolean>('advance_onboarding_step', {
      p_session_id: sessionId,
      p_from_step: fromStep,
      p_verdict: verdict,
      p_verdict_message: verdictMessage ?? null,
      p_recommendation: recommendation ?? null,
    });

    if (error) {
      this.logger.error(`Failed to advance session ${sessionId} from step ${fromStep}: ${error.message}`);
      return { advanced: false };
    }

    this.logger.log(`Session ${sessionId} advanced from step ${fromStep}: ${data}`);
    return { advanced: data ?? false };
  }

  /**
   * Advance onboarding from step 3 (Data Analysis) to step 4 (Dashboard Build).
   * Auto-resolves the project from the session's organization.
   * Queues two dashboard-build jobs and calls advance_onboarding_step RPC.
   */
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
      this.logger.warn(`Session ${sessionId} is on step ${session.current_step}, not 3 — skipping`);
      return { jobIds: [], advanced: false };
    }

    const projectId = await this.resolveProjectId(session.organization_id);
    if (!projectId) {
      this.logger.error(`Could not resolve project for org ${session.organization_id}`);
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

    const { advanced } = await this.advanceStep(
      sessionId,
      3,
      'good',
      'Data profiling complete. Building dashboards.',
      'Executive and Operations dashboards generating now.',
    );

    this.logger.log(`Session ${sessionId} advanced to step 4. Jobs: ${jobIds.join(', ')}`);
    return { jobIds, advanced };
  }
}
