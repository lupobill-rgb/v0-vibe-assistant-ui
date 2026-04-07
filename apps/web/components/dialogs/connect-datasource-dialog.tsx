"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useTeam } from "@/contexts/TeamContext"
import { API_URL } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import Nango from "@nangohq/frontend"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CONNECTORS = [
  { value: "hubspot", label: "HubSpot" },
  { value: "salesforce", label: "Salesforce" },
  { value: "slack", label: "Slack" },
  { value: "google-analytics-4", label: "Google Analytics 4" },
  { value: "mixpanel", label: "Mixpanel" },
  { value: "airtable", label: "Airtable" },
  { value: "snowflake", label: "Snowflake" },
  { value: "postgres", label: "PostgreSQL" },
  { value: "google-bigquery", label: "Google BigQuery" },
  { value: "aws-s3", label: "AWS S3" },
  { value: "decipher", label: "Decipher (Forsta)" },
]

interface ConnectDatasourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected?: (connectorType: string) => void
  onError?: () => void
  preselectedConnector?: string
}

export function ConnectDatasourceDialog({
  open,
  onOpenChange,
  onConnected,
  onError,
  preselectedConnector,
}: ConnectDatasourceDialogProps) {
  const { currentTeam } = useTeam()
  const [connectorType, setConnectorType] = useState(preselectedConnector ?? "")
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && preselectedConnector) setConnectorType(preselectedConnector)
  }, [open, preselectedConnector])

  const resetForm = () => {
    setConnectorType("")
    setConnecting(false)
    setError("")
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm()
    onOpenChange(next)
  }

  const handleConnect = async () => {
    if (!currentTeam || !connectorType) return
    setConnecting(true)
    setError("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_URL}/connectors/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          teamId: currentTeam.id,
          connectorType,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to initiate connection (${res.status})`)
      }

      const { sessionToken, connectionId } = await res.json()
      if (!sessionToken) {
        throw new Error("No session token returned")
      }

      const nango = new Nango()
      await nango.openConnectUI({
        sessionToken,
        onEvent: (event) => {
          if (event.type === "connect") {
            onConnected?.(connectorType)
            handleOpenChange(false)
          }
        },
      })
    } catch (err) {
      setError((err as Error).message)
      onError?.()
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Data Source</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Select value={connectorType} onValueChange={setConnectorType}>
            <SelectTrigger>
              <SelectValue placeholder="Select a data source" />
            </SelectTrigger>
            <SelectContent>
              {CONNECTORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!connectorType || connecting}
            className="bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white"
          >
            {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
