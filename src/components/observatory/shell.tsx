'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Search } from 'lucide-react'
import { CommandBar } from '@/components/layout/command-bar'
import { useDashboardData } from '@/lib/context/data-context'
import { Ticker } from './ticker'

/**
 * The Observatory shell — no sidebar. A single editorial masthead with
 * chapter navigation, a live 30-day ticker strip, and the content given
 * the full width of the page.
 */

const CHAPTERS = [
  { label: 'Pulse', href: '/' },
  { label: 'Growth', href: '/marketing' },
  { label: 'Revenue', href: '/financial' },
  { label: 'Members', href: '/members' },
  { label: 'Lab', href: '/lab' },
]

const MORE_LINKS: { group: string; items: { label: string; href: string }[] }[] = [
  {
    group: 'Legacy views',
    items: [
      { label: 'Delivery', href: '/clinical' },
      { label: 'Retention', href: '/retention' },
      { label: 'Support', href: '/support' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Data Upload', href: '/admin/upload' },
      { label: 'Upload History', href: '/admin/upload-history' },
      { label: 'Invite Users', href: '/admin/invite' },
      { label: 'Settings', href: '/admin/settings' },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const anyActive = MORE_LINKS.some(g => g.items.some(i => isActive(pathname, i.href)))

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-3 py-2 font-ui text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
          anyActive ? 'text-dash-text' : 'text-dash-text-secondary hover:text-dash-text'
        }`}
      >
        More <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-dash-border bg-dash-surface py-1.5 shadow-[0_12px_32px_-8px_rgba(26,26,26,0.18)]"
          >
            {MORE_LINKS.map(group => (
              <div key={group.group} className="px-1.5 py-1">
                <p className="px-2 pb-1 font-ui text-[9px] uppercase tracking-[0.14em] text-dash-text-muted">
                  {group.group}
                </p>
                {group.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                      isActive(pathname, item.href)
                        ? 'bg-dash-red/5 font-medium text-dash-red'
                        : 'text-dash-text-secondary hover:bg-dash-surface-hover hover:text-dash-text'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DemoBanner() {
  const { dataMode, switchToActual } = useDashboardData()
  if (dataMode !== 'demo') return null
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-600">
      Demo mode active — showing illustrative data.{' '}
      <button onClick={switchToActual} className="underline hover:no-underline">
        Turn off
      </button>
    </div>
  )
}

export function ObservatoryShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false)
  const pathname = usePathname()

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-dash-bg">
      <header className="sticky top-0 z-40 border-b border-dash-border bg-dash-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1560px] items-center justify-between gap-4 px-4 md:px-8">
          {/* Masthead */}
          <Link href="/" className="flex shrink-0 items-baseline gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://res.cloudinary.com/dkbhatjde/image/upload/v1774156339/TMRW_Wordmark_Black_fo2tpb.svg"
              alt="TMRW Health"
              width={86}
              height={19}
              style={{ height: 19, width: 'auto' }}
            />
            <span className="hidden font-ui text-[9px] uppercase tracking-[0.28em] text-tmrw-syringe sm:inline">
              Observatory
            </span>
          </Link>

          {/* Chapter nav — desktop */}
          <nav className="hidden items-center md:flex">
            {CHAPTERS.map(item => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3.5 py-2 font-ui text-[11px] font-medium uppercase tracking-[0.14em] transition-colors lg:px-5 ${
                    active ? 'text-dash-text' : 'text-dash-text-secondary hover:text-dash-text'
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="observatory-nav"
                      className="absolute inset-x-3 -bottom-[13px] h-[2px] bg-tmrw-syringe lg:inset-x-4"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                </Link>
              )
            })}
            <MoreMenu pathname={pathname} />
          </nav>

          {/* Right utilities */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-dash-border bg-dash-surface px-2.5 py-1.5 text-dash-text-secondary transition-colors hover:border-dash-border-strong hover:text-dash-text"
            >
              <Search size={13} />
              <kbd className="hidden font-mono text-[10px] text-dash-text-muted lg:inline">⌘K</kbd>
            </button>
            <span className="hidden font-mono text-[11px] text-dash-text-muted lg:inline">{today}</span>
          </div>
        </div>

        {/* Chapter nav — mobile scroll row */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-dash-border-subtle px-3 py-1.5 md:hidden">
          {CHAPTERS.map(item => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 font-ui text-[10.5px] font-medium uppercase tracking-[0.12em] ${
                  active ? 'bg-dash-black text-white' : 'text-dash-text-secondary'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          <Link
            href="/admin/upload"
            className="whitespace-nowrap rounded-full px-3.5 py-1.5 font-ui text-[10.5px] font-medium uppercase tracking-[0.12em] text-dash-text-secondary"
          >
            Admin
          </Link>
        </nav>
      </header>

      <Ticker />
      <DemoBanner />

      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          id="dashboard-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mx-auto max-w-[1560px] px-4 py-8 pb-24 md:px-8 md:py-10"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-dash-border">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2 px-4 py-5 md:px-8">
          <p className="font-ui text-[10px] uppercase tracking-[0.2em] text-dash-text-muted">
            TMRW Observatory — internal use only
          </p>
          <p className="font-mono text-[10px] text-dash-text-muted">
            ticker shows trailing 30 days vs the 30 before
          </p>
        </div>
      </footer>

      <CommandBar open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
