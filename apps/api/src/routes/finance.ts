import express, { Request, Response } from 'express';
import multer from 'multer';
import { getPlatformSupabaseClient } from '../supabase/client';
import { ingestTeamAsset } from '../lib/ingest-team-asset';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are supported. XLSX support is a future enhancement.'));
    }
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────

async function getFinanceTeamId(userId: string): Promise<string | null> {
  const sb = getPlatformSupabaseClient();
  const { data } = await sb
    .from('team_members')
    .select('team_id, teams!inner(name)')
    .eq('user_id', userId)
    .eq('teams.name', 'Finance')
    .limit(1);
  return data && data.length > 0 ? data[0].team_id : null;
}

// ── POST /api/finance/upload-plan ────────────────────────────────────────

router.post('/upload-plan', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req.body?.user_id || req.query.user_id || req.headers['x-user-id']) as string;
    if (!userId) {
      return res.status(401).json({ error: 'user_id is required' });
    }

    const financeTeamId = await getFinanceTeamId(userId);
    if (!financeTeamId) {
      return res.status(403).json({ error: 'Only Finance team members can upload budget plans' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Attach a CSV as "file".' });
    }

    const orgId = (req.body?.organization_id || req.query.organization_id) as string;
    if (!orgId) {
      return res.status(400).json({ error: 'organization_id is required' });
    }

    const fiscalYear = parseInt(
      (req.body?.fiscal_year || req.query.fiscal_year) as string, 10,
    ) || new Date().getFullYear();

    const csv = req.file.buffer.toString('utf-8');
    const result = await ingestTeamAsset({
      teamId: financeTeamId,
      assetType: 'budget_plan',
      rawContent: csv,
      originalFilename: req.file.originalname,
      orgId,
      publishedBy: userId,
      metadata: { fiscal_year: fiscalYear },
    });

    if (result.errors.length > 0 && result.row_count === 0) {
      return res.status(400).json(result);
    }

    // Return backward-compatible shape
    res.json({
      asset_id: result.asset_id,
      rows_processed: result.budget_ingest?.rows_processed ?? result.row_count,
      rows_failed: result.budget_ingest?.rows_failed ?? 0,
      fiscal_year: fiscalYear,
      replaced: result.replaced,
      errors: result.errors,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

// Multer error handler (oversized files, wrong type)
router.use((err: any, _req: Request, res: Response, next: Function) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 5 MB.' });
  }
  if (err?.name === 'MulterError' || err?.message?.includes('Only CSV')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
