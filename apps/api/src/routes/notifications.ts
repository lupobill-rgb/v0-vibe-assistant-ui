import express, { Request, Response } from 'express';
import { getPlatformSupabaseClient } from '../supabase/client';

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

/** GET /notifications — unread + recent notifications */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const sb = getPlatformSupabaseClient();
    const { data, error } = await sb
      .from('notifications')
      .select('id, type, title, body, link, reference_id, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });

    const unread_count = (data ?? []).filter((n: any) => !n.is_read).length;
    res.json({ notifications: data ?? [], unread_count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /notifications/:id/read — mark one as read */
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const sb = getPlatformSupabaseClient();
    await sb.from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', userId);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /notifications/read-all — mark all as read */
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const sb = getPlatformSupabaseClient();
    await sb.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
