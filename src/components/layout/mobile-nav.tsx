'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  DollarSign,
  Stethoscope,
  RefreshCw,
  Menu,
} from 'lucide-react'

const tabs = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Financial', href: '/financial', icon: DollarSign },
  { label: 'Delivery', href: '/clinical', icon: Stethoscope },
  { label: 'Retention', href: '/retention', icon: RefreshCw },
] as const

interface MobileNavProps {
  onMenuOpen: () => void
  menuOpen: boolean
}

export function MobileNav({ onMenuOpen, menuOpen }: MobileNavProps) {
  const pathname = usePathname()

  // "Menu" reads as active whenever the drawer is open OR the current route
  // isn't one of the four quick tabs (so the user is never left without a
  // highlighted destination).
  const onQuickTab = tabs.some((t) =>
    t.href === '/' ? pathname === '/' : pathname.startsWith(t.href)
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-dash-border bg-dash-surface/95 backdrop-blur-sm md:hidden">
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex min-w-[60px] flex-col items-center gap-0.5 px-2 py-2.5',
                isActive ? 'text-dash-red' : 'text-dash-text-muted'
              )}
            >
              <Icon size={21} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
        <button
          onClick={onMenuOpen}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className={cn(
            'flex min-w-[60px] flex-col items-center gap-0.5 px-2 py-2.5',
            menuOpen || !onQuickTab ? 'text-dash-red' : 'text-dash-text-muted'
          )}
        >
          <Menu size={21} strokeWidth={menuOpen || !onQuickTab ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  )
}
