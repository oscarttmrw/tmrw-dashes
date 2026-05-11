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
import type { Ticket, Status } from '@/lib/types'

interface TicketDetailPanelProps {
  ticket: Ticket | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ticketStatusColor(status: Ticket['status']): Status {
  if (status === 'Open') return 'red'
  if (status === 'Pending') return 'amber'
  if (status === 'Solved' || status === 'Closed') return 'green'
  return 'grey'
}

function priorityColor(priority: Ticket['priority']): Status {
  if (priority === 'Urgent') return 'red'
  if (priority === 'High') return 'amber'
  return 'grey'
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours < 24) return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

export function TicketDetailPanel({ ticket, open, onOpenChange }: TicketDetailPanelProps) {
  if (!ticket) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ticket #{ticket.id}</SheetTitle>
          <SheetDescription>{ticket.ticketType ?? 'Unknown type'} · {ticket.channel}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Status overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Status</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={ticketStatusColor(ticket.status)} />
                <span className="font-mono text-sm text-dash-text">{ticket.status}</span>
              </div>
            </div>
            <div className="rounded-md border border-dash-border p-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dash-text-secondary">Priority</span>
              <div className="mt-1 flex items-center gap-2">
                <StatusDot status={priorityColor(ticket.priority)} />
                <span className="font-mono text-sm text-dash-text">{ticket.priority}</span>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Assignment</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Assignee" value={ticket.assignee || '—'} />
              <InfoRow label="Group" value={ticket.group || '—'} />
              <InfoRow label="Member ID" value={ticket.memberId || '—'} />
            </div>
          </section>

          {/* Timing */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Timing</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Created" value={new Date(ticket.createdAt).toLocaleDateString('en-AU')} />
              <InfoRow label="Updated" value={new Date(ticket.updatedAt).toLocaleDateString('en-AU')} />
              <InfoRow label="Solved" value={ticket.solvedAt ? new Date(ticket.solvedAt).toLocaleDateString('en-AU') : '—'} />
              <InfoRow label="First Reply" value={formatMinutes(ticket.firstReplyMinutes)} />
              <InfoRow label="First Resolution" value={formatMinutes(ticket.firstResolutionMinutes)} />
              <InfoRow label="Full Resolution" value={formatMinutes(ticket.fullResolutionMinutes)} />
              <InfoRow label="Requester Wait" value={formatMinutes(ticket.requesterWaitMinutes)} />
            </div>
          </section>

          {/* Quality */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Quality</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Satisfaction" value={ticket.satisfaction ?? '—'} />
              <InfoRow label="Reopens" value={String(ticket.reopens)} />
              <InfoRow label="Replies" value={String(ticket.replies)} />
              <InfoRow label="Assignee Stations" value={String(ticket.assigneeStations)} />
              <InfoRow label="Group Stations" value={String(ticket.groupStations)} />
            </div>
          </section>

          {/* Tags */}
          {ticket.tags.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {ticket.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </section>
          )}
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
