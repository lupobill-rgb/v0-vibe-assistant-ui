import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /s/:id — Short share URL redirect.
 *
 * Looks up the published storage URL for a job and 302-redirects to it.
 * No authentication required — the target Supabase Storage bucket is public.
 *
 * Uses SUPABASE_SERVICE_KEY (server-only) to bypass RLS when reading
 * the jobs table. Falls back to the public anon key if the service key
 * is not configured.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!id || id.length < 8) {
    return new NextResponse('Invalid link', { status: 400 })
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''

  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse('Service unavailable', { status: 503 })
  }

  const sb = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Try jobs.preview_url first (set during publish)
  const { data: job } = await sb
    .from('jobs')
    .select('preview_url')
    .eq('id', id)
    .maybeSingle()

  if (job?.preview_url) {
    return NextResponse.redirect(job.preview_url, 302)
  }

  // Fallback: check projects.published_url (using id as project_id)
  const { data: project } = await sb
    .from('projects')
    .select('published_url')
    .eq('id', id)
    .maybeSingle()

  if (project?.published_url) {
    return NextResponse.redirect(project.published_url, 302)
  }

  // Not found — friendly HTML response
  return new NextResponse(
    `<!DOCTYPE html>
<html><head><title>VIBE — Site not found</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#cbd5e1;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{text-align:center;max-width:400px;padding:2rem}h1{color:#a78bfa;font-size:1.5rem}p{line-height:1.6}a{color:#818cf8}</style>
</head><body><div class="c">
<h1>Site not found</h1>
<p>This link may have expired or the site hasn't been published yet.</p>
<a href="/">Go to VIBE</a>
</div></body></html>`,
    { status: 404, headers: { 'Content-Type': 'text/html' } },
  )
}
