import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, Globe, Zap, Layers, Cpu } from 'lucide-react'
import { cn } from '../../lib/utils'
import { createJob, type Project } from '../../api/client'

const suggestions = [
  { icon: Globe, label: 'Build a landing page' },
  { icon: Zap, label: 'Create a REST API' },
  { icon: Layers, label: 'Design a dashboard' },
  { icon: Cpu, label: 'Add authentication' },
]

interface PromptCardProps {
  projects: Project[]
}

export function PromptCard({ projects }: PromptCardProps) {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [focused, setFocused] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [baseBranch, setBaseBranch] = useState('main')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProjectId = projectId || projects[0]?.id || ''
  const canSubmit = prompt.trim().length > 0 && selectedProjectId.length > 0 && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await createJob({
        prompt: prompt.trim(),
        project_id: selectedProjectId,
        base_branch: baseBranch || 'main',
      })
      if (result.task_id) {
        navigate(`/task/${result.task_id}`)
      } else {
        setError(result.error || 'Failed to create job')
      }
    } catch {
      setError('Failed to create job')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-6 -mt-8 relative z-10">
      <div
        className={cn(
          'bg-card rounded-3xl border border-border shadow-2xl shadow-black/20 transition-all duration-300',
          focused && 'border-primary/40 shadow-primary/5'
        )}
      >
        <div className="p-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
            }}
            placeholder="Describe what you want to build..."
            rows={3}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-base resize-none outline-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-2 gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {projects.length > 0 ? (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="text-xs bg-secondary text-foreground border border-border/50 rounded-lg px-2 py-1.5 outline-none max-w-[180px] truncate cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-muted-foreground">No projects — create one below</span>
              )}

              <input
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                placeholder="main"
                className="text-xs bg-secondary text-foreground placeholder:text-muted-foreground border border-border/50 rounded-lg px-2 py-1.5 outline-none w-20"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 flex-shrink-0',
                canSubmit
                  ? 'bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white shadow-lg shadow-[#A855F7]/20 hover:opacity-90'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed'
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => setPrompt(s.label)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/60 border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all duration-200"
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
