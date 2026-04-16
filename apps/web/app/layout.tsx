import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { CommandPalette } from '@/components/command-palette'
import { AuthGuard } from '@/components/auth-guard'
import { TeamProvider } from '@/contexts/TeamContext'
import { Toaster } from '@/components/ui/sonner'
import { NotificationListener } from '@/components/notification-listener'

export const metadata: Metadata = {
  title: 'UbiVibe - AI Coding Assistant',
  description: 'Build software faster with your AI coding assistant',
}

export const viewport: Viewport = {
  themeColor: '#0A0E17',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
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
              <NotificationListener />
            </TeamProvider>
          </AuthGuard>
          <CommandPalette />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
