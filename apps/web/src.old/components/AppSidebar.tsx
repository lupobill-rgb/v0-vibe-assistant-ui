import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
} from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex-shrink-0',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8EFF] via-[#A855F7] to-[#EC4899]">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">VIBE</span>
        )}
      </div>

      {/* New Project button */}
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <Link
          to="/"
          title={collapsed ? 'New Project' : undefined}
          className={cn(
            'flex items-center h-9 rounded-lg bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white hover:opacity-90 transition-opacity',
            collapsed ? 'w-full justify-center' : 'gap-2 px-3 justify-start'
          )}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span className="text-sm font-medium">New Project</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
        {!collapsed && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-3 mb-1">
            Navigation
          </span>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
                collapsed && 'justify-center px-0'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-2 border-t border-sidebar-border flex flex-col gap-1 flex-shrink-0">
        <div
          className={cn(
            'flex items-center gap-3 px-3 h-10 rounded-lg',
            collapsed && 'justify-center px-0'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-sidebar-foreground truncate">Demo User</span>
              <span className="text-[10px] text-muted-foreground truncate">Free Plan</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : undefined}
          className={cn(
            'flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
