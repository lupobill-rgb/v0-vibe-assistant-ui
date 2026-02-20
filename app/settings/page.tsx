"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { SettingsNav } from "@/components/settings/settings-nav"
import {
  ProfileSection,
  NotificationsSection,
  SecuritySection,
  ApiKeysSection,
  AppearanceSection,
  LanguageSection,
} from "@/components/settings/settings-sections"

const sectionComponents: Record<string, React.ComponentType> = {
  profile: ProfileSection,
  notifications: NotificationsSection,
  security: SecuritySection,
  "api-keys": ApiKeysSection,
  appearance: AppearanceSection,
  language: LanguageSection,
}

const sectionTitles: Record<string, string> = {
  profile: "Profile",
  notifications: "Notifications",
  security: "Security",
  "api-keys": "API Keys",
  appearance: "Appearance",
  language: "Language & Region",
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile")

  const ActiveComponent = sectionComponents[activeSection] ?? ProfileSection

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account, preferences, and integrations
          </p>
        </div>

        {/* Content */}
        <div className="flex px-8 py-8 gap-0">
          <SettingsNav activeSection={activeSection} onSectionChange={setActiveSection} />
          <div className="flex-1 max-w-2xl">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
