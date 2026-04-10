import { Injectable, Logger } from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';

@Injectable()
export class AutonomousProcessorService {
  private readonly logger = new Logger(AutonomousProcessorService.name);
  private get sb() { return getPlatformSupabaseClient(); }

  /**
   * Poll for queued autonomous executions and dispatch them into the job pipeline.
   * Called by a scheduler (wired in Session 4).
   */
  async processQueuedExecutions(): Promise<void> {
    const { data: executions, error } = await this.sb
      .from('autonomous_executions')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      this.logger.error(`Failed to query queued executions: ${error.message}`);
      return;
    }
    if (!executions?.length) return;

    this.logger.log(`Processing ${executions.length} queued autonomous executions`);
    for (const execution of executions) {
      try {
        await this.dispatchExecution(execution);
      } catch (err: any) {
        this.logger.error(`Failed to dispatch execution ${execution.id}: ${err.message}`);
        await this.sb
          .from('autonomous_executions')
          .update({ status: 'failed' })
          .eq('id', execution.id);
      }
    }
  }

  private async dispatchExecution(execution: any): Promise<void> {
    // Mark as running
    await this.sb
      .from('autonomous_executions')
      .update({ status: 'running' })
      .eq('id', execution.id);

    // Fetch the skill
    const { data: skill, error: skillErr } = await this.sb
      .from('skill_registry')
      .select('*')
      .eq('id', execution.skill_id)
      .single();

    if (skillErr || !skill) {
      this.logger.warn(`Skill not found for execution ${execution.id}: ${execution.skill_id}`);
      await this.sb
        .from('autonomous_executions')
        .update({ status: 'failed' })
        .eq('id', execution.id);
      return;
    }

    // Check cascade depth
    if ((execution.cascade_depth ?? 0) >= 5) {
      this.logger.warn(`Max cascade depth reached for execution ${execution.id}`);
      await this.sb
        .from('autonomous_executions')
        .update({ status: 'skipped' })
        .eq('id', execution.id);
      return;
    }

    // Resolve project for this team
    const { data: project } = await this.sb
      .from('projects')
      .select('id')
      .eq('team_id', execution.team_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!project) {
      this.logger.warn(`No project found for team ${execution.team_id}, skipping`);
      await this.sb.from('autonomous_executions').update({ status: 'skipped' }).eq('id', execution.id);
      return;
    }

    // Prevent duplicate builds within 1 hour
    const { data: recentJob } = await this.sb
      .from('jobs')
      .select('id, execution_state')
      .eq('project_id', project.id)
      .in('execution_state', ['completed', 'building', 'calling_llm', 'planning'])
      .gte('initiated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recentJob) {
      this.logger.log(`[AutonomousProcessor] project ${project.id} has recent job ${recentJob.id}, skipping`);
      await this.sb
        .from('autonomous_executions')
        .update({ status: 'skipped' })
        .eq('id', execution.id);
      return;
    }

    // Build prompt and insert job
    const prompt = `Using the ${skill.name} skill, analyze the incoming ${execution.trigger_source} data and generate the appropriate output for this team.`;

    const apiBase = process.env.RAILWAY_INTERNAL_URL || `http://localhost:${process.env.PORT || 3001}`;
    const jobRes = await fetch(`${apiBase}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VIBE_SERVICE_TOKEN || ''}`,
        'X-User-Id': process.env.VIBE_ADMIN_USER_ID || 'e167c9d1-0680-4cbb-80a0-5c75453584b9',
      },
      body: JSON.stringify({
        prompt,
        project_id: project.id,
        conversation_id: execution.id,
        mode: 'dashboard',
      }),
    }).catch(err => { throw new Error(`Job API call failed: ${err.message}`); });

    if (!jobRes.ok) {
      const errText = await jobRes.text();
      throw new Error(`Job creation failed: ${jobRes.status} ${errText}`);
    }

    const jobData = await jobRes.json() as any;
    const job = { id: jobData.task_id || jobData.id };

    // Mark execution complete with job reference
    await this.sb
      .from('autonomous_executions')
      .update({ job_id: job.id, status: 'complete' })
      .eq('id', execution.id);

    this.logger.log(`[AutonomousProcessor] dispatched job ${job.id} for skill ${skill.skill_name}`);
  }
}
