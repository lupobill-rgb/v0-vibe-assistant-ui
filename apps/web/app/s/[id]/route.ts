import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Look up published URL from jobs table by job id
  const { data: job } = await supabase
    .from('jobs')
    .select('preview_url')
    .eq('id', id)
    .maybeSingle()

  const publishedUrl = job?.preview_url

  if (!publishedUrl) {
    return new NextResponse('Site not found', { status: 404 })
  }

  // Fetch the HTML from Supabase Storage
  const res = await fetch(publishedUrl)
  if (!res.ok) {
    return new NextResponse('Failed to load site', { status: 502 })
  }

  const html = await res.text()

  // Return with correct Content-Type so browser renders it
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
