'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigation } from '@/lib/config/navigation'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

const sectionLabels: Record<string, string> = {
  home: 'Home',
  operations: 'Operations',
  management: 'Management',
  admin: 'Admin',
}

/**
 * Full-height navigation drawer for mobile. Slides in from the left with a
 * fading scrim, locks background scroll while open, and closes automatically
 * on navigation. Replaces the old overlay that re-used the desktop sidebar.
 */
export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname()

  // Close on route change.
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return
    document.body.classList.add('overflow-hidden-scroll')
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('overflow-hidden-scroll')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const grouped = navigation.reduce((acc, item) => {
    ;(acc[item.section] ||= []).push(item)
    return acc
  }, {} as Record<string, typeof navigation>)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <motion.div
            className="absolute inset-0 bg-dash-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute left-0 top-0 flex h-full w-[82%] max-w-[320px] flex-col bg-dash-surface shadow-pop"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex h-14 items-center justify-between border-b border-dash-border px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://res.cloudinary.com/dkbhatjde/image/upload/v1774156339/TMRW_Wordmark_Black_fo2tpb.svg"
                alt="TMRW Health"
                width={92}
                height={20}
                style={{ height: 20, width: 'auto' }}
              />
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="-mr-1.5 rounded-md p-2 text-dash-text-secondary hover:bg-dash-surface-hover hover:text-dash-text"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {(['home', 'operations', 'management', 'admin'] as const).map((section) => (
                <div key={section} className="mb-2">
                  <span className="mb-1 block px-3 pt-3 font-ui text-[10px] font-medium uppercase tracking-[0.1em] text-dash-text-muted">
                    {sectionLabels[section]}
                  </span>
                  {grouped[section]?.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      !item.disabled &&
                      (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))

                    if (item.disabled) {
                      return (
                        <div
                          key={item.href}
                          aria-disabled="true"
                          className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-dash-text-muted opacity-60 select-none"
                        >
                          <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                          <span className="line-through decoration-dash-text-muted/40">{item.label}</span>
                          <span className="ml-auto rounded-full border border-dash-border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-dash-text-muted">
                            WIP
                          </span>
                        </div>
                      )
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors',
                          isActive
                            ? 'bg-dash-red/[0.06] font-medium text-dash-red'
                            : 'text-dash-text-secondary active:bg-dash-surface-hover'
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-dash-red" />
                        )}
                        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
                        <span>{item.label}</span>
                        {item.tag && (
                          <span className="ml-auto rounded-full border border-status-amber/40 bg-status-amber/10 px-1.5 py-px font-mono text-[9px] font-medium uppercase tracking-wider text-status-amber">
                            {item.tag}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
