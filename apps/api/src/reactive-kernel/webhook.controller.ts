import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpException,
  Logger,
} from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';

interface DataEventBody {
  source: string;
  event: string;
  organization_id: string;
  team_id: string;
  payload?: object;
}

@Controller('api/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  @Post('data-event')
  @HttpCode(200)
  async handleDataEvent(
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() body: DataEventBody,
  ) {
    try {
      // 1. Validate shared secret
      const expected = process.env.REACTIVE_KERNEL_WEBHOOK_SECRET;
      if (!expected || !secret || secret !== expected) {
        throw new HttpException('Unauthorized', 401);
      }

      // 2. Validate required fields
      for (const field of ['source', 'event', 'organization_id', 'team_id'] as const) {
        if (!body[field]) {
          throw new HttpException({ error: 'missing_field', field }, 400);
        }
      }

      const { source, event, organization_id, team_id, payload } = body;

      // 3. Construct trigger key: source:eventPrefix
      const triggerKey = `${source}:${event.split('.')[0]}`;

      // 4. Query matching skills
      const sb = getPlatformSupabaseClient();
      const { data: matches, error: queryError } = await sb
        .from('skill_triggers')
        .select('skill_id, skill_registry!inner(id, is_active)')
        .eq('provider', triggerKey)
        .eq('skill_registry.is_active', true);

      if (queryError) {
        this.logger.error(`skill_triggers query failed: ${queryError.message}`);
        throw new Error(queryError.message);
      }

      // 5. No matches — silent success
      if (!matches || matches.length === 0) {
        this.logger.warn(`No skills matched trigger key: ${triggerKey}`);
        return { matched: 0, executions_created: 0 };
      }

      // 6. Batch insert autonomous_executions
      const rows = matches.map((m: any) => ({
        organization_id,
        team_id,
        skill_id: m.skill_id,
        trigger_source: source,
        trigger_event: event,
        trigger_payload: payload ?? null,
        status: 'pending',
      }));

      const { data: inserted, error: insertError } = await sb
        .from('autonomous_executions')
        .insert(rows)
        .select('id');

      if (insertError) {
        this.logger.error(`autonomous_executions insert failed: ${insertError.message}`);
        throw new Error(insertError.message);
      }

      const executionIds = (inserted ?? []).map((r: any) => r.id);

      return {
        matched: matches.length,
        executions_created: executionIds.length,
        execution_ids: executionIds,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const payloadKeys = body?.payload ? Object.keys(body.payload) : [];
      this.logger.error(
        `Webhook data-event error: ${(err as Error).message}`,
        { source: body?.source, event: body?.event, payloadKeys },
      );
      throw new HttpException({ error: 'internal' }, 500);
    }
  }
}
