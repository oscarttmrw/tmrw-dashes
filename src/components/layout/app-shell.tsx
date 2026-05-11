'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { TopBar } from './top-bar'
import { NorthStarBar } from './north-star-bar'
import { CommandBar } from './command-bar'
import { cn } from '@/lib/utils'

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

      {/* Mobile overlay menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

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
        {/* North Star bar — hidden on mobile */}
        <div className="hidden md:block">
          <NorthStarBar />
        </div>
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
      <MobileNav />

      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </div>
  )
}
