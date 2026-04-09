import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getPlatformSupabaseClient } from '../supabase/client';
import { dispatchPendingExecutions } from '../kernel/execution-dispatcher';

@Injectable()
export class AutonomousSchedulerService {
  private readonly logger = new Logger('AutonomousScheduler');

  @Cron('*/2 * * * *')
  async tick(): Promise<void> {
    this.logger.log('tick');
    try {
      const sb = getPlatformSupabaseClient();

      // Find distinct orgs with queued executions
      const { data: queued } = await sb
        .from('autonomous_executions')
        .select('organization_id')
        .eq('status', 'queued');
      const orgIds = [...new Set(queued?.map((r) => r.organization_id) ?? [])];
      if (orgIds.length === 0) {
        this.logger.log('no queued executions');
        return;
      }

      // Check kill switch per org
      const { data: killed } = await sb
        .from('organizations')
        .select('id')
        .eq('autonomous_kill_switch', true)
        .in('id', orgIds);
      const killedIds = new Set(killed?.map((o) => o.id) ?? []);
      for (const id of killedIds) {
        this.logger.warn(`kill switch active for org ${id}, skipping`);
      }

      // Fail queued executions for killed orgs
      if (killedIds.size > 0) {
        await sb
          .from('autonomous_executions')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('status', 'queued')
          .in('organization_id', [...killedIds]);
      }

      // Promote remaining queued → pending so dispatcher picks them up
      const liveOrgIds = orgIds.filter((id) => !killedIds.has(id));
      if (liveOrgIds.length > 0) {
        await sb
          .from('autonomous_executions')
          .update({ status: 'pending' })
          .eq('status', 'queued')
          .in('organization_id', liveOrgIds);
      }

      const count = await dispatchPendingExecutions();
      this.logger.log(count > 0 ? `dispatched ${count} execution(s)` : 'no pending executions');
    } catch (err) {
      this.logger.error('tick failed', err instanceof Error ? err.stack : err);
    }
  }
}
