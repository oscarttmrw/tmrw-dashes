'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { Member, Transaction, Ticket, Clinician, Alert, Rock } from '@/lib/types'
import type { MetaAdRow } from '@/lib/types/meta'
import type { PelagoniaRow } from '@/lib/types/pelagonia'
import type { ManualMetrics } from '@/data/mock/manual-metrics'
import type { PosthogManualValues } from '@/lib/types/posthog-manual'
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

// Canonical row shapes returned by /api/data/latest. Typed as unknown-records
// here because the dashboard pages haven't been migrated to consume canonical
// columns yet (that's PR 3 / future work).
export type CanonicalRow = Record<string, unknown>

export interface DashboardData {
  // Legacy domain-shaped arrays — still exposed so existing pages don't crash.
  // Populated only from demo mode; in 'actual' mode they remain empty until a
  // future PR maps canonical rows to these shapes.
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

  // Canonical Supabase row arrays — the source of truth going forward.
  meta: CanonicalRow[]
  stripe: CanonicalRow[]
  hubspot: CanonicalRow[]
  pelagonia: CanonicalRow[]
  tableau: CanonicalRow[]
  zendesk: CanonicalRow[]

  lastRefresh: Record<string, string | null>
  // Legacy alias for code that still references `lastRefreshed`.
  lastRefreshed: Record<string, string | null>

  // Manual operator-entered numbers (sourced from PostHog dashboards).
  // Override the derived counts on dashboard tiles when present.
  posthogManual: PosthogManualValues
}

interface DataContextValue extends DashboardData {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  resetToDemo: () => void
  switchToActual: () => void
  hasActualData: boolean
  derivedCAC: number | null
  savePosthogManual: (values: {
    registrations: number | null
    churnedMembers: number | null
    totalCasebook: number | null
  }) => Promise<void>
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const emptyLastRefresh: Record<string, string | null> = {
  meta: null,
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
  metaAds: [],
  pelagoniaOpportunities: [],
  manualMetrics: mockManualMetrics,
  rocks: mockRocks,
  alerts: mockAlerts,
  isUsingMockData: false,
  dataMode: 'actual',
  meta: [],
  stripe: [],
  hubspot: [],
  pelagonia: [],
  tableau: [],
  zendesk: [],
  lastRefresh: { ...emptyLastRefresh },
  lastRefreshed: { ...emptyLastRefresh },
  posthogManual: {
    registrations: null,
    churnedMembers: null,
    totalCasebook: null,
    uploadedAt: null,
  },
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
    meta: null,
    pelagonia: null,
  },
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

const DataContext = createContext<DataContextValue>({
  ...defaultData,
  loading: false,
  error: null,
  refresh: async () => {},
  resetToDemo: () => {},
  switchToActual: () => {},
  hasActualData: false,
  derivedCAC: null,
  savePosthogManual: async () => {},
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
      const [latestRes, posthogRes] = await Promise.all([
        fetch('/api/data/latest', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/posthog-manual', { credentials: 'include', cache: 'no-store' }),
      ])
      if (!latestRes.ok) throw new Error(`Status ${latestRes.status}`)
      const body = await latestRes.json()
      const lastRefresh = {
        ...emptyLastRefresh,
        ...((body.lastRefresh as Record<string, string | null> | undefined) ?? {}),
      }
      const posthogManual: PosthogManualValues = posthogRes.ok
        ? await posthogRes.json()
        : { registrations: null, churnedMembers: null, totalCasebook: null, uploadedAt: null }
      setData(prev => ({
        ...prev,
        // Preserve demo-only arrays if user explicitly switched to demo.
        isUsingMockData: false,
        dataMode: 'actual',
        meta: asRows(body.meta),
        stripe: asRows(body.stripe),
        hubspot: asRows(body.hubspot),
        pelagonia: asRows(body.pelagonia),
        tableau: asRows(body.tableau),
        zendesk: asRows(body.zendesk),
        lastRefresh,
        lastRefreshed: lastRefresh,
        posthogManual,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const savePosthogManual = useCallback(async (values: {
    registrations: number | null
    churnedMembers: number | null
    totalCasebook: number | null
  }) => {
    const res = await fetch('/api/posthog-manual', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to save (${res.status}) ${text}`)
    }
    const body = await res.json()
    if (body?.values) {
      setData(prev => ({ ...prev, posthogManual: body.values as PosthogManualValues }))
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

  // Derived CAC: total Meta spend / new members from HubSpot.
  // In 'actual' mode both arrays are empty until canonical→domain mapping
  // lands, so this returns null. In demo mode it uses the seeded mocks.
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
        savePosthogManual,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useDashboardData() {
  return useContext(DataContext)
}
