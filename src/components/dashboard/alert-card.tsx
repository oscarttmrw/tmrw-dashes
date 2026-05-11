'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertSeverity } from '@/lib/types'

interface AlertCardProps {
  severity: AlertSeverity
  title: string
  link?: { label: string; href: string }
  positive?: boolean
}

export function AlertCard({ severity, title, link, positive = false }: AlertCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-dash-border-subtle bg-dash-surface/50 px-3.5 py-3 md:px-4">
      {positive ? (
        <CheckCircle size={14} className="mt-0.5 shrink-0 text-status-green" />
      ) : severity === 'high' ? (
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-red" />
      ) : (
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-amber" />
      )}
      <p className="flex-1 font-sans text-xs text-dash-text-secondary">
        {title}
      </p>
      {link && (
        <Link
          href={link.href}
          className="shrink-0 font-sans text-[11px] text-dash-red hover:underline"
        >
          &rarr; {link.label}
        </Link>
      )}
    </div>
  )
}
