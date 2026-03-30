import { Router, Request, Response } from 'express';
import { resolveKernelContext, resolveDepartmentSkills } from '../kernel/context-injector';
import { getPlatformSupabaseClient } from '../supabase/client';

const router = Router();

router.get('/api/kernel-context/:userId/:orgId/:teamId', async (req: Request, res: Response) => {
  try {
    const { userId, orgId, teamId } = req.params;
    const sb = getPlatformSupabaseClient();
    const kernel = await resolveKernelContext(userId, orgId, teamId);

    // Resolve department skills diagnostic
    const { data: team } = await sb.from('teams').select('function').eq('id', teamId).limit(1).single();
    const teamFunction = team?.function ?? null;
    let availableSkills = 0;
    let skillNames: string[] = [];
    if (teamFunction) {
      const { data: skills } = await sb
        .from('skill_registry')
        .select('skill_name')
        .eq('team_function', teamFunction)
        .neq('content', 'PENDING_DESKTOP_SEED');
      availableSkills = skills?.length ?? 0;
      skillNames = (skills ?? []).map((s: any) => s.skill_name);
    }
    const { data: teamRow } = await sb.from('teams').select('name').eq('id', teamId).limit(1).single();
    const sampleInjection = await resolveDepartmentSkills(sb, teamId, teamRow?.name ?? 'unknown');

    res.json({
      context: kernel.context,
      injectSupabaseHelpers: kernel.injectSupabaseHelpers,
      hasVisibleTeamData: kernel.context.includes('VISIBLE TEAM DATA'),
      department_skills: {
        team_function: teamFunction,
        available_skills: availableSkills,
        skill_names: skillNames,
        sample_injection: sampleInjection.text.slice(0, 500),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/kernel-context/:userId/:orgId', async (req: Request, res: Response) => {
  try {
    const kernel = await resolveKernelContext(req.params.userId, req.params.orgId);
    res.json({
      context: kernel.context,
      injectSupabaseHelpers: kernel.injectSupabaseHelpers,
      hasVisibleTeamData: kernel.context.includes('VISIBLE TEAM DATA'),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
