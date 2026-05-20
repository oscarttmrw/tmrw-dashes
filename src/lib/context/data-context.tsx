'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { Member, Transaction, Ticket, Clinician, Alert, Rock } from '@/lib/types'
import type { PelagoniaRow } from '@/lib/types/pelagonia'
import type { ManualMetrics } from '@/data/mock/manual-metrics'
import {
  mockMembers,
  mockTransactions,
  mockTickets,
  mockClinicians,
  mockAlerts,
  mockRocks,
  mockManualMetrics,
} from '@/data/mock'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataMode = 'demo' | 'actual'

export type CanonicalRow = Record<string, unknown>

export interface DashboardData {
  // Legacy domain-shaped arrays — still exposed so existing pages don't crash.
  members: Member[]
  transactions: Transaction[]
  tickets: Ticket[]
  clinicians: Clinician[]
  pelagoniaOpportunities: PelagoniaRow[]
  manualMetrics: ManualMetrics
  rocks: Rock[]
  alerts: Alert[]
  isUsingMockData: boolean
  dataMode: DataMode

  // Canonical Supabase row arrays — source of truth.
  metaAds: CanonicalRow[]
  socialFollowers: CanonicalRow[]
  socialViews: CanonicalRow[]
  stripe: CanonicalRow[]
  hubspot: CanonicalRow[]
  pelagonia: CanonicalRow[]
  tableau: CanonicalRow[]
  zendesk: CanonicalRow[]

  lastRefresh: Record<string, string | null>
  lastRefreshed: Record<string, string | null>
}

interface DataContextValue extends DashboardData {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  resetToDemo: () => void
  switchToActual: () => void
  hasActualData: boolean
  derivedCAC: number | null
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const emptyLastRefresh: Record<string, string | null> = {
  metaAds: null,
  socialFollowers: null,
  socialViews: null,
  stripe: null,
  hubspot: null,
  pelagonia: null,
  tableau: null,
  zendesk: null,
}

const defaultData: DashboardData = {
  members: [],
  transactions: [],
  tickets: [],
  clinicians: [],
  pelagoniaOpportunities: [],
  manualMetrics: mockManualMetrics,
  rocks: mockRocks,
  alerts: mockAlerts,
  isUsingMockData: false,
  dataMode: 'actual',
  metaAds: [],
  socialFollowers: [],
  socialViews: [],
  stripe: [],
  hubspot: [],
  pelagonia: [],
  tableau: [],
  zendesk: [],
  lastRefresh: { ...emptyLastRefresh },
  lastRefreshed: { ...emptyLastRefresh },
}

const demoData: DashboardData = {
  ...defaultData,
  members: mockMembers,
  transactions: mockTransactions,
  tickets: mockTickets,
  clinicians: mockClinicians,
  isUsingMockData: true,
  dataMode: 'demo',
  lastRefresh: {
    tableau: '2026-03-05T09:00:00.000Z',
    hubspot: '2026-03-06T14:30:00.000Z',
    stripe: '2026-03-07T06:00:00.000Z',
    zendesk: '2026-03-06T22:15:00.000Z',
    metaAds: null,
    socialFollowers: null,
    socialViews: null,
    pelagonia: null,
  },
  lastRefreshed: {
    tableau: '2026-03-05T09:00:00.000Z',
    hubspot: '2026-03-06T14:30:00.000Z',
    stripe: '2026-03-07T06:00:00.000Z',
    zendesk: '2026-03-06T22:15:00.000Z',
    metaAds: null,
    socialFollowers: null,
    socialViews: null,
    pelagonia: null,
  },
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DataContext = createContext<DataContextValue>({
  ...defaultData,
  loading: false,
  error: null,
  refresh: async () => {},
  resetToDemo: () => {},
  switchToActual: () => {},
  hasActualData: false,
  derivedCAC: null,
})

function asRows(v: unknown): CanonicalRow[] {
  return Array.isArray(v) ? (v as CanonicalRow[]) : []
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>(defaultData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/data/latest', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const body = await res.json()
      const lastRefresh = {
        ...emptyLastRefresh,
        ...((body.lastRefresh as Record<string, string | null> | undefined) ?? {}),
      }
      setData(prev => ({
        ...prev,
        isUsingMockData: false,
        dataMode: 'actual',
        metaAds: asRows(body.metaAds),
        socialFollowers: asRows(body.socialFollowers),
        socialViews: asRows(body.socialViews),
        stripe: asRows(body.stripe),
        hubspot: asRows(body.hubspot),
        pelagonia: asRows(body.pelagonia),
        tableau: asRows(body.tableau),
        zendesk: asRows(body.zendesk),
        lastRefresh,
        lastRefreshed: lastRefresh,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const hasActualData = useMemo(() => {
    if (data.dataMode !== 'actual') return false
    return Object.values(data.lastRefresh).some(ts => ts !== null)
  }, [data.lastRefresh, data.dataMode])

  const resetToDemo = useCallback(() => {
    setData(demoData)
  }, [])

  const switchToActual = useCallback(() => {
    setData(defaultData)
    refresh()
  }, [refresh])

  const derivedCAC = useMemo((): number | null => {
    const metaAds = data.metaAds ?? []
    const hubspot = data.hubspot ?? []
    if (!metaAds.length) return null
    const totalSpend = metaAds.reduce(
      (sum, row) => sum + (typeof row.spend === 'number' ? row.spend : Number(row.spend) || 0),
      0
    )
    const newCustomers = hubspot.filter(r =>
      String(r.record_type ?? '').toLowerCase() === 'customer'
    ).length
    if (totalSpend === 0 || newCustomers === 0) return null
    return Math.round(totalSpend / newCustomers)
  }, [data.metaAds, data.hubspot])

  return (
    <DataContext.Provider
      value={{
        ...data,
        loading,
        error,
        refresh,
        resetToDemo,
        switchToActual,
        hasActualData,
        derivedCAC,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useDashboardData() {
  return useContext(DataContext)
}
