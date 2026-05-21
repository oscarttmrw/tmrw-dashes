'use client'

import { useEffect, useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useDashboardData } from '@/lib/context/data-context'

// ---------------------------------------------------------------------------
// Demo Mode Section (needs client state)
// ---------------------------------------------------------------------------
function DemoModeSection() {
  const { dataMode, resetToDemo, switchToActual } = useDashboardData()
  const isDemo = dataMode === 'demo'

  return (
    <section>
      <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
        Demo Mode
      </h2>
      <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
        <p className="mb-4 text-sm text-dash-text-secondary">
          Demo mode populates the dashboard with illustrative data. Use it for onboarding and presentations. Turn it off for live operations.
        </p>
        <div className="flex items-center gap-4">
          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={isDemo}
            onClick={() => (isDemo ? switchToActual() : resetToDemo())}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-dash-red focus:ring-offset-2 focus:ring-offset-dash-surface ${
              isDemo ? 'bg-amber-500' : 'bg-dash-border'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                isDemo ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div>
            <span className="text-sm font-medium text-dash-text">Demo mode</span>
            <span className={`ml-2 text-xs font-medium ${isDemo ? 'text-amber-500' : 'text-dash-text-muted'}`}>
              {isDemo ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// PostHog Manual Inputs
// ---------------------------------------------------------------------------
function PosthogManualSection() {
  const { posthogManual, savePosthogManual } = useDashboardData()

  const toStr = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))
  const [registrations, setRegistrations] = useState(toStr(posthogManual.registrations))
  const [churnedMembers, setChurnedMembers] = useState(toStr(posthogManual.churnedMembers))
  const [totalCasebook, setTotalCasebook] = useState(toStr(posthogManual.totalCasebook))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    setRegistrations(toStr(posthogManual.registrations))
    setChurnedMembers(toStr(posthogManual.churnedMembers))
    setTotalCasebook(toStr(posthogManual.totalCasebook))
  }, [posthogManual.registrations, posthogManual.churnedMembers, posthogManual.totalCasebook])

  const parse = (s: string): number | null => {
    const t = s.trim()
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) ? Math.round(n) : null
  }

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      await savePosthogManual({
        registrations: parse(registrations),
        churnedMembers: parse(churnedMembers),
        totalCasebook: parse(totalCasebook),
      })
      setFeedback({ kind: 'ok', msg: 'Saved.' })
    } catch (e) {
      setFeedback({ kind: 'err', msg: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const lastUpdated = posthogManual.uploadedAt
    ? new Date(posthogManual.uploadedAt).toLocaleString('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Never'

  const fields: Array<{ key: string; label: string; value: string; set: (v: string) => void }> = [
    { key: 'registrations', label: 'Registrations', value: registrations, set: setRegistrations },
    { key: 'churned', label: 'Churned Members', value: churnedMembers, set: setChurnedMembers },
    { key: 'casebook', label: 'Total Casebook', value: totalCasebook, set: setTotalCasebook },
  ]

  return (
    <section>
      <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
        PostHog Data
      </h2>
      <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
        <p className="mb-4 text-sm text-dash-text-secondary">
          Manually enter the latest figures from PostHog. These override the derived counts on the
          dashboard and the operations tabs until updated. Last updated: <span className="font-mono text-dash-text">{lastUpdated}</span>.
        </p>
        <div className="space-y-4">
          {fields.map((f) => (
            <div
              key={f.key}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
            >
              <label htmlFor={`posthog-${f.key}`} className="w-44 shrink-0 text-sm text-dash-text">
                {f.label}
              </label>
              <input
                id={`posthog-${f.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder="Enter count"
                className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red sm:max-w-[200px]"
              />
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="shrink-0 rounded-md border border-dash-border bg-dash-bg px-4 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {feedback && (
              <span
                className={`text-xs ${
                  feedback.kind === 'ok' ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {feedback.msg}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Metric Targets
// ---------------------------------------------------------------------------
const metricTargets = [
  { metric: 'Active Members', currentTarget: '300' },
  { metric: 'Monthly Revenue', currentTarget: '$75,000' },
  { metric: 'Churn Rate', currentTarget: '<5%' },
  { metric: 'NPS', currentTarget: '>70' },
  { metric: 'CSAT', currentTarget: '>80%' },
  { metric: 'First Reply Time', currentTarget: '<4h' },
  { metric: 'Resolution Time', currentTarget: '<24h' },
  { metric: 'Clinical Gate Pass Rate', currentTarget: '>90%' },
]

// ---------------------------------------------------------------------------
// SLA Thresholds
// ---------------------------------------------------------------------------
const slaThresholds = [
  { label: 'First Reply Target', current: '<4h', unit: 'hours' },
  { label: 'Resolution Target', current: '<24h', unit: 'hours' },
  { label: 'CSAT Target', current: '>80%', unit: '%' },
]

// ---------------------------------------------------------------------------
// Revenue Classification Rules
// ---------------------------------------------------------------------------
const revenueRules = [
  { category: 'Joining Fee', rangeMin: 299, rangeMax: 599 },
  { category: 'Subscription', rangeMin: 99, rangeMax: 249 },
  { category: 'Supplement', rangeMin: 15, rangeMax: 98 },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Settings' },
        ]}
      />

      {/* Demo Mode */}
      <DemoModeSection />

      {/* PostHog manual inputs — placed above Metric Targets so operators
          can refresh source-of-truth counts before reviewing targets. */}
      <PosthogManualSection />

      {/* Metric Targets */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Metric Targets
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Metric</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Current Target</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">New Target</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {metricTargets.map((t) => (
                <tr key={t.metric} className="bg-dash-surface/50">
                  <td className="px-4 py-2 text-dash-text">{t.metric}</td>
                  <td className="px-4 py-2 font-mono text-dash-text-secondary">
                    {t.currentTarget}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="New value"
                      className="w-full max-w-[160px] rounded-md border border-dash-border bg-dash-bg px-3 py-1.5 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button className="rounded-md border border-dash-border bg-dash-bg px-4 py-1.5 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Support SLA Thresholds */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Support SLA Thresholds
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          <div className="space-y-4">
            {slaThresholds.map((sla) => (
              <div
                key={sla.label}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
              >
                <label className="w-44 shrink-0 text-sm text-dash-text">
                  {sla.label}
                </label>
                <span className="w-28 shrink-0 font-mono text-sm text-dash-text-muted">
                  Current: {sla.current}
                </span>
                <input
                  type="text"
                  placeholder={`Value (${sla.unit})`}
                  className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red sm:max-w-[160px]"
                />
                <button className="shrink-0 rounded-md border border-dash-border bg-dash-bg px-4 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue Classification Rules */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Revenue Classification Rules
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          <div className="space-y-4">
            {revenueRules.map((rule) => (
              <div
                key={rule.category}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
              >
                <label className="w-44 shrink-0 text-sm text-dash-text">
                  {rule.category}
                </label>
                <span className="w-40 shrink-0 font-mono text-sm text-dash-text-muted">
                  ${rule.rangeMin} &ndash; ${rule.rangeMax}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-24 rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
                  />
                  <span className="text-dash-text-muted">&ndash;</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-24 rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
                  />
                </div>
                <button className="shrink-0 rounded-md border border-dash-border bg-dash-bg px-4 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Retention */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Data Retention
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="w-44 shrink-0 text-sm text-dash-text">
              Months of Historical Data
            </label>
            <span className="w-28 shrink-0 font-mono text-sm text-dash-text-muted">
              Current: 12
            </span>
            <input
              type="number"
              placeholder="Months"
              defaultValue={12}
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red sm:max-w-[120px]"
            />
            <button className="shrink-0 rounded-md border border-dash-border bg-dash-bg px-4 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
