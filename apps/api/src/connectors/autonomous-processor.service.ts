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

    // Build prompt and insert job
    const prompt = `Using the ${skill.name} skill, analyze the incoming ${execution.trigger_source} data and generate the appropriate output for this team.`;

    const apiUrl = process.env.RAILWAY_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service': 'autonomous-processor',
        'X-Team-Id': execution.team_id,
        'X-Org-Id': execution.organization_id,
      },
      body: JSON.stringify({
        prompt,
        project_id: project.id,
        conversation_id: execution.id,
        mode: 'dashboard',
        type: 'autonomous',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Job creation failed: ${response.status} ${errText}`);
    }

    const jobData = await response.json() as any;
    const job = { id: jobData.task_id || jobData.id };

    // Mark execution complete with job reference
    await this.sb
      .from('autonomous_executions')
      .update({ job_id: job.id, status: 'complete' })
      .eq('id', execution.id);

    this.logger.log(`[AutonomousProcessor] dispatched job ${job.id} for skill ${skill.name}`);
  }
}
