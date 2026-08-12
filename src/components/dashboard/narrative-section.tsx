/**
 * Numbered section header used by the live narrative pages (Home, Financial,
 * Marketing, Support). Extracted from the two verbatim copies that previously
 * lived in `page.tsx` and `financial/page.tsx`.
 */
export function NarrativeSection({
  number,
  question,
  subtitle,
  right,
  children,
}: {
  number: number
  question: string
  subtitle: string
  /** Optional control rendered on the section's right edge (toggle, dropdown). */
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-5 md:mb-7 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-start gap-4 md:gap-6">
            <span className="font-display text-4xl leading-none text-dash-text md:text-6xl">
              {String(number).padStart(2, '0')}
            </span>
            <h2 className="font-display uppercase tracking-tight text-dash-text text-2xl leading-none pt-[0.2rem] md:text-4xl md:pt-[0.4rem]">
              {question}
            </h2>
          </div>
          <p className="mt-2 ml-[3.5rem] md:ml-[5.5rem] font-ui text-[11px] uppercase tracking-[0.12em] text-dash-text-muted md:text-xs">
            {subtitle}
          </p>
        </div>
        {right && <div>{right}</div>}
      </div>
      {children}
    </section>
  )
}
