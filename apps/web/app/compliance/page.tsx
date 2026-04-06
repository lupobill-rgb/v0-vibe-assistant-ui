"use client"

import { useEffect, useState, useCallback } from "react"
import { AppShell } from "@/components/app-shell"
import { useTeam } from "@/contexts/TeamContext"
import { supabase } from "@/lib/supabase"
import { ShieldCheck, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface AuditRow {
  id: string
  created_at: string
  user_id: string
  department: string | null
  artifact_type: string | null
  skills_used: string[] | null
  artifact_hash: string | null
  approval_status: string
  approver_name: string | null
  approved_at: string | null
  artifact_hash_at_approval: string | null
}

interface GovernanceVersion {
  id: string
  document_name: string
  version_label: string
  effective_date: string
  hash: string | null
}

const PAGE_SIZE = 25

export default function CompliancePage() {
  const { currentOrg } = useTeam()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [governance, setGovernance] = useState<GovernanceVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const fetchAuditLog = useCallback(async () => {
    if (!currentOrg?.id) return
    setLoading(true)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count } = await supabase
      .from("compliance_audit_log")
      .select(
        `id, created_at, user_id, department, artifact_type, skills_used, artifact_hash,
         approval_signatures (
           approver_name, approved_at, artifact_hash_at_approval
         )`,
        { count: "exact" }
      )
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: false })
      .range(from, to)

    const mapped: AuditRow[] = (data ?? []).map((r: Record<string, unknown>) => {
      const sig = Array.isArray(r.approval_signatures)
        ? r.approval_signatures[0]
        : r.approval_signatures
      return {
        id: r.id as string,
        created_at: r.created_at as string,
        user_id: r.user_id as string,
        department: r.department as string | null,
        artifact_type: r.artifact_type as string | null,
        skills_used: r.skills_used as string[] | null,
        artifact_hash: r.artifact_hash as string | null,
        approval_status: sig ? "Approved" : "Pending",
        approver_name: sig?.approver_name ?? null,
        approved_at: sig?.approved_at ?? null,
        artifact_hash_at_approval: sig?.artifact_hash_at_approval ?? null,
      }
    })

    setRows(mapped)
    setTotal(count ?? 0)
    setLoading(false)
  }, [currentOrg?.id, page])

  const fetchGovernance = useCallback(async () => {
    if (!currentOrg?.id) return
    const { data } = await supabase
      .from("governance_versions")
      .select("id, document_name, version_label, effective_date, hash")
      .eq("organization_id", currentOrg.id)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single()

    if (data) setGovernance(data as GovernanceVersion)
  }, [currentOrg?.id])

  useEffect(() => {
    fetchAuditLog()
    fetchGovernance()
  }, [fetchAuditLog, fetchGovernance])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const truncate = (h: string | null) => h ? `${h.slice(0, 12)}...` : "—"
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"

  function IntegrityIcon({ row }: { row: AuditRow }) {
    if (!row.artifact_hash_at_approval) {
      return <span className="flex items-center gap-1 text-muted-foreground text-xs"><Clock className="w-3.5 h-3.5" /> Awaiting approval</span>
    }
    const match = row.artifact_hash_at_approval === row.artifact_hash
    return match
      ? <span className="flex items-center gap-1 text-emerald-500 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
      : <span className="flex items-center gap-1 text-red-500 text-xs"><AlertTriangle className="w-3.5 h-3.5" /> Tamper detected</span>
  }

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F8EFF] to-[#A855F7] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Compliance Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Trust Layer audit trail — read-only provenance chain
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 max-w-7xl space-y-6">
          {/* Section C: Governance Version */}
          {governance && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Active Governance Version</CardTitle>
                <CardDescription>Current policy governing all generated artifacts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div><span className="text-muted-foreground">Document:</span>{" "}<span className="font-medium">{governance.document_name}</span></div>
                  <div><span className="text-muted-foreground">Version:</span>{" "}<Badge variant="outline">{governance.version_label}</Badge></div>
                  <div><span className="text-muted-foreground">Effective:</span>{" "}{fmtDate(governance.effective_date)}</div>
                  <div><span className="text-muted-foreground">Hash:</span>{" "}<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{truncate(governance.hash)}</code></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section A + B: Audit Log Table with Integrity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audit Log</CardTitle>
              <CardDescription>
                {total} record{total !== 1 ? "s" : ""} — page {page + 1} of {totalPages || 1}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Loading audit trail...</p>
              ) : rows.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No audit records found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Artifact Type</TableHead>
                      <TableHead>Skills Used</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>Approval Status</TableHead>
                      <TableHead>Integrity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs">{fmtDate(row.created_at)}</TableCell>
                        <TableCell className="text-xs">{row.user_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-xs">{row.department ?? "—"}</TableCell>
                        <TableCell className="text-xs">{row.artifact_type ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {row.skills_used?.length
                            ? row.skills_used.map((s) => (
                                <Badge key={s} variant="secondary" className="mr-1 text-[10px]">{s}</Badge>
                              ))
                            : "—"}
                        </TableCell>
                        <TableCell><code className="text-[10px] bg-muted px-1 py-0.5 rounded">{truncate(row.artifact_hash)}</code></TableCell>
                        <TableCell>
                          {row.approval_status === "Approved" ? (
                            <span className="text-xs">
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Approved</Badge>
                              <span className="block text-[10px] text-muted-foreground mt-0.5">
                                {row.approver_name} &middot; {fmtDate(row.approved_at)}
                              </span>
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell><IntegrityIcon row={row} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
