"use client"

import { useState, useMemo } from "react"
import { AppShell } from "@/components/app-shell"
import { ProjectsHeader } from "@/components/projects/projects-header"
import { ProjectCard, type Project } from "@/components/dashboard/project-card"
import { ProjectListItem } from "@/components/projects/project-list-item"

const allProjects: Project[] = [
  {
    id: "1",
    name: "E-commerce Platform",
    description: "Full-stack Next.js store with Stripe integration",
    thumbnail: "",
    starred: true,
    lastEdited: "2 hours ago",
    status: "active",
  },
  {
    id: "2",
    name: "SaaS Dashboard",
    description: "Admin panel with analytics and user management",
    thumbnail: "",
    starred: false,
    lastEdited: "5 hours ago",
    status: "deployed",
  },
  {
    id: "3",
    name: "AI Chat App",
    description: "Real-time chat application with AI responses",
    thumbnail: "",
    starred: true,
    lastEdited: "1 day ago",
    status: "active",
  },
  {
    id: "4",
    name: "Portfolio Site",
    description: "Personal portfolio with blog and project showcase",
    thumbnail: "",
    starred: false,
    lastEdited: "2 days ago",
    status: "deployed",
  },
  {
    id: "5",
    name: "Task Manager",
    description: "Kanban board with drag-and-drop and real-time sync",
    thumbnail: "",
    starred: false,
    lastEdited: "3 days ago",
    status: "draft",
  },
  {
    id: "6",
    name: "Weather App",
    description: "Location-based weather with 7-day forecast",
    thumbnail: "",
    starred: false,
    lastEdited: "1 week ago",
    status: "draft",
  },
  {
    id: "7",
    name: "Social Media Clone",
    description: "Instagram-style app with feeds and stories",
    thumbnail: "",
    starred: false,
    lastEdited: "1 week ago",
    status: "active",
  },
  {
    id: "8",
    name: "Recipe Finder",
    description: "Search and save recipes with nutritional info",
    thumbnail: "",
    starred: true,
    lastEdited: "2 weeks ago",
    status: "deployed",
  },
]

type ViewMode = "grid" | "list"
type FilterTab = "all" | "active" | "deployed" | "draft"

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProjects = useMemo(() => {
    return allProjects.filter((project) => {
      const matchesFilter = filterTab === "all" || project.status === filterTab
      const matchesSearch =
        searchQuery === "" ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [filterTab, searchQuery])

  return (
    <AppShell>
      <div className="min-h-screen">
        <ProjectsHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filterTab={filterTab}
          onFilterTabChange={setFilterTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          projectCount={filteredProjects.length}
        />

        <div className="px-8 pb-8">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <span className="text-muted-foreground text-lg">0</span>
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No projects found</h3>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredProjects.map((project) => (
                <ProjectListItem key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
