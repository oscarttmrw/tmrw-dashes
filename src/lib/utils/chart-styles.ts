export const axisTickStyle = {
  fontSize: 11,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fill: '#525252',
}

export const axisLineStyle = {
  stroke: '#D4D4D4',
}

export const gridStyle = {
  strokeDasharray: '3 3',
  stroke: '#E5E5E5',
}

export const gridProps = {
  strokeDasharray: '3 3',
  stroke: '#E5E5E5',
}

export const tooltipStyle = {
  border: '1px solid #D4D4D4',
  borderRadius: 8,
  background: '#FFFFFF',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 13,
}

export const legendStyle = {
  fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 500,
}

export function lineDot(color: string, size = 5) {
  return { r: size, fill: color, stroke: '#fff', strokeWidth: 2 }
}

export function solidLine(color: string) {
  return {
    stroke: color,
    strokeWidth: 3,
    dot: { r: 4, fill: color, stroke: '#fff', strokeWidth: 2 },
  }
}

export function dashedLine(color: string) {
  return {
    stroke: color,
    strokeWidth: 2,
    strokeDasharray: '6 4',
    dot: { r: 3, fill: color, stroke: '#fff', strokeWidth: 1 },
  }
}

export function stackedArea(color: string) {
  return {
    stroke: color,
    fill: color,
    fillOpacity: 0.5,
    strokeWidth: 0,
  }
}

export const TMRW_COLORS = {
  red: '#8B0000',
  blue: '#2563EB',
  green: '#16A34A',
  amber: '#D97706',
  orange: '#EA580C',
  purple: '#7C3AED',
  cyan: '#0891B2',
  grey: '#94A3B8',
  darkGrey: '#737373',
  statusRed: '#DC2626',
  statusGreen: '#16A34A',
  statusAmber: '#D97706',
}

export const COLORS = TMRW_COLORS
