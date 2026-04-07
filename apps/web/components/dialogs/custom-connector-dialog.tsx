"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTeam } from "@/contexts/TeamContext"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const AUTH_METHODS = [
  { value: "oauth2", label: "OAuth 2.0" },
  { value: "api_key", label: "API Key" },
  { value: "basic", label: "Basic Auth" },
  { value: "bearer", label: "Bearer Token" },
]

interface CustomConnectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (connector: { name: string; baseUrl: string; authMethod: string }) => void
}

export function CustomConnectorDialog({
  open,
  onOpenChange,
  onCreated,
}: CustomConnectorDialogProps) {
  const { currentTeam } = useTeam()
  const [name, setName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [authMethod, setAuthMethod] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName("")
    setBaseUrl("")
    setAuthMethod("")
    setDescription("")
    setError(null)
  }

  const handleCreate = async () => {
    if (!name.trim() || !baseUrl.trim() || !authMethod || creating) return
    if (!currentTeam) {
      setError("No team selected")
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch("/api/connectors/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: currentTeam.id,
          name: name.trim(),
          baseUrl: baseUrl.trim(),
          authMethod,
          description: description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? `Request failed (${res.status})`)
      }

      onOpenChange(false)
      reset()
      onCreated?.({ name: name.trim(), baseUrl: baseUrl.trim(), authMethod })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const isValid = name.trim() && baseUrl.trim() && authMethod

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Build Your Own Connector</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="connector-name">Connector Name</Label>
            <Input
              id="connector-name"
              placeholder="e.g. Internal CRM"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={creating}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="connector-url">Base URL</Label>
            <Input
              id="connector-url"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={creating}
            />
          </div>

          <div className="grid gap-2">
            <Label>Auth Method</Label>
            <Select value={authMethod} onValueChange={setAuthMethod} disabled={creating}>
              <SelectTrigger>
                <SelectValue placeholder="Select auth method" />
              </SelectTrigger>
              <SelectContent>
                {AUTH_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="connector-desc">Description (optional)</Label>
            <Textarea
              id="connector-desc"
              placeholder="What does this connector do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={creating}
              rows={3}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isValid || creating}
            className="bg-gradient-to-r from-[#00E5A0] to-[#7B61FF] text-white border-0"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Connector
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
