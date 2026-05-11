'use client'

import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { navigation } from '@/lib/config/navigation'
import { useDashboardData } from '@/lib/context/data-context'
import { metricDefinitions } from '@/lib/config/metrics'
import {
  Search,
  Upload,
  FileDown,
  User,
  BarChart3,
  Clock,
} from 'lucide-react'

interface CommandBarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const RECENT_KEY = 'tmrw-cmd-recent'
const MAX_RECENT = 10

function getRecent(): { label: string; href: string }[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch { return [] }
}

function addToRecent(item: { label: string; href: string }) {
  try {
    const stored = getRecent()
    const updated = [item, ...stored.filter(s => s.href !== item.href)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch {}
}

const categoryRoutes: Record<string, string> = {
  financial: '/financial',
  members: '/members',
  clinical: '/clinical',
  support: '/support',
  retention: '/retention',
  marketing: '/marketing',
  strategy: '/strategy',
  eos: '/eos',
}

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const router = useRouter()
  const { members } = useDashboardData()
  const [recent, setRecent] = useState<{ label: string; href: string }[]>([])

  useEffect(() => {
    if (open) setRecent(getRecent())
  }, [open])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  function handleSelect(label: string, href: string) {
    addToRecent({ label, href })
    router.push(href)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <Command
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-dash-border bg-dash-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
        onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false) }}
        filter={(value, search) => {
          if (value.toLowerCase().includes(search.toLowerCase())) return 1
          return 0
        }}
      >
        <div className="flex items-center border-b border-dash-border px-4">
          <Search size={16} className="shrink-0 text-dash-text-muted" />
          <Command.Input
            placeholder="Search pages, metrics, members..."
            className="flex h-12 w-full bg-transparent px-3 text-sm text-dash-text outline-none placeholder:text-dash-text-muted"
            autoFocus
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-dash-text-muted">
            No results found.
          </Command.Empty>

          {recent.length > 0 && (
            <Command.Group heading="Recent" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
              {recent.slice(0, 5).map((item, i) => (
                <Command.Item
                  key={`recent-${i}`}
                  value={`recent ${item.label}`}
                  onSelect={() => handleSelect(item.label, item.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
                >
                  <Clock size={14} className="text-dash-text-muted" />
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Navigate" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Command.Item
                  key={item.href}
                  value={`nav ${item.label}`}
                  onSelect={() => handleSelect(item.label, item.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
                >
                  <Icon size={16} />
                  {item.label}
                </Command.Item>
              )
            })}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-dash-border" />

          <Command.Group heading="Members" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            {members.slice(0, 50).map((m) => (
              <Command.Item
                key={m.id}
                value={`member ${m.displayName} ${m.id}`}
                onSelect={() => {
                  addToRecent({ label: m.displayName, href: `/members#${m.id}` })
                  onOpenChange(false)
                }}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
              >
                <User size={14} className="text-dash-text-muted" />
                <span>{m.displayName}</span>
                <span className="ml-auto text-xs text-dash-text-muted">{m.id}</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-dash-border" />

          <Command.Group heading="Metrics" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            {metricDefinitions.map((m) => {
              const route = categoryRoutes[m.category] || '/'
              return (
                <Command.Item
                  key={m.id}
                  value={`metric ${m.label} ${m.category}`}
                  onSelect={() => handleSelect(m.label, route)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
                >
                  <BarChart3 size={14} className="text-dash-text-muted" />
                  <span>{m.label}</span>
                  <span className="ml-auto text-xs capitalize text-dash-text-muted">{m.category}</span>
                </Command.Item>
              )
            })}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-dash-border" />

          <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
            <Command.Item
              value="action Upload data"
              onSelect={() => handleSelect('Upload CSV data', '/admin/upload')}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
            >
              <Upload size={16} />
              Upload CSV data
            </Command.Item>
            <Command.Item
              value="action Export PDF"
              onSelect={async () => {
                onOpenChange(false)
                const el = document.getElementById('dashboard-content')
                if (!el) return
                const html2canvas = (await import('html2canvas')).default
                const { jsPDF } = await import('jspdf')
                const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#0F0F0F' })
                const imgData = canvas.toDataURL('image/png')
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] })
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
                pdf.save('tmrw-dashboard.pdf')
              }}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-dash-text-secondary data-[selected=true]:bg-dash-surface-hover data-[selected=true]:text-dash-text"
            >
              <FileDown size={16} />
              Export current view as PDF
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  )
}
