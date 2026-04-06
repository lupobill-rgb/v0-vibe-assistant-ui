"use client"

import { AppShell } from "@/components/app-shell"
import { OperationsDashboard } from "@/components/dashboard/operations-dashboard"

export default function OperationsPage() {
  return (
    <AppShell>
      <OperationsDashboard />
    </AppShell>
  )
}
