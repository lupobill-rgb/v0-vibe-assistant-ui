"use client"

import { use } from "react"
import { redirect } from "next/navigation"

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params)
  redirect(`/building/${id}`)
}
