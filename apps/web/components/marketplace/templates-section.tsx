"use client"

import { useRouter } from "next/navigation"
import { ExternalLink, Sparkles, Zap } from "lucide-react"
import { BUILTIN_TEMPLATES, COMMUNITY_TEMPLATES } from "@/lib/dashboard-templates"

export function TemplatesSection() {
  const router = useRouter()

  const launchTemplate = (prompt: string) => {
    // Send user to chat with the prompt pre-filled via query string
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`)
  }

  return (
    <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-6 md:py-8">
      {/* ── Built-in Templates ── */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#00E5A0]" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            VIBE Templates
          </h2>
          <span className="text-xs text-muted-foreground">
            {BUILTIN_TEMPLATES.length} ready to launch · zero LLM calls
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Pre-built dashboards you can launch instantly. Connect a data source to swap sample data for live CRM records.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUILTIN_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => launchTemplate(t.prompt)}
              className="text-left rounded-xl border border-border bg-card p-5 transition-all hover:border-[#7B61FF]/50 hover:shadow-md hover:-translate-y-0.5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{t.icon}</div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50 border border-border">
                  {t.department}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">{t.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{t.description}</p>
              <p className="text-xs text-muted-foreground/70 mb-4 line-clamp-2">{t.preview}</p>

              <div className="flex items-center justify-between">
                {t.liveDataProviders && t.liveDataProviders.length > 0 ? (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Live data ready
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground">Sample data</div>
                )}
                <span className="text-xs font-medium text-[#7B61FF] group-hover:text-[#00E5A0] transition-colors flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Launch
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Community Templates ── */}
      <section className="mt-12">
        <div className="flex items-center gap-2 mb-2">
          <ExternalLink className="w-4 h-4 text-[#00B4D8]" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Community Templates
          </h2>
          <span className="text-xs text-muted-foreground">
            Free templates from shadcn.io
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Inspiration from the shadcn ecosystem. Open the source to see the implementation — or describe what you want and VIBE will build a version using your data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMMUNITY_TEMPLATES.map((t) => (
            <a
              key={t.url}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-border bg-card p-4 transition-all hover:border-[#00B4D8]/50 group flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00B4D8]/20 to-[#7B61FF]/20 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4 text-[#00B4D8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground bg-secondary/50">
                    {t.source}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#00B4D8] transition-colors shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
