'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import {
  type DateRange,
  atDayStart,
  atDayEnd,
  dayCount,
  samePeriodLastMonth,
  samePeriodLastYear,
  weekToDate,
  fullWeek,
} from '@/lib/utils/period'

// DateRange now lives in lib/utils/period so server-safe utils can use it without
// importing this client component. Re-exported here so existing call sites keep
// working unchanged.
export type { DateRange }

/** How the comparison window is derived from the selected period. */
export type ComparisonMode =
  | 'previous'
  | 'same-period-last-month'
  | 'same-period-last-year'
  | 'custom'

export interface DateRangePickerValue {
  /** Primary period currently displayed in tiles + charts. */
  period: DateRange
  /** Comparison period. Tiles compute delta against this. */
  comparison: DateRange
  /** How `comparison` was derived. 'custom' = user-picked. */
  comparisonMode: ComparisonMode
}

/** Derive the comparison window for a period under a given mode. */
export function comparisonFor(period: DateRange, mode: ComparisonMode, current?: DateRange): DateRange {
  switch (mode) {
    case 'previous': return previousPeriod(period)
    case 'same-period-last-month': return samePeriodLastMonth(period)
    case 'same-period-last-year': return samePeriodLastYear(period)
    case 'custom': return current ?? previousPeriod(period)
  }
}

interface Props {
  value: DateRangePickerValue
  onChange: (value: DateRangePickerValue) => void
  className?: string
}

/* ─── Presets ──────────────────────────────────────────────────────── */

export type PresetKey =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'last-7'
  | 'last-14'
  | 'last-28'
  | 'last-30'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'last-quarter'
  | 'last-90'
  | 'all-time'
  | 'custom'

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this-week', label: 'This week (WTD)' },
  { key: 'last-week', label: 'Last week' },
  { key: 'last-7', label: 'Last 7 days' },
  { key: 'last-14', label: 'Last 14 days' },
  { key: 'last-28', label: 'Last 28 days' },
  { key: 'last-30', label: 'Last 30 days' },
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'this-quarter', label: 'This quarter' },
  { key: 'last-quarter', label: 'Last quarter' },
  { key: 'last-90', label: 'Last 90 days' },
  { key: 'all-time', label: 'All time' },
  { key: 'custom', label: 'Custom' },
]

export function presetToRange(preset: PresetKey, today = new Date()): DateRange {
  switch (preset) {
    case 'today':
      return { start: atDayStart(today), end: atDayEnd(today) }
    case 'yesterday': {
      const d = new Date(today)
      d.setDate(today.getDate() - 1)
      return { start: atDayStart(d), end: atDayEnd(d) }
    }
    case 'this-week':
      return weekToDate(today)
    case 'last-week': {
      const d = new Date(today)
      d.setDate(today.getDate() - 7)
      return fullWeek(d)
    }
    case 'last-7':  return shiftedDays(today, 6)
    case 'last-14': return shiftedDays(today, 13)
    case 'last-28': return shiftedDays(today, 27)
    case 'last-30': return shiftedDays(today, 29)
    case 'last-90': return shiftedDays(today, 89)
    case 'this-month':
      return {
        start: atDayStart(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: atDayEnd(today),
      }
    case 'last-month':
      return {
        start: atDayStart(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        end: atDayEnd(new Date(today.getFullYear(), today.getMonth(), 0)),
      }
    case 'this-quarter': {
      const q = Math.floor(today.getMonth() / 3)
      return {
        start: atDayStart(new Date(today.getFullYear(), q * 3, 1)),
        end: atDayEnd(today),
      }
    }
    case 'last-quarter': {
      const q = Math.floor(today.getMonth() / 3)
      const lastQStartMonth = (q - 1) * 3
      const y = lastQStartMonth < 0 ? today.getFullYear() - 1 : today.getFullYear()
      const m = ((lastQStartMonth % 12) + 12) % 12
      return {
        start: atDayStart(new Date(y, m, 1)),
        end: atDayEnd(new Date(y, m + 3, 0)),
      }
    }
    case 'all-time':
      // Reasonable lower bound — predates all TMRW data.
      return { start: atDayStart(new Date(2024, 0, 1)), end: atDayEnd(today) }
    case 'custom':
      return { start: atDayStart(today), end: atDayEnd(today) }
  }
}

function shiftedDays(today: Date, daysBack: number): DateRange {
  const start = new Date(today)
  start.setDate(today.getDate() - daysBack)
  return { start: atDayStart(start), end: atDayEnd(today) }
}

/** Previous period for comparison. See PR C.5 — month-aligned ranges get a
 * calendar-month shift; everything else gets equal-length shifted back. */
export function previousPeriod(period: DateRange): DateRange {
  const monthAligned =
    period.start.getDate() === 1
    && period.start.getFullYear() === period.end.getFullYear()
    && period.start.getMonth() === period.end.getMonth()

  if (monthAligned) {
    const y = period.start.getFullYear()
    const m = period.start.getMonth()
    const prevMonthLastDay = new Date(y, m, 0).getDate()
    const prevEndDay = Math.min(period.end.getDate(), prevMonthLastDay)
    return {
      start: atDayStart(new Date(y, m - 1, 1)),
      end: atDayEnd(new Date(y, m - 1, prevEndDay)),
    }
  }

  const lengthMs = period.end.getTime() - period.start.getTime()
  const end = new Date(period.start.getTime() - 1)
  const start = new Date(end.getTime() - lengthMs)
  return { start: atDayStart(start), end: atDayEnd(end) }
}

const COMPARISON_MODES: { key: ComparisonMode; label: string }[] = [
  { key: 'previous', label: 'Previous period' },
  { key: 'same-period-last-month', label: 'Same period last month' },
  { key: 'same-period-last-year', label: 'Same period last year' },
  { key: 'custom', label: 'Custom range' },
]

export function defaultDateRangePicker(): DateRangePickerValue {
  const period = presetToRange('this-month')
  return {
    period,
    comparison: previousPeriod(period),
    comparisonMode: 'previous',
  }
}

/**
 * Default for pages whose headline question is "how does this window compare with
 * the same window last month" — Dan's Zendesk report and the weekly marketing
 * table both read that way.
 */
export function defaultDateRangePickerSPLM(period = presetToRange('this-month')): DateRangePickerValue {
  return {
    period,
    comparison: samePeriodLastMonth(period),
    comparisonMode: 'same-period-last-month',
  }
}

/* ─── Formatting ───────────────────────────────────────────────────── */

function fmtRangeShort(r: DateRange): string {
  const optsMD: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const optsYear: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const sameYear = r.start.getFullYear() === r.end.getFullYear()
  return `${r.start.toLocaleDateString('en-AU', optsMD)} – ${r.end.toLocaleDateString('en-AU', sameYear ? optsMD : optsYear)}, ${r.end.getFullYear()}`
}

function fmtRangeArrow(r: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${r.start.toLocaleDateString('en-AU', opts)} → ${r.end.toLocaleDateString('en-AU', opts)}`
}

function dayCountLabel(r: DateRange): string {
  const n = dayCount(r)
  if (n === 1) return '1D'
  return `${n}D`
}

function toInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromInputValue(s: string, endOfDay = false): Date {
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return new Date(NaN)
  return endOfDay ? atDayEnd(new Date(y, m - 1, d)) : atDayStart(new Date(y, m - 1, d))
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/* ─── Component ────────────────────────────────────────────────────── */

type Tab = 'period' | 'compare'

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('period')
  // Draft state — Apply commits to parent, Cancel discards.
  const [draft, setDraft] = useState<DateRangePickerValue>(value)
  const rootRef = useRef<HTMLDivElement>(null)

  // Reset draft to current value whenever the picker opens.
  useEffect(() => {
    if (open) {
      setDraft(value)
      setTab('period')
    }
  }, [open, value])

  // Close on outside click.
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

  // Which preset (if any) matches the draft's period — for highlighting.
  const activePreset: PresetKey = useMemo(() => {
    for (const p of PRESETS) {
      if (p.key === 'custom') continue
      const r = presetToRange(p.key)
      if (sameDay(r.start, draft.period.start) && sameDay(r.end, draft.period.end)) return p.key
    }
    return 'custom'
  }, [draft.period])

  const selectPreset = (preset: PresetKey) => {
    if (preset === 'custom') return
    const period = presetToRange(preset)
    setDraft(d => ({
      ...d,
      period,
      comparison: comparisonFor(period, d.comparisonMode, d.comparison),
    }))
  }

  const setPeriodFromInputs = (startStr: string, endStr: string) => {
    const start = fromInputValue(startStr)
    const end = fromInputValue(endStr, true)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return
    const period: DateRange = { start, end }
    setDraft(d => ({
      ...d,
      period,
      comparison: comparisonFor(period, d.comparisonMode, d.comparison),
    }))
  }

  const setComparisonMode = (mode: ComparisonMode) => {
    setDraft(d => ({
      ...d,
      comparisonMode: mode,
      comparison: comparisonFor(d.period, mode, d.comparison),
    }))
  }

  const setComparisonFromInputs = (startStr: string, endStr: string) => {
    const start = fromInputValue(startStr)
    const end = fromInputValue(endStr, true)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return
    setDraft(d => ({ ...d, comparison: { start, end } }))
  }

  const handleApply = () => {
    onChange(draft)
    setOpen(false)
  }
  const handleCancel = () => setOpen(false)

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2.5 rounded-full bg-dash-text px-4 py-2 text-white transition-colors',
          'hover:bg-dash-text/90'
        )}
      >
        <Calendar size={14} className="text-white/80" />
        <span className="font-mono text-xs">{fmtRangeShort(value.period)}</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 font-ui text-[10px] uppercase tracking-[0.05em] text-white/90">
          {dayCountLabel(value.period)}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[40rem] max-w-[calc(100vw-2rem)] rounded-lg border border-dash-border bg-dash-bg shadow-xl">
          {/* Tabs */}
          <div className="flex border-b border-dash-border">
            <TabButton active={tab === 'period'} onClick={() => setTab('period')}>
              Date range
            </TabButton>
            <TabButton active={tab === 'compare'} onClick={() => setTab('compare')}>
              Compare
            </TabButton>
          </div>

          {/* Body — two columns */}
          <div className="grid grid-cols-[14rem_1fr] gap-0">
            {/* Left — preset list */}
            <div className="border-r border-dash-border py-2">
              {PRESETS.map(p => {
                const active = (tab === 'period' && activePreset === p.key)
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => selectPreset(p.key)}
                    disabled={tab === 'compare' && draft.comparisonMode === 'previous'}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-2 text-left font-sans text-sm transition-colors',
                      active ? 'border-l-2 border-dash-red bg-dash-red/5 pl-[14px] font-medium text-dash-red'
                             : 'text-dash-text hover:bg-dash-surface-hover',
                      tab === 'compare' && draft.comparisonMode === 'previous' && 'opacity-40'
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            {/* Right — date inputs + summary */}
            <div className="p-5">
              {tab === 'period' && (
                <PeriodEditor
                  range={draft.period}
                  onChange={setPeriodFromInputs}
                />
              )}

              {tab === 'compare' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {COMPARISON_MODES.map(m => (
                      <ModeButton
                        key={m.key}
                        active={draft.comparisonMode === m.key}
                        onClick={() => setComparisonMode(m.key)}
                      >
                        {m.label}
                      </ModeButton>
                    ))}
                  </div>

                  {draft.comparisonMode === 'custom' ? (
                    <PeriodEditor
                      range={draft.comparison}
                      onChange={setComparisonFromInputs}
                    />
                  ) : (
                    <div>
                      <p className="font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
                        Auto — {COMPARISON_MODES.find(m => m.key === draft.comparisonMode)?.label.toLowerCase()}
                      </p>
                      <p className="mt-2 font-mono text-sm text-dash-text">{fmtRangeArrow(draft.comparison)}</p>
                      <p className="mt-1 font-mono text-[11px] text-dash-text-muted">{dayCount(draft.comparison)} days</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-dash-border px-5 py-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-dash-border px-5 py-1.5 font-ui text-[11px] uppercase tracking-[0.05em] text-dash-text-secondary transition-colors hover:bg-dash-surface-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-full bg-dash-text px-5 py-1.5 font-ui text-[11px] uppercase tracking-[0.05em] text-white transition-colors hover:bg-dash-text/90"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 border-b-2 px-6 py-3 font-ui text-[11px] uppercase tracking-[0.06em] transition-colors',
        active
          ? 'border-dash-text text-dash-text'
          : 'border-transparent text-dash-text-muted hover:text-dash-text'
      )}
    >
      {children}
    </button>
  )
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 font-ui text-[10px] uppercase tracking-[0.05em] transition-colors',
        active
          ? 'bg-dash-text text-white'
          : 'border border-dash-border bg-dash-surface text-dash-text-secondary hover:border-dash-text-muted hover:text-dash-text'
      )}
    >
      {children}
    </button>
  )
}

function PeriodEditor({ range, onChange }: { range: DateRange; onChange: (start: string, end: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">Start date</label>
        <input
          type="date"
          value={toInputValue(range.start)}
          onChange={(e) => onChange(e.target.value, toInputValue(range.end))}
          className="mt-1.5 w-full rounded-md border border-dash-border bg-dash-surface px-3 py-2 font-mono text-sm text-dash-text focus:border-dash-text-secondary focus:outline-none"
        />
      </div>
      <div>
        <label className="block font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">End date</label>
        <input
          type="date"
          value={toInputValue(range.end)}
          onChange={(e) => onChange(toInputValue(range.start), e.target.value)}
          className="mt-1.5 w-full rounded-md border border-dash-border bg-dash-surface px-3 py-2 font-mono text-sm text-dash-text focus:border-dash-text-secondary focus:outline-none"
        />
      </div>
      <div className="border-t border-dash-border pt-3">
        <p className="font-ui text-[10px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">Selected</p>
        <p className="mt-1.5 font-mono text-sm text-dash-text">{fmtRangeArrow(range)}</p>
        <p className="mt-0.5 font-mono text-[11px] text-dash-text-muted">{dayCount(range)} days</p>
      </div>
    </div>
  )
}
