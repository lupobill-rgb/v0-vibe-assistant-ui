"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { importGithubProject } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ImportGithubDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: (id: string) => void
}

export function ImportGithubDialog({
  open,
  onOpenChange,
  onImported,
}: ImportGithubDialogProps) {
  const [repoUrl, setRepoUrl] = useState("")
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setRepoUrl("")
    setError(null)
  }

  const handleImport = async () => {
    if (!repoUrl.trim() || importing) return
    setImporting(true)
    setError(null)
    try {
      const result = await importGithubProject(repoUrl.trim())
      if (result.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
        reset()
        if (result.id) onImported?.(result.id)
      }
    } catch {
      setError("Failed to import repository. Is the API running?")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import from GitHub</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleImport()
            }}
            disabled={importing}
            autoFocus
          />
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!repoUrl.trim() || importing}
            className="bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white border-0"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
