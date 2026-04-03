import express, { Request, Response } from 'express';
import { getPlatformSupabaseClient } from '../supabase/client';
import { ConnectorType } from '../connectors/nango.service';

const router = express.Router();

/** Known Nango provider values (lowercase) for input validation. */
const VALID_PROVIDERS = new Set<string>(Object.values(ConnectorType));

/**
 * POST /api/skills/:skillId/triggers
 *
 * Body: { provider: string }
 * Adds a trigger row linking a skill to a webhook provider.
 */
router.post('/:skillId/triggers', async (req: Request, res: Response) => {
  try {
    const { skillId } = req.params;
    const { provider } = req.body ?? {};

    if (!skillId) {
      return res.status(400).json({ error: 'Missing skillId parameter' });
    }
    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid provider in request body' });
    }

    const normalised = provider.trim().toLowerCase();
    if (!VALID_PROVIDERS.has(normalised)) {
      return res.status(400).json({
        error: `Unknown provider: ${provider}`,
        valid_providers: [...VALID_PROVIDERS],
      });
    }

    const sb = getPlatformSupabaseClient();

    // Verify skill exists
    const { data: skill, error: skillErr } = await sb
      .from('skill_registry')
      .select('id')
      .eq('id', skillId)
      .single();

    if (skillErr || !skill) {
      return res.status(404).json({ error: `Skill not found: ${skillId}` });
    }

    // Insert trigger row (unique constraint prevents duplicates)
    const { data: trigger, error: insertErr } = await sb
      .from('skill_triggers')
      .insert({ skill_id: skillId, provider: normalised })
      .select('id, skill_id, provider, created_at')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(409).json({ error: `Trigger already exists for provider: ${normalised}` });
      }
      console.error('[skill-triggers] insert failed:', insertErr.message);
      return res.status(500).json({ error: 'Failed to create trigger' });
    }

    return res.status(201).json(trigger);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[skill-triggers] POST error:', message);
    return res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/skills/:skillId/triggers/:provider
 *
 * Removes the trigger linking a skill to a specific provider.
 */
router.delete('/:skillId/triggers/:provider', async (req: Request, res: Response) => {
  try {
    const { skillId, provider } = req.params;

    if (!skillId) {
      return res.status(400).json({ error: 'Missing skillId parameter' });
    }
    if (!provider) {
      return res.status(400).json({ error: 'Missing provider parameter' });
    }

    const normalised = provider.trim().toLowerCase();
    if (!VALID_PROVIDERS.has(normalised)) {
      return res.status(400).json({
        error: `Unknown provider: ${provider}`,
        valid_providers: [...VALID_PROVIDERS],
      });
    }

    const sb = getPlatformSupabaseClient();

    const { data, error } = await sb
      .from('skill_triggers')
      .delete()
      .eq('skill_id', skillId)
      .eq('provider', normalised)
      .select('id');

    if (error) {
      console.error('[skill-triggers] delete failed:', error.message);
      return res.status(500).json({ error: 'Failed to delete trigger' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: `No trigger found for skill=${skillId}, provider=${normalised}` });
    }

    return res.status(200).json({ deleted: true, skill_id: skillId, provider: normalised });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[skill-triggers] DELETE error:', message);
    return res.status(500).json({ error: message });
  }
});

export default router;
