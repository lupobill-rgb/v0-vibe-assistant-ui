import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import path from 'path';
import { getPlatformSupabaseClient } from '../supabase/client';

/** Extract user_id by validating token against Supabase auth. */
async function extractUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const supabase = getPlatformSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user?.id) return user.id;
  }
  return (req.body?.user_id as string) ?? null;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'No file provided. Attach a .csv or .xlsx file.' });
    }

    const userId = await extractUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required: provide a valid Authorization header' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv' && ext !== '.xlsx') {
      return res.status(400).json({ error: 'Unsupported file type. Only .csv and .xlsx are accepted.' });
    }

    let columns: string[] = [];
    let allRows: Record<string, unknown>[] = [];
    let rowCount = 0;

    if (ext === '.csv') {
      const records = csvParse(file.buffer, {
        relax_column_count: true,
        skip_empty_lines: true,
        columns: true,
        cast: true,
      }) as Record<string, unknown>[];
      rowCount = records.length;
      columns = records.length > 0 ? Object.keys(records[0]) : [];
      allRows = records;
    } else {
      // .xlsx — persist raw file so upload_id is available for the build prompt
      rowCount = Math.round(file.size / 50);
      const xlsxTableName = path.basename(file.originalname, ext)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '') || 'uploaded_data';

      const sb = getPlatformSupabaseClient();
      const { data: xlsxInserted, error: xlsxError } = await sb
        .from('user_uploads')
        .insert({
          user_id: userId,
          project_id: req.body?.project_id || null,
          original_filename: file.originalname,
          table_name: xlsxTableName,
          columns: [],
          column_schema: {},
          sample_data: [],
          raw_content: file.buffer.toString('base64'),
          row_count: rowCount,
          aggregated_stats: { totalRows: rowCount },
        })
        .select('id')
        .single();

      if (xlsxError) {
        console.error('[UPLOAD] XLSX Supabase insert failed:', xlsxError.message);
        return res.status(500).json({ error: `Failed to persist upload: ${xlsxError.message}` });
      }

      console.log(`[UPLOAD] Persisted XLSX upload ${xlsxInserted.id} — ${xlsxTableName}, ~${rowCount} rows`);

      return res.json({
        upload_id: xlsxInserted.id,
        original_filename: file.originalname,
        table_name: xlsxTableName,
        columns: [],
        row_count: rowCount,
        size: file.size,
        note: 'XLSX column preview not yet supported. CSV is recommended for full data context.',
      });
    }

    // Derive a safe table name from the filename
    const tableName = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '') || 'uploaded_data';

    // Infer column types from first 50 rows
    const inferType = (val: unknown): string => {
      if (val === null || val === undefined || val === '') return 'string';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'boolean') return 'boolean';
      const s = String(val);
      if (!isNaN(Number(s)) && s.trim() !== '') return 'number';
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 'date';
      return 'string';
    };
    const columnSchema: Record<string, string> = {};
    for (const col of columns) {
      const sample = allRows.slice(0, 50).map(r => r[col]);
      const types = sample.filter(v => v !== null && v !== undefined && v !== '').map(inferType);
      columnSchema[col] = types.length > 0
        ? (types.find(t => t === 'number') && types.every(t => t === 'number') ? 'number'
          : types.every(t => t === 'date') ? 'date'
          : types.every(t => t === 'boolean') ? 'boolean'
          : 'string')
        : 'string';
    }

    // Keep first 20 rows as the sample injected into LLM context
    const SAMPLE_LIMIT = 20;
    const sampleData = allRows.slice(0, SAMPLE_LIMIT);

    // Compute real aggregates from ALL rows so dashboards show correct totals
    const aggregatedStats: Record<string, unknown> = { totalRows: rowCount };
    const columnStats: Record<string, unknown> = {};
    for (const col of columns) {
      const vals = allRows.map(r => r[col]);
      const nonNull = vals.filter(v => v !== null && v !== undefined && v !== '');
      const colType = columnSchema[col];
      const stat: Record<string, unknown> = { nonNullCount: nonNull.length, nullCount: vals.length - nonNull.length };

      if (colType === 'number') {
        const nums = nonNull.map(v => Number(v)).filter(n => !isNaN(n));
        if (nums.length > 0) {
          const sum = nums.reduce((a, b) => a + b, 0);
          stat.sum = Math.round(sum * 100) / 100;
          stat.min = Math.min(...nums);
          stat.max = Math.max(...nums);
          stat.mean = Math.round((sum / nums.length) * 100) / 100;
        }
      } else {
        // Distinct value counts (cap at 50 most frequent to keep payload sane)
        const freq: Record<string, number> = {};
        for (const v of nonNull) {
          const key = String(v);
          freq[key] = (freq[key] || 0) + 1;
        }
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        stat.distinctCount = sorted.length;
        stat.topValues = Object.fromEntries(sorted.slice(0, 50));
      }
      columnStats[col] = stat;
    }
    aggregatedStats.columns = columnStats;

    // Persist to Supabase user_uploads table
    const sb = getPlatformSupabaseClient();
    const { data: inserted, error: insertError } = await sb
      .from('user_uploads')
      .insert({
        user_id: userId,
        project_id: req.body?.project_id || null,
        original_filename: file.originalname,
        table_name: tableName,
        columns,
        column_schema: columnSchema,
        sample_data: sampleData,
        raw_content: file.buffer.toString('utf-8'),
        row_count: rowCount,
        aggregated_stats: aggregatedStats,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[UPLOAD] Supabase insert failed:', insertError.message);
      return res.status(500).json({ error: `Failed to persist upload: ${insertError.message}` });
    }

    console.log(`[UPLOAD] Persisted upload ${inserted.id} — ${tableName}, ${rowCount} rows, ${columns.length} cols`);

    return res.json({
      upload_id: inserted.id,
      original_filename: file.originalname,
      table_name: tableName,
      columns,
      column_schema: columnSchema,
      row_count: rowCount,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process file' });
  }
});

// Multer error handler (oversized files, etc.)
router.use((err: any, _req: Request, res: Response, next: Function) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 10 MB.' });
  }
  if (err?.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
