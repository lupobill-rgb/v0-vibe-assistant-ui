import {
  Controller, Post, Get, Body, Param, Query, Req,
  Logger, BadRequestException, UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import { AssetsService } from './assets.service';
import { getPlatformSupabaseClient } from '../supabase/client';

function extractUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(auth.slice(7).split('.')[1], 'base64').toString(),
    );
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

interface PublishBody {
  project_id: string;
  name: string;
  description?: string;
  asset_type: string;
  visibility: 'org' | 'private';
}

@Controller('assets')
export class AssetsController {
  private readonly logger = new Logger(AssetsController.name);

  constructor(private readonly assetsService: AssetsService) {}

  /**
   * POST /assets/publish
   * Publish a project as a shared asset.
   */
  @Post('publish')
  async publish(@Req() req: Request, @Body() body: PublishBody) {
    const userId = extractUserId(req);
    if (!userId) throw new UnauthorizedException('Authentication required');

    const { project_id, name, asset_type, visibility } = body;
    if (!project_id || !name || !asset_type || !visibility) {
      throw new BadRequestException('project_id, name, asset_type, visibility required');
    }
    if (visibility !== 'org' && visibility !== 'private') {
      throw new BadRequestException('visibility must be org or private');
    }

    // Resolve team_id and org_id from user membership
    const sb = getPlatformSupabaseClient();
    const { data: membership } = await sb
      .from('team_members')
      .select('team_id, teams(org_id)')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!membership) {
      throw new BadRequestException('User has no team membership');
    }

    const teamId = membership.team_id as string;
    const orgId = (membership as any).teams?.org_id as string;

    try {
      const result = await this.assetsService.publish({
        project_id,
        name,
        description: body.description,
        asset_type,
        visibility,
        user_id: userId,
        team_id: teamId,
        org_id: orgId,
      });
      this.logger.log(`Published asset ${result.id} by user ${userId}`);
      return result;
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * POST /assets/:id/subscribe
   * Subscribe current team to an asset.
   */
  @Post(':id/subscribe')
  async subscribe(@Req() req: Request, @Param('id') assetId: string) {
    const userId = extractUserId(req);
    if (!userId) throw new UnauthorizedException('Authentication required');

    // Resolve subscriber's current team
    const sb = getPlatformSupabaseClient();
    const { data: membership } = await sb
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!membership) {
      throw new BadRequestException('User has no team membership');
    }

    try {
      await this.assetsService.subscribe(assetId, membership.team_id, userId);
      this.logger.log(`User ${userId} subscribed team ${membership.team_id} to asset ${assetId}`);
      return { subscribed: true };
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * POST /assets/recommendations
   * Bulk-insert skill recommendations for a team.
   */
  @Post('recommendations')
  async createRecommendations(@Req() req: Request, @Body() body: {
    team_id: string;
    recommendations: Array<{
      skill_id?: string; title: string; rationale: string;
      proposed_action: string; estimated_impact?: string;
      context_data?: Record<string, unknown>; priority?: string;
    }>;
  }) {
    const userId = extractUserId(req);
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!body.team_id || !body.recommendations?.length) {
      throw new BadRequestException('team_id and recommendations[] required');
    }

    const sb = getPlatformSupabaseClient();
    const { data: membership } = await sb
      .from('team_members')
      .select('team_id, teams(org_id)')
      .eq('user_id', userId)
      .eq('team_id', body.team_id)
      .limit(1)
      .single();
    if (!membership) throw new BadRequestException('Not a member of this team');

    const orgId = (membership as any).teams?.org_id as string;
    const rows = body.recommendations.map((r) => ({
      org_id: orgId,
      team_id: body.team_id,
      skill_id: r.skill_id ?? null,
      title: r.title,
      rationale: r.rationale,
      proposed_action: r.proposed_action,
      estimated_impact: r.estimated_impact ?? null,
      context_data: r.context_data ?? null,
      priority: r.priority ?? 'medium',
    }));

    const { data, error } = await sb.from('skill_recommendations').insert(rows).select('id');
    if (error) throw new InternalServerErrorException(error.message);
    this.logger.log(`Created ${data.length} recommendations for team ${body.team_id}`);
    return { created: data.length };
  }

  /**
   * POST /assets/recommendations/:id/decide
   * Approve or reject a recommendation.
   */
  @Post('recommendations/:id/decide')
  async decideRecommendation(
    @Req() req: Request,
    @Param('id') recId: string,
    @Body() body: { decision: 'approved' | 'rejected'; decision_note?: string },
  ) {
    const userId = extractUserId(req);
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!['approved', 'rejected'].includes(body.decision)) {
      throw new BadRequestException('decision must be approved or rejected');
    }

    const sb = getPlatformSupabaseClient();
    const { data: rec, error: recErr } = await sb
      .from('skill_recommendations')
      .select('*')
      .eq('id', recId)
      .single();
    if (recErr || !rec) throw new BadRequestException('Recommendation not found');

    // Update recommendation status
    await sb.from('skill_recommendations').update({ status: body.decision }).eq('id', recId);

    let executionId: string | null = null;

    if (body.decision === 'approved' && rec.skill_id) {
      const { data: exec } = await sb.from('autonomous_executions').insert({
        organization_id: rec.org_id,
        team_id: rec.team_id,
        skill_id: rec.skill_id,
        trigger_source: 'approval',
        trigger_event: 'recommendation_approved',
        trigger_payload: { recommendation_id: recId },
        status: 'pending',
      }).select('id').single();
      executionId = exec?.id ?? null;
    }

    await sb.from('skill_approvals').insert({
      recommendation_id: recId,
      org_id: rec.org_id,
      team_id: rec.team_id,
      decision: body.decision,
      decided_by: userId,
      decision_note: body.decision_note ?? null,
      execution_id: executionId,
    });

    this.logger.log(`Recommendation ${recId} ${body.decision} by ${userId}`);
    return { decision: body.decision, execution_id: executionId };
  }

  /**
   * GET /assets/feed?team_id=...
   * Get org-visible assets from other teams with subscription status.
   */
  @Get('feed')
  async feed(@Req() req: Request, @Query('team_id') teamId: string) {
    const userId = extractUserId(req);
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!teamId) throw new BadRequestException('team_id query param required');

    try {
      const assets = await this.assetsService.getFeed(teamId);
      return assets;
    } catch (err: any) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
