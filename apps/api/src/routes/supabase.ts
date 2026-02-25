import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from '../storage';
import { createSupabaseAdminClient } from '../supabase/client';

const router = Router();

// ── Encryption helpers (AES-256-GCM) ───────────────────────────────────────

function deriveKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY env var is not set');
  return crypto.scryptSync(raw, 'vibe-supabase-salt', 32);
}

function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':');
}

function decrypt(stored: string): string {
  const [ivHex, tagHex, encHex] = stored.split(':');
  const key = deriveKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(encHex, 'hex', 'utf8') + decipher.final('utf8');
}

// ── POST /api/supabase/connect ──────────────────────────────────────────────

router.post('/connect', async (req: Request, res: Response) => {
  const { projectId, url, anonKey, serviceKey } = req.body as {
    projectId?: string;
    url?: string;
    anonKey?: string;
    serviceKey?: string;
  };

  if (!projectId || !url || !anonKey || !serviceKey) {
    return res.status(400).json({ error: 'projectId, url, anonKey, and serviceKey are required' });
  }

  // Validate URL shape without logging the key
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid Supabase URL' });
  }

  if (!process.env.ENCRYPTION_KEY) {
    return res.status(500).json({ error: 'Server is not configured for credential storage (ENCRYPTION_KEY missing)' });
  }

  // Validate credentials by performing a lightweight Supabase API call
  try {
    const client = createSupabaseAdminClient(url, serviceKey);
    await client.storage.listBuckets();
  } catch {
    return res.status(422).json({ error: 'Could not connect to Supabase: invalid URL or service key' });
  }

  const serviceKeyEnc = encrypt(serviceKey);
  await storage.upsertSupabaseConnection(projectId, url, anonKey, serviceKeyEnc);

  res.json({ ok: true, projectId, url });
});

// ── GET /api/supabase/status/:projectId ────────────────────────────────────

router.get('/status/:projectId', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const conn = await storage.getSupabaseConnection(projectId);

  if (!conn) {
    return res.json({ connected: false, projectId });
  }

  // Return public info only — never echo the service key
  res.json({
    connected: true,
    projectId,
    url: conn.url,
    anonKey: conn.anon_key,
    connectedAt: conn.connected_at,
  });
});

// ── POST /api/supabase/migrate ──────────────────────────────────────────────

router.post('/migrate', async (req: Request, res: Response) => {
  const { projectId, sql } = req.body as { projectId?: string; sql?: string };

  if (!projectId || !sql) {
    return res.status(400).json({ error: 'projectId and sql are required' });
  }

  const conn = await storage.getSupabaseConnection(projectId);
  if (!conn) {
    return res.status(404).json({ error: 'No Supabase connection found for this project' });
  }

  const serviceKey = decrypt(conn.service_key_enc);
  const client = createSupabaseAdminClient(conn.url, serviceKey);

  const { error } = await client.rpc('exec_sql', { query: sql }).single();
  if (error) {
    // Attempt direct REST SQL execution via pg endpoint
    const pgUrl = conn.url.replace(/\/?$/, '') + '/rest/v1/rpc/exec_sql';
    try {
      const resp = await fetch(pgUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        return res.status(422).json({ error: (body as any).message || 'Migration failed' });
      }
      return res.json({ ok: true });
    } catch (fetchErr: any) {
      return res.status(500).json({ error: fetchErr.message || 'Migration failed' });
    }
  }

  res.json({ ok: true });
});

// ── POST /api/supabase/add-table ───────────────────────────────────────────

interface ColumnDef {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
}

router.post('/add-table', async (req: Request, res: Response) => {
  const { projectId, tableName, columns } = req.body as {
    projectId?: string;
    tableName?: string;
    columns?: ColumnDef[];
  };

  if (!projectId || !tableName || !Array.isArray(columns) || columns.length === 0) {
    return res.status(400).json({ error: 'projectId, tableName, and columns[] are required' });
  }

  // Validate identifiers to prevent SQL injection
  const ident = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!ident.test(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }
  for (const col of columns) {
    if (!ident.test(col.name)) {
      return res.status(400).json({ error: `Invalid column name: ${col.name}` });
    }
    if (!ident.test(col.type.split('(')[0].trim())) {
      return res.status(400).json({ error: `Invalid column type: ${col.type}` });
    }
  }

  const conn = await storage.getSupabaseConnection(projectId);
  if (!conn) {
    return res.status(404).json({ error: 'No Supabase connection found for this project' });
  }

  const colDefs = columns
    .map((c) => {
      let def = `"${c.name}" ${c.type}`;
      if (c.nullable === false) def += ' NOT NULL';
      if (c.default !== undefined) def += ` DEFAULT ${c.default}`;
      return def;
    })
    .join(',\n  ');

  const migrationSql = `
CREATE TABLE IF NOT EXISTS "${tableName}" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ${colDefs},
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = '${tableName}' AND policyname = '${tableName}_deny_all'
  ) THEN
    EXECUTE 'CREATE POLICY "${tableName}_deny_all" ON "${tableName}" FOR ALL USING (false)';
  END IF;
END$$;
`.trim();

  const serviceKey = decrypt(conn.service_key_enc);
  const sqlEndpoint = conn.url.replace(/\/?$/, '') + '/rest/v1/rpc/exec_sql';
  try {
    const resp = await fetch(sqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: migrationSql }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      return res.status(422).json({ error: (body as any).message || 'Table creation failed' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Table creation failed' });
  }

  res.status(201).json({ ok: true, tableName, rlsEnabled: true, sql: migrationSql });
});

export default router;
