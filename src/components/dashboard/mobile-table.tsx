'use client'

interface MobileTableProps {
  children: React.ReactNode
  className?: string
}

export function MobileTable({ children, className }: MobileTableProps) {
  return (
    <div className={`overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 ${className || ''}`}>
      <div className="min-w-[600px]">
        {children}
      </div>
    </div>
  )
}
