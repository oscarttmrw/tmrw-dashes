'use client'

import type { ReactNode } from 'react'
import { Reveal } from './motion'

/**
 * Editorial section header — oversized display numerals in the brand face,
 * consistent with the existing Home/Financial narrative sections.
 */
export function PulseSection({
  number,
  title,
  subtitle,
  right,
  children,
}: {
  number: number
  title: string
  subtitle: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <Reveal>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 md:mb-7">
          <div>
            <div className="flex items-start gap-4 md:gap-6">
              <span className="font-display text-4xl leading-none text-tmrw-syringe/90 md:text-6xl">
                {String(number).padStart(2, '0')}
              </span>
              <h2 className="pt-[0.2rem] font-display text-2xl uppercase leading-none tracking-tight text-dash-text md:pt-[0.4rem] md:text-4xl">
                {title}
              </h2>
            </div>
            <p className="ml-[3.5rem] mt-2 font-ui text-[11px] uppercase tracking-[0.12em] text-dash-text-muted md:ml-[5.5rem] md:text-xs">
              {subtitle}
            </p>
          </div>
          {right && <div>{right}</div>}
        </div>
      </Reveal>
      {children}
    </section>
  )
}

/** Card title row used inside chart cards. */
export function CardTitle({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-ui text-[12px] font-medium uppercase tracking-[0.1em] text-dash-text">{title}</h3>
        {hint && <p className="mt-1 text-[11px] leading-snug text-dash-text-muted">{hint}</p>}
      </div>
      {right}
    </div>
  )
}
