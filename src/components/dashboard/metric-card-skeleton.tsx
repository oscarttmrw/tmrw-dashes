'use client'

export function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 animate-pulse rounded bg-dash-surface-hover" />
        <div className="h-2 w-2 animate-pulse rounded-full bg-dash-surface-hover" />
      </div>
      <div className="mt-3 h-7 w-32 animate-pulse rounded bg-dash-surface-hover" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-dash-surface-hover" />
      <div className="mt-4 h-8 w-full animate-pulse rounded bg-dash-surface-hover" />
    </div>
  )
}
