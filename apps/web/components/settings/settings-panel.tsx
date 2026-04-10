"use client"

import { useEffect, useState } from "react"
import { fetchHealth, TENANT_ID, type HealthStatus } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { useTeam } from "@/contexts/TeamContext"
import { CheckCircle2, XCircle, Loader2, Server, Key, Cpu, Shield, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const LLM_STORAGE_KEY = "vibe_llm_provider"

interface SettingsSection {
  title: string
  icon: typeof Server
  children: React.ReactNode
}

function Section({ title, icon: Icon, children }: SettingsSection) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00E5A0]/20 to-[#7B61FF]/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#00E5A0]" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5 flex flex-col gap-4">{children}</div>
    </div>
  )
}

interface FieldRowProps {
  label: string
  value: string
  description?: string
  badge?: { text: string; variant: "success" | "error" | "neutral" }
}

function FieldRow({ label, value, description, badge }: FieldRowProps) {
  const badgeColors = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    neutral: "bg-secondary text-muted-foreground border-border",
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm text-muted-foreground font-mono truncate max-w-[240px]">
          {value}
        </span>
        {badge && (
          <span
            className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-md border",
              badgeColors[badge.variant]
            )}
          >
            {badge.text}
          </span>
        )}
      </div>
    </div>
  )
}

type LlmProvider = "deepseek" | "openai" | "anthropic"

const LLM_OPTIONS: { value: LlmProvider; label: string; model: string; description: string }[] = [
  {
    value: "deepseek",
    label: "DeepSeek V3",
    model: "deepseek-chat",
    description: "Cost-effective code generation — default for staging",
  },
  {
    value: "openai",
    label: "OpenAI GPT-4o",
    model: "gpt-4o",
    description: "Code generation via OpenAI",
  },
  {
    value: "anthropic",
    label: "Anthropic Claude",
    model: "claude-sonnet-4",
    description: "Highest quality — production use",
  },
]

export function SettingsPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState(false)
  const [llmProvider, setLlmProvider] = useState<LlmProvider>("deepseek")
  const [bgProvider, setBgProvider] = useState<LlmProvider>("deepseek")
  const [autonomousEnabled, setAutonomousEnabled] = useState(false)
  const [autonomousLoading, setAutonomousLoading] = useState(true)
  const [autonomousSaving, setAutonomousSaving] = useState(false)
  const { currentOrg } = useTeam()

  const apiUrl =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
    "https://vibeapi-production-fdd1.up.railway.app"

  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setHealth(data)
        setHealthLoading(false)
      })
      .catch(() => {
        setHealthError(true)
        setHealthLoading(false)
      })
  }, [])

  // Load LLM preferences from organizations table
  const [llmSaving, setLlmSaving] = useState(false)
  const [bgSaving, setBgSaving] = useState(false)
  useEffect(() => {
    if (!currentOrg?.id) return
    ;(async () => {
      const { data } = await supabase
        .from("organizations")
        .select("preferred_llm, preferred_llm_background")
        .eq("id", currentOrg.id)
        .single()
      if (data?.preferred_llm && LLM_OPTIONS.some((o) => o.value === data.preferred_llm)) {
        setLlmProvider(data.preferred_llm as LlmProvider)
        localStorage.setItem(LLM_STORAGE_KEY, data.preferred_llm)
      }
      if (data?.preferred_llm_background && LLM_OPTIONS.some((o) => o.value === data.preferred_llm_background)) {
        setBgProvider(data.preferred_llm_background as LlmProvider)
        localStorage.setItem("vibe_llm_background", data.preferred_llm_background)
      }
    })()
  }, [currentOrg?.id])

  const handleLlmChange = async (provider: LlmProvider) => {
    if (llmSaving) return
    setLlmProvider(provider)
    localStorage.setItem(LLM_STORAGE_KEY, provider)
    if (!currentOrg?.id) return
    setLlmSaving(true)
    await supabase
      .from("organizations")
      .update({ preferred_llm: provider })
      .eq("id", currentOrg.id)
    setLlmSaving(false)
  }

  const handleBgChange = async (provider: LlmProvider) => {
    if (bgSaving) return
    setBgProvider(provider)
    localStorage.setItem("vibe_llm_background", provider)
    if (!currentOrg?.id) return
    setBgSaving(true)
    await supabase
      .from("organizations")
      .update({ preferred_llm_background: provider })
      .eq("id", currentOrg.id)
    setBgSaving(false)
  }

  // Load autonomous kill switch from organizations table
  // autonomous_kill_switch=true means automations are OFF (inverted for UI)
  useEffect(() => {
    if (!currentOrg?.id) { setAutonomousLoading(false); return }
    ;(async () => {
      try {
        const { data } = await supabase
          .from("organizations")
          .select("autonomous_kill_switch")
          .eq("id", currentOrg.id)
          .single()
        setAutonomousEnabled(data?.autonomous_kill_switch === false)
      } catch { /* ignore */ }
      setAutonomousLoading(false)
    })()
  }, [currentOrg?.id])

  const handleAutonomousToggle = async () => {
    if (!currentOrg?.id || autonomousSaving) return
    const newEnabled = !autonomousEnabled
    setAutonomousSaving(true)
    setAutonomousEnabled(newEnabled)
    // kill_switch is inverted: enabled=true → kill_switch=false
    const { error } = await supabase
      .from("organizations")
      .update({ autonomous_kill_switch: !newEnabled })
      .eq("id", currentOrg.id)
    if (error) setAutonomousEnabled(!newEnabled) // revert on failure
    setAutonomousSaving(false)
  }

  const apiStatus = healthLoading
    ? { text: "Checking...", variant: "neutral" as const }
    : health
    ? { text: "Connected", variant: "success" as const }
    : { text: "Unreachable", variant: "error" as const }

  const selectedOption = LLM_OPTIONS.find((o) => o.value === llmProvider) ?? LLM_OPTIONS[0]

  return (
    <div className="flex flex-col gap-6">
      {/* API Connection */}
      <Section title="API Connection" icon={Server}>
        <FieldRow
          label="API URL"
          value={apiUrl}
          description="Backend REST API endpoint"
          badge={apiStatus}
        />
        <FieldRow
          label="Tenant ID"
          value={TENANT_ID}
          description="Multi-tenant workspace identifier (X-Tenant-Id header)"
        />
        {health && (
          <FieldRow
            label="API Status"
            value={`Online · ${new Date(health.timestamp * 1000).toLocaleTimeString()}`}
            description="Last health check timestamp"
            badge={{ text: health.status, variant: "success" }}
          />
        )}
        {!healthLoading && healthError && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            Cannot reach the API. Make sure the backend is running on {apiUrl}.
          </div>
        )}
        {healthLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking API health...
          </div>
        )}
      </Section>

      {/* LLM Configuration */}
      <Section title="LLM Configuration" icon={Cpu}>
        {/* Build Provider */}
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Build Provider</p>
          <p className="text-xs text-muted-foreground mb-3">
            Powers dashboard and site generation. Needs high output token limits.
          </p>
          <div className="flex gap-2">
            {LLM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleLlmChange(opt.value)}
                disabled={llmSaving}
                className={cn(
                  "flex-1 flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-all duration-200",
                  llmProvider === opt.value
                    ? "border-[#00E5A0]/60 bg-[#00E5A0]/10 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-border hover:bg-secondary",
                  llmSaving && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-[11px] mt-0.5 font-mono opacity-70">{opt.model}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Data Processor */}
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Data Processor</p>
          <p className="text-xs text-muted-foreground mb-3">
            Powers recommendations, intake chat, and background data analysis. Short outputs — cost-effective models work well.
          </p>
          <div className="flex gap-2">
            {LLM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleBgChange(opt.value)}
                disabled={bgSaving}
                className={cn(
                  "flex-1 flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-all duration-200",
                  bgProvider === opt.value
                    ? "border-[#7B61FF]/60 bg-[#7B61FF]/10 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-border hover:bg-secondary",
                  bgSaving && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-[11px] mt-0.5 font-mono opacity-70">{opt.model}</span>
              </button>
            ))}
          </div>
        </div>

        <FieldRow
          label="Build Provider"
          value={selectedOption.model}
          description={selectedOption.description}
          badge={{ text: "Builds", variant: "success" }}
        />
        <FieldRow
          label="Data Processor"
          value={LLM_OPTIONS.find((o) => o.value === bgProvider)?.model ?? "deepseek-chat"}
          description={LLM_OPTIONS.find((o) => o.value === bgProvider)?.description ?? ""}
          badge={{ text: "Background", variant: "neutral" }}
        />
      </Section>

      {/* Preflight Pipeline */}
      <Section title="Preflight Pipeline" icon={Shield}>
        <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2 border border-border/50">
          Preflight stages run after applying a diff to validate changes. Unconfigured
          stages are skipped. Set the corresponding env var on the server to enable each
          stage.
        </div>
        {[
          { label: "Lint", env: "LINT_COMMAND", description: "Code linting stage" },
          {
            label: "Typecheck",
            env: "TYPECHECK_COMMAND",
            description: "TypeScript type checking stage",
          },
          { label: "Test", env: "TEST_COMMAND", description: "Automated test suite stage" },
          { label: "Smoke", env: "SMOKE_COMMAND", description: "Smoke test stage" },
        ].map((stage) => (
          <FieldRow
            key={stage.env}
            label={stage.label}
            value={stage.env}
            description={stage.description}
            badge={{ text: "Env-controlled", variant: "neutral" }}
          />
        ))}
        <FieldRow
          label="Timeout"
          value="300,000 ms (5 min)"
          description="Shared timeout for all preflight stages (PREFLIGHT_TIMEOUT)"
        />
      </Section>

      {/* Autonomous Automations */}
      <Section title="Automations" icon={Zap}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Autonomous Executions</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When enabled, incoming data from connected integrations (HubSpot, Salesforce, etc.)
              can trigger AI-powered recommendations and autonomous skill executions.
              When disabled, data still syncs but no LLM calls are made.
            </p>
          </div>
          <button
            onClick={handleAutonomousToggle}
            disabled={autonomousLoading || autonomousSaving || !currentOrg}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0",
              autonomousEnabled
                ? "bg-[#00E5A0]"
                : "bg-secondary border border-border",
              (autonomousLoading || autonomousSaving || !currentOrg) && "opacity-50 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200",
                autonomousEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
        <div className={cn(
          "flex items-center gap-2 text-xs px-3 py-2 rounded-lg border",
          autonomousEnabled
            ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20"
            : "text-muted-foreground bg-secondary/50 border-border/50"
        )}>
          {autonomousEnabled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Automations are active. Webhook events will trigger AI recommendations.
            </>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5 flex-shrink-0" />
              Human-in-the-loop mode. Data syncs silently — no AI credits consumed.
            </>
          )}
        </div>
      </Section>

      {/* Authentication */}
      <Section title="Integrations" icon={Key}>
        <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2 border border-border/50">
          API keys and tokens are managed server-side. They are never exposed to the
          browser.
        </div>
        <FieldRow
          label="OpenAI API Key"
          value="••••••••••••••••"
          description="Required for LLM code generation (OPENAI_API_KEY)"
          badge={{ text: "Server-side", variant: "neutral" }}
        />
        <FieldRow
          label="GitHub Token"
          value="••••••••••••••••"
          description="Required for PR creation (GITHUB_TOKEN)"
          badge={{ text: "Server-side", variant: "neutral" }}
        />
      </Section>
    </div>
  )
}
