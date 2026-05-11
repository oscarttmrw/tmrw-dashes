'use client'

import { useRef, useEffect, type ReactNode } from 'react'

interface ChartFixWrapperProps {
  children: ReactNode
  className?: string
  lineWidth?: number
  areaOpacity?: number
  dotSize?: number
}

/**
 * Wraps any Tremor chart and fixes SVG rendering after mount.
 * Tremor uses inline SVG attributes that CSS can't override.
 * This component mutates the DOM after render to force visibility.
 */
export function ChartFixWrapper({
  children,
  className,
  lineWidth = 3,
  areaOpacity = 0.2,
  dotSize = 4,
}: ChartFixWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const fix = () => {
      const el = ref.current
      if (!el) return

      // Fix line strokes — make them thick
      el.querySelectorAll('.recharts-line-curve, .recharts-area-curve').forEach((path) => {
        ;(path as SVGElement).setAttribute('stroke-width', String(lineWidth))
      })

      // Fix area fills — increase opacity
      el.querySelectorAll('.recharts-area-area').forEach((path) => {
        ;(path as SVGElement).setAttribute('fill-opacity', String(areaOpacity))
      })

      // Fix dots — make them visible
      el.querySelectorAll('.recharts-dot').forEach((dot) => {
        ;(dot as SVGElement).setAttribute('r', String(dotSize))
      })

      // Fix active dots
      el.querySelectorAll('.recharts-active-dot circle').forEach((dot) => {
        ;(dot as SVGElement).setAttribute('r', String(dotSize + 2))
      })

      // Fix bar charts that render black
      el.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect').forEach((bar) => {
        const fill = (bar as SVGElement).getAttribute('fill')
        if (fill === '#000' || fill === '#000000' || fill === 'black' || fill === 'rgb(0, 0, 0)') {
          ;(bar as SVGElement).setAttribute('fill', '#8B0000')
        }
      })
    }

    fix()

    const timer1 = setTimeout(fix, 100)
    const timer2 = setTimeout(fix, 500)
    const timer3 = setTimeout(fix, 1000)

    const observer = new MutationObserver(fix)
    observer.observe(ref.current, { childList: true, subtree: true, attributes: true })

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      observer.disconnect()
    }
  }, [lineWidth, areaOpacity, dotSize])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
