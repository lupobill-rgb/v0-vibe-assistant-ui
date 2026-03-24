import express, { Request, Response } from 'express';
import multer from 'multer';
import { getPlatformSupabaseClient } from '../supabase/client';
import { ingestBudgetCSV } from '../lib/ingest-budget-csv';

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

async function isFinanceMember(userId: string): Promise<boolean> {
  const sb = getPlatformSupabaseClient();
  const { data } = await sb
    .from('team_members')
    .select('team_id, teams!inner(name)')
    .eq('user_id', userId)
    .eq('teams.name', 'Finance')
    .limit(1);
  return !!(data && data.length > 0);
}

// ── POST /api/finance/upload-plan ────────────────────────────────────────

router.post('/upload-plan', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req.body?.user_id || req.query.user_id || req.headers['x-user-id']) as string;
    if (!userId) {
      return res.status(401).json({ error: 'user_id is required' });
    }

    if (!(await isFinanceMember(userId))) {
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
    const result = await ingestBudgetCSV(csv, orgId, fiscalYear);

    if (result.rows_processed === 0 && result.errors.length > 0) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

export default router;
