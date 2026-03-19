"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useParams, useRouter } from "next/navigation"
import {
  Home,
  FolderKanban,
  MessageSquare,
  Settings,
  Store,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  CreditCard,
  HelpCircle,
  Check,
  Building2,
  LogOut,
} from "lucide-react"
import type { Team, Org } from "@/contexts/TeamContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CreateProjectDialog } from "@/components/dialogs/create-project-dialog"
import { ConnectDatasourceDialog } from "@/components/dialogs/connect-datasource-dialog"
import { supabase } from "@/lib/supabase"

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: FolderKanban, label: "Projects", href: "/projects" },
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: Store, label: "Marketplace", href: "/marketplace" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

const bottomItems = [
  { icon: HelpCircle, label: "Help & Support", href: "/help" },
  { icon: CreditCard, label: "Billing", href: "/billing" },
]

interface AppSidebarProps {
  currentOrg: Org | null
  currentTeam: Team | null
  userRole: string | null
  availableTeams: Team[]
  onTeamChange: (teamId: string) => Promise<void>
  teamLoading: boolean
}

function roleBadge(role: string | null) {
  const label = (role ?? "IC").toUpperCase()
  const isHighRank = ["ADMIN", "DIRECTOR"].includes(label)
  const isMidRank = ["LEAD", "MANAGER"].includes(label)
  const color = isHighRank
    ? "bg-[#7c3aed]/20 text-[#a78bfa]"
    : isMidRank
      ? "bg-cyan-500/20 text-cyan-400"
      : "bg-white/10 text-gray-400"
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {label}
    </span>
  )
}

export function AppSidebar({ currentOrg, currentTeam, userRole, availableTeams, onTeamChange, teamLoading }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const activeProjectId = pathname.startsWith("/projects/") ? (params?.id as string | undefined) : undefined
  const [dialogOpen, setDialogOpen] = useState(false)
  const [connectDatasourceOpen, setConnectDatasourceOpen] = useState(false)

  // Close switcher on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    if (switcherOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [switcherOpen])

  const openSearch = () => {
    window.dispatchEvent(new Event("open-command-palette"))
  }

  return (
    <>
    <CreateProjectDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onCreated={(id) => router.push(`/chat?project=${id}`)}
    />
    <ConnectDatasourceDialog
      open={connectDatasourceOpen}
      onOpenChange={setConnectDatasourceOpen}
    />
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex-shrink-0",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8EFF] via-[#A855F7] to-[#EC4899]">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
              VIBE
            </span>
          )}
        </div>

        {/* Team Switcher + Context Bar */}
        {!collapsed && !teamLoading && (
          <div className="px-3 pt-3 pb-1 flex-shrink-0" ref={switcherRef}>
            {/* Switcher trigger */}
            <button
              onClick={() => setSwitcherOpen(!switcherOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-white/10 hover:bg-white/5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 flex-shrink-0 text-[#7c3aed]" />
                <div className="flex flex-col min-w-0">
                  {currentOrg && (
                    <span className="truncate text-[10px] text-muted-foreground">
                      {currentOrg.name}
                    </span>
                  )}
                  <span className="truncate text-sm font-medium text-sidebar-foreground">
                    {currentTeam?.name ?? "Personal Workspace"}
                  </span>
                </div>
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", switcherOpen && "rotate-180")} />
            </button>

            {/* Dropdown */}
            {switcherOpen && (
              <div className="mt-1 rounded-lg border border-white/10 bg-[#0f0f23] py-1 shadow-lg">
                {availableTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => { onTeamChange(team.id); setSwitcherOpen(false) }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-white/5",
                      team.id === currentTeam?.id ? "text-[#7c3aed]" : "text-gray-300"
                    )}
                  >
                    {team.id === currentTeam?.id && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    {team.id !== currentTeam?.id && <span className="w-3.5" />}
                    <span className="truncate">{team.name}</span>
                  </button>
                ))}
                <div className="mx-2 my-1 border-t border-white/5" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      disabled
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New Team</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Contact admin to create a team</TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Team context info */}
            <div className="mt-1 px-3 pb-1">
              {currentTeam ? (
                <div className="flex items-center gap-2">
                  {roleBadge(userRole)}
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground">Personal Workspace</span>
              )}
            </div>
          </div>
        )}

        {/* New Project Button */}
        <div className="px-3 pt-4 pb-2 flex-shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => setDialogOpen(true)}
                  className="w-full h-9 bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] hover:opacity-90 text-primary-foreground border-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Project</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              onClick={() => setDialogOpen(true)}
              className="w-full h-9 bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] hover:opacity-90 text-primary-foreground border-0 justify-start gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setConnectDatasourceOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Connect Data Source
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2 flex-shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={openSearch}
                  className="flex items-center justify-center w-full h-9 rounded-lg bg-sidebar-accent text-muted-foreground hover:bg-sidebar-accent/80 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Search</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={openSearch}
              className="flex items-center gap-2 w-full h-9 px-3 rounded-lg bg-sidebar-accent text-muted-foreground text-sm hover:bg-sidebar-accent/80 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <kbd className="ml-auto text-[10px] bg-sidebar-border px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                /
              </kbd>
            </button>
          )}
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto">
          <span className={cn(
            "text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-3 mb-1",
            collapsed && "sr-only"
          )}>
            Navigation
          </span>
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href === "/projects" && !!activeProjectId)
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }
            return linkContent
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 py-2 border-t border-sidebar-border flex flex-col gap-1 flex-shrink-0">
          {bottomItems.map((item) => {
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }
            return linkContent
          })}

          {/* Sign Out */}
          {(() => {
            const signOut = async () => {
              await supabase.auth.signOut()
              window.location.href = "/login"
            }
            const btn = (
              <button
                onClick={signOut}
                className={cn(
                  "flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors w-full",
                  collapsed && "justify-center px-0"
                )}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>Sign Out</span>}
              </button>
            )
            if (collapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">Sign Out</TooltipContent>
                </Tooltip>
              )
            }
            return btn
          })()}
        </div>

        {/* Collapse Toggle */}
        <div className="px-3 py-2 border-t border-sidebar-border flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  "flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full",
                  collapsed && "justify-center px-0"
                )}
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                    <span>Collapse</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Expand</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
    </>
  )
}
