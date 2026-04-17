"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
  sectionName: string
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Section-level error boundary.
 * Catches render errors within a single section so a crash in one
 * part of the page doesn't blow up the whole layout.
 * Logs the actual error to the console for debugging.
 */
export class SectionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[${this.props.sectionName}] Render error:`,
      error.message,
      "\nStack:",
      error.stack,
      "\nComponent stack:",
      info.componentStack
    )
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {this.props.sectionName} couldn&apos;t load
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Something in this section threw an error. The rest of the page still works.
          </p>
          <details className="text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Error details</summary>
            <pre className="mt-2 p-2 bg-background rounded overflow-x-auto">
              {this.state.error?.message ?? "Unknown error"}
            </pre>
          </details>
        </div>
      )
    }
    return this.props.children
  }
}
