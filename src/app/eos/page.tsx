'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { StatusDot } from '@/components/dashboard/status-dot'
import { Sparkline } from '@/components/dashboard/sparkline'
import { useDashboardData } from '@/lib/context/data-context'
import { cn } from '@/lib/utils'
import { Upload, ChevronDown, ChevronUp, Target, Link2 } from 'lucide-react'
import type { Status } from '@/lib/types'

// ---------------------------------------------------------------------------
// 01. Strategic Destination — 12-month targets
// ---------------------------------------------------------------------------
interface DestinationTarget {
  label: string
  now: string
  target: string
  status: Status
  href: string
}

const destinationTargets: DestinationTarget[] = [
  { label: 'Active Members', now: '270', target: '500', status: 'amber', href: '/members' },
  { label: 'MRR', now: '$18K', target: '$60K', status: 'red', href: '/financial' },
  { label: 'Churn', now: '3.8%', target: '<3%', status: 'green', href: '/retention' },
  { label: 'Reg→Dashboard', now: '98d', target: '<30d', status: 'red', href: '/clinical' },
  { label: 'NPS', now: '62', target: '70+', status: 'amber', href: '/support' },
  { label: 'Retest Rate', now: 'TBC', target: '40%+', status: 'grey', href: '/retention' },
]

// ---------------------------------------------------------------------------
// 02. Rock data
// ---------------------------------------------------------------------------
const rockMetricSpark: Record<string, number[]> = {
  'Monthly churn': [4.2, 4.0, 3.9, 3.7, 3.5, 3.4, 3.6, 3.8],
  'Members with 2+ cycles': [0, 0, 0, 0, 0, 0, 0, 0],
}

const rockLaddersTo: Record<string, string> = {
  'ROCK-001': 'Can we deliver value reliably?',
  'ROCK-002': 'Do customers love it?',
  'ROCK-003': 'Can we prove it works?',
}

const rockStatusColors: Record<string, string> = {
  'on-track': 'text-status-green', 'off-track': 'text-status-red',
  'at-risk': 'text-status-amber', complete: 'text-status-green', building: 'text-dash-text-muted',
}
const rockStatusBg: Record<string, string> = {
  'on-track': 'bg-status-green/10', 'off-track': 'bg-status-red/10',
  'at-risk': 'bg-status-amber/10', complete: 'bg-status-green/10', building: 'bg-dash-surface',
}

// ---------------------------------------------------------------------------
// 03. Priorities — Artifact Format
// ---------------------------------------------------------------------------
interface OrgPriority {
  id: string
  label: string
  title: string
  description: string
}

interface PersonThisWeek {
  name: string
  role: string
  bucket: string
  priorities: { title: string; description: string; org: string[] }[]
}

interface PersonLastWeek {
  name: string
  role: string
  priorities: { title: string }[]
}

interface PrioritiesPayload {
  weekOf: string
  orgPriorities: OrgPriority[]
  thisWeek: PersonThisWeek[]
  lastWeek: PersonLastWeek[]
  completionState: Record<string, boolean>
  exportedAt?: string
  uploadedAt?: string
  weekKey?: string
}

const ORG_COLORS: Record<string, { color: string; bg: string }> = {
  O1: { color: '#9B1C1C', bg: '#FEF2F2' },
  O2: { color: '#1C398B', bg: '#EFF3FF' },
  O3: { color: '#065F46', bg: '#ECFDF5' },
  O4: { color: '#713F12', bg: '#FEFCE8' },
}

const METRIC_KEYWORDS: Record<string, { metricId: string; label: string; page: string }> = {
  queue: { metricId: 'pipeline-queue', label: 'Pipeline Queue', page: '/clinical' },
  dashboard: { metricId: 'dashboards-waiting', label: 'Dashboards Waiting', page: '/clinical' },
  churn: { metricId: 'monthly-churn', label: 'Monthly Churn', page: '/retention' },
  retention: { metricId: 'retention-rate', label: 'Retention Rate', page: '/retention' },
  revenue: { metricId: 'mrr', label: 'MRR', page: '/financial' },
  mrr: { metricId: 'mrr', label: 'MRR', page: '/financial' },
  stripe: { metricId: 'stripe-status', label: 'Stripe', page: '/admin/registry' },
  zendesk: { metricId: 'zendesk-status', label: 'Zendesk', page: '/admin/registry' },
  hire: { metricId: 'clinical-capacity', label: 'Capacity', page: '/clinical' },
  clinician: { metricId: 'clinical-capacity', label: 'Capacity', page: '/clinical' },
  capacity: { metricId: 'clinical-capacity', label: 'Capacity', page: '/clinical' },
  support: { metricId: 'open-tickets', label: 'Open Tickets', page: '/support' },
  ticket: { metricId: 'open-tickets', label: 'Open Tickets', page: '/support' },
  csat: { metricId: 'csat', label: 'CSAT', page: '/support' },
  registration: { metricId: 'weekly-registrations', label: 'Registrations', page: '/members' },
  retest: { metricId: 'retests', label: 'Retests', page: '/retention' },
  supplement: { metricId: 'supplement-protocols', label: 'Protocols', page: '/clinical' },
  landing: { metricId: 'website-status', label: 'Website', page: '/marketing' },
  compliance: { metricId: 'tga-status', label: 'TGA', page: '/strategy' },
}

function autoLinkMetrics(text: string): { metricId: string; label: string; page: string }[] {
  const lower = text.toLowerCase()
  const matches = new Map<string, { metricId: string; label: string; page: string }>()
  for (const [keyword, metric] of Object.entries(METRIC_KEYWORDS)) {
    if (lower.includes(keyword)) matches.set(metric.metricId, metric)
  }
  return Array.from(matches.values())
}

// Demo priorities data (pre-populated in demo mode)
const DEMO_PRIORITIES: PrioritiesPayload = {
  weekOf: '2026-03-09',
  orgPriorities: [
    { id: 'O1', label: 'Clinical Process', title: 'Improved Clinical Process & Zendesk Implementation', description: 'Streamline the member journey from kit receipt to dashboard delivery. Reduce manual touchpoints and implement Zendesk for support tracking.' },
    { id: 'O2', label: 'Website & Landing', title: 'Website Rebuild & Landing Page Optimisation', description: 'Rebuild the main website and create high-converting landing pages for each journey type.' },
    { id: 'O3', label: 'Retention & Revenue', title: 'Retention Engine & Revenue Growth', description: 'Build the systems that keep members engaged past their first cycle and drive retest bookings.' },
    { id: 'O4', label: 'Compliance & Ops', title: 'TGA Compliance & Operational Foundation', description: 'Ensure all products and processes meet TGA requirements. Build the operational foundation for scale.' },
  ],
  thisWeek: [
    {
      name: 'Katie', role: 'Clinical Lead', bucket: 'main',
      priorities: [
        { title: 'Clear 12 members from kit-received queue', description: 'Focus on longest-waiting members first. Target: reduce queue from 67 to 55.', org: ['O1'] },
        { title: 'Zendesk workflow configuration', description: 'Set up auto-assignment rules and SLA timers for clinical tickets.', org: ['O1'] },
        { title: 'Review clinician capacity model', description: 'Update the capacity forecast with March hiring timeline.', org: ['O1'] },
      ],
    },
    {
      name: 'Tom', role: 'Tech Lead', bucket: 'main',
      priorities: [
        { title: 'Ship menopause journey v2 landing page', description: 'Final QA and deploy. Includes new hero section and testimonials.', org: ['O2'] },
        { title: 'Dashboard publishing automation', description: 'Reduce manual steps in dashboard generation. Target: 50% time reduction.', org: ['O1'] },
      ],
    },
    {
      name: 'Mark', role: 'CEO', bucket: 'main',
      priorities: [
        { title: 'Close allied health partnership deal', description: 'Final terms negotiation with two clinic networks in Sydney.', org: ['O3'] },
        { title: 'Board prep and investor update', description: 'Prepare March board pack with updated metrics and Q2 forecast.', org: [] },
        { title: 'Review Stripe failed payment recovery', description: 'Analyse February failed payments and approve dunning sequence.', org: ['O3'] },
      ],
    },
    {
      name: 'Emma', role: 'Growth Lead', bucket: 'main',
      priorities: [
        { title: 'Launch retest campaign for Nov cohort', description: 'Email + SMS sequence for members approaching 90-day mark.', org: ['O3'] },
        { title: 'TGA compliance documentation review', description: 'Final review of supplement product descriptions for TGA submission.', org: ['O4'] },
      ],
    },
  ],
  lastWeek: [
    {
      name: 'Katie', role: 'Clinical Lead',
      priorities: [
        { title: 'Process 8 members through results review' },
        { title: 'Draft Zendesk implementation plan' },
        { title: 'Hire clinical operations coordinator — post role' },
      ],
    },
    {
      name: 'Tom', role: 'Tech Lead',
      priorities: [
        { title: 'Fix dashboard rendering bugs on mobile' },
        { title: 'Landing page design review with Mark' },
      ],
    },
    {
      name: 'Mark', role: 'CEO',
      priorities: [
        { title: 'Partnership outreach — 3 clinic networks' },
        { title: 'Q1 Rock progress review with team' },
        { title: 'Revenue forecast update' },
      ],
    },
    {
      name: 'Emma', role: 'Growth Lead',
      priorities: [
        { title: 'Design retest email sequence' },
        { title: 'TGA product label review' },
      ],
    },
  ],
  completionState: {
    'Katie|0': true,
    'Katie|1': true,
    'Katie|2': false,
    'Tom|0': true,
    'Tom|1': true,
    'Mark|0': true,
    'Mark|1': false,
    'Mark|2': true,
    'Emma|0': true,
    'Emma|1': false,
  },
}

// ---------------------------------------------------------------------------
// 04. Weekly Scorecard
// ---------------------------------------------------------------------------
const scorecardRows: {
  metric: string; target: string; targetNumeric: number;
  weeks: { label: string; numeric: number }[]; status: Status; lowerIsBetter: boolean
}[] = [
  { metric: 'New registrations', target: '25/wk', targetNumeric: 25, lowerIsBetter: false, status: 'red',
    weeks: [{ label: '18', numeric: 18 }, { label: '15', numeric: 15 }, { label: '20', numeric: 20 }, { label: '14', numeric: 14 }, { label: '16', numeric: 16 }, { label: '12', numeric: 12 }, { label: '8', numeric: 8 }, { label: '11', numeric: 11 }] },
  { metric: 'Dashboards pub.', target: '10/wk', targetNumeric: 10, lowerIsBetter: false, status: 'amber',
    weeks: [{ label: '6', numeric: 6 }, { label: '8', numeric: 8 }, { label: '5', numeric: 5 }, { label: '9', numeric: 9 }, { label: '10', numeric: 10 }, { label: '7', numeric: 7 }, { label: '9', numeric: 9 }, { label: '8', numeric: 8 }] },
  { metric: 'Churn (monthly)', target: '<5%', targetNumeric: 5, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '4.1%', numeric: 4.1 }, { label: '3.8%', numeric: 3.8 }, { label: '3.5%', numeric: 3.5 }, { label: '3.4%', numeric: 3.4 }, { label: '3.3%', numeric: 3.3 }, { label: '3.2%', numeric: 3.2 }, { label: '3.6%', numeric: 3.6 }, { label: '3.8%', numeric: 3.8 }] },
  { metric: 'Revenue collected', target: '$8K/wk', targetNumeric: 8, lowerIsBetter: false, status: 'amber',
    weeks: [{ label: '$4.8K', numeric: 4.8 }, { label: '$5.1K', numeric: 5.1 }, { label: '$5.5K', numeric: 5.5 }, { label: '$5.0K', numeric: 5.0 }, { label: '$5.2K', numeric: 5.2 }, { label: '$5.2K', numeric: 5.2 }, { label: '$6.1K', numeric: 6.1 }, { label: '$5.8K', numeric: 5.8 }] },
  { metric: 'Support tickets', target: '<20/wk', targetNumeric: 20, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '22', numeric: 22 }, { label: '19', numeric: 19 }, { label: '17', numeric: 17 }, { label: '15', numeric: 15 }, { label: '18', numeric: 18 }, { label: '14', numeric: 14 }, { label: '18', numeric: 18 }, { label: '16', numeric: 16 }] },
  { metric: 'Avg reg→dashboard', target: '<30d', targetNumeric: 30, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '42', numeric: 42 }, { label: '40', numeric: 40 }, { label: '38', numeric: 38 }, { label: '36', numeric: 36 }, { label: '35', numeric: 35 }, { label: '34', numeric: 34 }, { label: '32', numeric: 32 }, { label: '27', numeric: 27 }] },
  { metric: 'Failed payments', target: '<3%', targetNumeric: 3, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '2.5%', numeric: 2.5 }, { label: '2.2%', numeric: 2.2 }, { label: '1.8%', numeric: 1.8 }, { label: '1.5%', numeric: 1.5 }, { label: '1.4%', numeric: 1.4 }, { label: '1.2%', numeric: 1.2 }, { label: '2.0%', numeric: 2.0 }, { label: '1.8%', numeric: 1.8 }] },
  { metric: 'First reply time', target: '<4h', targetNumeric: 4, lowerIsBetter: true, status: 'green',
    weeks: [{ label: '3.8h', numeric: 3.8 }, { label: '3.2h', numeric: 3.2 }, { label: '2.9h', numeric: 2.9 }, { label: '2.5h', numeric: 2.5 }, { label: '2.3h', numeric: 2.3 }, { label: '2.1h', numeric: 2.1 }, { label: '3.4h', numeric: 3.4 }, { label: '2.8h', numeric: 2.8 }] },
  { metric: 'CSAT', target: '>80%', targetNumeric: 80, lowerIsBetter: false, status: 'green',
    weeks: [{ label: '76%', numeric: 76 }, { label: '78%', numeric: 78 }, { label: '79%', numeric: 79 }, { label: '80%', numeric: 80 }, { label: '81%', numeric: 81 }, { label: '82%', numeric: 82 }, { label: '78%', numeric: 78 }, { label: '81%', numeric: 81 }] },
]

const statusRowBg: Record<Status, string> = {
  red: 'bg-status-red-light', amber: 'bg-status-amber-light',
  green: 'bg-dash-surface/50', grey: 'bg-dash-surface/50',
}

function cellBg(value: number, target: number, lowerIsBetter: boolean): string {
  const ratio = lowerIsBetter ? target / value : value / target
  if (ratio < 0.8) return 'bg-status-red-light'
  if (ratio > 1.2) return 'bg-status-green-light'
  return ''
}

function sparkColor(row: typeof scorecardRows[number]): string {
  const latest = row.weeks[row.weeks.length - 1].numeric
  const ratio = row.lowerIsBetter ? row.targetNumeric / latest : latest / row.targetNumeric
  if (ratio < 0.8) return '#DC2626'
  if (ratio < 1.0) return '#D97706'
  return '#16A34A'
}

// ---------------------------------------------------------------------------
// 05. IDS Queue
// ---------------------------------------------------------------------------
type IDSStatus = 'Queue' | 'Discussing' | 'Resolved'
interface IDSItem { id: string; topic: string; owner: string; status: IDSStatus }

const defaultIDSItems: IDSItem[] = [
  { id: 'ids-1', topic: 'Member onboarding flow too slow for high-value leads', owner: 'Mark', status: 'Queue' },
  { id: 'ids-2', topic: 'Clinical capacity shortfall impacting NPS', owner: 'Katie', status: 'Discussing' },
  { id: 'ids-3', topic: 'Tableau export automation keeps breaking', owner: 'Alex T', status: 'Queue' },
  { id: 'ids-4', topic: 'Q2 pricing experiment scope', owner: 'Emma', status: 'Queue' },
  { id: 'ids-5', topic: 'Partner channel attribution gap', owner: 'Tom', status: 'Resolved' },
]

const idsStatusOrder: IDSStatus[] = ['Queue', 'Discussing', 'Resolved']
const idsStatusColor: Record<IDSStatus, string> = { Queue: 'text-status-amber', Discussing: 'text-dash-red', Resolved: 'text-status-green' }
const idsStatusBgColor: Record<IDSStatus, string> = { Queue: 'bg-status-amber/10', Discussing: 'bg-dash-red/10', Resolved: 'bg-status-green/10' }

// ---------------------------------------------------------------------------
// 06. To-Do List
// ---------------------------------------------------------------------------
interface TodoItem { id: string; task: string; owner: string; due: string; done: boolean }

const defaultTodos: TodoItem[] = [
  { id: 'todo-1', task: 'Upload latest Tableau data export', owner: 'Alex P', due: '2026-03-07', done: false },
  { id: 'todo-2', task: 'Review clinical capacity planning', owner: 'Katie', due: '2026-03-10', done: false },
  { id: 'todo-3', task: 'Complete Q1 Rock metric updates', owner: 'Emma', due: '2026-03-14', done: false },
  { id: 'todo-4', task: 'Schedule board prep meeting', owner: 'Mark', due: '2026-03-12', done: false },
]

function isOverdue(dueStr: string, done: boolean): boolean {
  if (done) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(dueStr) < today
}

function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
const IDS_STORAGE_KEY = 'eos-ids-queue'
const TODOS_STORAGE_KEY = 'eos-todos'

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* */ }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function EosPage() {
  const { rocks, dataMode } = useDashboardData()

  // --- IDS Queue state ---
  const [idsItems, setIDSItems] = useState<IDSItem[]>(defaultIDSItems)
  const [idsLoaded, setIDSLoaded] = useState(false)
  useEffect(() => { setIDSItems(loadFromStorage(IDS_STORAGE_KEY, defaultIDSItems)); setIDSLoaded(true) }, [])
  useEffect(() => { if (idsLoaded) saveToStorage(IDS_STORAGE_KEY, idsItems) }, [idsItems, idsLoaded])
  const advanceIDSStatus = useCallback((id: string) => {
    setIDSItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const idx = idsStatusOrder.indexOf(item.status)
      return idx >= idsStatusOrder.length - 1 ? item : { ...item, status: idsStatusOrder[idx + 1] }
    }))
  }, [])

  // --- To-Do state ---
  const [todos, setTodos] = useState<TodoItem[]>(defaultTodos)
  const [todosLoaded, setTodosLoaded] = useState(false)
  const [showAddTodo, setShowAddTodo] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [newDue, setNewDue] = useState('')
  useEffect(() => { setTodos(loadFromStorage(TODOS_STORAGE_KEY, defaultTodos)); setTodosLoaded(true) }, [])
  useEffect(() => { if (todosLoaded) saveToStorage(TODOS_STORAGE_KEY, todos) }, [todos, todosLoaded])
  const toggleTodo = useCallback((id: string) => { setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)) }, [])
  const addTodo = useCallback(() => {
    if (!newTask.trim()) return
    setTodos(prev => [...prev, { id: `todo-${Date.now()}`, task: newTask.trim(), owner: newOwner.trim() || 'Unassigned', due: newDue || new Date().toISOString().slice(0, 10), done: false }])
    setNewTask(''); setNewOwner(''); setNewDue(''); setShowAddTodo(false)
  }, [newTask, newOwner, newDue])

  // --- Priorities state (artifact format) ---
  const [priorities, setPriorities] = useState<PrioritiesPayload | null>(dataMode === 'demo' ? DEMO_PRIORITIES : null)
  const [loadingPriorities, setLoadingPriorities] = useState(dataMode !== 'demo')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dataMode === 'demo') {
      setPriorities(DEMO_PRIORITIES)
      setLoadingPriorities(false)
      return
    }
    fetch('/api/priorities')
      .then(r => r.json())
      .then(data => { if (data) setPriorities(typeof data === 'string' ? JSON.parse(data) : data) })
      .catch(() => {})
      .finally(() => setLoadingPriorities(false))
  }, [dataMode])

  const handlePrioritiesUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as PrioritiesPayload
      setPriorities({ ...parsed, uploadedAt: new Date().toISOString() })
      fetch('/api/priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOf: parsed.weekOf, priorities: parsed }),
      }).catch(() => {})
    } catch (err) {
      console.error('Failed to parse priorities:', err)
    }
  }, [])

  const toggleCompletion = useCallback((key: string) => {
    setPriorities(prev => {
      if (!prev) return prev
      const updated = { ...prev, completionState: { ...prev.completionState, [key]: !prev.completionState[key] } }
      fetch('/api/priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekOf: updated.weekOf, priorities: updated }),
      }).catch(() => {})
      return updated
    })
  }, [])

  // --- Rock expanded state ---
  const [expandedRock, setExpandedRock] = useState<string | null>(null)
  const offTrackCount = rocks.filter(r => r.status === 'off-track' || r.status === 'building').length

  return (
    <div className="space-y-4 md:space-y-10">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'EOS / L10' }]} />

      {/* ================================================================= */}
      {/* 01. Strategic Destination                                         */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={1} title="Strategic Destination — 12 Months" />
        <div className="rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
          <div className="mb-2 flex items-center gap-2">
            <Target size={14} className="text-dash-red" />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-dash-text-secondary">
              Where we need to be by Feb 2027
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {destinationTargets.map(t => (
              <Link key={t.label} href={t.href}
                className="rounded-md border border-dash-border bg-dash-bg p-2.5 transition-all duration-150 hover:border-dash-border-strong hover:shadow-sm hover:-translate-y-px md:p-3"
              >
                <span className="font-sans text-[10px] font-medium uppercase tracking-[0.04em] text-dash-text-muted">{t.label}</span>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-mono text-sm font-bold text-dash-text md:text-base">{t.now}</span>
                  <span className="font-mono text-[10px] text-dash-text-muted">&rarr; {t.target}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <StatusDot status={t.status} size="sm" />
                  <span className={cn('font-sans text-[10px]',
                    t.status === 'red' ? 'text-status-red' : t.status === 'amber' ? 'text-status-amber' : t.status === 'green' ? 'text-status-green' : 'text-dash-text-muted'
                  )}>
                    {t.status === 'red' ? 'Off pace' : t.status === 'amber' ? 'Tracking' : t.status === 'green' ? 'On track' : 'TBC'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 02. Quarterly Rocks                                               */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={2} title="Q1 2026 Rocks" />
        <div className="mb-3 rounded-md bg-dash-surface-alt px-4 py-2">
          <p className="text-xs font-medium text-dash-text-secondary">47 days left in Q1 2026 &middot; {offTrackCount} need attention</p>
        </div>
        <div className="space-y-3">
          {rocks.map(rock => {
            const isExpanded = expandedRock === rock.id
            const laddersTo = rockLaddersTo[rock.id]
            return (
              <div key={rock.id} className="rounded-lg border border-dash-border bg-dash-surface transition-all duration-150 hover:shadow-sm">
                <button onClick={() => setExpandedRock(isExpanded ? null : rock.id)} className="flex w-full items-center gap-3 p-3 text-left md:p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dash-red font-mono text-[11px] font-bold text-white">R{rock.number}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate font-sans text-sm font-medium text-dash-text">{rock.title}</h4>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', rockStatusColors[rock.status], rockStatusBg[rock.status])}>{rock.status.replace('-', ' ')}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-dash-text-muted">
                      <span>Owner: {rock.owner}</span>
                      {laddersTo && <span className="hidden sm:inline"><Link2 size={10} className="mr-0.5 inline" />{laddersTo}</span>}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">{rock.metrics.map(m => <StatusDot key={m.label} status={m.status} size="sm" />)}</div>
                  {isExpanded ? <ChevronUp size={16} className="text-dash-text-muted" /> : <ChevronDown size={16} className="text-dash-text-muted" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-dash-border px-3 py-3 md:px-4 md:py-4">
                    {rock.description && <p className="mb-3 text-xs text-dash-text-secondary">{rock.description}</p>}
                    <div className="space-y-2">
                      {rock.metrics.map(m => (
                        <div key={m.label} className="flex items-center justify-between rounded-md bg-dash-bg px-3 py-2">
                          <span className="text-xs text-dash-text-secondary">{m.label}</span>
                          <div className="flex items-center gap-3">
                            {rockMetricSpark[m.label] && rockMetricSpark[m.label].length >= 2 && (
                              <Sparkline data={rockMetricSpark[m.label]} color={m.status === 'red' ? '#DC2626' : m.status === 'amber' ? '#D97706' : '#16A34A'} width={80} height={18} />
                            )}
                            <span className="font-mono text-xs font-medium text-dash-text">{m.current}</span>
                            <span className="text-[10px] text-dash-text-muted">/ {m.target}</span>
                            <StatusDot status={m.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* 03. Weekly Priorities — Artifact Format                           */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={3} title={`Weekly Priorities${priorities ? ` — w/c ${priorities.weekOf}` : ''}`} />

        {/* Empty state */}
        {!priorities && !loadingPriorities && (
          <div className="rounded-lg border-2 border-dashed border-dash-border bg-dash-surface p-10 text-center">
            <p className="mb-1 text-sm font-medium text-dash-text">No priorities uploaded this week</p>
            <p className="mb-5 text-xs text-dash-text-muted">Export from your Claude priorities artifact and upload the JSON</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-dash-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-dash-red/90 hover:shadow-md">
              <Upload size={16} />Upload Priorities
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handlePrioritiesUpload} />
            </label>
          </div>
        )}

        {loadingPriorities && <div className="h-40 animate-pulse rounded-lg bg-dash-surface-alt" />}

        {priorities && (
          <div className="space-y-6">

            {/* Org Focus */}
            <div>
              <div className="mb-3">
                <span className="text-[9px] font-semibold uppercase tracking-[3px] text-dash-text-muted">Organisation</span>
                <h3 className="font-serif text-xl font-semibold text-dash-text">Weekly Priorities</h3>
                <div className="mt-2 h-px w-8 bg-dash-red" />
              </div>
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-dash-border sm:grid-cols-2">
                {priorities.orgPriorities.map((op, idx) => {
                  const c = ORG_COLORS[op.id] || { color: '#737373', bg: '#F5F5F5' }
                  return (
                    <div key={op.id} className="bg-dash-surface p-5 md:p-6">
                      <div className="flex items-start gap-3.5">
                        <span className="font-serif text-3xl font-light text-dash-border-strong select-none">{idx + 1}</span>
                        <div>
                          <span className="mb-2 inline-block rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: c.color, backgroundColor: c.bg }}>{op.label}</span>
                          <p className="font-serif text-[15px] font-semibold leading-tight text-dash-text">{op.title}</p>
                          <p className="mt-1.5 text-xs leading-relaxed text-dash-text-secondary">{op.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Last Week Completion Bar */}
            {(() => {
              const allKeys = priorities.lastWeek.flatMap(l => l.priorities.map((_, i) => `${l.name}|${i}`))
              const doneCount = allKeys.filter(k => priorities.completionState[k]).length
              const pct = allKeys.length > 0 ? Math.round((doneCount / allKeys.length) * 100) : 0
              return allKeys.length > 0 ? (
                <div className="flex items-center gap-5 rounded-lg border border-dash-border bg-dash-surface px-5 py-3">
                  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[3px] text-dash-text-muted">Last week completion</span>
                  <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-dash-surface-alt">
                    <div className="h-full rounded-full bg-dash-red transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="shrink-0">
                    <span className="font-serif text-xl font-semibold text-dash-text">{doneCount}</span>
                    <span className="font-serif text-sm text-dash-text-muted">/{allKeys.length}</span>
                    <span className="ml-1.5 text-[10px] text-dash-text-muted">{pct}%</span>
                  </div>
                </div>
              ) : null
            })()}

            {/* Individual Priorities */}
            <div>
              <div className="mb-3">
                <span className="text-[9px] font-semibold uppercase tracking-[3px] text-dash-text-muted">Team</span>
                <h3 className="font-serif text-xl font-semibold text-dash-text">Individual Priorities</h3>
                <div className="mt-2 h-px w-8 bg-dash-red" />
              </div>
              <div className="space-y-px">
                {priorities.thisWeek.map(person => {
                  const lw = priorities.lastWeek.find(l => l.name === person.name)
                  const lwPriorities = lw?.priorities || []
                  const lwDone = lwPriorities.filter((_, i) => priorities.completionState[`${person.name}|${i}`]).length
                  const lwAllDone = lwPriorities.length > 0 && lwDone === lwPriorities.length
                  return (
                    <div key={person.name} className="overflow-hidden rounded-lg border border-dash-border bg-dash-surface">
                      {/* Person header */}
                      <div className="flex items-center gap-4 border-b border-dash-border bg-[#FAFAFA] px-5 py-3.5 md:px-7">
                        <div className="h-8 w-0.5 shrink-0 bg-dash-red" />
                        <div className="flex-1">
                          <div className="font-serif text-lg font-semibold text-dash-text">{person.name}</div>
                          <div className="text-[10px] uppercase tracking-[1.2px] text-dash-text-muted">{person.role}</div>
                        </div>
                        {lwPriorities.length > 0 && (
                          <span className={cn('text-[11px]', lwAllDone ? 'font-semibold text-dash-red' : 'text-dash-text-muted')}>
                            {lwAllDone ? 'Last week: all done' : `Last week: ${lwDone}/${lwPriorities.length}`}
                          </span>
                        )}
                      </div>
                      {/* Two-column body */}
                      <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* This Week */}
                        <div className="lg:border-r lg:border-dash-border">
                          <div className="border-b border-[#F6F6F6] px-5 py-2.5 md:px-7">
                            <span className="text-[9px] font-bold uppercase tracking-[2px] text-dash-red">This Week</span>
                          </div>
                          {person.priorities.map((p, pIdx) => {
                            const linked = autoLinkMetrics(p.title + ' ' + p.description)
                            return (
                              <div key={pIdx} className="border-b border-[#F6F6F6] px-5 py-3.5 last:border-b-0 md:px-7">
                                <p className="font-serif text-sm font-semibold leading-snug text-dash-text">{p.title}</p>
                                <p className="mt-1 text-[11px] leading-relaxed text-dash-text-secondary">{p.description}</p>
                                {p.org.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {p.org.map(id => {
                                      const op = priorities.orgPriorities.find(o => o.id === id)
                                      const c = ORG_COLORS[id]
                                      if (!op || !c) return null
                                      return (
                                        <span key={id} className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                                          style={{ color: c.color, backgroundColor: c.bg, border: `1px solid ${c.color}20` }}>
                                          {op.label}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                                {linked.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {linked.map(lm => (
                                      <Link key={lm.metricId} href={lm.page}
                                        className="inline-flex items-center gap-1 rounded border border-dash-border bg-dash-surface-alt px-2 py-1 text-[10px] transition-all hover:border-dash-border-strong">
                                        <span className="text-dash-text-secondary">{lm.label}</span>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {/* Last Week */}
                        <div>
                          <div className="border-b border-[#F6F6F6] px-5 py-2.5 md:px-7">
                            <span className="text-[9px] font-bold uppercase tracking-[2px] text-dash-text-muted">Last Week</span>
                          </div>
                          {lwPriorities.length === 0 ? (
                            <div className="px-5 py-4 text-xs italic text-dash-text-muted md:px-7">No priorities recorded</div>
                          ) : lwPriorities.map((p, pIdx) => {
                            const key = `${person.name}|${pIdx}`
                            const done = !!priorities.completionState[key]
                            return (
                              <div key={pIdx} onClick={() => toggleCompletion(key)}
                                className={cn('flex cursor-pointer items-start gap-3 border-b border-[#F6F6F6] px-5 py-3.5 last:border-b-0 transition-colors md:px-7', done ? 'bg-[#FEF9F9]' : 'hover:bg-dash-surface-hover')}>
                                <div className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border-[1.5px] transition-all', done ? 'border-dash-red bg-dash-red' : 'border-dash-border')}>
                                  {done && <svg width="8" height="6" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </div>
                                <span className={cn('select-none text-xs leading-relaxed transition-colors', done ? 'text-dash-text-muted line-through' : 'text-dash-text-secondary')}>{p.title}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] text-dash-text-muted">
              <span>
                {priorities.uploadedAt
                  ? `Uploaded: ${new Date(priorities.uploadedAt).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : dataMode === 'demo' ? 'Demo data' : ''}
              </span>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-dash-red hover:underline">
                  {priorities ? 'Re-upload' : 'Upload'}
                  <input type="file" accept=".json" className="hidden" onChange={handlePrioritiesUpload} />
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* 04. Weekly Scorecard                                              */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={4} title="Weekly Scorecard" />
        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {scorecardRows.map(row => {
            const latest = row.weeks[row.weeks.length - 1]
            return (
              <div key={row.metric} className={cn('rounded-lg border border-dash-border p-3', statusRowBg[row.status])}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-dash-text">{row.metric}</span>
                  <StatusDot status={row.status} />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-lg font-bold text-dash-text">{latest.label}</span>
                  <span className="font-mono text-[10px] text-dash-text-muted">target: {row.target}</span>
                </div>
                <div className="mt-1.5"><Sparkline data={row.weeks.map(w => w.numeric)} color={sparkColor(row)} width={200} height={20} /></div>
              </div>
            )
          })}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface">
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Metric</th>
                <th className="px-4 py-3 font-medium text-dash-text-secondary">Target</th>
                {Array.from({ length: 8 }, (_, i) => (
                  <th key={i} className="px-2 py-3 text-right font-mono text-[10px] font-medium text-dash-text-muted">{i === 7 ? 'This Wk' : `W${i - 7}`}</th>
                ))}
                <th className="px-3 py-3 text-center font-medium text-dash-text-secondary">Trend</th>
                <th className="px-3 py-3 text-center font-medium text-dash-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {scorecardRows.map(row => (
                <tr key={row.metric} className={statusRowBg[row.status]}>
                  <td className="px-4 py-2 font-medium text-dash-text">{row.metric}</td>
                  <td className="px-4 py-2 font-mono text-xs text-dash-text-muted">{row.target}</td>
                  {row.weeks.map((wk, i) => (
                    <td key={i} className={`px-2 py-2 text-right font-mono text-xs ${i === row.weeks.length - 1 ? 'font-semibold text-dash-text' : 'text-dash-text-secondary'} ${cellBg(wk.numeric, row.targetNumeric, row.lowerIsBetter)}`}>{wk.label}</td>
                  ))}
                  <td className="px-3 py-2 text-center"><Sparkline data={row.weeks.map(w => w.numeric)} color={sparkColor(row)} width={80} height={20} /></td>
                  <td className="px-3 py-2 text-center"><StatusDot status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 05. IDS Queue                                                     */}
      {/* ================================================================= */}
      <section>
        <SectionHeading number={5} title="IDS Queue — This Week" />
        <div className="space-y-2 md:hidden">
          {idsItems.map(item => (
            <div key={item.id} className="rounded-lg border border-dash-border bg-dash-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-dash-text">{item.topic}</p>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', idsStatusColor[item.status], idsStatusBgColor[item.status])}>{item.status}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-dash-text-muted">{item.owner}</span>
                {item.status !== 'Resolved' && (
                  <button onClick={() => advanceIDSStatus(item.id)} className="rounded border border-dash-border px-2 py-0.5 text-[10px] font-medium text-dash-text hover:bg-dash-border">Advance &rarr;</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-dash-border bg-dash-surface">
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Topic</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Owner</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Status</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary" />
            </tr></thead>
            <tbody className="divide-y divide-dash-border">
              {idsItems.map(item => (
                <tr key={item.id} className="bg-dash-surface/50">
                  <td className="px-4 py-2 text-dash-text">{item.topic}</td>
                  <td className="px-4 py-2 text-dash-text-secondary">{item.owner}</td>
                  <td className="px-4 py-2"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${idsStatusColor[item.status]} ${idsStatusBgColor[item.status]}`}>{item.status}</span></td>
                  <td className="px-4 py-2 text-right">
                    {item.status !== 'Resolved' && (
                      <button onClick={() => advanceIDSStatus(item.id)} className="rounded border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text transition-colors hover:bg-dash-border">Advance &rarr;</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 06. To-Do List                                                    */}
      {/* ================================================================= */}
      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading number={6} title="To-Do List" />
          <button onClick={() => setShowAddTodo(v => !v)} className="rounded border border-dash-border bg-dash-surface px-3 py-1.5 text-xs font-medium text-dash-text transition-colors hover:bg-dash-border">
            {showAddTodo ? 'Cancel' : '+ Add To-Do'}
          </button>
        </div>
        {showAddTodo && (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-dash-border bg-dash-surface p-4">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-dash-text-muted">Task</label>
              <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} className="w-full rounded border border-dash-border bg-dash-bg px-3 py-1.5 text-sm text-dash-text outline-none focus:border-dash-red" placeholder="What needs doing?" />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-dash-text-muted">Owner</label>
              <input type="text" value={newOwner} onChange={e => setNewOwner(e.target.value)} className="w-full rounded border border-dash-border bg-dash-bg px-3 py-1.5 text-sm text-dash-text outline-none focus:border-dash-red" placeholder="Name" />
            </div>
            <div className="w-36">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-dash-text-muted">Due</label>
              <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="w-full rounded border border-dash-border bg-dash-bg px-3 py-1.5 text-sm text-dash-text outline-none focus:border-dash-red" />
            </div>
            <button onClick={addTodo} className="rounded bg-dash-red px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-dash-red/90">Add</button>
          </div>
        )}
        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {todos.map(row => {
            const overdue = isOverdue(row.due, row.done)
            return (
              <div key={row.id} className={cn('rounded-lg border border-dash-border bg-dash-surface p-3', overdue && 'border-l-4 border-l-status-red', row.done && 'opacity-60')}>
                <div className="flex items-start gap-2">
                  <button onClick={() => toggleTodo(row.id)} className={cn('mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs', row.done ? 'border-status-green bg-status-green/20 text-status-green' : 'border-dash-border')}>
                    {row.done ? '✓' : ''}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', row.done ? 'line-through text-dash-text-muted' : overdue ? 'text-status-red' : 'text-dash-text')}>{row.task}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-dash-text-muted">
                      <span>{row.owner}</span>
                      <span className={overdue ? 'font-semibold text-status-red' : ''}>{formatDue(row.due)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-dash-border">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-dash-border bg-dash-surface">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Task</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Owner</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Due</th>
              <th className="px-4 py-3 font-medium text-dash-text-secondary">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-dash-border">
              {todos.map(row => {
                const overdue = isOverdue(row.due, row.done)
                return (
                  <tr key={row.id} className={`${overdue ? 'border-l-4 border-l-status-red' : ''} ${row.done ? 'bg-dash-surface/30' : 'bg-dash-surface/50'}`}>
                    <td className="px-4 py-2">
                      <button onClick={() => toggleTodo(row.id)} className={cn('inline-flex h-4 w-4 items-center justify-center rounded border text-xs', row.done ? 'border-status-green bg-status-green/20 text-status-green' : 'border-dash-border')}>
                        {row.done ? '✓' : ''}
                      </button>
                    </td>
                    <td className={`px-4 py-2 ${row.done ? 'line-through text-dash-text-muted' : overdue ? 'text-status-red' : 'text-dash-text'}`}>{row.task}</td>
                    <td className="px-4 py-2 text-dash-text-secondary">{row.owner}</td>
                    <td className={`px-4 py-2 font-mono text-xs ${overdue ? 'font-semibold text-status-red' : 'text-dash-text-muted'}`}>{formatDue(row.due)}</td>
                    <td className="px-4 py-2">
                      {row.done ? <span className="inline-block rounded-full bg-status-green/10 px-2.5 py-0.5 text-xs font-medium text-status-green">done</span>
                        : overdue ? <span className="inline-block rounded-full bg-status-red/10 px-2.5 py-0.5 text-xs font-medium text-status-red">overdue</span>
                        : <span className="inline-block rounded-full bg-status-amber/10 px-2.5 py-0.5 text-xs font-medium text-status-amber">pending</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
