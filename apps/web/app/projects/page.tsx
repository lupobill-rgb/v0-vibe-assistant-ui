"use client"

import { AppShell } from "@/components/app-shell"
import { ProjectsGrid } from "@/components/dashboard/projects-grid"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Github, FolderKanban } from "lucide-react"
import { fetchProjects, type Project } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "@/components/dialogs/create-project-dialog"
import { ImportGithubDialog } from "@/components/dialogs/import-github-dialog"

export default function ProjectsPage() {
  const [projectCount, setProjectCount] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetchProjects().then((data: Project[]) => setProjectCount(data.length))
  }, [refreshKey])

  const handleCreated = (id?: string) => {
    setRefreshKey((k) => k + 1)
    if (id) router.push(`/chat?project=${id}`)
  }

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Page Header */}
        <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00E5A0] to-[#7B61FF] flex items-center justify-center flex-shrink-0">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground">Projects</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {projectCount === null
                    ? "Loading..."
                    : `${projectCount} project${projectCount !== 1 ? "s" : ""} total`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                className="gap-2 min-h-[44px]"
              >
                <Github className="w-4 h-4" />
                <span className="hidden sm:inline">Import from GitHub</span>
                <span className="sm:hidden">Import</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2 min-h-[44px] bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white border-0 hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <ProjectsGrid key={refreshKey} />
      </div>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleCreated}
      />
      <ImportGithubDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={handleCreated}
      />
    </AppShell>
  )
}
