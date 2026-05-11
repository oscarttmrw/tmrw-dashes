'use client'

export function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 md:mb-4 md:gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dash-red font-sans text-[11px] font-bold text-white shadow-sm md:h-7 md:w-7 md:text-[13px]">
        {String(number).padStart(2, '0')}
      </span>
      <h2 className="font-sans text-sm font-semibold tracking-tight text-dash-text md:text-base">
        {title}
      </h2>
    </div>
  )
}
