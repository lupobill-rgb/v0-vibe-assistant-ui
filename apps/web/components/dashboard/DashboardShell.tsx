"use client";

import { useState } from "react";
import type { DashboardData, AlertBlock, ActionBlock } from "@/types/dashboard";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface DashboardShellProps {
  data: DashboardData;
  children: React.ReactNode;
  onAction?: (action: ActionBlock) => void;
}

const dataSourceBadge: Record<
  DashboardData["meta"]["data_source"],
  { label: string; className: string }
> = {
  sample: {
    label: "Sample Data",
    className: "bg-muted text-muted-foreground border-transparent",
  },
  connected: {
    label: "Live",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent",
  },
  empty: {
    label: "No Data",
    className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-transparent",
  },
};

const alertBorderColor: Record<AlertBlock["severity"], string> = {
  info: "border-l-blue-500",
  warning: "border-l-yellow-500",
  critical: "border-l-red-500",
};

const actionVariant: Record<ActionBlock["action"], "default" | "ghost" | "outline"> = {
  accept: "default",
  dismiss: "ghost",
  modify: "outline",
  navigate: "outline",
};

export function DashboardShell({ data, children, onAction }: DashboardShellProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const { meta, alerts, actions } = data;
  const themeMode = meta.theme?.mode ?? "system";

  const visibleAlerts = alerts?.filter((a) => !dismissedAlerts.has(a.id)) ?? [];

  function dismissAlert(id: string) {
    setDismissedAlerts((prev) => new Set(prev).add(id));
  }

  return (
    <div data-theme={themeMode} className="flex min-h-full flex-col bg-background text-foreground">
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader>
          <div>
            <CardTitle className="text-xl">{meta.title}</CardTitle>
            {meta.subtitle && (
              <CardDescription className="mt-1">{meta.subtitle}</CardDescription>
            )}
          </div>
          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{meta.department}</Badge>
              <Badge className={dataSourceBadge[meta.data_source].className}>
                {dataSourceBadge[meta.data_source].label}
              </Badge>
              {meta.connector && (
                <span className="text-xs text-muted-foreground">via {meta.connector}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {meta.generated_at}
              </span>
            </div>
          </CardAction>
        </CardHeader>
      </Card>

      {/* Alerts rail */}
      {visibleAlerts.length > 0 && (
        <div className="flex flex-col gap-2 px-6 pt-4">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between rounded-md border border-l-4 bg-card px-4 py-3 ${alertBorderColor[alert.severity]}`}
            >
              <span className="text-sm">{alert.message}</span>
              <div className="flex items-center gap-2">
                {alert.action_label && onAction && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onAction({ id: alert.id, label: alert.action_label!, action: "navigate", payload: {} })
                    }
                  >
                    {alert.action_label}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => dismissAlert(alert.id)}
                  aria-label="Dismiss alert"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 px-6 py-6">{children}</div>

      {/* Actions footer */}
      {actions && actions.length > 0 && (
        <div className="sticky bottom-0 flex items-center gap-3 border-t bg-background px-6 py-4">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={actionVariant[action.action]}
              onClick={() => onAction?.(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
