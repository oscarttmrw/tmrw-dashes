'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { MobileDrawer } from './mobile-drawer'
import { TopBar } from './top-bar'
import { NorthStarBar } from './north-star-bar'
import { CommandBar } from './command-bar'
import { cn } from '@/lib/utils'
import { useDashboardData } from '@/lib/context/data-context'

function DemoBanner() {
  const { dataMode, switchToActual } = useDashboardData()
  if (dataMode !== 'demo') return null
  return (
    <div className="sticky top-0 z-40 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-medium text-amber-600">
      Demo mode active — showing illustrative data.{' '}
      <button onClick={switchToActual} className="underline hover:no-underline">
        Turn off
      </button>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandBarOpen, setCommandBarOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-dash-bg">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile navigation drawer — animated, scroll-locking */}
      <MobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main content */}
      <div
        className={cn(
          'transition-[margin-left] duration-0',
          'md:ml-48',
          sidebarCollapsed && 'md:ml-14',
          'ml-0'
        )}
      >
        <TopBar
          onCommandBarOpen={() => setCommandBarOpen(true)}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
        />
        <DemoBanner />
        <NorthStarBar />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            id="dashboard-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="mx-auto max-w-[1440px] px-4 py-4 pb-20 md:px-6 md:py-6 md:pb-6"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileNav onMenuOpen={() => setMobileMenuOpen(true)} menuOpen={mobileMenuOpen} />

      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </div>
  )
}
