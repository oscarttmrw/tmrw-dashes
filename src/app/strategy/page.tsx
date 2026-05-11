'use client'

import { useState, useEffect, useCallback } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { StatusDot } from '@/components/dashboard/status-dot'
import { Sparkline } from '@/components/dashboard/sparkline'
import { useDashboardData } from '@/lib/context/data-context'
import {
  mockQuestions,
  mockStrategicBets,
  mockPostureChoices,
  mockDestinationTable,
} from '@/data/mock'
import type { Status } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const metricLabels: Record<string, string> = {
  'biomarker-improvement': 'Biomarker Improvement Rate',
  'bio-age-delta': 'Bio Age Delta',
  'new-member-capacity': 'New Member Capacity/Month',
  'treatment-journey-conversion': 'Treatment Journey Conversion',
  csat: 'CSAT',
  'monthly-churn': 'Monthly Churn',
  'channel-partners': 'Channel Partners',
  'corporate-partners': 'Corporate Partners',
  'reg-to-dashboard': 'Reg→Dashboard',
  'members-per-clinical-fte': 'Members/Clinical FTE',
  'blended-cac': 'Blended CAC',
  'cm-per-member': 'CM/Member',
}

const metricFormats: Record<string, { prefix?: string; suffix?: string }> = {
  'blended-cac': { prefix: '$' },
  'cm-per-member': { prefix: '$' },
  'reg-to-dashboard': { suffix: 'd' },
  csat: { suffix: '%' },
  'monthly-churn': { suffix: '%' },
}

function formatMetricValue(id: string, value: number | string | null): string {
  if (value === null || value === 'TBC') return 'TBC'
  const fmt = metricFormats[id]
  if (!fmt) return String(value)
  return `${fmt.prefix ?? ''}${value}${fmt.suffix ?? ''}`
}

function formatTarget(id: string, target: number | string | null): string | null {
  if (target === null) return null
  const fmt = metricFormats[id]
  if (!fmt) return String(target)
  return `${fmt.prefix ?? ''}${target}${fmt.suffix ?? ''}`
}

const areaLinks: Record<string, { label: string; href: string }> = {
  clinical: { label: 'Clinical', href: '/clinical' },
  members: { label: 'Members', href: '/members' },
  support: { label: 'Support', href: '/support' },
  financial: { label: 'Financial', href: '/financial' },
  marketing: { label: 'Marketing', href: '/marketing' },
  strategy: { label: 'Strategy (manual)', href: '/strategy' },
}

const statusRowBg: Record<Status, string> = {
  red: 'bg-status-red-light',
  amber: 'bg-status-amber-light',
  green: 'bg-dash-surface/50',
  grey: 'bg-dash-surface/50',
}

// 12-week sparkline scores per strategic question (1-indexed by question number)
const weeklyScores: Record<number, number[]> = {
  1: [55, 58, 54, 60, 62, 59, 63, 65, 68, 67, 70, 72],
  2: [40, 42, 38, 45, 43, 47, 50, 48, 52, 55, 54, 57],
  3: [70, 72, 71, 68, 65, 67, 69, 72, 74, 76, 75, 78],
  4: [30, 32, 35, 38, 40, 42, 44, 45, 48, 50, 52, 55],
  5: [60, 58, 55, 57, 60, 62, 65, 63, 66, 68, 70, 72],
}

// Last activity timestamps for strategic bets (ISO strings)
const betLastActivity: Record<number, string> = {
  1: '2026-02-28',
  2: '2026-01-15',
  3: '2026-03-01',
}

// Position mapping for posture slider
const positionMap: Record<string, number> = {
  'decided-left': 15,
  'leaning-left': 30,
  open: 50,
  'leaning-right': 70,
  'decided-right': 85,
}

const positionValues = ['decided-left', 'leaning-left', 'open', 'leaning-right', 'decided-right'] as const

const POSTURE_STORAGE_KEY = 'strategy-posture-positions'

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function StrategyPage() {
  // Use context data (available but strategy page uses mostly mock strategy data)
  useDashboardData()

  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set([1, 2, 3, 4, 5])
  )
  const [expandedBets, setExpandedBets] = useState<Set<number>>(new Set())

  // Posture slider state
  const [posturePositions, setPosturePositions] = useState<Record<string, { position: string; updatedAt: string }>>({})
  const [postureLoaded, setPostureLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(POSTURE_STORAGE_KEY)
      if (raw) setPosturePositions(JSON.parse(raw))
    } catch {
      // ignore
    }
    setPostureLoaded(true)
  }, [])

  useEffect(() => {
    if (!postureLoaded) return
    try {
      localStorage.setItem(POSTURE_STORAGE_KEY, JSON.stringify(posturePositions))
    } catch {
      // ignore
    }
  }, [posturePositions, postureLoaded])

  function toggleQuestion(n: number) {
    setExpandedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  function toggleBet(n: number) {
    setExpandedBets((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const updatePosture = useCallback((id: string, newPosition: string) => {
    setPosturePositions((prev) => ({
      ...prev,
      [id]: { position: newPosition, updatedAt: new Date().toISOString() },
    }))
  }, [])

  // Group destination rows by category
  const destinationCategories: { category: string; rows: typeof mockDestinationTable }[] = []
  const seen = new Set<string>()
  for (const row of mockDestinationTable) {
    if (!seen.has(row.category)) {
      seen.add(row.category)
      destinationCategories.push({
        category: row.category,
        rows: mockDestinationTable.filter((r) => r.category === row.category),
      })
    }
  }

  const now = new Date()

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Strategy' }]} />

      {/* ================================================================= */}
      {/* A. Five Strategic Questions                                        */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-6 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Five Strategic Questions
        </h2>

        <div className="divide-y divide-dash-border rounded-lg border border-dash-border">
          {mockQuestions.map((q) => {
            const isOpen = expandedQuestions.has(q.number)
            const sparkData = weeklyScores[q.number] ?? []
            return (
              <div key={q.id} className="bg-dash-surface">
                {/* Header row */}
                <button
                  onClick={() => toggleQuestion(q.number)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-dash-surface/80"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dash-border text-xs font-semibold text-dash-text">
                    {q.number}
                  </span>
                  <span className="flex-1 font-sans text-sm font-semibold text-dash-text">
                    {q.text}
                  </span>
                  {/* 12-week sparkline */}
                  {sparkData.length > 1 && (
                    <span className="hidden shrink-0 sm:inline-block">
                      <Sparkline data={sparkData} width={80} height={24} />
                    </span>
                  )}
                  <StatusDot status={q.status} />
                  <svg
                    className={`h-4 w-4 shrink-0 text-dash-text-muted transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="space-y-5 px-5 pb-5">
                    {/* Framing */}
                    <p className="text-sm leading-relaxed text-dash-text-secondary">
                      {q.framing}
                    </p>

                    {/* Primary metrics */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {q.primaryMetrics.map((m) => (
                        <MetricCard
                          key={m.metricId}
                          label={metricLabels[m.metricId] || m.metricId}
                          value={formatMetricValue(m.metricId, m.current)}
                          target={formatTarget(m.metricId, m.target)}
                          status={m.status}
                          trend={m.trend}
                          sparkline={m.sparkline.length > 1 ? m.sparkline : undefined}
                        />
                      ))}
                    </div>

                    {/* Secondary metrics (e.g. Q2) */}
                    {q.secondaryMetrics.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {q.secondaryMetrics.map((m) => (
                          <MetricCard
                            key={m.metricId}
                            label={metricLabels[m.metricId] || m.metricId}
                            value={formatMetricValue(m.metricId, m.current)}
                            target={formatTarget(m.metricId, m.target)}
                            status={m.status}
                            trend={m.trend}
                            sparkline={m.sparkline.length > 1 ? m.sparkline : undefined}
                          />
                        ))}
                      </div>
                    )}

                    {/* What Has To Be True */}
                    <div>
                      <h4 className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
                        What Has To Be True
                      </h4>
                      <ul className="space-y-1">
                        {q.whatHasToBeTrueItems.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-dash-text-secondary"
                          >
                            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-dash-text-muted" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Functional area links */}
                    <div className="flex items-center gap-2">
                      {q.functionalAreas.map((area) => {
                        const link = areaLinks[area]
                        if (!link) return null
                        return (
                          <a
                            key={area}
                            href={link.href}
                            className="text-xs text-dash-red hover:underline"
                          >
                            &rarr; {link.label}
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* B. Destination Table                                               */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Destination Table
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Category</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Metric</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Now</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">
                  Jun Target
                </th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">
                  Dec Target
                </th>
                <th className="px-4 py-3 text-center font-medium text-dash-text-secondary">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {destinationCategories.map((group) =>
                group.rows.map((row, idx) => (
                  <tr key={`${row.category}-${row.metric}`} className={statusRowBg[row.status]}>
                    {idx === 0 ? (
                      <td
                        rowSpan={group.rows.length}
                        className="border-r border-dash-border px-4 py-2 align-top font-medium text-dash-text"
                      >
                        {row.category}
                      </td>
                    ) : null}
                    <td className="px-4 py-2 text-dash-text">{row.metric}</td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text">{row.now}</td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text-muted">
                      {row.jun}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-dash-text-muted">
                      {row.dec}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusDot status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* C. Strategic Bets                                                  */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Strategic Bets
        </h2>
        <div className="space-y-3">
          {mockStrategicBets.map((bet) => {
            const isOpen = expandedBets.has(bet.number)
            const lastActivityISO = betLastActivity[bet.number]
            const lastActivityDate = lastActivityISO ? new Date(lastActivityISO) : null
            const daysSince = lastActivityDate ? daysBetween(now, lastActivityDate) : 0
            const isStale = daysSince > 42
            return (
              <div
                key={bet.id}
                className={`rounded-lg border bg-dash-surface ${
                  isStale ? 'border-status-amber border-2' : 'border-dash-border'
                }`}
              >
                <button
                  onClick={() => toggleBet(bet.number)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-dash-surface/80"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dash-border text-xs font-semibold text-dash-text">
                    {bet.number}
                  </span>
                  <span className="flex-1 font-sans text-sm font-semibold text-dash-text">
                    {bet.title}
                  </span>
                  {/* Last Activity indicator */}
                  {lastActivityDate && (
                    <span className={`shrink-0 text-[11px] ${isStale ? 'font-semibold text-status-amber' : 'text-dash-text-muted'}`}>
                      Last activity: {formatShortDate(lastActivityISO)}
                      {isStale && ' (stale)'}
                    </span>
                  )}
                  <svg
                    className={`h-4 w-4 shrink-0 text-dash-text-muted transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="space-y-4 px-5 pb-5">
                    {isStale && (
                      <div className="rounded border border-status-amber bg-status-amber/10 px-3 py-2 text-xs font-medium text-status-amber">
                        This bet has had no activity for {daysSince} days. Consider reviewing or archiving.
                      </div>
                    )}

                    <p className="text-sm leading-relaxed text-dash-text-secondary">
                      {bet.description}
                    </p>

                    {/* Proof conditions */}
                    <div>
                      <h4 className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-dash-text-muted">
                        Proof Conditions
                      </h4>
                      <ul className="space-y-1.5">
                        {bet.proofConditions.map((pc, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span
                              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
                                pc.met
                                  ? 'border-status-green bg-status-green/20 text-status-green'
                                  : 'border-dash-border'
                              }`}
                            >
                              {pc.met ? '✓' : ''}
                            </span>
                            <span
                              className={
                                pc.met ? 'text-dash-text line-through' : 'text-dash-text-secondary'
                              }
                            >
                              {pc.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* D. Strategic Posture Choices                                       */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Strategic Posture Choices
        </h2>
        <div className="space-y-4 rounded-lg border border-dash-border bg-dash-surface p-5">
          {mockPostureChoices.map((choice) => {
            const savedState = posturePositions[choice.id]
            const currentPosition = savedState?.position ?? choice.position
            const pct = positionMap[currentPosition] ?? 50
            const updatedAt = savedState?.updatedAt
              ? new Date(savedState.updatedAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
              : null

            return (
              <div key={choice.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-medium text-dash-text">
                    {choice.label}
                  </span>
                  {updatedAt && (
                    <span className="text-[10px] text-dash-text-muted">
                      Updated {updatedAt}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-right text-[11px] text-dash-text-muted">
                    {choice.leftLabel}
                  </span>
                  {/* Interactive slider track */}
                  <div className="relative flex-1">
                    <input
                      type="range"
                      min={0}
                      max={4}
                      step={1}
                      value={positionValues.indexOf(currentPosition as typeof positionValues[number])}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10)
                        updatePosture(choice.id, positionValues[idx])
                      }}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    />
                    <div className="relative h-2 rounded-full bg-dash-border">
                      {/* Centre line */}
                      <div className="absolute left-1/2 top-0 h-full w-px bg-dash-text-muted/40" />
                      {/* Marker */}
                      <div
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dash-red bg-dash-red/80 transition-all duration-150"
                        style={{ left: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-32 shrink-0 text-[11px] text-dash-text-muted">
                    {choice.rightLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
