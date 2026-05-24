'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { navigation } from '@/lib/config/navigation'
import { PanelLeftClose, PanelLeft } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const sectionLabels: Record<string, string> = {
  home: 'HOME',
  operations: 'OPERATIONS',
  management: 'MANAGEMENT',
  admin: 'ADMIN',
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const grouped = navigation.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = []
    acc[item.section].push(item)
    return acc
  }, {} as Record<string, typeof navigation>)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-dash-border bg-dash-sidebar transition-[width] duration-0',
        collapsed ? 'w-14' : 'w-48'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-dash-border px-3">
        {!collapsed && (
          <span className="font-display text-[18px] font-normal uppercase tracking-[0.04em] text-dash-text">
            TMRW
          </span>
        )}
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-dash-text-secondary hover:bg-dash-surface-hover hover:text-dash-text"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-2 pt-4">
        {(['home', 'operations', 'management', 'admin'] as const).map((section) => (
          <div key={section}>
            {!collapsed && (
              <span className="mb-1 block px-2.5 pt-3 font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-dash-text-muted">
                {sectionLabels[section]}
              </span>
            )}
            {collapsed && section !== 'home' && (
              <div className="mx-3 my-2 border-t border-dash-border-subtle" />
            )}
            {grouped[section]?.map((item) => {
              const isActive = !item.disabled && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
              const Icon = item.icon

              if (item.disabled) {
                const tooltip = item.disabledReason ?? 'Coming soon'
                return (
                  <div
                    key={item.href}
                    aria-disabled="true"
                    title={tooltip}
                    className={cn(
                      'group relative flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-dash-text-muted opacity-60 select-none'
                    )}
                  >
                    <Icon size={16} className="shrink-0" strokeWidth={1.5} />
                    {!collapsed && (
                      <>
                        <span className="line-through decoration-dash-text-muted/40">{item.label}</span>
                        <span className="ml-auto rounded-full border border-dash-border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-dash-text-muted">
                          WIP
                        </span>
                      </>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-all duration-150',
                    isActive
                      ? 'bg-dash-red/5 text-dash-red font-medium'
                      : 'text-dash-text-secondary hover:bg-dash-surface-hover hover:text-dash-text'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-dash-red"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon size={16} className="shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                  {!collapsed && <span>{item.label}</span>}
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-status-red px-1.5 font-mono text-[10px] font-medium text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
