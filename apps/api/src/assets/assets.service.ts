import { Injectable, Logger } from '@nestjs/common';
import { getPlatformSupabaseClient } from '../supabase/client';

interface PublishInput {
  project_id: string;
  name: string;
  description?: string;
  asset_type: string;
  visibility: 'org' | 'private';
  user_id: string;
  team_id: string;
  org_id: string;
}

interface FeedAsset {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  team_id: string;
  is_subscribed: boolean;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async publish(input: PublishInput): Promise<{ id: string; name: string; slug: string }> {
    const sb = getPlatformSupabaseClient();
    const slug = this.slugify(input.name);

    const { data, error } = await sb
      .from('published_assets')
      .insert({
        org_id: input.org_id,
        team_id: input.team_id,
        published_by: input.user_id,
        name: input.name,
        description: input.description ?? null,
        asset_type: input.asset_type,
        visibility: input.visibility,
        project_id: input.project_id,
        is_active: true,
        slug,
      })
      .select('id, name, slug')
      .single();

    if (error) {
      this.logger.error(`Publish failed: ${error.message}`);
      throw new Error(error.message);
    }

    return data as { id: string; name: string; slug: string };
  }

  async subscribe(
    assetId: string,
    subscriberTeamId: string,
    subscriberUserId: string,
  ): Promise<void> {
    const sb = getPlatformSupabaseClient();

    const { error } = await sb
      .from('feed_subscriptions')
      .upsert(
        {
          asset_id: assetId,
          subscriber_team_id: subscriberTeamId,
          subscriber_user_id: subscriberUserId,
          status: 'active',
        },
        { onConflict: 'asset_id,subscriber_team_id' },
      );

    if (error) {
      this.logger.error(`Subscribe failed: ${error.message}`);
      throw new Error(error.message);
    }
  }

  async getFeed(teamId: string): Promise<FeedAsset[]> {
    const sb = getPlatformSupabaseClient();

    // Get org_id for this team
    const { data: team } = await sb
      .from('teams')
      .select('org_id')
      .eq('id', teamId)
      .single();

    if (!team?.org_id) return [];

    // Fetch org-visible assets from OTHER teams
    const { data: assets, error } = await sb
      .from('published_assets')
      .select('id, name, description, asset_type, team_id')
      .eq('visibility', 'org')
      .eq('org_id', team.org_id)
      .eq('is_active', true)
      .neq('team_id', teamId);

    if (error) {
      this.logger.error(`Feed query failed: ${error.message}`);
      throw new Error(error.message);
    }
    if (!assets || assets.length === 0) return [];

    // Get current subscriptions for this team
    const assetIds = assets.map((a: any) => a.id);
    const { data: subs } = await sb
      .from('feed_subscriptions')
      .select('asset_id')
      .eq('subscriber_team_id', teamId)
      .eq('status', 'active')
      .in('asset_id', assetIds);

    const subscribedSet = new Set((subs ?? []).map((s: any) => s.asset_id));

    return assets.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      asset_type: a.asset_type,
      team_id: a.team_id,
      is_subscribed: subscribedSet.has(a.id),
    }));
  }
}
