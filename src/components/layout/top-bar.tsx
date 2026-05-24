'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, Download, Search, Menu, FileText, FileDown } from 'lucide-react'
interface TopBarProps {
  onCommandBarOpen: () => void
  onMobileMenuOpen?: () => void
}

function generateMarkdownReport() {
  const headings = document.querySelectorAll('h1, h2, h3, [data-section-heading]')
  const cards = document.querySelectorAll('[data-metric-card]')
  const lines: string[] = []

  lines.push('# TMRW Dashboard Report')
  lines.push(`**Generated:** ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push('')

  if (cards.length > 0) {
    lines.push('## Key Metrics')
    lines.push('')
    lines.push('| Metric | Value |')
    lines.push('|--------|-------|')
    cards.forEach((card) => {
      const label = card.querySelector('[data-metric-label]')?.textContent ?? ''
      const value = card.querySelector('[data-metric-value]')?.textContent ?? ''
      if (label && value) lines.push(`| ${label} | ${value} |`)
    })
    lines.push('')
  }

  headings.forEach((h) => {
    const text = h.textContent?.trim()
    if (text) {
      const level = h.tagName === 'H1' ? '##' : h.tagName === 'H2' ? '###' : '####'
      lines.push(`${level} ${text}`)
      lines.push('')
    }
  })

  return lines.join('\n')
}

async function generateFullMarkdownExport(): Promise<string> {
  const report = generateMarkdownReport()
  try {
    const res = await fetch('/api/full-code')
    if (!res.ok) {
      // Fallback to static file
      const fallback = await fetch('/full-code.md')
      if (!fallback.ok) return report
      const code = await fallback.text()
      return report + '\n\n---\n\n' + code
    }
    const code = await res.text()
    return report + '\n\n---\n\n' + code
  } catch {
    return report
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function TopBar({ onCommandBarOpen, onMobileMenuOpen }: TopBarProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-dash-border bg-dash-header px-4 md:h-14 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        {onMobileMenuOpen && (
          <button
            onClick={onMobileMenuOpen}
            className="rounded-md p-1.5 text-white/70 hover:text-white md:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        {/* TMRW brand visible only on mobile (desktop has it in sidebar) */}
        <h1 className="font-display text-[18px] font-normal uppercase tracking-[0.04em] text-white md:hidden">
          TMRW
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Search — icon only on mobile */}
        <button
          onClick={onCommandBarOpen}
          className="rounded-md p-2 text-white/70 hover:text-white md:flex md:items-center md:gap-2 md:border md:border-white/20 md:px-3 md:py-1.5"
        >
          <Search size={14} />
          <span className="hidden md:inline text-sm text-white/80">Search</span>
          <kbd className="ml-2 hidden lg:inline rounded border border-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white/50">
            ⌘K
          </kbd>
        </button>

        {/* Date — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1.5 px-2 text-sm text-white/60">
          <div className="h-5 w-px bg-white/15" />
          <Calendar size={14} />
          <span className="font-mono text-xs">{dateStr}</span>
        </div>

        {/* Export dropdown — hidden on mobile */}
        <div className="hidden md:flex items-center" ref={exportRef}>
          <div className="h-5 w-px bg-white/15 mr-2" />
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/60 hover:text-white"
              title="Export"
            >
              <Download size={14} />
              <span className="hidden lg:inline text-xs">Export</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-dash-border bg-dash-surface shadow-lg">
                <button
                  onClick={() => {
                    window.print()
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-dash-text hover:bg-dash-surface-hover"
                >
                  <FileDown size={14} className="text-dash-text-secondary" />
                  Export as PDF
                </button>
                <button
                  onClick={async () => {
                    const md = await generateFullMarkdownExport()
                    const dateSlug = new Date().toISOString().slice(0, 10)
                    downloadFile(md, `tmrw-report-${dateSlug}.md`, 'text/markdown')
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-dash-text hover:bg-dash-surface-hover"
                >
                  <FileText size={14} className="text-dash-text-secondary" />
                  Export as Markdown
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
