import express, { Request, Response } from 'express';
import { getPlatformSupabaseClient } from '../supabase/client';
import { dispatchPendingExecutions } from '../kernel/execution-dispatcher';

const router = express.Router();

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

// POST /recommendations — bulk insert skill recommendations
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { org_id, team_id, recommendations } = req.body;
    if (!org_id || !team_id || !Array.isArray(recommendations) || recommendations.length === 0)
      return res.status(400).json({ error: 'org_id, team_id, and recommendations[] required' });

    if (!(await verifyTeamMembership(userId, team_id)))
      return res.status(403).json({ error: 'Not a member of this team' });

    const sb = getPlatformSupabaseClient();

    // Check existing pending to skip duplicates
    const { data: existing } = await sb
      .from('skill_recommendations')
      .select('title')
      .eq('team_id', team_id)
      .eq('status', 'pending');
    const existingTitles = new Set((existing ?? []).map((r: any) => r.title));

    const toInsert = recommendations
      .filter((r: any) => !existingTitles.has(r.title))
      .map((r: any) => ({
        org_id,
        team_id,
        title: r.title,
        rationale: r.rationale,
        proposed_action: r.proposed_action,
        estimated_impact: r.estimated_impact,
        priority: r.priority || 'medium',
        context_data: r.context_data || {},
        status: 'pending',
        created_by: userId,
      }));

    if (toInsert.length === 0) return res.json({ created: 0 });

    const { error } = await sb.from('skill_recommendations').insert(toInsert);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ created: toInsert.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /recommendations/:id/decide — approve or reject
router.post('/recommendations/:id/decide', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;
    const { decision, decision_note } = req.body;
    if (!decision || !['approved', 'rejected'].includes(decision))
      return res.status(400).json({ error: 'decision must be approved or rejected' });

    const sb = getPlatformSupabaseClient();

    // Fetch recommendation
    const { data: rec } = await sb
      .from('skill_recommendations')
      .select('*')
      .eq('id', id)
      .single();
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    if (!(await verifyTeamMembership(userId, rec.team_id)))
      return res.status(403).json({ error: 'Not a member of this team' });

    // Update status
    await sb.from('skill_recommendations').update({ status: decision }).eq('id', id);

    // Record approval
    await sb.from('skill_approvals').insert({
      recommendation_id: id,
      org_id: rec.org_id,
      team_id: rec.team_id,
      decision,
      decided_by: userId,
      decision_note: decision_note || null,
    });

    let execution_id: string | null = null;

    // If approved, queue execution
    if (decision === 'approved') {
      const { data: exec } = await sb
        .from('autonomous_executions')
        .insert({
          organization_id: rec.org_id,
          team_id: rec.team_id,
          skill_id: rec.skill_id || null,
          trigger_source: 'approval',
          trigger_event: rec.title,
          status: 'queued',
          cascade_depth: 0,
        })
        .select('id')
        .single();
      execution_id = exec?.id ?? null;
    }

    // Fire the dispatcher so the queued execution gets picked up immediately
    if (decision === 'approved' && execution_id) {
      dispatchPendingExecutions().catch((err) => {
        console.error('[approvals] dispatchPendingExecutions error:', err);
      });
    }

    res.json({ decision, execution_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /recommendations — list pending for a team
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const teamId = req.query.team_id as string;
    if (!teamId) return res.status(400).json({ error: 'team_id required' });

    if (!(await verifyTeamMembership(userId, teamId)))
      return res.status(403).json({ error: 'Not a member of this team' });

    const sb = getPlatformSupabaseClient();
    const { data, error } = await sb
      .from('skill_recommendations')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ recommendations: data ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
