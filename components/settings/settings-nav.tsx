"use client"

import { User, Bell, Shield, Key, Palette, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

const navSections = [
  {
    title: "Account",
    items: [
      { icon: User, label: "Profile", id: "profile" },
      { icon: Bell, label: "Notifications", id: "notifications" },
      { icon: Shield, label: "Security", id: "security" },
    ],
  },
  {
    title: "Developer",
    items: [
      { icon: Key, label: "API Keys", id: "api-keys" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Palette, label: "Appearance", id: "appearance" },
      { icon: Globe, label: "Language", id: "language" },
    ],
  },
]

interface SettingsNavProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function SettingsNav({ activeSection, onSectionChange }: SettingsNavProps) {
  return (
    <nav className="w-[220px] flex-shrink-0 pr-8">
      <div className="flex flex-col gap-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 block px-3">
              {section.title}
            </span>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                    activeSection === item.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}
