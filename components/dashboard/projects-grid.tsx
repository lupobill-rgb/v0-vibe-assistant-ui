"use client"

import { ProjectCard, type Project } from "./project-card"

const mockProjects: Project[] = [
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
]

export function ProjectsGrid() {
  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Your Projects
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mockProjects.length} projects total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            All
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            Starred
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            Recent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
