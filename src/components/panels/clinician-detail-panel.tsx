'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { StatusDot } from '@/components/dashboard/status-dot'
import type { Clinician, Status } from '@/lib/types'

interface ClinicianDetailPanelProps {
  clinician: Clinician | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function caseloadStatus(membersPerFTE: number): Status {
  if (membersPerFTE > 60) return 'red'
  if (membersPerFTE > 50) return 'amber'
  return 'green'
}

export function ClinicianDetailPanel({ clinician, open, onOpenChange }: ClinicianDetailPanelProps) {
  if (!clinician) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{clinician.name}</SheetTitle>
          <SheetDescription>{clinician.role} · {clinician.fte} FTE</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Caseload overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Active Cases</span>
              <div className="mt-1 font-mono text-lg font-bold text-dash-text">{clinician.activeCases}</div>
            </div>
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Members/FTE</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={caseloadStatus(clinician.membersPerFTE)} />
                <span className="font-mono text-lg font-bold text-dash-text">{clinician.membersPerFTE}</span>
              </div>
            </div>
          </div>

          {/* Performance */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Performance</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Closed Cases" value={String(clinician.closedCases)} />
              <InfoRow label="Dashboards Published" value={String(clinician.dashboardsPublished)} />
              <InfoRow label="Avg Case Duration" value={clinician.avgCaseDuration ? `${clinician.avgCaseDuration} days` : '—'} />
            </div>
          </section>

          {/* Benchmarks */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Case Time Benchmarks</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Complex Case Time" value={`${clinician.complexCaseTime} min`} />
              <InfoRow label="Simple Case Time" value={`${clinician.simpleCaseTime} min`} />
            </div>
          </section>

          {/* Details */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Details</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Department" value={clinician.department} />
              <InfoRow label="FTE" value={String(clinician.fte)} />
              <InfoRow label="ID" value={clinician.id} />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-36 shrink-0 text-dash-text-secondary">{label}</span>
      <span className="font-mono text-dash-text">{value}</span>
    </div>
  )
}
