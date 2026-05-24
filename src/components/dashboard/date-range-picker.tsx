'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Calendar, ChevronDown } from 'lucide-react'

export interface DateRange {
  start: Date
  end: Date
}

export interface DateRangePickerValue {
  /** Primary period currently displayed in tiles + charts. */
  period: DateRange
  /** Comparison period. Tiles compute delta against this. */
  comparison: DateRange
  /** 'previous' = derived (length of period A shifted back); 'custom' = user-picked. */
  comparisonMode: 'previous' | 'custom'
}

interface Props {
  value: DateRangePickerValue
  onChange: (value: DateRangePickerValue) => void
  className?: string
}

/* ─── Range presets ────────────────────────────────────────────────── */

type PresetKey =
  | 'this-month'
  | 'last-month'
  | 'last-30'
  | 'last-90'
  | 'this-quarter'
  | 'custom'

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'last-30', label: 'Last 30 days' },
  { key: 'last-90', label: 'Last 90 days' },
  { key: 'this-quarter', label: 'This quarter' },
  { key: 'custom', label: 'Custom' },
]

function presetToRange(preset: PresetKey, today = new Date()): DateRange {
  const start = new Date(today)
  const end = new Date(today)
  switch (preset) {
    case 'this-month':
      start.setDate(1)
      return { start: atDayStart(start), end: atDayEnd(today) }
    case 'last-month': {
      const lmStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lmEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: atDayStart(lmStart), end: atDayEnd(lmEnd) }
    }
    case 'last-30':
      start.setDate(today.getDate() - 29)
      return { start: atDayStart(start), end: atDayEnd(today) }
    case 'last-90':
      start.setDate(today.getDate() - 89)
      return { start: atDayStart(start), end: atDayEnd(today) }
    case 'this-quarter': {
      const q = Math.floor(today.getMonth() / 3)
      const qStart = new Date(today.getFullYear(), q * 3, 1)
      return { start: atDayStart(qStart), end: atDayEnd(today) }
    }
    case 'custom':
      return { start: atDayStart(start), end: atDayEnd(end) }
  }
}

function atDayStart(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function atDayEnd(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** Previous period of equal length, ending the day before period.start. */
export function previousPeriod(period: DateRange): DateRange {
  const lengthMs = period.end.getTime() - period.start.getTime()
  const end = new Date(period.start.getTime() - 1)
  const start = new Date(end.getTime() - lengthMs)
  return { start: atDayStart(start), end: atDayEnd(end) }
}

/** Helper: default value if no caller-state exists yet. */
export function defaultDateRangePicker(): DateRangePickerValue {
  const period = presetToRange('this-month')
  return {
    period,
    comparison: previousPeriod(period),
    comparisonMode: 'previous',
  }
}

/* ─── Formatting ───────────────────────────────────────────────────── */

function fmtRange(r: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const sameYear = r.start.getFullYear() === r.end.getFullYear()
  const startStr = r.start.toLocaleDateString('en-AU', opts)
  const endStr = sameYear
    ? r.end.toLocaleDateString('en-AU', opts)
    : r.end.toLocaleDateString('en-AU', { ...opts, year: 'numeric' })
  return `${startStr} – ${endStr}, ${r.end.getFullYear()}`
}

function toInputValue(d: Date): string {
  // 'YYYY-MM-DD' in local time — what <input type="date"> expects.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromInputValue(s: string, endOfDay = false): Date {
  // 'YYYY-MM-DD' → local Date. endOfDay flag sets to 23:59:59.999.
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return new Date(NaN)
  return endOfDay ? atDayEnd(new Date(y, m - 1, d)) : atDayStart(new Date(y, m - 1, d))
}

/* ─── Component ────────────────────────────────────────────────────── */

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectPreset = (preset: PresetKey) => {
    if (preset === 'custom') return  // user fills the date inputs below
    const period = presetToRange(preset)
    onChange({
      ...value,
      period,
      comparison: value.comparisonMode === 'previous' ? previousPeriod(period) : value.comparison,
    })
  }

  const setPeriodFromInputs = (startStr: string, endStr: string) => {
    const start = fromInputValue(startStr)
    const end = fromInputValue(endStr, true)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return
    const period: DateRange = { start, end }
    onChange({
      ...value,
      period,
      comparison: value.comparisonMode === 'previous' ? previousPeriod(period) : value.comparison,
    })
  }

  const setComparisonFromInputs = (startStr: string, endStr: string) => {
    const start = fromInputValue(startStr)
    const end = fromInputValue(endStr, true)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return
    onChange({ ...value, comparison: { start, end } })
  }

  const setComparisonMode = (mode: 'previous' | 'custom') => {
    onChange({
      ...value,
      comparisonMode: mode,
      comparison: mode === 'previous' ? previousPeriod(value.period) : value.comparison,
    })
  }

  // Determine which preset (if any) matches the current period — for highlight.
  const activePreset: PresetKey | null = (() => {
    for (const p of PRESETS) {
      if (p.key === 'custom') continue
      const r = presetToRange(p.key)
      if (sameDay(r.start, value.period.start) && sameDay(r.end, value.period.end)) return p.key
    }
    return 'custom'
  })()

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 rounded-md border border-dash-border bg-dash-surface px-3 py-2 font-ui text-xs uppercase tracking-[0.05em] text-dash-text transition-colors',
          'hover:border-dash-border-strong',
          open && 'border-dash-text-secondary'
        )}
      >
        <Calendar size={14} className="text-dash-text-secondary" />
        <span className="font-mono normal-case tracking-normal">
          {fmtRange(value.period)}
        </span>
        <span className="text-dash-text-muted">vs</span>
        <span className="font-mono normal-case tracking-normal text-dash-text-secondary">
          {fmtRange(value.comparison)}
        </span>
        <ChevronDown size={12} className={cn('text-dash-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[28rem] max-w-[calc(100vw-2rem)] rounded-lg border border-dash-border bg-dash-bg p-4 shadow-xl">
          {/* Preset chips */}
          <div className="mb-3">
            <p className="mb-1.5 font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary">Period</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => {
                const active = activePreset === p.key
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => selectPreset(p.key)}
                    className={cn(
                      'rounded-full px-3 py-1 font-ui text-[10px] uppercase tracking-[0.05em] transition-colors',
                      active
                        ? 'bg-dash-text text-dash-text-inverse'
                        : 'border border-dash-border bg-dash-surface text-dash-text-secondary hover:border-dash-text-muted hover:text-dash-text'
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Period A date inputs */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <DateInput
              label="From"
              value={toInputValue(value.period.start)}
              onChange={(v) => setPeriodFromInputs(v, toInputValue(value.period.end))}
            />
            <DateInput
              label="To"
              value={toInputValue(value.period.end)}
              onChange={(v) => setPeriodFromInputs(toInputValue(value.period.start), v)}
            />
          </div>

          {/* Comparison */}
          <div>
            <p className="mb-1.5 font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-secondary">Compare to</p>
            <div className="mb-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => setComparisonMode('previous')}
                className={cn(
                  'rounded-full px-3 py-1 font-ui text-[10px] uppercase tracking-[0.05em] transition-colors',
                  value.comparisonMode === 'previous'
                    ? 'bg-dash-text text-dash-text-inverse'
                    : 'border border-dash-border bg-dash-surface text-dash-text-secondary hover:border-dash-text-muted hover:text-dash-text'
                )}
              >
                Previous period
              </button>
              <button
                type="button"
                onClick={() => setComparisonMode('custom')}
                className={cn(
                  'rounded-full px-3 py-1 font-ui text-[10px] uppercase tracking-[0.05em] transition-colors',
                  value.comparisonMode === 'custom'
                    ? 'bg-dash-text text-dash-text-inverse'
                    : 'border border-dash-border bg-dash-surface text-dash-text-secondary hover:border-dash-text-muted hover:text-dash-text'
                )}
              >
                Custom range
              </button>
            </div>
            {value.comparisonMode === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <DateInput
                  label="From"
                  value={toInputValue(value.comparison.start)}
                  onChange={(v) => setComparisonFromInputs(v, toInputValue(value.comparison.end))}
                />
                <DateInput
                  label="To"
                  value={toInputValue(value.comparison.end)}
                  onChange={(v) => setComparisonFromInputs(toInputValue(value.comparison.start), v)}
                />
              </div>
            )}
            {value.comparisonMode === 'previous' && (
              <p className="font-mono text-[11px] text-dash-text-muted">
                {fmtRange(value.comparison)}
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-dash-text px-3 py-1.5 font-ui text-[10px] uppercase tracking-[0.05em] text-dash-text-inverse hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block font-ui text-[10px] uppercase tracking-[0.05em] text-dash-text-muted">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-dash-border bg-dash-surface px-2 py-1 font-mono text-xs text-dash-text focus:border-dash-text-secondary focus:outline-none"
      />
    </label>
  )
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}
