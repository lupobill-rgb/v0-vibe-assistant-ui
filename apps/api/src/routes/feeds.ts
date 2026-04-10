import express, { Request, Response } from 'express';
import { getPlatformSupabaseClient } from '../supabase/client';

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ptaqytvztkhjpuawdxng.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

function extractUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64').toString());
      return (payload.sub as string) ?? null;
    } catch { return null; }
  }
  return null;
}

async function verifyTeamMembership(userId: string, teamId: string): Promise<boolean> {
  const sb = getPlatformSupabaseClient();
  const { data } = await sb
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { assetId, teamId } = req.body;
    if (!assetId || !teamId) return res.status(400).json({ error: 'assetId and teamId required' });

    if (!(await verifyTeamMembership(userId, teamId)))
      return res.status(403).json({ error: 'Not a member of this team' });

    // Prevent subscribing to own team's assets
    const sb = getPlatformSupabaseClient();
    const { data: asset } = await sb
      .from('published_assets')
      .select('team_id')
      .eq('id', assetId)
      .single();
    if (asset?.team_id === teamId)
      return res.status(400).json({ error: 'Cannot subscribe to your own team\'s feeds' });

    const { error } = await sb
      .from('feed_subscriptions')
      .upsert({
        asset_id: assetId,
        subscriber_team_id: teamId,
        subscriber_user_id: userId,
        status: 'active',
      }, { onConflict: 'asset_id,subscriber_team_id' });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ subscribed: true, assetId, teamId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { assetId, teamId } = req.body;
    if (!assetId || !teamId) return res.status(400).json({ error: 'assetId and teamId required' });

    if (!(await verifyTeamMembership(userId, teamId)))
      return res.status(403).json({ error: 'Not a member of this team' });

    const sb = getPlatformSupabaseClient();
    const { error } = await sb
      .from('feed_subscriptions')
      .update({ status: 'cancelled' })
      .eq('asset_id', assetId)
      .eq('subscriber_team_id', teamId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ unsubscribed: true, assetId, teamId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const jobId = req.query.jobId as string;
    const teamId = req.query.teamId as string;
    if (!jobId || !teamId) return res.status(400).json({ error: 'jobId and teamId required' });

    if (!(await verifyTeamMembership(userId, teamId)))
      return res.status(403).json({ error: 'Not a member of this team' });

    const recs = await getFeedRecommendations(jobId, teamId);
    res.json({ recommendations: recs });
  } catch (err: any) {
    console.error('[FEEDS] recommendations error:', err.message);
    res.json({ recommendations: [] });
  }
});

async function getFeedRecommendations(
  jobId: string, teamId: string,
): Promise<{ assetId: string; feedName: string; publisherTeam: string; reason: string }[]> {
  const sb = getPlatformSupabaseClient();

  // Get job context
  const { data: job } = await sb
    .from('jobs')
    .select('user_prompt, project_id')
    .eq('id', jobId)
    .single();
  if (!job?.user_prompt) return [];

  // Get team + org info
  const { data: team } = await sb
    .from('teams')
    .select('name, org_id')
    .eq('id', teamId)
    .single();
  if (!team?.org_id) return [];

  // Find other teams in the same org
  const { data: orgTeams } = await sb
    .from('teams')
    .select('id')
    .eq('org_id', team.org_id)
    .neq('id', teamId);
  const otherTeamIds = (orgTeams ?? []).map((t: any) => t.id);
  if (otherTeamIds.length === 0) return [];

  // Find cross-team feeds
  const { data: feeds } = await sb
    .from('published_assets')
    .select('id, asset_type, original_filename, row_count, team_id, teams!inner(name)')
    .in('team_id', otherTeamIds);

  if (!feeds || feeds.length === 0) return [];

  // Exclude already-subscribed feeds
  const { data: existing } = await sb
    .from('feed_subscriptions')
    .select('asset_id')
    .eq('subscriber_team_id', teamId)
    .eq('status', 'active');
  const subscribedSet = new Set((existing ?? []).map((e: any) => e.asset_id));
  const available = feeds.filter((f: any) => !subscribedSet.has(f.id));
  if (available.length === 0) return [];

  // Call LLM via edge function for recommendations
  const feedList = available.map((f: any) =>
    `- ${f.asset_type} from ${(f as any).teams?.name ?? 'unknown'} (id: ${f.id}, ${f.row_count ?? 0} rows)`
  ).join('\n');

  const system = `You are a cross-team data advisor. Given the build that just completed and the available feeds from other departments, recommend 0-2 feeds that would enrich this team's work. Return JSON: { "recommendations": [{ "assetId": "...", "feedName": "...", "publisherTeam": "...", "reason": "..." }] } or { "recommendations": [] }. Never recommend irrelevant feeds. Quality over quantity. Return ONLY valid JSON, no markdown.`;

  const prompt = `Team "${team.name}" just completed a build with prompt: "${job.user_prompt}"\n\nAvailable cross-team feeds:\n${feedList}`;

  try {
    const llmRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-diff`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, system, model: 'deepseek', max_tokens: 512 }),
    });
    if (!llmRes.ok) {
      console.warn(`[FEEDS] Edge function returned ${llmRes.status}`);
      return [];
    }
    const llmData = (await llmRes.json()) as { diff?: string };
    const text = (llmData.diff || '').trim();
    if (!text) return [];
    // Try direct JSON parse first, then regex extraction
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*"recommendations"[\s\S]*\}/);
      if (!jsonMatch) return [];
      parsed = JSON.parse(jsonMatch[0]);
    }
    return (parsed.recommendations || []).slice(0, 2);
  } catch (err: any) {
    console.error('[FEEDS] LLM recommendation failed (non-blocking):', err.message);
    return [];
  }
}

export default router;
