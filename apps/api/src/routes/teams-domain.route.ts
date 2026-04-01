import { Router, Response } from 'express';
import crypto from 'crypto';
import { resolve as dnsResolve } from 'dns/promises';
import { getPlatformSupabaseClient } from '../supabase/client';
import { assertTenantOwnership } from '../middleware/tenant';
import { AuthRequest } from '../auth';

const router = Router();

// POST /:id/domain — set custom domain for a team
router.post('/:id/domain', async (req: AuthRequest, res: Response) => {
  try {
    const teamId = req.params.id;
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'domain (string) is required' });
    }

    // Normalize: lowercase, strip trailing dot, trim whitespace
    const normalized = domain.trim().toLowerCase().replace(/\.$/, '');

    const sb = getPlatformSupabaseClient();

    // Look up the team
    const { data: team, error: teamErr } = await sb
      .from('teams')
      .select('id, org_id')
      .eq('id', teamId)
      .single();

    if (teamErr || !team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!assertTenantOwnership(team.org_id, req, res)) return;

    const token = crypto.randomUUID();

    const { error: updateErr } = await sb
      .from('teams')
      .update({
        custom_domain: normalized,
        domain_verified: false,
        domain_verification_token: token,
      })
      .eq('id', teamId);

    if (updateErr) {
      return res.status(500).json({ error: `Failed to save domain: ${updateErr.message}` });
    }

    res.json({
      domain: normalized,
      verified: false,
      instructions: {
        cname: { type: 'CNAME', name: normalized, value: 'cname.vercel-dns.com' },
        txt: { type: 'TXT', name: `_vibe-verify.${normalized}`, value: token },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: `Domain setup failed: ${err.message}` });
  }
});

// POST /:id/domain/verify — verify domain ownership via TXT record
router.post('/:id/domain/verify', async (req: AuthRequest, res: Response) => {
  try {
    const teamId = req.params.id;
    const sb = getPlatformSupabaseClient();

    const { data: team, error: teamErr } = await sb
      .from('teams')
      .select('id, org_id, custom_domain, domain_verification_token')
      .eq('id', teamId)
      .single();

    if (teamErr || !team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!assertTenantOwnership(team.org_id, req, res)) return;

    if (!team.custom_domain || !team.domain_verification_token) {
      return res.status(400).json({ error: 'No domain configured for this team. Call POST /:id/domain first.' });
    }

    const txtHost = `_vibe-verify.${team.custom_domain}`;
    let records: string[][];
    try {
      records = await dnsResolve(txtHost, 'TXT');
    } catch (dnsErr: any) {
      return res.status(422).json({
        error: 'DNS lookup failed — TXT record not found yet',
        detail: dnsErr.code || dnsErr.message,
        expected: { host: txtHost, value: team.domain_verification_token },
      });
    }

    // TXT records come back as arrays of chunks; flatten and check
    const flat = records.map((chunks) => chunks.join('')).flat();
    if (!flat.includes(team.domain_verification_token)) {
      return res.status(422).json({
        error: 'TXT record found but value does not match',
        expected: team.domain_verification_token,
        found: flat,
      });
    }

    const { error: updateErr } = await sb
      .from('teams')
      .update({ domain_verified: true })
      .eq('id', teamId);

    if (updateErr) {
      return res.status(500).json({ error: `Failed to update verification: ${updateErr.message}` });
    }

    res.json({ domain: team.custom_domain, verified: true });
  } catch (err: any) {
    res.status(500).json({ error: `Domain verification failed: ${err.message}` });
  }
});

export default router;
