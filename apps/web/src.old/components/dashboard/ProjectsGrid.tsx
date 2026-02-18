import { useState } from 'react'
import { Plus, Download } from 'lucide-react'
import { ProjectCard } from './ProjectCard'
import { createProject, importGithubProject, type Project as APIProject } from '../../api/client'
import { cn } from '../../lib/utils'

type Tab = 'all' | 'recent'

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

interface ProjectsGridProps {
  projects: APIProject[]
  loading: boolean
  onRefresh: () => void
}

export function ProjectsGrid({ projects, loading, onRefresh }: ProjectsGridProps) {
  const [tab, setTab] = useState<Tab>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [newName, setNewName] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim() || creating) return
    setCreating(true)
    await createProject(newName.trim())
    setNewName('')
    setShowCreate(false)
    setCreating(false)
    onRefresh()
  }

  const handleImport = async () => {
    if (!importUrl.trim() || creating) return
    setCreating(true)
    await importGithubProject(importUrl.trim())
    setImportUrl('')
    setShowImport(false)
    setCreating(false)
    onRefresh()
  }

  const displayedProjects =
    tab === 'recent'
      ? [...projects]
          .sort((a, b) => (b.last_synced ?? b.created_at) - (a.last_synced ?? a.created_at))
          .slice(0, 6)
      : projects

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your Projects</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{projects.length} projects total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === 'all'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            All
          </button>
          <button
            onClick={() => setTab('recent')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === 'recent'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            Recent
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Import
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No projects yet. Create or import a project to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={{
                id: project.id,
                name: project.name,
                description: project.repository_url || project.local_path,
                starred: false,
                lastEdited: formatRelative(project.last_synced ?? project.created_at),
                status: 'active',
              }}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold text-foreground mb-4">New Project</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="w-full bg-secondary text-foreground placeholder:text-muted-foreground border border-border rounded-lg px-3 py-2 text-sm outline-none mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="text-sm font-semibold text-foreground mb-1">Import GitHub Repo</h3>
            <p className="text-xs text-muted-foreground mb-4">Paste a public GitHub repository URL</p>
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full bg-secondary text-foreground placeholder:text-muted-foreground border border-border rounded-lg px-3 py-2 text-sm outline-none mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowImport(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={creating || !importUrl.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white disabled:opacity-50"
              >
                {creating ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
