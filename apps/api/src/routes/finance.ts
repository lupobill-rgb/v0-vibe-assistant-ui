import express, { Request, Response } from 'express';
import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import { getPlatformSupabaseClient } from '../supabase/client';

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

interface TeamRow { id: string; name: string }

async function resolveTeams(orgId: string): Promise<Map<string, string>> {
  const sb = getPlatformSupabaseClient();
  const { data } = await sb
    .from('teams')
    .select('id, name')
    .eq('org_id', orgId);
  const map = new Map<string, string>();
  if (data) {
    for (const t of data as TeamRow[]) {
      map.set(t.name.toLowerCase().trim(), t.id);
    }
  }
  return map;
}

// ── POST /api/finance/upload-plan ────────────────────────────────────────

router.post('/upload-plan', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Auth: extract user_id from body, query, or header
    const userId = (req.body?.user_id || req.query.user_id || req.headers['x-user-id']) as string;
    if (!userId) {
      return res.status(401).json({ error: 'user_id is required' });
    }

    // Authz: must be Finance team member
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

    // Parse CSV
    const csv = req.file.buffer.toString('utf-8');
    let rows: Record<string, string>[];
    try {
      rows = csvParse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (e: any) {
      return res.status(400).json({ error: `CSV parse error: ${e.message}` });
    }

    if (!rows.length) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Resolve team names → IDs
    const teamMap = await resolveTeams(orgId);

    const sb = getPlatformSupabaseClient();
    let rowsProcessed = 0;
    let rowsFailed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // +1 for header, +1 for 1-based

      const teamName = (row.team || '').trim();
      const category = (row.category || '').trim();
      const q1 = parseFloat(row.q1 || '0');
      const q2 = parseFloat(row.q2 || '0');
      const q3 = parseFloat(row.q3 || '0');
      const q4 = parseFloat(row.q4 || '0');

      if (!teamName) {
        errors.push(`Row ${lineNum}: missing team name`);
        rowsFailed++;
        continue;
      }
      if (!category) {
        errors.push(`Row ${lineNum}: missing category`);
        rowsFailed++;
        continue;
      }

      const teamId = teamMap.get(teamName.toLowerCase());
      if (!teamId) {
        errors.push(`Row ${lineNum}: team "${teamName}" not found in organization`);
        rowsFailed++;
        continue;
      }

      if ([q1, q2, q3, q4].some(isNaN)) {
        errors.push(`Row ${lineNum}: non-numeric amount value`);
        rowsFailed++;
        continue;
      }

      const { error: upsertErr } = await sb
        .from('budget_allocations')
        .upsert(
          {
            organization_id: orgId,
            team_id: teamId,
            category,
            fiscal_year: fiscalYear,
            q1_amount: q1,
            q2_amount: q2,
            q3_amount: q3,
            q4_amount: q4,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'team_id,category,fiscal_year' },
        );

      if (upsertErr) {
        errors.push(`Row ${lineNum}: ${upsertErr.message}`);
        rowsFailed++;
      } else {
        rowsProcessed++;
      }
    }

    res.json({
      rows_processed: rowsProcessed,
      rows_failed: rowsFailed,
      fiscal_year: fiscalYear,
      errors,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

export default router;
