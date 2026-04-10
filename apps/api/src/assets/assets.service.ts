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

  /** Share an asset with specific users, teams, or role thresholds. */
  async shareAsset(
    assetId: string, sharedBy: string, orgId: string,
    targets: { type: 'user' | 'team' | 'role'; id?: string; role?: string }[],
    message?: string, accessLevel: string = 'read',
  ): Promise<{ shared: number; notified: number }> {
    const sb = getPlatformSupabaseClient();
    let shared = 0;
    let notified = 0;

    // Get asset info for notification text
    const { data: asset } = await sb
      .from('published_assets').select('name, team_id, teams!inner(name)')
      .eq('id', assetId).single();
    const assetName = (asset as any)?.name ?? 'a dashboard';
    const teamName = (asset as any)?.teams?.name ?? 'a team';

    for (const target of targets) {
      const row: any = {
        asset_id: assetId, shared_by: sharedBy, org_id: orgId,
        target_type: target.type, message: message ?? null, access_level: accessLevel,
      };
      if (target.type === 'user') row.target_user_id = target.id;
      if (target.type === 'team') row.target_team_id = target.id;
      if (target.type === 'role') row.target_role = target.role;

      const { error } = await sb.from('asset_shares').insert(row);
      if (error) { this.logger.warn(`Share insert failed: ${error.message}`); continue; }
      shared++;

      // Resolve recipients and create notifications
      const recipients = await this.resolveShareRecipients(sb, orgId, target);
      for (const userId of recipients) {
        await sb.from('notifications').insert({
          org_id: orgId, user_id: userId, type: 'share',
          title: `${teamName} shared "${assetName}" with you`,
          body: message || `New data available from ${teamName}`,
          link: `/feed?asset=${assetId}`, reference_id: assetId,
        });
        notified++;
      }
    }
    this.logger.log(`Shared asset ${assetId}: ${shared} shares, ${notified} notifications`);
    return { shared, notified };
  }

  /** Revoke a share. */
  async revokeShare(shareId: string, userId: string): Promise<void> {
    const sb = getPlatformSupabaseClient();
    const { error } = await sb.from('asset_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', shareId).eq('shared_by', userId);
    if (error) throw new Error(error.message);
  }

  /** Get assets shared with a specific user. */
  async getSharedWithMe(userId: string, orgId: string): Promise<any[]> {
    const sb = getPlatformSupabaseClient();

    // Get user's team memberships and roles
    const { data: memberships } = await sb
      .from('team_members').select('team_id, role').eq('user_id', userId);
    const teamIds = (memberships ?? []).map((m: any) => m.team_id);
    const roles = (memberships ?? []).map((m: any) => m.role);
    const ROLE_HIERARCHY = ['IC', 'Lead', 'Manager', 'Director', 'Executive', 'Admin'];
    const maxRoleIdx = Math.max(...roles.map((r: string) => ROLE_HIERARCHY.indexOf(r)));

    // Find shares targeting this user directly
    const { data: userShares } = await sb
      .from('asset_shares')
      .select('asset_id, message, shared_by, created_at, access_level')
      .eq('target_type', 'user').eq('target_user_id', userId)
      .eq('org_id', orgId).is('revoked_at', null);

    // Find shares targeting user's teams
    const { data: teamShares } = teamIds.length > 0
      ? await sb.from('asset_shares')
          .select('asset_id, message, shared_by, created_at, access_level')
          .eq('target_type', 'team').in('target_team_id', teamIds)
          .eq('org_id', orgId).is('revoked_at', null)
      : { data: [] };

    // Find shares targeting user's role level or below
    const { data: roleShares } = await sb
      .from('asset_shares')
      .select('asset_id, message, shared_by, created_at, target_role, access_level')
      .eq('target_type', 'role').eq('org_id', orgId).is('revoked_at', null);
    const matchingRoleShares = (roleShares ?? []).filter((s: any) => {
      const targetIdx = ROLE_HIERARCHY.indexOf(s.target_role);
      return targetIdx >= 0 && maxRoleIdx >= targetIdx;
    });

    // Dedupe by asset_id, collect all unique asset IDs
    const assetMap = new Map<string, any>();
    for (const s of [...(userShares ?? []), ...(teamShares ?? []), ...matchingRoleShares]) {
      if (!assetMap.has(s.asset_id)) assetMap.set(s.asset_id, s);
    }
    if (assetMap.size === 0) return [];

    // Fetch asset details
    const { data: assets } = await sb
      .from('published_assets')
      .select('id, name, description, asset_type, team_id, teams!inner(name)')
      .in('id', [...assetMap.keys()]).eq('is_active', true);

    return (assets ?? []).map((a: any) => {
      const share = assetMap.get(a.id);
      return {
        id: a.id, name: a.name, description: a.description,
        asset_type: a.asset_type, team_id: a.team_id,
        team_name: a.teams?.name, shared_at: share?.created_at,
        message: share?.message, access_level: share?.access_level,
      };
    });
  }

  /** Resolve share targets to a list of user IDs for notifications. */
  private async resolveShareRecipients(
    sb: ReturnType<typeof getPlatformSupabaseClient>,
    orgId: string, target: { type: string; id?: string; role?: string },
  ): Promise<string[]> {
    if (target.type === 'user' && target.id) return [target.id];

    if (target.type === 'team' && target.id) {
      const { data } = await sb.from('team_members').select('user_id').eq('team_id', target.id);
      return (data ?? []).map((m: any) => m.user_id);
    }

    if (target.type === 'role' && target.role) {
      const ROLE_HIERARCHY = ['IC', 'Lead', 'Manager', 'Director', 'Executive', 'Admin'];
      const minIdx = ROLE_HIERARCHY.indexOf(target.role);
      if (minIdx < 0) return [];
      const validRoles = ROLE_HIERARCHY.slice(minIdx);
      // Get all org teams
      const { data: teams } = await sb.from('teams').select('id').eq('org_id', orgId);
      if (!teams?.length) return [];
      const { data: members } = await sb.from('team_members')
        .select('user_id, role').in('team_id', teams.map((t: any) => t.id));
      return [...new Set(
        (members ?? []).filter((m: any) => validRoles.includes(m.role)).map((m: any) => m.user_id)
      )];
    }
    return [];
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
