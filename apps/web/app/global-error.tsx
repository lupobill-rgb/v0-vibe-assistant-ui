"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ backgroundColor: "#0A0E17", color: "#E8ECF4", fontFamily: "Inter, system-ui, sans-serif", margin: 0 }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ maxWidth: "400px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>&#9888;</div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: "14px", color: "#888", marginBottom: "24px" }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid #1a2030",
                background: "linear-gradient(135deg, #00E5A0 0%, #7B61FF 100%)",
                color: "#fff",
                fontWeight: 500,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
