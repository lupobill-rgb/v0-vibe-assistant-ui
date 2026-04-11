import type { Metadata } from "next"
import { META } from "./constants"

export const metadata: Metadata = {
  title: META.title,
  description: META.description,
  openGraph: {
    title: META.title,
    description: META.description,
    type: "website",
    siteName: "UbiGrowth VIBE",
  },
  twitter: {
    card: "summary_large_image",
    title: META.title,
    description: META.description,
  },
}

export default function PELandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
