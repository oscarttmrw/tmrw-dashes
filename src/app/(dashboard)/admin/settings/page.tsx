'use client'

import { useEffect, useMemo, useState } from 'react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useDashboardData } from '@/lib/context/data-context'
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react'

// ---------------------------------------------------------------------------
// Plan Targets — monthly registrations + revenue + MRR targets.
// Stored in `plan_targets`. Powers the vs-plan progress on home-dashboard
// Section 1 tiles.
// ---------------------------------------------------------------------------

interface PlanTargetRow {
  month: string  // 'YYYY-MM-DD' (first of month)
  registrations_target: number | null
  gross_revenue_target: number | null
  net_revenue_target: number | null
  mrr_target: number | null
  ltv_assumed: number | null
  updated_at?: string | null
}

interface FormState {
  month: string  // 'YYYY-MM'
  registrations: string
  gross: string
  net: string
  mrr: string
  ltv: string
}

function currentMonthYM(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function rowToForm(row: PlanTargetRow | null, month: string): FormState {
  return {
    month,
    registrations: row?.registrations_target?.toString() ?? '',
    gross: row?.gross_revenue_target?.toString() ?? '',
    net: row?.net_revenue_target?.toString() ?? '',
    mrr: row?.mrr_target?.toString() ?? '',
    ltv: row?.ltv_assumed?.toString() ?? '',
  }
}

function formatMonthLabel(monthIso: string): string {
  // 'YYYY-MM-DD' → 'May 2026'
  const d = new Date(monthIso + (monthIso.length === 7 ? '-01' : ''))
  if (isNaN(d.getTime())) return monthIso
  return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function formatNum(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function PlanTargetsSection() {
  const { refresh } = useDashboardData()
  const [rows, setRows] = useState<PlanTargetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [form, setForm] = useState<FormState>(() => rowToForm(null, currentMonthYM()))

  // Load existing targets on mount
  useEffect(() => {
    fetch('/api/plan-targets', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(body => {
        const list: PlanTargetRow[] = Array.isArray(body.plan_targets) ? body.plan_targets : []
        setRows(list)
        // Pre-fill form with current month's row if it exists.
        const current = currentMonthYM()
        const match = list.find(r => r.month?.startsWith(current))
        setForm(rowToForm(match ?? null, current))
        setLoading(false)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load plan targets')
        setLoading(false)
      })
  }, [])

  // When user changes the month picker, re-prefill from existing row.
  const setMonth = (ym: string) => {
    const match = rows.find(r => r.month?.startsWith(ym))
    setForm(rowToForm(match ?? null, ym))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const body = {
        month: form.month,
        registrations_target: form.registrations === '' ? null : Number(form.registrations),
        gross_revenue_target: form.gross === '' ? null : Number(form.gross),
        net_revenue_target: form.net === '' ? null : Number(form.net),
        mrr_target: form.mrr === '' ? null : Number(form.mrr),
        ltv_assumed: form.ltv === '' ? null : Number(form.ltv),
      }
      const res = await fetch('/api/plan-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? `Save failed (HTTP ${res.status})`)
      }
      const updated: PlanTargetRow = (await res.json()).plan_target
      // Update local list (replace existing for that month or insert).
      setRows(prev => {
        const without = prev.filter(r => !r.month?.startsWith(form.month))
        return [updated, ...without].sort((a, b) => (b.month ?? '').localeCompare(a.month ?? ''))
      })
      setSavedAt(Date.now())
      // Refresh the dashboard context so Section 1 vs-plan progress updates.
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const previousMonths = useMemo(
    () => rows.filter(r => !r.month?.startsWith(form.month)),
    [rows, form.month]
  )

  return (
    <section>
      <h2 className="mb-4 font-ui text-sm font-semibold uppercase tracking-[0.05em] text-dash-text-secondary">
        Plan Targets
      </h2>
      <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
        <p className="mb-5 text-sm text-dash-text-secondary">
          Monthly targets for Registrations, Gross Revenue, Net Revenue, MRR and the assumed LTV. Powers the vs-plan progress on the home dashboard and the LTV/ROI tiles on the Marketing tab.
        </p>

        {/* Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">Month</label>
            <input
              type="month"
              value={form.month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 font-mono text-sm text-dash-text focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
            />
          </div>
          <div /> {/* spacer */}

          <NumberField
            label="Registrations target"
            value={form.registrations}
            onChange={(v) => setForm(f => ({ ...f, registrations: v }))}
            placeholder="e.g. 310"
          />
          <NumberField
            label="Gross Revenue target ($)"
            value={form.gross}
            onChange={(v) => setForm(f => ({ ...f, gross: v }))}
            placeholder="e.g. 80000"
          />
          <NumberField
            label="Net Revenue target ($)"
            value={form.net}
            onChange={(v) => setForm(f => ({ ...f, net: v }))}
            placeholder="e.g. 75000"
            hint="Locked tile — enter ahead of time"
          />
          <NumberField
            label="MRR target ($)"
            value={form.mrr}
            onChange={(v) => setForm(f => ({ ...f, mrr: v }))}
            placeholder="e.g. 50000"
            hint="Locked tile — enter ahead of time"
          />
          <NumberField
            label="LTV — assumed ($ per member)"
            value={form.ltv}
            onChange={(v) => setForm(f => ({ ...f, ltv: v }))}
            placeholder="e.g. 3500"
            hint="Drives LTV-per-Registration and ROI on the Marketing tab. Carries forward until a later month overrides it."
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-md bg-dash-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-dash-red/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save targets'}
          </button>
          {savedAt && Date.now() - savedAt < 3500 && (
            <span className="flex items-center gap-1.5 text-xs text-status-green">
              <CheckCircle size={14} />
              Saved
            </span>
          )}
          {error && (
            <span className="text-xs text-status-red">{error}</span>
          )}
        </div>

        {/* Previous months */}
        {previousMonths.length > 0 && (
          <div className="mt-6 border-t border-dash-border pt-4">
            <button
              type="button"
              onClick={() => setHistoryOpen(o => !o)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="font-ui text-xs font-medium uppercase tracking-[0.05em] text-dash-text-secondary">
                Previous months ({previousMonths.length})
              </span>
              {historyOpen ? <ChevronDown size={14} className="text-dash-text-secondary" /> : <ChevronRight size={14} className="text-dash-text-secondary" />}
            </button>
            {historyOpen && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-dash-border">
                      <th className="px-3 py-2 font-medium text-dash-text-secondary">Month</th>
                      <th className="px-3 py-2 text-right font-medium text-dash-text-secondary">Registrations</th>
                      <th className="px-3 py-2 text-right font-medium text-dash-text-secondary">Gross</th>
                      <th className="px-3 py-2 text-right font-medium text-dash-text-secondary">Net</th>
                      <th className="px-3 py-2 text-right font-medium text-dash-text-secondary">MRR</th>
                      <th className="px-3 py-2 text-right font-medium text-dash-text-secondary">LTV</th>
                      <th className="px-3 py-2 font-medium text-dash-text-secondary"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border">
                    {previousMonths.map(r => (
                      <tr key={r.month} className="bg-dash-surface/40">
                        <td className="px-3 py-2 font-mono text-dash-text">{formatMonthLabel(r.month)}</td>
                        <td className="px-3 py-2 text-right font-mono text-dash-text">{formatNum(r.registrations_target)}</td>
                        <td className="px-3 py-2 text-right font-mono text-dash-text">${formatNum(r.gross_revenue_target)}</td>
                        <td className="px-3 py-2 text-right font-mono text-dash-text">${formatNum(r.net_revenue_target)}</td>
                        <td className="px-3 py-2 text-right font-mono text-dash-text">${formatNum(r.mrr_target)}</td>
                        <td className="px-3 py-2 text-right font-mono text-dash-text">{r.ltv_assumed === null || r.ltv_assumed === undefined ? '—' : `$${formatNum(r.ltv_assumed)}`}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setMonth(r.month.slice(0, 7))}
                            className="text-xs text-dash-red hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-dash-text-secondary">{label}</label>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 font-mono text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red"
      />
      {hint && <p className="mt-1 text-[11px] italic text-dash-text-muted">{hint}</p>}
    </div>
  )
}

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

      {/* Plan Targets */}
      <PlanTargetsSection />

      {/* Demo Mode */}
      <DemoModeSection />

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
