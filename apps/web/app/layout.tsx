import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { CommandPalette } from '@/components/command-palette'
import { AuthGuard } from '@/components/auth-guard'
import { TeamProvider } from '@/contexts/TeamContext'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'UbiVibe - AI Coding Assistant',
  description: 'Build software faster with your AI coding assistant',
}

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthGuard>
            <TeamProvider>
              {children}
            </TeamProvider>
          </AuthGuard>
          <CommandPalette />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
