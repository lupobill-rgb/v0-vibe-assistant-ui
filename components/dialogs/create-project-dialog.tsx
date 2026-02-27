"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { createProject } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (id: string) => void
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName("")
    setError(null)
  }

  const handleCreate = async () => {
    if (!name.trim() || creating) return
    setCreating(true)
    setError(null)
    try {
      const result = await createProject(name.trim())
      if (result.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
        reset()
        if (result.id) onCreated?.(result.id)
      }
    } catch {
      setError("Failed to create project. Is the API running?")
    } finally {
      setCreating(false)
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
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate()
            }}
            disabled={creating}
            autoFocus
          />
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
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
            disabled={!name.trim() || creating}
            className="bg-gradient-to-r from-[#4F8EFF] to-[#A855F7] text-white border-0"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
