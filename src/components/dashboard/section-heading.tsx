'use client'

export function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-3 md:mb-4">
      <span className="font-display text-2xl leading-none text-dash-red md:text-3xl">
        {String(number).padStart(2, '0')}
      </span>
      <span className="h-5 w-px bg-dash-border md:h-6" />
      <h2 className="font-sans text-sm font-semibold tracking-tight text-dash-text md:text-base">
        {title}
      </h2>
    </div>
  )
}
