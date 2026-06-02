'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  defaultDateRangePicker,
  type DateRangePickerValue,
} from '@/components/dashboard/date-range-picker'

/**
 * Tool-wide date filter. Lifted out of the individual pages so that changing
 * the range on one page (Dashboard / Marketing / Financial) carries across to
 * the others. Persisted to localStorage so it survives navigation + reloads.
 */
interface FilterContextValue {
  value: DateRangePickerValue
  setValue: (value: DateRangePickerValue) => void
}

const FilterContext = createContext<FilterContextValue | null>(null)

const STORAGE_KEY = 'tmrw.dateFilter.v1'

// Dates don't survive JSON.stringify as Dates, so serialize to ISO + revive.
function serialize(v: DateRangePickerValue): string {
  return JSON.stringify({
    period: { start: v.period.start.toISOString(), end: v.period.end.toISOString() },
    comparison: { start: v.comparison.start.toISOString(), end: v.comparison.end.toISOString() },
    comparisonMode: v.comparisonMode,
  })
}

function revive(raw: string): DateRangePickerValue | null {
  try {
    const o = JSON.parse(raw)
    if (!o?.period?.start || !o?.period?.end || !o?.comparison?.start || !o?.comparison?.end) return null
    const d = (s: string) => {
      const date = new Date(s)
      return isNaN(date.getTime()) ? null : date
    }
    const ps = d(o.period.start), pe = d(o.period.end), cs = d(o.comparison.start), ce = d(o.comparison.end)
    if (!ps || !pe || !cs || !ce) return null
    return {
      period: { start: ps, end: pe },
      comparison: { start: cs, end: ce },
      comparisonMode: o.comparisonMode === 'custom' ? 'custom' : 'previous',
    }
  } catch {
    return null
  }
}

export function FilterProvider({ children }: { children: ReactNode }) {
  // Start from the default so server + first client render match; hydrate from
  // localStorage in an effect (after mount) to avoid an SSR hydration mismatch.
  const [value, setValueState] = useState<DateRangePickerValue>(() => defaultDateRangePicker())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const revived = revive(raw)
        if (revived) setValueState(revived)
      }
    } catch {
      /* localStorage unavailable — fall back to default */
    }
  }, [])

  const setValue = useCallback((v: DateRangePickerValue) => {
    setValueState(v)
    try {
      localStorage.setItem(STORAGE_KEY, serialize(v))
    } catch {
      /* ignore persistence failures */
    }
  }, [])

  return <FilterContext.Provider value={{ value, setValue }}>{children}</FilterContext.Provider>
}

export function useDateFilter(): FilterContextValue {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useDateFilter must be used within a FilterProvider')
  return ctx
}
