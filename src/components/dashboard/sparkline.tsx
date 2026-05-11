'use client'

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: number
  className?: string
}

export function Sparkline({
  data,
  color = '#8B0000',
  height = 32,
  width = 120,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 4

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')
  const lastPoint = points[points.length - 1]

  const areaPath = [
    `M ${points[0].x},${height}`,
    `L ${points.map(p => `${p.x},${p.y}`).join(' L ')}`,
    `L ${lastPoint.x},${height}`,
    'Z',
  ].join(' ')

  return (
    <svg width={width} height={height} className={`overflow-visible ${className ?? ''}`}>
      <path d={areaPath} fill={color} opacity="0.12" />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="3.5"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  )
}
