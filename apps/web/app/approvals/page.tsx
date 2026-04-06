"use client"

import { ApprovalQueue } from "@/components/dashboard/approval-queue"

export default function ApprovalsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-xl font-semibold text-foreground mb-6">Skill Approvals</h1>
      <ApprovalQueue />
    </div>
  )
}
