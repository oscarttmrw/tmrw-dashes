'use client'

import { Breadcrumb } from '@/components/layout/breadcrumb'
import { useDashboardData } from '@/lib/context/data-context'
import { mockTeam, mockHiringPipeline, departmentSummary } from '@/data/mock'

// ---------------------------------------------------------------------------
// A. Team Capacity vs Demand
// ---------------------------------------------------------------------------
const capacityRows: {
  role: string
  fte: number
  demand: number
  gap: number
  hireBy: string
}[] = [
  { role: 'Clinical IC', fte: 5.0, demand: 6.2, gap: -1.2, hireBy: 'Apr 2026' },
  { role: 'Clinical GP', fte: 0.9, demand: 1.1, gap: -0.2, hireBy: 'Jun 2026' },
  { role: 'Engineering', fte: 5.0, demand: 5.0, gap: 0, hireBy: '—' },
  { role: 'Brand/Marketing', fte: 1.6, demand: 2.0, gap: -0.4, hireBy: 'Jul 2026' },
  { role: 'Operations', fte: 2.0, demand: 2.0, gap: 0, hireBy: '—' },
]

function gapColor(gap: number): string {
  if (gap >= 0) return 'text-status-green'
  if (gap >= -0.5) return 'text-status-amber'
  return 'text-status-red'
}

function gapBg(gap: number): string {
  if (gap >= 0) return 'bg-status-green/10'
  if (gap >= -0.5) return 'bg-status-amber/10'
  return 'bg-status-red/10'
}

// ---------------------------------------------------------------------------
// B. Department Breakdown
// ---------------------------------------------------------------------------
const totalFTE = departmentSummary.reduce((s, d) => s + d.fte, 0)

// ---------------------------------------------------------------------------
// C. Clinician Load
// ---------------------------------------------------------------------------
const clinicianLoad = [
  { name: 'Katie', members: 53 },
  { name: 'Alia', members: 51 },
  { name: 'Paula', members: 51 },
  { name: 'Isabelle', members: 48 },
  { name: 'Jaclyn', members: 14 },
  { name: 'Marko', members: 9 },
  { name: 'Sanja', members: 8 },
  { name: 'Katrina', members: 1 },
]

const maxLoad = Math.max(...clinicianLoad.map((c) => c.members))

// ---------------------------------------------------------------------------
// D. Hiring Pipeline stage colors
// ---------------------------------------------------------------------------
const stageColors: Record<string, string> = {
  sourcing: 'bg-status-grey/20 text-status-grey',
  interviewing: 'bg-status-amber/20 text-status-amber',
  offer: 'bg-status-green/20 text-status-green',
  onboarding: 'bg-dash-red-light text-dash-red',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TeamPage() {
  // Pull from context where applicable
  const { clinicians } = useDashboardData()

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Team' }]} />

      {/* ================================================================= */}
      {/* A. Team Capacity vs Demand                                        */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Team Capacity vs Demand
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Role</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">FTE</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Demand</th>
                <th className="px-4 py-3 text-right font-medium text-dash-text-secondary">Gap</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Hire By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {capacityRows.map((row) => (
                <tr key={row.role} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{row.role}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text">{row.fte.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right font-mono text-dash-text">{row.demand.toFixed(1)}</td>
                  <td className={`px-4 py-2 text-right font-mono font-semibold ${gapColor(row.gap)} ${gapBg(row.gap)}`}>
                    {row.gap > 0 ? '+' : ''}{row.gap.toFixed(1)}
                  </td>
                  <td className="px-4 py-2 text-dash-text-secondary">{row.hireBy}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-dash-border bg-dash-surface">
                <td className="px-4 py-2 font-semibold text-dash-text">Total</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-dash-text">
                  {capacityRows.reduce((s, r) => s + r.fte, 0).toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-dash-text">
                  {capacityRows.reduce((s, r) => s + r.demand, 0).toFixed(1)}
                </td>
                <td className={`px-4 py-2 text-right font-mono font-semibold ${gapColor(capacityRows.reduce((s, r) => s + r.gap, 0))}`}>
                  {capacityRows.reduce((s, r) => s + r.gap, 0).toFixed(1)}
                </td>
                <td className="px-4 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* B. Department Breakdown                                           */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Department Breakdown
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          {/* Stacked bar */}
          <div className="mb-4 flex h-8 w-full overflow-hidden rounded">
            {departmentSummary.map((d) => (
              <div
                key={d.department}
                className="flex items-center justify-center text-[10px] font-medium text-white"
                style={{
                  width: `${(d.fte / totalFTE) * 100}%`,
                  backgroundColor: d.color,
                }}
                title={`${d.department}: ${d.fte} FTE`}
              >
                {d.fte >= 2 ? d.fte : ''}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {departmentSummary.map((d) => (
              <div key={d.department} className="flex items-center gap-2 text-xs text-dash-text-secondary">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: d.color }}
                />
                {d.department}: <span className="font-mono font-medium text-dash-text">{d.fte} FTE</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* C. Hiring Pipeline                                                */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Hiring Pipeline
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Role</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Department</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Stage</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Target Start</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {mockHiringPipeline.map((hire) => (
                <tr key={hire.role} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{hire.role}</td>
                  <td className="px-4 py-2 capitalize text-dash-text">{hire.department}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${stageColors[hire.stage] ?? 'bg-status-grey/20 text-status-grey'}`}
                    >
                      {hire.stage}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-dash-text">{formatDate(hire.targetStart)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* D. Team Roster                                                    */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Team Roster
        </h2>
        <div className="overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Name</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Role</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Department</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">FTE</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Start Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {mockTeam.map((member) => (
                <tr key={member.id} className="bg-dash-surface/50">
                  <td className="px-4 py-2 font-medium text-dash-text">{member.name}</td>
                  <td className="px-4 py-2 text-dash-text">{member.role}</td>
                  <td className="px-4 py-2 capitalize text-dash-text">{member.department}</td>
                  <td className="px-4 py-2 font-mono text-dash-text">{member.fte}</td>
                  <td className="px-4 py-2 text-dash-text">{formatDate(member.startDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* E. Clinician Load                                                 */}
      {/* ================================================================= */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
          Clinician Load
        </h2>
        <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
          <div className="space-y-3">
            {clinicianLoad.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-dash-text">{c.name}</span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-dash-border/30">
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-chart-1"
                    style={{ width: `${(c.members / maxLoad) * 100}%` }}
                  />
                  {/* Benchmark line at 50 members/FTE */}
                  <div
                    className="absolute inset-y-0 w-px bg-status-red"
                    style={{ left: `${(50 / maxLoad) * 100}%` }}
                    title="Benchmark: 50 members/FTE"
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-sm text-dash-text">{c.members}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-dash-text-muted">
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-status-red" />
            Red line = benchmark at 50 members/FTE
          </p>
        </div>
      </section>
    </div>
  )
}
