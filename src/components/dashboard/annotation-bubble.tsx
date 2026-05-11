'use client'

import { MessageCircle } from 'lucide-react'
import { useState } from 'react'

interface AnnotationBubbleProps {
  text: string
  author: string
  date: string
}

export function AnnotationBubble({ text, author, date }: AnnotationBubbleProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="text-dash-text-muted hover:text-dash-red"
      >
        <MessageCircle size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-50 w-72 rounded-lg border border-dash-border bg-dash-surface p-3 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
            <p className="font-sans text-xs text-dash-text-secondary">{text}</p>
            <p className="mt-2 font-sans text-[11px] text-dash-text-muted">
              &mdash; {author}, {date}
            </p>
          </div>
        </>
      )}
    </span>
  )
}
