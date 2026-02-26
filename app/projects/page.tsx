"use client"

import { AppShell } from "@/components/app-shell"
import { ProjectsGrid } from "@/components/dashboard/projects-grid"
import { useEffect, useState } from "react"
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

  useEffect(() => {
    fetchProjects().then((data: Project[]) => setProjectCount(data.length))
  }, [refreshKey])

  const handleCreated = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Page Header */}
        <div className="px-6 pt-8 pb-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Projects</h1>
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
                className="gap-2"
              >
                <Github className="w-4 h-4" />
                Import from GitHub
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2 bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white border-0 hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                New Project
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
