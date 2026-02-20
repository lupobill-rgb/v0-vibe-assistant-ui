"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Copy, Plus, Trash2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {children}
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

function TextInput({
  value,
  placeholder,
  type = "text",
  disabled = false,
}: {
  value: string
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="h-9 min-h-[2.25rem]">
      {mounted && (
        <input
          type={type}
          defaultValue={value}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full h-9 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:bg-card",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      )}
    </div>
  )
}

export function ProfileSection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Profile Information" description="Update your personal details and public profile.">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" className="w-fit">
              Change Avatar
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG or GIF. 1MB max.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="First Name">
            <TextInput value="Demo" placeholder="First name" />
          </FieldGroup>
          <FieldGroup label="Last Name">
            <TextInput value="User" placeholder="Last name" />
          </FieldGroup>
          <FieldGroup label="Email">
            <TextInput value="demo@example.com" type="email" />
          </FieldGroup>
          <FieldGroup label="Username">
            <TextInput value="demouser" placeholder="Username" />
          </FieldGroup>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex justify-end">
          <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90">
            Save Changes
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}

export function NotificationsSection() {
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)

  const toggleItems = [
    { label: "Email Notifications", description: "Receive updates about your projects via email", value: emailNotifs, onChange: setEmailNotifs },
    { label: "Push Notifications", description: "Get browser push notifications for real-time alerts", value: pushNotifs, onChange: setPushNotifs },
    { label: "Weekly Digest", description: "Receive a weekly summary of your activity", value: weeklyDigest, onChange: setWeeklyDigest },
  ]

  return (
    <SectionCard title="Notification Preferences" description="Choose how and when you want to be notified.">
      <div className="flex flex-col gap-4">
        {toggleItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            <button
              onClick={() => item.onChange(!item.value)}
              className={cn(
                "w-10 h-6 rounded-full transition-colors flex items-center px-0.5",
                item.value ? "bg-primary" : "bg-secondary"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-primary-foreground transition-transform shadow-sm",
                  item.value ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function SecuritySection() {
  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Change Password" description="Update your password to keep your account secure.">
        <div className="flex flex-col gap-4 max-w-sm">
          <FieldGroup label="Current Password">
            <TextInput value="" placeholder="Enter current password" type="password" />
          </FieldGroup>
          <FieldGroup label="New Password">
            <TextInput value="" placeholder="Enter new password" type="password" />
          </FieldGroup>
          <FieldGroup label="Confirm Password">
            <TextInput value="" placeholder="Confirm new password" type="password" />
          </FieldGroup>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex justify-end">
          <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90">
            Update Password
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Two-Factor Authentication" description="Add an extra layer of security to your account.">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Status</p>
            <p className="text-xs text-muted-foreground mt-0.5">Two-factor authentication is not enabled</p>
          </div>
          <Button variant="outline" size="sm">
            Enable 2FA
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}

export function ApiKeysSection() {
  const [showKey, setShowKey] = useState(false)
  const apiKeys = [
    { name: "Production", key: "vibe_pk_live_a1b2c3d4e5f6g7h8i9j0", created: "Jan 15, 2026", lastUsed: "2 hours ago" },
    { name: "Development", key: "vibe_pk_test_x9y8w7v6u5t4s3r2q1p0", created: "Feb 1, 2026", lastUsed: "1 day ago" },
  ]

  return (
    <SectionCard title="API Keys" description="Manage API keys for accessing the VIBE API programmatically.">
      <div className="flex flex-col gap-3">
        {apiKeys.map((apiKey) => (
          <div key={apiKey.name} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">{apiKey.name}</span>
                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                  Created {apiKey.created}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-muted-foreground font-mono">
                  {showKey ? apiKey.key : apiKey.key.replace(/(?<=.{12}).*/g, "...")}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Last used {apiKey.lastUsed}</p>
            </div>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-border flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Generate New Key
        </Button>
      </div>
    </SectionCard>
  )
}

export function AppearanceSection() {
  const [theme, setTheme] = useState("dark")
  const themes = [
    { id: "dark", label: "Dark", bg: "bg-[#1a1a2e]" },
    { id: "light", label: "Light", bg: "bg-[#fafafa]" },
    { id: "system", label: "System", bg: "bg-gradient-to-r from-[#1a1a2e] to-[#fafafa]" },
  ]

  return (
    <SectionCard title="Appearance" description="Customize how VIBE looks and feels.">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Theme</p>
          <div className="flex items-center gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors w-28",
                  theme === t.id
                    ? "border-primary bg-secondary"
                    : "border-border hover:border-border/80"
                )}
              >
                <div className={cn("w-full h-10 rounded-lg", t.bg)} />
                <span className="text-xs font-medium text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Font Size</p>
          <div className="flex items-center gap-2">
            {["Small", "Medium", "Large"].map((size) => (
              <button
                key={size}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                  size === "Medium"
                    ? "bg-secondary text-foreground border-primary"
                    : "text-muted-foreground border-border hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export function LanguageSection() {
  const [language, setLanguage] = useState("en")
  const languages = [
    { id: "en", label: "English" },
    { id: "es", label: "Spanish" },
    { id: "fr", label: "French" },
    { id: "de", label: "German" },
    { id: "ja", label: "Japanese" },
    { id: "zh", label: "Chinese" },
  ]

  return (
    <SectionCard title="Language & Region" description="Set your preferred language and regional settings.">
      <div className="flex flex-col gap-4 max-w-sm">
        <FieldGroup label="Language">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground outline-none transition-colors focus:border-ring focus:bg-card appearance-none cursor-pointer"
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="Timezone">
          <select className="w-full h-9 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground outline-none transition-colors focus:border-ring focus:bg-card appearance-none cursor-pointer">
            <option>UTC (Coordinated Universal Time)</option>
            <option>EST (Eastern Standard Time)</option>
            <option>PST (Pacific Standard Time)</option>
            <option>CET (Central European Time)</option>
            <option>JST (Japan Standard Time)</option>
          </select>
        </FieldGroup>
      </div>
      <div className="mt-4 pt-4 border-t border-border flex justify-end">
        <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90">
          Save Preferences
        </Button>
      </div>
    </SectionCard>
  )
}
