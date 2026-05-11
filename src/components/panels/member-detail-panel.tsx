'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { StatusDot } from '@/components/dashboard/status-dot'
import { Badge } from '@/components/ui/badge'
import type { Member, Status } from '@/lib/types'

interface MemberDetailPanelProps {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function journeyStatusColor(stage: Member['journeyStage']): Status {
  if (stage === 'churned' || stage === 'inactive') return 'red'
  if (stage === 'dashboard-unlocked' || stage === 'active-plan') return 'green'
  if (stage === 'awaiting-results' || stage === 'kit-returned') return 'amber'
  return 'grey'
}

export function MemberDetailPanel({ member, open, onOpenChange }: MemberDetailPanelProps) {
  if (!member) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle>{member.displayName}</SheetTitle>
            <button
              onClick={() => {
                member.isVIP = !member.isVIP
                try {
                  const stored = JSON.parse(localStorage.getItem('tmrw-vip-members') || '{}')
                  if (member.isVIP) stored[member.id] = true
                  else delete stored[member.id]
                  localStorage.setItem('tmrw-vip-members', JSON.stringify(stored))
                } catch {}
              }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                member.isVIP
                  ? 'bg-dash-red-light text-dash-red'
                  : 'border border-dash-border text-dash-text-muted hover:bg-dash-surface-hover'
              }`}
              title={member.isVIP ? 'Remove VIP tag' : 'Tag as VIP'}
            >
              {member.isVIP ? '★ VIP' : '☆ VIP'}
            </button>
          </div>
          <SheetDescription>{member.id} · {member.type}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Status overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Journey Stage</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={journeyStatusColor(member.journeyStage)} />
                <span className="font-mono text-sm text-dash-text">{member.journeyStage.replace(/-/g, ' ')}</span>
              </div>
            </div>
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Case Status</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={member.caseStatus === 'Open' ? 'green' : member.caseStatus === 'Closed' ? 'red' : 'grey'} />
                <span className="font-mono text-sm text-dash-text">{member.caseStatus}</span>
              </div>
            </div>
          </div>

          {/* Clinical */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Clinical</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Primary Clinician" value={member.primaryClinician || '—'} />
              <InfoRow label="Assigned Doctor" value={member.assignedDoctor || '—'} />
              <InfoRow label="Dashboard Unlocked" value={member.dashboardUnlocked ? 'Yes' : 'No'} />
              {member.dashboardUnlockedAt && (
                <InfoRow label="Unlocked At" value={new Date(member.dashboardUnlockedAt).toLocaleDateString('en-AU')} />
              )}
              <InfoRow label="Last Test Date" value={member.lastTestDate ? new Date(member.lastTestDate).toLocaleDateString('en-AU') : '—'} />
              <InfoRow label="Next Retest" value={member.nextRetestDate ? new Date(member.nextRetestDate).toLocaleDateString('en-AU') : '—'} />
            </div>
          </section>

          {/* Financial */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Financial</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Total Revenue" value={`$${member.totalRevenue.toLocaleString()}`} />
              <InfoRow label="Transactions" value={String(member.transactionCount)} />
              <InfoRow label="MRR" value={`$${member.mrr}`} />
              <InfoRow label="First Payment" value={member.firstPaymentDate ? new Date(member.firstPaymentDate).toLocaleDateString('en-AU') : '—'} />
            </div>
          </section>

          {/* Support */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Support</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Ticket Count" value={String(member.ticketCount)} />
              <InfoRow label="Open Tickets" value={String(member.openTickets)} />
              <InfoRow label="Avg Resolution" value={member.avgResolutionTime ? `${member.avgResolutionTime.toFixed(0)} min` : '—'} />
              <InfoRow label="CSAT" value={member.csat ? `${member.csat}%` : '—'} />
            </div>
          </section>

          {/* Risk Flags */}
          {member.riskFlags.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Risk Flags</h3>
              <div className="space-y-2">
                {member.riskFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md bg-status-red-light px-3 py-2">
                    <StatusDot status="red" size="sm" />
                    <div>
                      <span className="text-xs font-medium text-status-red">{flag.type.replace(/-/g, ' ')}</span>
                      <p className="text-xs text-dash-text-secondary">{flag.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Meta */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Details</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Registered" value={new Date(member.createdAt).toLocaleDateString('en-AU')} />
              <InfoRow label="Days Since Registration" value={String(member.daysSinceRegistration)} />
              <InfoRow label="Sex" value={member.sex || '—'} />
              {member.addOns.length > 0 && (
                <div className="flex items-start gap-4">
                  <span className="w-36 shrink-0 text-dash-text-secondary">Add-ons</span>
                  <div className="flex flex-wrap gap-1">
                    {member.addOns.map((a) => (
                      <Badge key={a} variant="secondary">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
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
