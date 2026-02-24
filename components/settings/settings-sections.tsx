"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Eye, EyeOff, Copy, Plus, Trash2, User, AlertTriangle, Monitor, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTheme } from "next-themes"

// --------------- localStorage helpers ---------------

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

// --------------- Shared UI ---------------

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
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full h-9 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:bg-card",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    />
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "w-10 h-6 rounded-full transition-colors flex items-center px-0.5",
        value ? "bg-primary" : "bg-secondary"
      )}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-full bg-primary-foreground transition-transform shadow-sm",
          value ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}

// ========================  PROFILE  ========================

interface ProfileData {
  firstName: string
  lastName: string
  email: string
  username: string
  avatar: string | null
}

const defaultProfile: ProfileData = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  avatar: null,
}

export function ProfileSection() {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile)
  const [loaded, setLoaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setProfile(loadJSON("vibe_user_profile", defaultProfile))
    setLoaded(true)
  }, [])

  const update = useCallback(
    (field: keyof ProfileData, value: string) => {
      setProfile((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSave = () => {
    saveJSON("vibe_user_profile", profile)
    toast.success("Profile saved successfully")
  }

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_048_576) {
      toast.error("Image must be under 1 MB")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setProfile((prev) => ({ ...prev, avatar: base64 }))
      saveJSON("vibe_user_profile", { ...profile, avatar: base64 })
      toast.success("Avatar updated")
    }
    reader.readAsDataURL(file)
  }

  if (!loaded) return null

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Profile Information" description="Update your personal details and public profile.">
        <div className="flex items-start gap-6 mb-6">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="User avatar"
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-primary-foreground" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="hidden"
              onChange={handleAvatar}
            />
            <Button variant="outline" size="sm" className="w-fit" onClick={() => fileRef.current?.click()}>
              Change Avatar
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG or GIF. 1MB max.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="First Name">
            <TextInput value={profile.firstName} onChange={(v) => update("firstName", v)} placeholder="First name" />
          </FieldGroup>
          <FieldGroup label="Last Name">
            <TextInput value={profile.lastName} onChange={(v) => update("lastName", v)} placeholder="Last name" />
          </FieldGroup>
          <FieldGroup label="Email">
            <TextInput value={profile.email} onChange={(v) => update("email", v)} placeholder="you@example.com" type="email" />
          </FieldGroup>
          <FieldGroup label="Username">
            <TextInput value={profile.username} onChange={(v) => update("username", v)} placeholder="Username" />
          </FieldGroup>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex justify-end">
          <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}

// ========================  NOTIFICATIONS  ========================

interface NotificationPrefs {
  email: boolean
  buildComplete: boolean
  weeklySummary: boolean
  marketing: boolean
}

const defaultNotifications: NotificationPrefs = {
  email: true,
  buildComplete: true,
  weeklySummary: true,
  marketing: false,
}

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultNotifications)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setPrefs(loadJSON("vibe_notifications", defaultNotifications))
    setLoaded(true)
  }, [])

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    saveJSON("vibe_notifications", prefs)
    toast.success("Notification preferences saved")
  }

  if (!loaded) return null

  const items: { key: keyof NotificationPrefs; label: string; description: string }[] = [
    { key: "email", label: "Email Notifications", description: "Receive updates about your projects via email" },
    { key: "buildComplete", label: "Build Complete Alerts", description: "Get notified when builds finish" },
    { key: "weeklySummary", label: "Weekly Summary", description: "Receive a weekly summary of your activity" },
    { key: "marketing", label: "Marketing Emails", description: "Occasional product news and promotions" },
  ]

  return (
    <SectionCard title="Notification Preferences" description="Choose how and when you want to be notified.">
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            <Toggle value={prefs[item.key]} onChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-border flex justify-end">
        <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90" onClick={handleSave}>
          Save Preferences
        </Button>
      </div>
    </SectionCard>
  )
}

// ========================  SECURITY  ========================

interface SecurityData {
  twoFactorEnabled: boolean
}

const defaultSecurity: SecurityData = { twoFactorEnabled: false }

export function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [security, setSecurity] = useState<SecurityData>(defaultSecurity)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSecurity(loadJSON("vibe_security", defaultSecurity))
    setLoaded(true)
  }, [])

  const handlePasswordChange = () => {
    if (!currentPassword) {
      toast.error("Please enter your current password")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    saveJSON("vibe_security_password", { updatedAt: new Date().toISOString() })
    toast.success("Password updated successfully")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  const toggle2FA = () => {
    const next = { ...security, twoFactorEnabled: !security.twoFactorEnabled }
    setSecurity(next)
    saveJSON("vibe_security", next)
    toast.success(next.twoFactorEnabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled")
  }

  if (!loaded) return null

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Change Password" description="Update your password to keep your account secure.">
        <div className="flex flex-col gap-4 max-w-sm">
          <FieldGroup label="Current Password">
            <TextInput value={currentPassword} onChange={setCurrentPassword} placeholder="Enter current password" type="password" />
          </FieldGroup>
          <FieldGroup label="New Password">
            <TextInput value={newPassword} onChange={setNewPassword} placeholder="Enter new password" type="password" />
          </FieldGroup>
          <FieldGroup label="Confirm Password">
            <TextInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm new password" type="password" />
          </FieldGroup>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex justify-end">
          <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90" onClick={handlePasswordChange}>
            Update Password
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Two-Factor Authentication" description="Add an extra layer of security to your account.">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Status</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {security.twoFactorEnabled
                ? "Two-factor authentication is enabled"
                : "Two-factor authentication is not enabled"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={toggle2FA}>
            {security.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Active Sessions" description="Devices currently signed in to your account.">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 border border-border">
            <Monitor className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Chrome on macOS</p>
              <p className="text-xs text-muted-foreground">Active now &middot; Current session</p>
            </div>
            <span className="text-[10px] font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-400/10">Active</span>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 border border-border">
            <Smartphone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Safari on iPhone</p>
              <p className="text-xs text-muted-foreground">Last active 3 hours ago</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive">
              Revoke
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ========================  API KEYS  ========================

interface ApiKeyData {
  name: string
  key: string
  created: string
  lastUsed: string
}

function generateRandomKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = "vibe_pk_"
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const defaultApiKeys: ApiKeyData[] = []

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyData[]>(defaultApiKeys)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setKeys(loadJSON("vibe_api_keys", defaultApiKeys))
    setLoaded(true)
  }, [])

  const handleGenerate = () => {
    const newKey: ApiKeyData = {
      name: keys.length === 0 ? "Production" : `Key ${keys.length + 1}`,
      key: generateRandomKey(),
      created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      lastUsed: "Never",
    }
    const next = [...keys, newKey]
    setKeys(next)
    saveJSON("vibe_api_keys", next)
    toast.success("New API key generated")
  }

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key)
    toast.success("API key copied to clipboard")
  }

  const handleDelete = (keyValue: string) => {
    const next = keys.filter((k) => k.key !== keyValue)
    setKeys(next)
    saveJSON("vibe_api_keys", next)
    toast.success("API key deleted")
  }

  if (!loaded) return null

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="API Keys" description="Manage API keys for accessing the VIBE API programmatically.">
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No API keys yet. Generate one below.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {keys.map((apiKey) => (
              <div key={apiKey.key} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{apiKey.name}</span>
                    <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                      Created {apiKey.created}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-muted-foreground font-mono">
                      {showKey === apiKey.key ? apiKey.key : `${apiKey.key.slice(0, 12)}${"*".repeat(12)}`}
                    </code>
                    <button
                      onClick={() => setShowKey(showKey === apiKey.key ? null : apiKey.key)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showKey === apiKey.key ? "Hide key" : "Show key"}
                    >
                      {showKey === apiKey.key ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleCopy(apiKey.key)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Copy key"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Last used: {apiKey.lastUsed}</p>
                </div>
                <button
                  onClick={() => handleDelete(apiKey.key)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-border flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate}>
            <Plus className="w-3.5 h-3.5" />
            Generate New Key
          </Button>
        </div>
      </SectionCard>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Keep your API key secret. Do not share it publicly or commit it to version control. If you believe a key has been compromised, delete it and generate a new one immediately.
        </p>
      </div>
    </div>
  )
}

// ========================  APPEARANCE  ========================

interface AppearancePrefs {
  accentColor: string
  compactMode: boolean
}

const defaultAppearance: AppearancePrefs = {
  accentColor: "indigo",
  compactMode: false,
}

const accentColors = [
  { id: "indigo", label: "Indigo", color: "bg-indigo-500" },
  { id: "blue", label: "Blue", color: "bg-blue-500" },
  { id: "purple", label: "Purple", color: "bg-purple-500" },
  { id: "green", label: "Green", color: "bg-green-500" },
  { id: "rose", label: "Rose", color: "bg-rose-500" },
]

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = useState<AppearancePrefs>(defaultAppearance)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setPrefs(loadJSON("vibe_appearance", defaultAppearance))
    setLoaded(true)
  }, [])

  const themes = [
    { id: "dark", label: "Dark", bg: "bg-[#1a1a2e]" },
    { id: "light", label: "Light", bg: "bg-[#fafafa]" },
    { id: "system", label: "System", bg: "bg-gradient-to-r from-[#1a1a2e] to-[#fafafa]" },
  ]

  const handleThemeChange = (t: string) => {
    setTheme(t)
    toast.success(`Theme set to ${t}`)
  }

  const handleAccentChange = (color: string) => {
    const next = { ...prefs, accentColor: color }
    setPrefs(next)
    saveJSON("vibe_appearance", next)
    toast.success(`Accent color set to ${color}`)
  }

  const handleCompactToggle = () => {
    const next = { ...prefs, compactMode: !prefs.compactMode }
    setPrefs(next)
    saveJSON("vibe_appearance", next)
    toast.success(next.compactMode ? "Compact mode enabled" : "Compact mode disabled")
  }

  if (!loaded) return null

  return (
    <SectionCard title="Appearance" description="Customize how VIBE looks and feels.">
      <div className="flex flex-col gap-6">
        {/* Theme */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Theme</p>
          <div className="flex items-center gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
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

        {/* Accent Color */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Accent Color</p>
          <div className="flex items-center gap-3">
            {accentColors.map((c) => (
              <button
                key={c.id}
                onClick={() => handleAccentChange(c.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-colors w-16",
                  prefs.accentColor === c.id
                    ? "border-primary bg-secondary"
                    : "border-border hover:border-border/80"
                )}
              >
                <div className={cn("w-6 h-6 rounded-full", c.color)} />
                <span className="text-[10px] font-medium text-foreground">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Compact mode */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-foreground">Compact Mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reduce padding and spacing in the interface</p>
          </div>
          <Toggle value={prefs.compactMode} onChange={handleCompactToggle} />
        </div>
      </div>
    </SectionCard>
  )
}

// ========================  LANGUAGE  ========================

interface LanguagePrefs {
  language: string
  timezone: string
}

const defaultLanguage: LanguagePrefs = {
  language: "en",
  timezone: "utc",
}

const languages = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "ja", label: "Japanese" },
]

const timezones = [
  { id: "utc", label: "UTC (Coordinated Universal Time)" },
  { id: "est", label: "EST (Eastern Standard Time)" },
  { id: "pst", label: "PST (Pacific Standard Time)" },
  { id: "cet", label: "CET (Central European Time)" },
  { id: "jst", label: "JST (Japan Standard Time)" },
]

export function LanguageSection() {
  const [prefs, setPrefs] = useState<LanguagePrefs>(defaultLanguage)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setPrefs(loadJSON("vibe_language", defaultLanguage))
    setLoaded(true)
  }, [])

  const handleSave = () => {
    saveJSON("vibe_language", prefs)
    toast.success("Language preferences saved")
  }

  if (!loaded) return null

  return (
    <SectionCard title="Language & Region" description="Set your preferred language and regional settings.">
      <div className="flex flex-col gap-4 max-w-sm">
        <FieldGroup label="Language">
          <select
            value={prefs.language}
            onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
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
          <select
            value={prefs.timezone}
            onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))}
            className="w-full h-9 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground outline-none transition-colors focus:border-ring focus:bg-card appearance-none cursor-pointer"
          >
            {timezones.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.label}
              </option>
            ))}
          </select>
        </FieldGroup>
      </div>
      <div className="mt-4 pt-4 border-t border-border flex justify-end">
        <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90" onClick={handleSave}>
          Save Preferences
        </Button>
      </div>
    </SectionCard>
  )
}
