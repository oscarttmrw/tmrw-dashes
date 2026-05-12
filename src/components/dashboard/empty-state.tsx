'use client'

interface EmptyStateProps {
  source: string          // e.g. "HubSpot", "Stripe"
  sourcePath?: string     // e.g. "/admin/upload" — if provided, render as a link
  className?: string
}

export function EmptyState({ source, sourcePath, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-dash-border bg-dash-surface/50 px-6 py-10 text-center ${className ?? ''}`}>
      <p className="text-sm font-medium text-dash-text-secondary">No {source} data yet</p>
      {sourcePath ? (
        <a href={sourcePath} className="mt-1 text-xs text-dash-text-muted underline hover:text-dash-text-secondary">
          Upload from Admin → Upload Data
        </a>
      ) : (
        <p className="mt-1 text-xs text-dash-text-muted">Upload from Admin → Upload Data</p>
      )}
    </div>
  )
}
