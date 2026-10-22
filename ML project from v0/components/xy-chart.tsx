export type ChartLine = {
  id: string
  points: [number, number][]
  color: string
  width?: number
  dashed?: boolean
  step?: boolean
  opacity?: number
}

export type ChartDot = {
  x: number
  y: number
  color: string
  ring?: boolean
  opacity?: number
}

type Props = {
  lines?: ChartLine[]
  dots?: ChartDot[]
  xDomain: [number, number]
  yDomain: [number, number]
  xTicks: number[]
  yTicks: number[]
  xLabel: string
  yLabel: string
  xFormat?: (v: number) => string
  yFormat?: (v: number) => string
  label: string
}

const W = 520
const H = 340
const M = { l: 52, r: 14, t: 12, b: 44 }

export function niceTicks([min, max]: [number, number], count = 5): number[] {
  const span = max - min
  const rough = span / count
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? rough
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = first; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(10)))
  return ticks
}

export function XYChart({
  lines = [],
  dots = [],
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  xFormat = String,
  yFormat = String,
  label,
}: Props) {
  const sx = (v: number) => M.l + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * (W - M.l - M.r)
  const sy = (v: number) => H - M.b - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * (H - M.t - M.b)

  const pathFor = (line: ChartLine) => {
    const pts = line.points
    if (!line.step) return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x)},${sy(y)}`).join(' ')
    return pts
      .map(([x, y], i) => (i ? `L${sx(x)},${sy(pts[i - 1][1])} L${sx(x)},${sy(y)}` : `M${sx(x)},${sy(y)}`))
      .join(' ')
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} className="stroke-border" strokeWidth={1} />
          <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
            {yFormat(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text
          key={`x${t}`}
          x={sx(t)}
          y={H - M.b + 18}
          textAnchor="middle"
          className="fill-muted-foreground font-mono text-[11px]"
        >
          {xFormat(t)}
        </text>
      ))}
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} className="stroke-foreground/40" />
      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} className="stroke-foreground/40" />
      <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-xs">
        {xLabel}
      </text>
      <text
        transform={`translate(13 ${(M.t + H - M.b) / 2}) rotate(-90)`}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {yLabel}
      </text>

      {lines.map((l) => (
        <path
          key={l.id}
          d={pathFor(l)}
          fill="none"
          style={{ stroke: l.color }}
          strokeWidth={l.width ?? 2}
          strokeDasharray={l.dashed ? '5 4' : undefined}
          opacity={l.opacity ?? 1}
          strokeLinejoin="round"
        />
      ))}
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={sx(d.x)}
          cy={sy(d.y)}
          r={d.ring ? 4 : 3.2}
          style={{ fill: d.ring ? 'transparent' : d.color, stroke: d.color }}
          strokeWidth={d.ring ? 1.6 : 0}
          opacity={d.opacity ?? 0.85}
        />
      ))}
    </svg>
  )
}
