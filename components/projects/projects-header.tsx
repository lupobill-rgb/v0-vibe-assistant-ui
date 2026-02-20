"use client"

import { useState } from "react"
import { Search, LayoutGrid, List, Plus, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type ViewMode = "grid" | "list"
type FilterTab = "all" | "active" | "deployed" | "draft"

interface ProjectsHeaderProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  filterTab: FilterTab
  onFilterTabChange: (tab: FilterTab) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  projectCount: number
}

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "deployed", label: "Deployed" },
  { value: "draft", label: "Drafts" },
]

export function ProjectsHeader({
  viewMode,
  onViewModeChange,
  filterTab,
  onFilterTabChange,
  searchQuery,
  onSearchChange,
  projectCount,
}: ProjectsHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <div className="px-8 pt-8 pb-6">
      {/* Title Row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projectCount} project{projectCount !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button className="h-9 bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] hover:opacity-90 text-primary-foreground border-0 gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Filters & Search Row */}
      <div className="flex items-center gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onFilterTabChange(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filterTab === tab.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div
          className={cn(
            "flex items-center gap-2 flex-1 max-w-sm h-9 px-3 rounded-lg border transition-colors",
            searchFocused
              ? "border-ring bg-card"
              : "border-border bg-secondary/50"
          )}
        >
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "w-8 h-7 rounded-md flex items-center justify-center transition-colors",
              viewMode === "grid"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "w-8 h-7 rounded-md flex items-center justify-center transition-colors",
              viewMode === "list"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
