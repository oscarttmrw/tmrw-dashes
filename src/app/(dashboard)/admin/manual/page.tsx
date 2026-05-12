'use client'

import { Breadcrumb } from '@/components/layout/breadcrumb'

// ---------------------------------------------------------------------------
// Form field definitions by section
// ---------------------------------------------------------------------------
interface Field {
  label: string
  current: string
  type?: 'text' | 'number'
}

interface Section {
  title: string
  fields: Field[]
}

const sections: Section[] = [
  {
    title: 'Financial',
    fields: [
      { label: 'Blended CAC', current: '$95', type: 'number' },
      { label: 'CM/Member', current: '$72', type: 'number' },
    ],
  },
  {
    title: 'Clinical',
    fields: [
      { label: 'Gate 2A Pass Rate', current: '92%', type: 'number' },
      { label: 'Gate 2B Pass Rate', current: '88%', type: 'number' },
      { label: 'Gate 3 Pass Rate', current: '95%', type: 'number' },
      { label: 'Biomarker Improvement Rate', current: 'TBC', type: 'text' },
    ],
  },
  {
    title: 'Marketing',
    fields: [
      { label: 'Organic %', current: '72%', type: 'number' },
      { label: 'Referral Rate', current: 'TBC', type: 'text' },
    ],
  },
  {
    title: 'Partnerships',
    fields: [
      { label: 'Channel Partners', current: '0', type: 'number' },
      { label: 'Corporate Partners', current: '0', type: 'number' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ManualEntryPage() {
  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Manual Entry' },
        ]}
      />

      {/* Sections */}
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-dash-text-secondary">
            {section.title}
          </h2>
          <div className="rounded-lg border border-dash-border bg-dash-surface p-5">
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div
                  key={field.label}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
                >
                  <label className="w-52 shrink-0 text-sm text-dash-text">
                    {field.label}
                  </label>
                  <span className="w-28 shrink-0 font-mono text-sm text-dash-text-muted">
                    Current: {field.current}
                  </span>
                  <input
                    type={field.type ?? 'text'}
                    placeholder="New value"
                    className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:border-dash-red focus:outline-none focus:ring-1 focus:ring-dash-red sm:max-w-[200px]"
                  />
                  <button className="shrink-0 rounded-md border border-dash-border bg-dash-bg px-4 py-2 text-xs font-medium text-dash-text-secondary transition-colors hover:border-dash-red/40 hover:text-dash-red">
                    Save
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
