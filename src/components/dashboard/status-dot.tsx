'use client'

import { cn } from '@/lib/utils'
import type { Status } from '@/lib/types'

const colors: Record<Status, string> = {
  green: 'bg-status-green',
  amber: 'bg-status-amber',
  red: 'bg-status-red',
  grey: 'bg-status-grey',
}

export function StatusDot({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' }) {
  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          'inline-block rounded-full',
          colors[status],
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
        )}
      />
      {status === 'red' && (
        <span
          className={cn(
            'absolute inset-0 inline-block animate-ping rounded-full bg-status-red opacity-40',
            size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
          )}
        />
      )}
    </span>
  )
}
