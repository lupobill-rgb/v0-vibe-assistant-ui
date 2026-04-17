"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading skeleton for ShadcnDashboard.
 * Matches the layout shape so the handoff to real data is seamless.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header skeleton */}
      <header className="flex h-14 shrink-0 items-center border-b bg-card/50">
        <div className="flex w-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#00E5A0] to-[#7B61FF] shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </header>

      {/* Filter bar skeleton */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-2 border-b">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-60" />
      </div>

      {/* Main content skeleton */}
      <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-7 w-28 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Chart cards */}
        {[0, 1].map((i) => (
          <div key={i} className="px-4 lg:px-6">
            <Card className="animate-pulse">
              <CardHeader className="flex flex-col gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[240px] w-full" />
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Table */}
        <div className="px-4 lg:px-6">
          <Card className="animate-pulse">
            <CardHeader className="flex flex-col gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent className="px-0">
              <div className="flex flex-col gap-2 px-6">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
