'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbProps {
  items: { label: string; href?: string }[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} className="text-dash-text-muted" />}
          {item.href ? (
            <Link href={item.href} className="text-dash-text-secondary hover:text-dash-red">
              {item.label}
            </Link>
          ) : (
            <span className="text-dash-text">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
