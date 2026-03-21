import { NextResponse } from 'next/server';

// Invoked by Vercel Cron (see vercel.json).
// Authenticates with CRON_SECRET, then calls the staleness-agent Edge Function.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: Request) {
  // Verify this is coming from Vercel Cron (or an authorised caller)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const edgeFnUrl = `${SUPABASE_URL}/functions/v1/staleness-agent`;

  const res = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CRON_SECRET}`,
    },
  });

  const body = await res.json();

  if (!res.ok) {
    console.error('[cron/staleness] Edge Function error:', body);
    return NextResponse.json({ error: body }, { status: 500 });
  }

  console.log('[cron/staleness] result:', body);
  return NextResponse.json(body);
}
