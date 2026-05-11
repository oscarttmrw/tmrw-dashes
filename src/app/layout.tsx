import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/app-shell'
import { DataProvider } from '@/lib/context/data-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'TMRW Operating Dashboard',
  description: 'TMRW Health operational command center',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  )
}
