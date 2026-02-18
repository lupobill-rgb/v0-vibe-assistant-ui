import { useState, useEffect } from 'react'
import { AppSidebar } from '../components/AppSidebar'
import { HeroSection } from '../components/dashboard/HeroSection'
import { PromptCard } from '../components/dashboard/PromptCard'
import { ProjectsGrid } from '../components/dashboard/ProjectsGrid'
import { fetchProjects, type Project } from '../api/client'

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const loadProjects = async () => {
    const data = await fetchProjects()
    setProjects(data)
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <HeroSection />
        <PromptCard projects={projects} />
        <ProjectsGrid projects={projects} loading={loading} onRefresh={loadProjects} />
      </main>
    </div>
  )
}
