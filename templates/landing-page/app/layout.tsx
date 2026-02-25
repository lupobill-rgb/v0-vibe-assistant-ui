import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIBE – Build Websites with Natural Language",
  description:
    "VIBE is an AI-powered website builder. Describe what you want, and VIBE generates production-ready code in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-[#0a0f1e] text-white antialiased">{children}</body>
    </html>
  );
}
