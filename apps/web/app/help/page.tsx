"use client"

import { AppShell } from "@/components/app-shell"
import { HelpCircle, Book, Github, MessageCircle, ExternalLink } from "lucide-react"

const LINKS = [
  {
    icon: Book,
    title: "Documentation",
    description: "Learn how VIBE works, how to configure it, and how to use the API.",
    href: "https://github.com/UbiGrowth/VIBE#readme",
    label: "Read the docs",
  },
  {
    icon: Github,
    title: "GitHub Issues",
    description: "Report bugs or request features on the VIBE GitHub repository.",
    href: "https://github.com/UbiGrowth/VIBE/issues",
    label: "Open an issue",
  },
  {
    icon: MessageCircle,
    title: "Community",
    description: "Join the community to ask questions and share tips.",
    href: "https://github.com/UbiGrowth/VIBE/discussions",
    label: "Join discussions",
  },
]

export default function HelpPage() {
  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Page Header */}
        <div className="px-6 pt-8 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Help &amp; Support</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Resources, documentation, and community support
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 max-w-3xl">
          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {LINKS.map((link) => (
              <a
                key={link.title}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-card rounded-xl border border-border p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8EFF]/20 to-[#A855F7]/20 flex items-center justify-center mb-3">
                  <link.icon className="w-4 h-4 text-[#4F8EFF]" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{link.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {link.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4F8EFF] group-hover:underline">
                  {link.label}
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            ))}
          </div>

          {/* FAQ */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60">
              <h2 className="text-sm font-semibold text-foreground">Frequently Asked Questions</h2>
            </div>
            <div className="divide-y divide-border/60">
              {[
                {
                  q: "How do I create a project?",
                  a: 'Navigate to Projects → click "New Project" or "Import from GitHub". Your project will be cached and ready for jobs.',
                },
                {
                  q: "How do I submit a job?",
                  a: 'Go to Chat (or click "Open Project" from the Projects page), type your prompt, select a project, and press ⌘↵ or click the submit button.',
                },
                {
                  q: "Where do I see job logs?",
                  a: "After submitting a job you are redirected to the Task view which shows a live pipeline tracker and streaming build output.",
                },
                {
                  q: "How do I change the LLM provider?",
                  a: 'Go to Settings → LLM Configuration and select either OpenAI GPT-4 or Anthropic Claude. Your preference is saved locally.',
                },
                {
                  q: "Where is my GitHub pull request?",
                  a: "Once a job completes successfully, a PR link appears in the pipeline tracker footer and in the job history list.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="px-5 py-4">
                  <p className="text-sm font-medium text-foreground mb-1">{q}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
