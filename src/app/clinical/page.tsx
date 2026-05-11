'use client'

import React, { useState, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { MetricCard } from '@/components/dashboard/metric-card'
import { DataSourceBadge } from '@/components/dashboard/data-source-badge'
import { AlertCard } from '@/components/dashboard/alert-card'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { ChartPeriodToggle } from '@/components/dashboard/chart-period-toggle'
import { ClinicianDetailPanel } from '@/components/panels/clinician-detail-panel'
import { MemberDetailPanel } from '@/components/panels/member-detail-panel'
import {
  ResponsiveContainer,
  LineChart as RechartLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { axisTickStyle, axisLineStyle, gridStyle, tooltipStyle, legendStyle, lineDot, TMRW_COLORS } from '@/lib/utils/chart-styles'
import { Sparkline } from '@/components/dashboard/sparkline'
import { TrendIndicator } from '@/components/dashboard/trend-indicator'
import { StatusDot } from '@/components/dashboard/status-dot'
import { cn } from '@/lib/utils'
import { useDashboardData } from '@/lib/context/data-context'
import type { Clinician, Member, Status } from '@/lib/types'

// ═══════════════════════════════════════════════════════════════════════
// 01 Journey Pipeline — Kanban Flow
// ═══════════════════════════════════════════════════════════════════════

interface PipelineStage {
  id: string
  label: string
  shortLabel: string
  phase: 'onboarding' | 'insights' | 'ongoing' | 'retest'
  memberCount: number
  medianDwellDays: number | null
  targetDwellDays: number | null
  trend: number
  oracleStage: string
  dataSource: 'tableau' | 'hubspot' | 'oracle' | 'derived'
  isBottleneck: boolean
}

const pipelineStages: PipelineStage[] = [
  { id: 'registered', label: 'Registered', shortLabel: 'Reg', phase: 'onboarding', memberCount: 18, medianDwellDays: 2, targetDwellDays: 1, trend: +3, oracleStage: 'Registration Complete', dataSource: 'tableau', isBottleneck: false },
  { id: 'clinician-assigned', label: 'Clinician Assigned', shortLabel: 'Assigned', phase: 'onboarding', memberCount: 12, medianDwellDays: 1, targetDwellDays: 1, trend: 0, oracleStage: 'Clinician Allocated', dataSource: 'hubspot', isBottleneck: false },
  { id: 'health-story', label: 'Health Story', shortLabel: 'HS', phase: 'onboarding', memberCount: 16, medianDwellDays: 4, targetDwellDays: 3, trend: -2, oracleStage: 'Health Story Submitted', dataSource: 'oracle', isBottleneck: false },
  { id: 'kit-transit', label: 'Kit in Transit', shortLabel: 'Kit', phase: 'onboarding', memberCount: 22, medianDwellDays: 5, targetDwellDays: 3, trend: +1, oracleStage: 'Kit Dispatched', dataSource: 'oracle', isBottleneck: false },
  { id: 'sample-collection', label: 'Sample Collection', shortLabel: 'Sample', phase: 'onboarding', memberCount: 14, medianDwellDays: 8, targetDwellDays: 7, trend: 0, oracleStage: 'Sample Received', dataSource: 'oracle', isBottleneck: false },
  { id: 'lab-processing', label: 'Lab Processing', shortLabel: 'Lab', phase: 'onboarding', memberCount: 23, medianDwellDays: 21, targetDwellDays: 14, trend: +2, oracleStage: 'Awaiting Results', dataSource: 'tableau', isBottleneck: true },
  { id: 'clinical-review', label: 'Clinical Review', shortLabel: 'Review', phase: 'onboarding', memberCount: 18, medianDwellDays: 5, targetDwellDays: 2, trend: +3, oracleStage: 'Clinical Review Complete', dataSource: 'oracle', isBottleneck: true },
  { id: 'doctor-signoff', label: 'Doctor Sign-off', shortLabel: 'Dr Sign', phase: 'onboarding', memberCount: 12, medianDwellDays: 4, targetDwellDays: 1, trend: +1, oracleStage: 'Doctor Sign-off', dataSource: 'oracle', isBottleneck: true },
  { id: 'dashboard-prep', label: 'Dashboard Prep', shortLabel: 'Prep', phase: 'onboarding', memberCount: 19, medianDwellDays: 3, targetDwellDays: 1, trend: -1, oracleStage: 'Report Prepared', dataSource: 'oracle', isBottleneck: true },
  { id: 'dashboard-live', label: 'Dashboard Live', shortLabel: 'Live', phase: 'insights', memberCount: 61, medianDwellDays: 14, targetDwellDays: 7, trend: +5, oracleStage: 'Dashboard Live', dataSource: 'tableau', isBottleneck: true },
  { id: 'insights-call', label: 'Insights Call', shortLabel: 'Insights', phase: 'insights', memberCount: 1, medianDwellDays: null, targetDwellDays: 3, trend: 0, oracleStage: 'Insights Call Complete', dataSource: 'oracle', isBottleneck: false },
  { id: 'active-plan', label: 'Active Plan', shortLabel: 'Active', phase: 'ongoing', memberCount: 46, medianDwellDays: null, targetDwellDays: null, trend: +4, oracleStage: 'Ongoing Monitoring', dataSource: 'tableau', isBottleneck: false },
  { id: 'retest-due', label: 'Retest Due', shortLabel: 'Retest', phase: 'retest', memberCount: 5, medianDwellDays: null, targetDwellDays: null, trend: +2, oracleStage: 'Retest Initiated', dataSource: 'oracle', isBottleneck: false },
]

const PHASE_COLORS = {
  onboarding: '#2D6A4F',
  insights: '#92400E',
  ongoing: '#3D5B6B',
  retest: '#5B4A6B',
}

// ═══════════════════════════════════════════════════════════════════════
// 02 Clinical Activity Report
// ═══════════════════════════════════════════════════════════════════════

interface ClinicalActivity {
  id: string
  label: string
  category: 'clinical' | 'operational' | 'member'
  today: number
  thisWeek: number
  lastWeek: number
  thisMonth: number
  trailing4wAvg: number
  sparkline: number[]
  target: number | null
  dataSource: 'oracle' | 'hubspot' | 'tableau' | 'derived'
  owner: string
}

const clinicalActivities: ClinicalActivity[] = [
  { id: 'health-stories', label: 'Health Stories Completed', category: 'clinical', today: 2, thisWeek: 8, lastWeek: 7, thisMonth: 32, trailing4wAvg: 7.5, sparkline: [1,2,1,3,2,1,2,3,1,2,2,1,3,2,1,2,3,1,2,2,1,3,2,1,2,3,1,2,2,2], target: 3, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'welcome-calls', label: 'Welcome Calls Completed', category: 'clinical', today: 1, thisWeek: 5, lastWeek: 4, thisMonth: 22, trailing4wAvg: 5.0, sparkline: [1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1], target: 2, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'clinical-reviews', label: 'Clinical Reviews Completed', category: 'clinical', today: 3, thisWeek: 12, lastWeek: 10, thisMonth: 45, trailing4wAvg: 10.5, sparkline: [2,1,3,2,1,2,3,2,1,2,3,2,1,3,2,2,1,3,2,1,2,3,2,1,2,3,2,1,3,3], target: 3, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'doctor-signoffs', label: 'Doctor Sign-offs', category: 'clinical', today: 2, thisWeek: 10, lastWeek: 8, thisMonth: 38, trailing4wAvg: 9.0, sparkline: [1,2,1,1,2,1,2,1,1,2,1,2,1,1,2,2,1,2,1,1,2,1,2,1,1,2,1,2,2,2], target: 3, dataSource: 'oracle', owner: 'Dr Mohan / Dr Team' },
  { id: 'dashboards-published', label: 'Dashboards Published', category: 'clinical', today: 1, thisWeek: 8, lastWeek: 5, thisMonth: 28, trailing4wAvg: 6.5, sparkline: [0,1,1,0,1,0,1,1,0,1,1,0,1,1,0,1,2,1,1,0,1,2,1,1,1,2,1,1,1,1], target: 3, dataSource: 'tableau', owner: 'Clinical Team' },
  { id: 'insights-calls', label: 'Insights Calls Completed', category: 'clinical', today: 0, thisWeek: 1, lastWeek: 0, thisMonth: 3, trailing4wAvg: 0.5, sparkline: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0], target: 5, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'supplement-protocols', label: 'Supplement Protocols Created', category: 'clinical', today: 2, thisWeek: 9, lastWeek: 7, thisMonth: 35, trailing4wAvg: 8.0, sparkline: [1,1,2,1,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,2,2], target: 3, dataSource: 'oracle', owner: 'Clinical Team' },
  { id: 'kits-dispatched', label: 'Kits Dispatched', category: 'operational', today: 3, thisWeek: 14, lastWeek: 12, thisMonth: 52, trailing4wAvg: 13.0, sparkline: [1,2,2,1,2,2,1,2,2,2,1,2,2,1,2,3,2,1,2,2,2,3,2,1,2,3,2,2,3,3], target: null, dataSource: 'oracle', owner: 'Operations' },
  { id: 'kit-qc-failures', label: 'Kit QC Failures', category: 'operational', today: 0, thisWeek: 2, lastWeek: 3, thisMonth: 8, trailing4wAvg: 2.5, sparkline: [0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,0,0], target: null, dataSource: 'oracle', owner: 'Operations' },
  { id: 'results-received', label: 'Lab Results Received', category: 'operational', today: 4, thisWeek: 15, lastWeek: 13, thisMonth: 55, trailing4wAvg: 14.0, sparkline: [1,2,2,1,2,2,2,1,2,2,2,1,2,3,2,1,2,2,2,3,2,1,2,3,2,2,3,2,4,4], target: null, dataSource: 'oracle', owner: 'Lab / External' },
  { id: 'supplement-purchases', label: 'Supplement Purchases', category: 'member', today: 1, thisWeek: 6, lastWeek: 5, thisMonth: 24, trailing4wAvg: 5.5, sparkline: [0,1,1,0,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,0,1,1], target: null, dataSource: 'oracle', owner: 'Member-initiated' },
  { id: 'ad-hoc-support', label: 'Ad-hoc Clinician Requests', category: 'member', today: 2, thisWeek: 8, lastWeek: 6, thisMonth: 30, trailing4wAvg: 7.0, sparkline: [1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,2,1,1,1,0,1,2,1,1,1,2,1,2,2], target: null, dataSource: 'oracle', owner: 'Clinical Team' },
]

// ═══════════════════════════════════════════════════════════════════════
// 03 Stage Conversion & Timing
// ═══════════════════════════════════════════════════════════════════════

interface StageTransition {
  from: string
  to: string
  conversionRate: number
  medianDays: number | null
  targetDays: number
  trend: number[]
  memberCount: number
  dataSource: 'tableau' | 'oracle' | 'derived'
}

const stageTransitions: StageTransition[] = [
  { from: 'Registration', to: 'Clinician Assigned', conversionRate: 98, medianDays: 1, targetDays: 1, trend: [95,96,97,97,98,98], memberCount: 284, dataSource: 'derived' },
  { from: 'Clinician Assigned', to: 'Health Story', conversionRate: 92, medianDays: 3, targetDays: 2, trend: [88,89,90,91,91,92], memberCount: 272, dataSource: 'oracle' },
  { from: 'Health Story', to: 'Kit Dispatch', conversionRate: 88, medianDays: 2, targetDays: 1, trend: [82,84,85,86,87,88], memberCount: 248, dataSource: 'oracle' },
  { from: 'Kit Dispatch', to: 'Sample at Lab', conversionRate: 85, medianDays: 8, targetDays: 7, trend: [80,82,83,84,85,85], memberCount: 216, dataSource: 'oracle' },
  { from: 'Sample at Lab', to: 'Results Ready', conversionRate: 100, medianDays: 21, targetDays: 14, trend: [100,100,100,100,100,100], memberCount: 189, dataSource: 'tableau' },
  { from: 'Results Ready', to: 'Clinical Review', conversionRate: 95, medianDays: 5, targetDays: 2, trend: [90,91,92,93,94,95], memberCount: 189, dataSource: 'oracle' },
  { from: 'Clinical Review', to: 'Doctor Sign-off', conversionRate: 90, medianDays: 4, targetDays: 1, trend: [85,86,87,88,89,90], memberCount: 180, dataSource: 'oracle' },
  { from: 'Doctor Sign-off', to: 'Dashboard Published', conversionRate: 85, medianDays: 3, targetDays: 1, trend: [78,80,82,83,84,85], memberCount: 162, dataSource: 'tableau' },
  { from: 'Dashboard', to: 'Insights Call', conversionRate: 2, medianDays: null, targetDays: 7, trend: [0,0,0,1,1,2], memberCount: 61, dataSource: 'oracle' },
  { from: 'Insights Call', to: 'Active Plan', conversionRate: 100, medianDays: 1, targetDays: 1, trend: [100,100,100,100,100,100], memberCount: 1, dataSource: 'oracle' },
]

// ═══════════════════════════════════════════════════════════════════════
// 04 Clinician Load — Tenure-Weighted Intensity
// ═══════════════════════════════════════════════════════════════════════

interface ClinicianTenureLoad {
  name: string
  month1: number
  month2: number
  month3: number
  month4plus: number
  total: number
  weightedHours: number
  availableHours: number
  utilisationPct: number
}

const TIME_WEIGHTS = { month1: 2.5, month2: 1.5, month3: 0.75, month4plus: 0.25 }

const clinicianTenureData: ClinicianTenureLoad[] = [
  { name: 'Katie Kell', month1: 8, month2: 12, month3: 10, month4plus: 23, total: 53, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Alia Jaghbir', month1: 6, month2: 10, month3: 12, month4plus: 23, total: 51, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Paula Aguina', month1: 7, month2: 11, month3: 11, month4plus: 22, total: 51, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Isabelle Baissac', month1: 5, month2: 8, month3: 10, month4plus: 25, total: 48, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Jaclyn Blueming', month1: 3, month2: 4, month3: 3, month4plus: 4, total: 14, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
  { name: 'Marko Papuckovski', month1: 2, month2: 3, month3: 2, month4plus: 2, total: 9, weightedHours: 0, availableHours: 132, utilisationPct: 0 },
]

clinicianTenureData.forEach(c => {
  c.weightedHours = c.month1 * TIME_WEIGHTS.month1 + c.month2 * TIME_WEIGHTS.month2 + c.month3 * TIME_WEIGHTS.month3 + c.month4plus * TIME_WEIGHTS.month4plus
  c.utilisationPct = Math.round((c.weightedHours / c.availableHours) * 100)
})

// ═══════════════════════════════════════════════════════════════════════
// 05 Action Queue
// ═══════════════════════════════════════════════════════════════════════

interface ActionItem {
  type: string
  label: string
  count: number
  owner: string
  urgentCount: number
  detail: string
}

const actionQueue: ActionItem[] = [
  { type: 'clinical-review', label: 'Clinical Reviews Pending', count: 18, owner: 'Clinical Team', urgentCount: 7, detail: '7 waiting 5+ days, 5 from yesterday, 6 since today' },
  { type: 'doctor-signoff', label: 'Doctor Sign-offs Pending', count: 12, owner: 'Dr Mohan', urgentCount: 4, detail: "4 waiting 4+ days. All from Katie and Paula's patients." },
  { type: 'dashboard-publish', label: 'Dashboards Ready to Publish', count: 19, owner: 'Clinical Team', urgentCount: 11, detail: '11 members waiting 30+ days. 3 waiting 90+ days.' },
  { type: 'insights-call', label: 'Insights Calls to Schedule', count: 60, owner: 'Clinical Team', urgentCount: 60, detail: '60 members have dashboards but no insights call scheduled.' },
  { type: 'welcome-call', label: 'Welcome Calls Scheduled Today', count: 3, owner: 'Katie, Alia', urgentCount: 0, detail: '10:00 — Member #089 (Katie), 14:00 — Member #142 (Alia), 16:00 — Member #201 (Katie)' },
  { type: 'supplement-protocol', label: 'Supplement Protocols to Create', count: 6, owner: 'Clinical Team', urgentCount: 2, detail: 'For members who completed welcome call this week. 2 overdue from last week.' },
  { type: 'kit-qc', label: 'Kit QC Failures to Resolve', count: 2, owner: 'Operations', urgentCount: 2, detail: 'Member #142 — kit returned damaged. Member #289 — sample insufficient.' },
]

// ═══════════════════════════════════════════════════════════════════════
// 06 Capacity Model (carried forward)
// ═══════════════════════════════════════════════════════════════════════

const capacityForecastMonthly = [
  { month: 'Jan 2026', demand: 480, capacity: 554 },
  { month: 'Feb 2026', demand: 510, capacity: 554 },
  { month: 'Mar 2026', demand: 530, capacity: 554 },
  { month: 'Apr 2026', demand: 545, capacity: 554 },
  { month: 'May 2026', demand: 570, capacity: 554 },
  { month: 'Jun 2026', demand: 600, capacity: 554 },
]

const capacityForecastQuarterly = [
  { month: 'Q4 2025', demand: 440, capacity: 554 },
  { month: 'Q1 2026', demand: 507, capacity: 554 },
  { month: 'Q2 2026', demand: 572, capacity: 554 },
]

type HiringScenario = 'current' | 'plus1-apr' | 'plus2-apr' | 'plus1-jun'
const HOURS_PER_CLINICIAN = 110

function getCapacityForecast(scenario: HiringScenario) {
  return capacityForecastMonthly.map((row) => {
    let extra = 0
    const monthIndex = capacityForecastMonthly.indexOf(row)
    if (scenario === 'plus1-apr' && monthIndex >= 3) extra = HOURS_PER_CLINICIAN
    if (scenario === 'plus2-apr' && monthIndex >= 3) extra = HOURS_PER_CLINICIAN * 2
    if (scenario === 'plus1-jun' && monthIndex >= 5) extra = HOURS_PER_CLINICIAN
    return { ...row, capacity: row.capacity + extra }
  })
}

const scenarioDescriptions: Record<HiringScenario, string> = {
  current: 'No additional hires. Demand exceeds capacity by May 2026.',
  'plus1-apr': '+1 clinician from April adds 110h/mo. Capacity gap closed through June.',
  'plus2-apr': '+2 clinicians from April adds 220h/mo. Surplus maintained through June.',
  'plus1-jun': '+1 clinician from June adds 110h/mo. Gap persists April-May before relief.',
}

// ═══════════════════════════════════════════════════════════════════════
// 07 Clinical Efficiency (carried forward)
// ═══════════════════════════════════════════════════════════════════════

const timePerMemberMonthly = [
  { month: 'Sep 2025', actual: 0.9, model: 0.5 },
  { month: 'Oct 2025', actual: 0.85, model: 0.5 },
  { month: 'Nov 2025', actual: 0.82, model: 0.5 },
  { month: 'Dec 2025', actual: 0.78, model: 0.5 },
  { month: 'Jan 2026', actual: 0.75, model: 0.5 },
  { month: 'Feb 2026', actual: 0.72, model: 0.5 },
]

const timePerMemberQuarterly = [
  { month: 'Q3 2025', actual: 0.86, model: 0.5 },
  { month: 'Q4 2025', actual: 0.79, model: 0.5 },
  { month: 'Q1 2026', actual: 0.73, model: 0.5 },
]

const newVsReturning = [
  { month: 'Sep 2025', newMember: 1.2, returning: 0.6 },
  { month: 'Oct 2025', newMember: 1.15, returning: 0.58 },
  { month: 'Nov 2025', newMember: 1.1, returning: 0.55 },
  { month: 'Dec 2025', newMember: 1.05, returning: 0.52 },
  { month: 'Jan 2026', newMember: 1.0, returning: 0.5 },
  { month: 'Feb 2026', newMember: 0.95, returning: 0.48 },
]

const costTrendData = [
  { month: 'Sep 2025', Katie: 63, Alia: 60, Paula: 57, Isabelle: 55, Jaclyn: 53, Marko: 50 },
  { month: 'Nov 2025', Katie: 61, Alia: 58, Paula: 55, Isabelle: 53, Jaclyn: 50, Marko: 48 },
  { month: 'Jan 2026', Katie: 59, Alia: 56, Paula: 53, Isabelle: 51, Jaclyn: 49, Marko: 47 },
  { month: 'Mar 2026', Katie: 58, Alia: 55, Paula: 52, Isabelle: 50, Jaclyn: 48, Marko: 46 },
]

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function dwellStatusColor(median: number | null, target: number | null): Status {
  if (median === null || target === null) return 'grey'
  if (median <= target) return 'green'
  if (median <= target * 2) return 'amber'
  return 'red'
}

function dwellTextColor(s: Status): string {
  return s === 'green' ? 'text-status-green' : s === 'amber' ? 'text-status-amber' : s === 'red' ? 'text-status-red' : 'text-dash-text-muted'
}

// ═══════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════

export default function ClinicalPage() {
  const { clinicians, members, dataMode } = useDashboardData()

  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [expandedAction, setExpandedAction] = useState<string | null>(null)

  // Chart period toggles
  const [timePerMemberPeriod, setTimePerMemberPeriod] = useState('monthly')
  const [capacityPeriod, setCapacityPeriod] = useState('monthly')
  const [hiringScenario, setHiringScenario] = useState<HiringScenario>('current')

  const timePerMemberData = timePerMemberPeriod === 'monthly' ? timePerMemberMonthly : timePerMemberQuarterly

  const baseCapacity = capacityPeriod === 'monthly' ? capacityForecastMonthly : capacityForecastQuarterly
  const capacityData = useMemo(() => {
    if (capacityPeriod === 'quarterly') return baseCapacity
    return getCapacityForecast(hiringScenario)
  }, [hiringScenario, capacityPeriod, baseCapacity])

  // Pipeline stats
  const totalInPipeline = pipelineStages.reduce((s, p) => s + p.memberCount, 0)
  const bottleneckCount = pipelineStages.filter(p => p.isBottleneck).length

  // Oracle data available check
  const hasOracle = dataMode === 'demo'

  return (
    <div className="space-y-4 md:space-y-10">
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Delivery' }]} />
        <div className="flex items-center gap-2">
          <DataSourceBadge source="hubspot" />
          <DataSourceBadge source="tableau" />
          <DataSourceBadge source="manual" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 01 Journey Pipeline — Kanban Flow                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={1} title="Journey Pipeline" />

        {/* Phase colour legend */}
        <div className="mb-4 flex flex-wrap gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: PHASE_COLORS.onboarding }} /> Onboarding
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: PHASE_COLORS.insights }} /> Insights & Results
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: PHASE_COLORS.ongoing }} /> Ongoing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: PHASE_COLORS.retest }} /> Retest
          </span>
        </div>

        {/* Pipeline cards — horizontal scroll */}
        <div className="overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
          <div className="flex gap-1.5 min-w-max md:gap-2">
            {pipelineStages.map((stage, i) => {
              const phaseColor = PHASE_COLORS[stage.phase]
              const status = dwellStatusColor(stage.medianDwellDays, stage.targetDwellDays)
              const textColor = dwellTextColor(status)

              return (
                <Fragment key={stage.id}>
                  {i > 0 && (
                    <div className="flex items-center text-dash-text-muted">
                      <ChevronRight size={14} className="md:h-4 md:w-4" />
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedStage(selectedStage?.id === stage.id ? null : stage)}
                    className={cn(
                      'flex flex-col rounded-lg border bg-dash-surface p-2.5 transition-colors hover:border-dash-border-strong',
                      'w-[100px] shrink-0 md:w-[120px]',
                      stage.isBottleneck ? 'border-status-red' : 'border-dash-border',
                      selectedStage?.id === stage.id && 'ring-2 ring-dash-red',
                    )}
                  >
                    <div className="mb-1.5 h-1 w-full rounded-full md:mb-2" style={{ backgroundColor: phaseColor }} />
                    <span className="text-[9px] font-medium uppercase leading-tight tracking-wide text-dash-text-secondary md:text-[10px]">
                      <span className="md:hidden">{stage.shortLabel}</span>
                      <span className="hidden md:inline">{stage.label}</span>
                    </span>
                    <span className="mt-0.5 font-mono text-xl font-bold text-dash-text md:mt-1 md:text-2xl">
                      {stage.memberCount}
                    </span>
                    <div className="mt-0.5 md:mt-1">
                      <TrendIndicator value={stage.trend} />
                    </div>
                    {stage.medianDwellDays !== null && (
                      <div className="mt-1.5 border-t border-dash-border pt-1.5 md:mt-2 md:pt-2">
                        <span className={cn('font-mono text-xs font-bold', textColor)}>
                          {stage.medianDwellDays}d
                        </span>
                        <span className="text-[9px] text-dash-text-muted md:text-[10px]"> / {stage.targetDwellDays}d</span>
                      </div>
                    )}
                    {stage.dataSource === 'oracle' && (
                      <span className="mt-0.5 text-[8px] italic text-dash-text-muted md:mt-1 md:text-[9px]">Oracle</span>
                    )}
                  </button>
                </Fragment>
              )
            })}
          </div>
        </div>

        {/* Selected stage detail */}
        {selectedStage && (
          <div className="mt-3 rounded-lg border border-dash-border bg-dash-surface p-3 md:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-dash-text">{selectedStage.label}</h3>
                <p className="text-xs text-dash-text-muted">{selectedStage.oracleStage} &middot; Source: {selectedStage.dataSource}</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-dash-text-secondary"><span className="font-mono font-bold text-dash-text">{selectedStage.memberCount}</span> members</span>
                {selectedStage.medianDwellDays !== null && (
                  <span className="text-dash-text-secondary">Dwell: <span className={cn('font-mono font-bold', dwellTextColor(dwellStatusColor(selectedStage.medianDwellDays, selectedStage.targetDwellDays)))}>{selectedStage.medianDwellDays}d</span> / {selectedStage.targetDwellDays}d</span>
                )}
              </div>
            </div>
            {selectedStage.isBottleneck && (
              <div className="mt-2 rounded bg-status-red/5 px-3 py-2 text-xs text-status-red">
                Bottleneck: median dwell exceeds target by {selectedStage.medianDwellDays !== null && selectedStage.targetDwellDays !== null ? Math.round(((selectedStage.medianDwellDays - selectedStage.targetDwellDays) / selectedStage.targetDwellDays) * 100) : 0}%
              </div>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs md:mt-4 md:gap-6">
          <span className="text-dash-text-secondary">
            Total in pipeline: <span className="font-mono font-bold text-dash-text">{totalInPipeline}</span>
          </span>
          <span className="text-dash-text-secondary">
            Bottlenecks: <span className="font-mono font-bold text-status-red">{bottleneckCount} stages</span>
          </span>
          <span className="text-dash-text-secondary">
            End-to-end median: <span className="font-mono font-bold text-dash-text">77d</span>
            <span className="text-dash-text-muted"> / 40d target</span>
          </span>
        </div>

        {!hasOracle && dataMode === 'actual' && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-dash-surface-alt px-3 py-2 text-[11px] text-dash-text-muted">
            <span>8 of 13 stages require Oracle data pipeline.</span>
            <Link href="/admin/registry" className="text-dash-red hover:underline">View data roadmap &rarr;</Link>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 02 Clinical Activity Report                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={2} title="Clinical Activity Report" />

        {/* Mobile: stacked cards */}
        <div className="space-y-2 md:hidden">
          {(['clinical', 'operational', 'member'] as const).map(cat => (
            <div key={cat}>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-dash-text-muted">
                {cat === 'clinical' ? 'Clinical' : cat === 'operational' ? 'Operational' : 'Member-Initiated'}
              </h3>
              {clinicalActivities.filter(a => a.category === cat).map(activity => {
                const weekDelta = activity.thisWeek - activity.lastWeek
                const todayVsTarget = activity.target ? (activity.today >= activity.target ? 'green' : activity.today >= activity.target * 0.5 ? 'amber' : 'red') : null
                const todayColor = todayVsTarget === 'green' ? 'text-status-green' : todayVsTarget === 'red' ? 'text-status-red' : todayVsTarget === 'amber' ? 'text-status-amber' : 'text-dash-text'

                return (
                  <div key={activity.id} className="rounded-lg border border-dash-border bg-dash-surface p-3 mb-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-dash-text">{activity.label}</span>
                      <span className={cn('font-mono text-lg font-bold', todayColor)}>{activity.today}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-dash-text-muted">
                      <span>Wk: <span className="font-mono text-dash-text">{activity.thisWeek}</span> ({weekDelta >= 0 ? '+' : ''}{weekDelta})</span>
                      <span>Mo: <span className="font-mono text-dash-text">{activity.thisMonth}</span></span>
                      {activity.target && <span>Target: {activity.target}/d</span>}
                    </div>
                    <div className="mt-1.5">
                      <Sparkline data={activity.sparkline} width={160} height={16} color="#8B0000" />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface-alt">
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Activity</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Today</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">This Week</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Last Week</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">4wk Avg</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">This Month</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">30d Trend</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {(['clinical', 'operational', 'member'] as const).map(cat => (
                <Fragment key={cat}>
                  <tr className="bg-dash-surface-alt/50">
                    <td colSpan={8} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-dash-text-muted">
                      {cat === 'clinical' ? 'Clinical Activities' : cat === 'operational' ? 'Operational Activities' : 'Member-Initiated Activities'}
                    </td>
                  </tr>
                  {clinicalActivities.filter(a => a.category === cat).map(activity => {
                    const weekDelta = activity.thisWeek - activity.lastWeek
                    const todayVsTarget = activity.target ? (activity.today >= activity.target ? 'green' : activity.today >= activity.target * 0.5 ? 'amber' : 'red') : null
                    const todayColor = todayVsTarget === 'green' ? 'text-status-green' : todayVsTarget === 'red' ? 'text-status-red' : todayVsTarget === 'amber' ? 'text-status-amber' : 'text-dash-text'

                    return (
                      <tr key={activity.id}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-dash-text">{activity.label}</span>
                          {activity.target && (
                            <span className="ml-2 text-[10px] text-dash-text-muted">target: {activity.target}/day</span>
                          )}
                        </td>
                        <td className={cn('px-4 py-3 text-right font-mono font-bold', todayColor)}>
                          {activity.today}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-dash-text">
                          <span className="font-bold">{activity.thisWeek}</span>
                          <span className={cn('ml-1 text-[10px]', weekDelta > 0 ? 'text-status-green' : weekDelta < 0 ? 'text-status-red' : 'text-dash-text-muted')}>
                            {weekDelta > 0 ? '+' : ''}{weekDelta}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-dash-text-secondary">{activity.lastWeek}</td>
                        <td className="px-4 py-3 text-right font-mono text-dash-text-secondary">{activity.trailing4wAvg.toFixed(1)}/wk</td>
                        <td className="px-4 py-3 text-right font-mono text-dash-text">{activity.thisMonth}</td>
                        <td className="px-4 py-3">
                          <Sparkline data={activity.sparkline} width={100} height={20} color="#8B0000" />
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-dash-surface-alt text-dash-text-muted">
                            {activity.dataSource}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Key callouts */}
        <div className="mt-3 space-y-2 md:mt-4">
          <div className="rounded-lg border-l-[3px] border-status-red bg-dash-surface p-3 md:p-4">
            <p className="text-xs font-medium text-dash-text md:text-sm">
              Insights Calls: <span className="font-mono">1 this week, 3 this month.</span> Target is 5/day. This step is barely happening &mdash; 1 of 284 members has completed an insights call.
            </p>
          </div>
          <div className="rounded-lg border-l-[3px] border-status-green bg-dash-surface p-3 md:p-4">
            <p className="text-xs font-medium text-dash-text md:text-sm">
              Clinical Reviews up 20% week-on-week (12 vs 10). Pipeline clearing velocity improving.
            </p>
          </div>
        </div>

        {!hasOracle && dataMode === 'actual' && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-dash-surface-alt px-3 py-2 text-[11px] text-dash-text-muted">
            <span>Requires Oracle data pipeline.</span>
            <Link href="/admin/registry" className="text-dash-red hover:underline">View data roadmap &rarr;</Link>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 03 Stage Conversion & Timing                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={3} title="Stage Conversion & Timing" />

        {/* Mobile: stacked cards */}
        <div className="space-y-2 md:hidden">
          {stageTransitions.map(t => {
            const convColor = t.conversionRate >= 90 ? 'text-status-green' : t.conversionRate >= 70 ? 'text-status-amber' : 'text-status-red'
            const timeStatus = dwellStatusColor(t.medianDays, t.targetDays)
            const timeColor = dwellTextColor(timeStatus)

            return (
              <div key={`${t.from}-${t.to}`} className={cn('rounded-lg border border-dash-border bg-dash-surface p-3', t.conversionRate < 10 && 'border-status-red bg-status-red/5')}>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-dash-text-secondary">{t.from}</span>
                  <span className="text-dash-text-muted">&rarr;</span>
                  <span className="font-medium text-dash-text">{t.to}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <span className={cn('font-mono text-xl font-bold', convColor)}>{t.conversionRate}%</span>
                    <span className="ml-2 text-[10px] text-dash-text-muted">conversion</span>
                  </div>
                  <div className="text-right">
                    <span className={cn('font-mono text-sm font-bold', timeColor)}>{t.medianDays !== null ? `${t.medianDays}d` : '—'}</span>
                    <span className="ml-1 text-[10px] text-dash-text-muted">/ {t.targetDays}d</span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-dash-text-muted">
                  <span>n={t.memberCount}</span>
                  <Sparkline data={t.trend} width={60} height={14} color={t.conversionRate < 10 ? '#DC2626' : '#16A34A'} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface-alt">
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Transition</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Conv %</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">6mo Trend</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Median</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Target</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">n at stage</th>
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {stageTransitions.map(t => {
                const convStatus = t.conversionRate >= 90 ? 'green' : t.conversionRate >= 70 ? 'amber' : 'red'
                const convColor = convStatus === 'green' ? 'text-status-green' : convStatus === 'amber' ? 'text-status-amber' : 'text-status-red'
                const timeStatus = dwellStatusColor(t.medianDays, t.targetDays)
                const timeColor = dwellTextColor(timeStatus)

                return (
                  <tr key={`${t.from}-${t.to}`} className={t.conversionRate < 10 ? 'bg-status-red/5' : ''}>
                    <td className="px-4 py-3">
                      <span className="text-dash-text-secondary">{t.from}</span>
                      <span className="mx-2 text-dash-text-muted">&rarr;</span>
                      <span className="font-medium text-dash-text">{t.to}</span>
                    </td>
                    <td className={cn('px-4 py-3 text-right font-mono font-bold', convColor)}>
                      {t.conversionRate}%
                    </td>
                    <td className="px-4 py-3">
                      <Sparkline data={t.trend} width={80} height={20} color={convStatus === 'red' ? '#DC2626' : '#16A34A'} />
                    </td>
                    <td className={cn('px-4 py-3 text-right font-mono font-bold', timeColor)}>
                      {t.medianDays !== null ? `${t.medianDays}d` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text-muted">
                      {t.targetDays}d
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text-secondary">
                      {t.memberCount}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-dash-surface-alt text-dash-text-muted">
                        {t.dataSource}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Screaming callout */}
        <div className="mt-3 rounded-lg border-2 border-status-red bg-status-red/5 p-4 md:mt-4 md:p-5">
          <p className="text-sm font-bold text-status-red">
            Dashboard &rarr; Insights Call: 2% conversion.
          </p>
          <p className="mt-1 text-xs text-dash-text md:text-sm">
            61 members have a live dashboard. 1 has completed an insights call. This is the single biggest drop-off in the entire journey.
            Either the call isn&apos;t being scheduled, or members aren&apos;t booking, or the process doesn&apos;t exist yet.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 04 Clinician Load — Tenure-Weighted Intensity                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={4} title="Clinician Load — Tenure-Weighted Intensity" />

        <p className="mb-3 text-[10px] text-dash-text-muted md:mb-4 md:text-xs">
          Month 1 members require ~{TIME_WEIGHTS.month1}h/month. Month 2: ~{TIME_WEIGHTS.month2}h. Month 3: ~{TIME_WEIGHTS.month3}h. Month 4+: ~{TIME_WEIGHTS.month4plus}h.
          Weighted hours = sum of (members x hourly weight). Utilisation = weighted hours / {clinicianTenureData[0].availableHours}h available.
        </p>

        {/* Mobile: stacked cards */}
        <div className="space-y-2 md:hidden">
          {clinicianTenureData.map(c => {
            const utilColor = c.utilisationPct > 85 ? 'text-status-red' : c.utilisationPct > 70 ? 'text-status-amber' : 'text-status-green'
            return (
              <div key={c.name} className="rounded-lg border border-dash-border bg-dash-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-dash-text">{c.name}</span>
                  <span className={cn('font-mono text-lg font-bold', utilColor)}>{c.utilisationPct}%</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div>
                    <div className="font-semibold text-status-red">M1</div>
                    <div className="font-mono text-dash-text">{c.month1}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-status-amber">M2</div>
                    <div className="font-mono text-dash-text">{c.month2}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-status-green">M3</div>
                    <div className="font-mono text-dash-text">{c.month3}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-dash-text-muted">M4+</div>
                    <div className="font-mono text-dash-text">{c.month4plus}</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-dash-text-muted">
                  <span>Total: {c.total}</span>
                  <span>{c.weightedHours.toFixed(1)}h weighted</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto rounded-lg border border-dash-border md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-dash-surface-alt">
                <th className="px-4 py-3 font-semibold text-dash-text-secondary">Clinician</th>
                <th className="px-4 py-3 text-right font-semibold text-status-red">Month 1</th>
                <th className="px-4 py-3 text-right font-semibold text-status-amber">Month 2</th>
                <th className="px-4 py-3 text-right font-semibold text-status-green">Month 3</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-muted">Month 4+</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Total</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Weighted Hours</th>
                <th className="px-4 py-3 text-right font-semibold text-dash-text-secondary">Utilisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {clinicianTenureData.map(c => {
                const maxMonth1 = Math.max(...clinicianTenureData.map(x => x.month1))
                const maxMonth2 = Math.max(...clinicianTenureData.map(x => x.month2))
                const m1Intensity = c.month1 / maxMonth1
                const m2Intensity = c.month2 / maxMonth2
                const utilColor = c.utilisationPct > 85 ? 'text-status-red' : c.utilisationPct > 70 ? 'text-status-amber' : 'text-status-green'

                return (
                  <tr key={c.name}>
                    <td className="px-4 py-3 font-medium text-dash-text">{c.name}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold" style={{ backgroundColor: `rgba(139, 0, 0, ${m1Intensity * 0.2})` }}>
                      {c.month1}
                    </td>
                    <td className="px-4 py-3 text-right font-mono" style={{ backgroundColor: `rgba(217, 119, 6, ${m2Intensity * 0.15})` }}>
                      {c.month2}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text-secondary">{c.month3}</td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text-muted">{c.month4plus}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-dash-text">{c.total}</td>
                    <td className="px-4 py-3 text-right font-mono text-dash-text">{c.weightedHours.toFixed(1)}h</td>
                    <td className={cn('px-4 py-3 text-right font-mono font-bold', utilColor)}>{c.utilisationPct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Projection callout */}
        <div className="mt-3 rounded-lg border border-dash-border bg-dash-surface p-3 md:mt-4 md:p-4">
          <p className="text-xs text-dash-text md:text-sm">
            <span className="font-semibold">Scaling impact:</span> At 200 new members/month, each clinician absorbs ~33 new month-1 members,
            adding ~82.5 weighted hours. Katie&apos;s utilisation would jump from {clinicianTenureData[0].utilisationPct}% to {Math.min(100, clinicianTenureData[0].utilisationPct + Math.round(82.5/132*100))}%.
            <span className="font-semibold text-status-red"> Capacity breach within 4 weeks at current staffing.</span>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 05 Action Queue — Today                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={5} title="Action Queue — Today" />
        <div className="space-y-2">
          {actionQueue.map(item => (
            <button
              key={item.type}
              onClick={() => setExpandedAction(expandedAction === item.type ? null : item.type)}
              className="w-full rounded-lg border border-dash-border bg-dash-surface p-3 text-left transition-colors hover:border-dash-border-strong md:p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold md:h-8 md:w-8 md:text-sm',
                    item.urgentCount > 0 ? 'bg-status-red/10 text-status-red' : 'bg-dash-surface-alt text-dash-text-secondary'
                  )}>
                    {item.count}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-dash-text md:text-sm">{item.label}</span>
                    {item.urgentCount > 0 && (
                      <span className="ml-2 hidden rounded-full bg-status-red/10 px-2 py-0.5 text-[10px] font-semibold text-status-red sm:inline-block">
                        {item.urgentCount} urgent
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] text-dash-text-secondary md:text-xs">{item.owner}</span>
              </div>
              <p className="mt-1.5 text-[10px] text-dash-text-muted md:mt-2 md:text-xs">{item.detail}</p>
              {item.urgentCount > 0 && (
                <span className="mt-1 inline-block rounded-full bg-status-red/10 px-2 py-0.5 text-[9px] font-semibold text-status-red sm:hidden">
                  {item.urgentCount} urgent
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 06 Capacity Model (carried forward)                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={6} title="Capacity Model" />

        <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Demand vs Capacity — Next 6 Months (Hours)
            </h3>
            <ChartPeriodToggle
              options={[
                { label: 'Monthly', value: 'monthly' },
                { label: 'Quarterly', value: 'quarterly' },
              ]}
              selected={capacityPeriod}
              onChange={setCapacityPeriod}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-dash-text-secondary">Scenario:</span>
            {([
              { value: 'current', label: 'Current Staff' },
              { value: 'plus1-apr', label: '+1 Hire (Apr)' },
              { value: 'plus2-apr', label: '+2 Hires (Apr)' },
              { value: 'plus1-jun', label: '+1 Hire (Jun)' },
            ] as { value: HiringScenario; label: string }[]).map((s) => (
              <button
                key={s.value}
                onClick={() => setHiringScenario(s.value)}
                className={`rounded-md px-2.5 py-1 font-sans text-[11px] font-medium transition-colors ${
                  hiringScenario === s.value
                    ? 'bg-dash-accent text-white'
                    : 'border border-dash-border text-dash-text-muted hover:bg-dash-surface-hover hover:text-dash-text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={224} className="h-44 md:h-56">
            <RechartLineChart data={capacityData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Line type="monotone" dataKey="demand" name="Demand" stroke={TMRW_COLORS.red} strokeWidth={3} dot={lineDot(TMRW_COLORS.red)} />
              <Line type="monotone" dataKey="capacity" name="Capacity" stroke={TMRW_COLORS.green} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: TMRW_COLORS.green, stroke: '#fff', strokeWidth: 1 }} />
            </RechartLineChart>
          </ResponsiveContainer>

          <div className="mt-3 rounded border border-dash-border bg-dash-bg p-3">
            <p className="text-xs text-dash-text-secondary">
              {scenarioDescriptions[hiringScenario]}
            </p>
          </div>

          <AlertCard
            severity="high"
            title="At current staffing, demand exceeds capacity in Month 5 (May 2026)."
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 07 Clinical Efficiency (carried forward)                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={7} title="Clinical Efficiency" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
                Avg Clinician Hours per Member per Month
              </h3>
              <ChartPeriodToggle
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Quarterly', value: 'quarterly' },
                ]}
                selected={timePerMemberPeriod}
                onChange={setTimePerMemberPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={192} className="h-36 md:h-48">
              <RechartLineChart data={timePerMemberData}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke={TMRW_COLORS.blue} strokeWidth={3} dot={lineDot(TMRW_COLORS.blue, 4)} />
                <Line type="monotone" dataKey="model" name="Model" stroke={TMRW_COLORS.grey} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: TMRW_COLORS.grey, stroke: '#fff', strokeWidth: 1 }} />
              </RechartLineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-dash-text-muted">
              Model assumes 0.5h per member. Actual converging but still 44% above model.
            </p>
          </div>

          <div className="rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              New vs Returning Member Time (Hours)
            </h3>
            <ResponsiveContainer width="100%" height={192} className="h-36 md:h-48">
              <RechartLineChart data={newVsReturning}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="newMember" name="New Member" stroke={TMRW_COLORS.purple} strokeWidth={3} dot={lineDot(TMRW_COLORS.purple, 4)} />
                <Line type="monotone" dataKey="returning" name="Returning" stroke={TMRW_COLORS.cyan} strokeWidth={3} dot={lineDot(TMRW_COLORS.cyan, 4)} />
              </RechartLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dash-border bg-dash-surface p-4 md:p-5">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
            Cost per Case by Clinician (at $70/hr)
          </h3>
          <ResponsiveContainer width="100%" height={192} className="h-36 md:h-48">
            <RechartLineChart data={costTrendData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisTickStyle} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} axisLine={axisLineStyle} width={40} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v}`} />
              <Legend wrapperStyle={{ ...legendStyle, fontSize: 12 }} />
              <Line type="monotone" dataKey="Katie" stroke={TMRW_COLORS.red} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.red }} />
              <Line type="monotone" dataKey="Alia" stroke={TMRW_COLORS.blue} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.blue }} />
              <Line type="monotone" dataKey="Paula" stroke={TMRW_COLORS.green} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.green }} />
              <Line type="monotone" dataKey="Isabelle" stroke={TMRW_COLORS.amber} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.amber }} />
              <Line type="monotone" dataKey="Jaclyn" stroke={TMRW_COLORS.purple} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.purple }} />
              <Line type="monotone" dataKey="Marko" stroke={TMRW_COLORS.cyan} strokeWidth={2.5} dot={{ r: 3, fill: TMRW_COLORS.cyan }} />
            </RechartLineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-dash-text-muted">All clinicians trending down &mdash; AI artifact pre-creation reducing time-per-case.</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 08 Quality Gates (carried forward)                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading number={8} title="Quality Gates" />

        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
          <MetricCard label="Gate 2A Pass Rate" value="92%" status="green" target=">90%" />
          <MetricCard label="Gate 2B Pass Rate" value="88%" status="amber" target=">90%" />
          <MetricCard label="Gate 3 Pass Rate" value="95%" status="green" target=">90%" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:mt-4 md:gap-4 lg:grid-cols-2">
          <div className="rounded-lg border-2 border-status-amber/40 bg-dash-surface p-4 md:p-5">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              QC Failure Impact
            </h3>
            <p className="font-mono text-2xl font-semibold text-status-amber">12%</p>
            <p className="mt-1 font-sans text-sm text-dash-text-secondary">QC failure rate</p>
            <p className="mt-3 font-sans text-xs text-dash-text md:text-sm">
              At 12% QC failure rate, <span className="font-semibold text-status-amber">~34 members</span> experienced restarts.
              Adding <span className="font-semibold text-status-red">~680 member-days</span> of delay.
            </p>
          </div>

          <div className="rounded-lg border-2 border-status-red/40 bg-status-red-light p-4 md:p-5">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-dash-text-secondary">
              Insights Call Completion
            </h3>
            <p className="font-mono text-2xl font-bold text-status-red md:text-3xl">1 of 284</p>
            <p className="mt-1 font-sans text-xs text-dash-text-secondary md:text-sm">members have completed an insights call</p>
            <AlertCard
              severity="high"
              title="Insights call completion is critically low at 0.4%. This gate is effectively non-operational."
            />
          </div>
        </div>
      </section>

      {/* Clinician detail slide-over */}
      <ClinicianDetailPanel
        clinician={selectedClinician}
        open={selectedClinician !== null}
        onOpenChange={(open) => { if (!open) setSelectedClinician(null) }}
      />

      {/* Member detail slide-over */}
      <MemberDetailPanel
        member={selectedMember}
        open={selectedMember !== null}
        onOpenChange={(open) => { if (!open) setSelectedMember(null) }}
      />
    </div>
  )
}
