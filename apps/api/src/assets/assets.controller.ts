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
