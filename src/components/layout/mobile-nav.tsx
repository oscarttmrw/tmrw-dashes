'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  DollarSign,
  Stethoscope,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react'

const tabs = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Financial', href: '/financial', icon: DollarSign },
  { label: 'Delivery', href: '/clinical', icon: Stethoscope },
  { label: 'Retention', href: '/retention', icon: RefreshCw },
  { label: 'More', href: '/members', icon: MoreHorizontal },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-dash-border bg-white md:hidden">
      <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href)
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2.5 min-w-[64px]',
                isActive
                  ? 'text-dash-red'
                  : 'text-dash-text-muted'
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
