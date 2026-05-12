'use client'

interface LockedStateProps {
  reason?: string
  className?: string
}

export function LockedState({ reason, className }: LockedStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-dash-border bg-dash-surface/30 px-6 py-10 text-center opacity-60 ${className ?? ''}`}>
      <p className="text-sm font-medium text-dash-text-muted">Coming soon</p>
      {reason && <p className="mt-1 text-xs text-dash-text-muted">{reason}</p>}
    </div>
  )
}
