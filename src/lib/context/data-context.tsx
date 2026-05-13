'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { Member, Transaction, Ticket, Clinician, Alert, Rock } from '@/lib/types'
import type { MetaAdRow } from '@/lib/types/meta'
import type { PelagoniaRow } from '@/lib/types/pelagonia'
import type { ManualMetrics } from '@/data/mock/manual-metrics'
import type { SnowflakeExport } from '@/lib/types/snowflake-export'
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

export interface DashboardData {
  members: Member[]
  transactions: Transaction[]
  tickets: Ticket[]
  clinicians: Clinician[]
  metaAds: MetaAdRow[]
  pelagoniaOpportunities: PelagoniaRow[]
  manualMetrics: ManualMetrics
  rocks: Rock[]
  alerts: Alert[]
  isUsingMockData: boolean
  dataMode: DataMode
  lastRefreshed: Record<string, string | null>
}

interface DataContextValue extends DashboardData {
  updateSource: (source: string, data: Partial<DashboardData>) => void
  setLastRefreshed: (source: string, timestamp: string) => void
  resetToDemo: () => void
  switchToActual: () => void
  hasActualData: boolean
  isLoading: boolean
  derivedCAC: number | null
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'tmrw-dashboard-data'

function loadFromStorage(): Partial<DashboardData> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToStorage(data: Partial<DashboardData>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      members: data.members,
      transactions: data.transactions,
      tickets: data.tickets,
      clinicians: data.clinicians,
      metaAds: data.metaAds,
      pelagoniaOpportunities: data.pelagoniaOpportunities,
      lastRefreshed: data.lastRefreshed,
      isUsingMockData: data.isUsingMockData,
      dataMode: data.dataMode,
    }))
  } catch {
    // localStorage full or unavailable
  }
}

// ---------------------------------------------------------------------------
// Default data
// ---------------------------------------------------------------------------

const defaultData: DashboardData = {
  members: [],
  transactions: [],
  tickets: [],
  clinicians: [],
  metaAds: [],
  pelagoniaOpportunities: [],
  manualMetrics: mockManualMetrics,
  rocks: mockRocks,
  alerts: mockAlerts,
  isUsingMockData: false,
  dataMode: 'actual',
  lastRefreshed: {
    tableau: null,
    hubspot: null,
    stripe: null,
    zendesk: null,
    meta: null,
    pelagonia: null,
  },
}

const demoData: DashboardData = {
  members: mockMembers,
  transactions: mockTransactions,
  tickets: mockTickets,
  clinicians: mockClinicians,
  metaAds: [],
  pelagoniaOpportunities: [],
  manualMetrics: mockManualMetrics,
  rocks: mockRocks,
  alerts: mockAlerts,
  isUsingMockData: true,
  dataMode: 'demo',
  lastRefreshed: {
    tableau: '2026-03-05T09:00:00.000Z',
    hubspot: '2026-03-06T14:30:00.000Z',
    stripe: '2026-03-07T06:00:00.000Z',
    zendesk: '2026-03-06T22:15:00.000Z',
    meta: null,
    pelagonia: null,
  },
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Snowflake daily export (dormant until env vars set)
// ---------------------------------------------------------------------------

const SNOWFLAKE_EXPORT_URL = process.env.NEXT_PUBLIC_SNOWFLAKE_EXPORT_URL || null

function mapSnowflakeMember(m: SnowflakeExport['members'][number]): Member {
  return m as unknown as Member
}
function mapSnowflakeTransaction(t: SnowflakeExport['transactions'][number]): Transaction {
  return t as unknown as Transaction
}
function mapSnowflakeTicket(t: SnowflakeExport['tickets'][number]): Ticket {
  return t as unknown as Ticket
}
function mapSnowflakeClinician(c: SnowflakeExport['clinicians'][number]): Clinician {
  return c as unknown as Clinician
}

const DataContext = createContext<DataContextValue>({
  ...defaultData,
  updateSource: () => {},
  setLastRefreshed: () => {},
  resetToDemo: () => {},
  switchToActual: () => {},
  hasActualData: false,
  isLoading: false,
  derivedCAC: null,
})

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData>(defaultData)
  const [isLoading, setIsLoading] = useState(true)

  // Load persisted data on mount — try server first, localStorage fallback
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/data/latest')
        if (res.ok) {
          const sources = await res.json()
          if (sources && Object.keys(sources).length > 0) {
            const updates: Partial<DashboardData> = { isUsingMockData: false, lastRefreshed: {} }
            // Defensive: /api/data/latest now returns canonical row arrays under each
            // source key plus a top-level `lastRefresh` map. Older shape was
            // `{ tableau: { data: [...], timestamp }, ... }`. Coerce both shapes
            // and never let `undefined` reach state arrays (would crash useMemo).
            const refreshMap = (sources.lastRefresh ?? {}) as Record<string, string | null>
            const dataOf = (v: unknown): unknown[] => {
              if (Array.isArray(v)) return v
              if (v && typeof v === 'object' && Array.isArray((v as { data?: unknown }).data)) {
                return (v as { data: unknown[] }).data
              }
              return []
            }
            const tsOf = (k: string, v: unknown): string | null => {
              if (v && typeof v === 'object' && !Array.isArray(v) && 'timestamp' in v) {
                return ((v as { timestamp?: string | null }).timestamp) ?? null
              }
              return refreshMap[k] ?? null
            }
            if (sources.tableau) {
              updates.members = dataOf(sources.tableau) as typeof updates.members
              updates.lastRefreshed!.tableau = tsOf('tableau', sources.tableau)
            }
            if (sources.hubspot) {
              updates.lastRefreshed!.hubspot = tsOf('hubspot', sources.hubspot)
            }
            if (sources.stripe) {
              updates.transactions = dataOf(sources.stripe) as typeof updates.transactions
              updates.lastRefreshed!.stripe = tsOf('stripe', sources.stripe)
            }
            if (sources.zendesk) {
              updates.tickets = dataOf(sources.zendesk) as typeof updates.tickets
              updates.lastRefreshed!.zendesk = tsOf('zendesk', sources.zendesk)
            }
            if (sources.meta) {
              updates.metaAds = dataOf(sources.meta) as typeof updates.metaAds
              updates.lastRefreshed!.meta = tsOf('meta', sources.meta)
            }
            if (sources.pelagonia) {
              updates.pelagoniaOpportunities = dataOf(sources.pelagonia) as typeof updates.pelagoniaOpportunities
              updates.lastRefreshed!.pelagonia = tsOf('pelagonia', sources.pelagonia)
            }
            if (Object.keys(updates.lastRefreshed || {}).length > 0) {
              setData(prev => ({
                ...prev,
                ...updates,
                dataMode: 'actual',
                rocks: prev.rocks,
                alerts: prev.alerts,
                manualMetrics: prev.manualMetrics,
              }))
              setIsLoading(false)
              return
            }
          }
        }
      } catch {
        // Server unavailable — fall through to localStorage
      }

      const stored = loadFromStorage()
      if (stored && !stored.isUsingMockData) {
        setData((prev) => ({
          ...prev,
          ...stored,
          dataMode: 'actual',
          rocks: prev.rocks,
          alerts: prev.alerts,
          manualMetrics: prev.manualMetrics,
        }))
      }
      setIsLoading(false)
    }

    loadData()
  }, [])

  const hasActualData = useMemo(() => {
    // Check in-memory state first — but only count non-null timestamps when
    // the dashboard is actually in "actual" mode (demo mode now ships its own
    // placeholder timestamps for display purposes).
    if (data.dataMode === 'actual' && Object.values(data.lastRefreshed).some(ts => ts !== null)) return true
    // Also check localStorage (actual data is preserved there when switching to demo)
    const stored = loadFromStorage()
    if (stored?.lastRefreshed && stored?.dataMode === 'actual') {
      return Object.values(stored.lastRefreshed).some(ts => ts !== null)
    }
    return false
  }, [data.lastRefreshed, data.dataMode])

  const updateSource = useCallback((source: string, incoming: Partial<DashboardData>) => {
    setData((prev) => {
      const next = {
        ...prev,
        ...incoming,
        isUsingMockData: false,
        dataMode: 'actual' as DataMode,
        lastRefreshed: {
          ...prev.lastRefreshed,
          [source]: new Date().toISOString(),
        },
      }
      saveToStorage(next)
      return next
    })
  }, [])

  const setLastRefreshed = useCallback((source: string, timestamp: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        lastRefreshed: { ...prev.lastRefreshed, [source]: timestamp },
      }
      saveToStorage(next)
      return next
    })
  }, [])

  const resetToDemo = useCallback(() => {
    setData(demoData)
    // Don't clear localStorage — preserve actual data for switching back
  }, [])

  const switchToActual = useCallback(() => {
    const stored = loadFromStorage()
    setData(prev => ({
      ...defaultData,
      ...(stored ?? {}),
      dataMode: 'actual',
      rocks: prev.rocks,
      alerts: prev.alerts,
      manualMetrics: prev.manualMetrics,
    }))
  }, [])

  // Snowflake daily export auto-fetch (dormant until env vars set)
  const fetchSnowflakeExport = useCallback(async () => {
    if (!SNOWFLAKE_EXPORT_URL) return

    try {
      const res = await fetch(SNOWFLAKE_EXPORT_URL, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SNOWFLAKE_TOKEN || ''}`,
        },
      })

      if (!res.ok) throw new Error(`Snowflake fetch failed: ${res.status}`)

      const exported: SnowflakeExport = await res.json()

      const members = exported.members.map(mapSnowflakeMember)
      const transactions = exported.transactions.map(mapSnowflakeTransaction)
      const tickets = exported.tickets.map(mapSnowflakeTicket)
      const clinicians = exported.clinicians.map(mapSnowflakeClinician)

      setData(prev => ({
        ...prev,
        members,
        transactions,
        tickets,
        clinicians,
        isUsingMockData: false,
        dataMode: 'actual',
        lastRefreshed: exported.meta.sourceFreshness,
      }))

      saveToStorage({ members, transactions, tickets, clinicians, lastRefreshed: exported.meta.sourceFreshness, isUsingMockData: false, dataMode: 'actual' })

    } catch (err) {
      console.error('Snowflake export fetch failed:', err)
      // Fall back to localStorage or mock data
    }
  }, [])

  // Auto-fetch on mount if Snowflake URL is configured
  useEffect(() => {
    if (SNOWFLAKE_EXPORT_URL) {
      fetchSnowflakeExport()
    }
  }, [fetchSnowflakeExport])

  // Derived CAC: total Meta spend / new members from HubSpot (fallback to null if either missing)
  const derivedCAC = useMemo((): number | null => {
    const metaAds = data.metaAds ?? []
    const members = data.members ?? []
    if (!metaAds.length || !members.length) return null
    const totalSpend = metaAds.reduce((sum, row) => sum + (row.spend ?? 0), 0)
    const newMembers = members.filter(m => m.type === 'Customer').length
    if (totalSpend === 0 || newMembers === 0) return null
    return Math.round(totalSpend / newMembers)
  }, [data.metaAds, data.members])

  return (
    <DataContext.Provider value={{ ...data, updateSource, setLastRefreshed, resetToDemo, switchToActual, hasActualData, isLoading, derivedCAC }}>
      {children}
    </DataContext.Provider>
  )
}

export function useDashboardData() {
  return useContext(DataContext)
}
