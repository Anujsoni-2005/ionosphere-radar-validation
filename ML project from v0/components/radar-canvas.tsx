'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { RadarSignal } from '@/lib/api'

const GOOD = '#5fd38a'
const BAD = '#ff7a59'
const SWEEP_SECONDS = 7
const TAU = Math.PI * 2

type Blip = RadarSignal & { angle: number; radius: number }

type Props = {
  signals: RadarSignal[]
  selectedId: number | null
  onSelect: (id: number) => void
}

function toBlips(signals: RadarSignal[]): Blip[] {
  const maxDist = Math.max(...signals.map((s) => Math.hypot(s.x, s.y)), 1e-9)
  return signals.map((s) => ({
    ...s,
    angle: (Math.atan2(s.y, s.x) + TAU) % TAU,
    radius: (Math.hypot(s.x, s.y) / maxDist) * 0.92,
  }))
}

export function RadarCanvas({ signals, selectedId, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverRef = useRef<number | null>(null)
  const selectedRef = useRef<number | null>(selectedId)
  const [hover, setHover] = useState<{ blip: Blip; left: number; top: number } | null>(null)
  const blips = useMemo(() => toBlips(signals), [signals])
  const blipsRef = useRef(blips)

  useEffect(() => {
    blipsRef.current = blips
  }, [blips])
  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let size = 0
    let raf = 0
    const start = performance.now()

    const resize = () => {
      size = wrap.clientWidth
      const dpr = window.devicePixelRatio || 1
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.height = `${size}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(() => {
      resize()
      if (reduced) draw(performance.now())
    })
    observer.observe(wrap)
    resize()

    function draw(now: number) {
      const c = size / 2
      const R = c - 14
      const sweep = reduced ? 0 : (((now - start) / 1000 / SWEEP_SECONDS) * TAU) % TAU
      ctx!.clearRect(0, 0, size, size)

      ctx!.strokeStyle = 'rgba(95, 211, 138, 0.22)'
      ctx!.lineWidth = 1
      for (let i = 1; i <= 4; i++) {
        ctx!.beginPath()
        ctx!.arc(c, c, (R * i) / 4, 0, TAU)
        ctx!.stroke()
      }
      ctx!.beginPath()
      ctx!.moveTo(c - R, c)
      ctx!.lineTo(c + R, c)
      ctx!.moveTo(c, c - R)
      ctx!.lineTo(c, c + R)
      ctx!.stroke()

      if (!reduced) {
        const grad = ctx!.createConicGradient(sweep - 0.9, c, c)
        grad.addColorStop(0, 'rgba(95, 211, 138, 0)')
        grad.addColorStop(0.9 / TAU, 'rgba(95, 211, 138, 0.28)')
        grad.addColorStop(0.9 / TAU + 0.001, 'rgba(95, 211, 138, 0)')
        ctx!.fillStyle = grad
        ctx!.beginPath()
        ctx!.moveTo(c, c)
        ctx!.arc(c, c, R, sweep - 0.9, sweep)
        ctx!.closePath()
        ctx!.fill()
        ctx!.strokeStyle = 'rgba(95, 211, 138, 0.9)'
        ctx!.lineWidth = 1.5
        ctx!.beginPath()
        ctx!.moveTo(c, c)
        ctx!.lineTo(c + Math.cos(sweep) * R, c + Math.sin(sweep) * R)
        ctx!.stroke()
      }

      for (const b of blipsRef.current) {
        const behind = (sweep - b.angle + TAU) % TAU
        const alpha = reduced ? 1 : 0.18 + 0.82 * Math.pow(1 - behind / TAU, 2.2)
        const x = c + Math.cos(b.angle) * b.radius * R
        const y = c + Math.sin(b.angle) * b.radius * R
        const color = b.predicted === 'good' ? GOOD : BAD
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = color
        ctx!.beginPath()
        ctx!.arc(x, y, 4, 0, TAU)
        ctx!.fill()
        if (b.predicted !== b.truth) {
          ctx!.strokeStyle = '#ffffff'
          ctx!.lineWidth = 1.5
          ctx!.beginPath()
          ctx!.arc(x, y, 8, 0, TAU)
          ctx!.stroke()
        }
        if (b.id === selectedRef.current || b.id === hoverRef.current) {
          ctx!.globalAlpha = 1
          ctx!.strokeStyle = '#ffffff'
          ctx!.lineWidth = 1
          ctx!.strokeRect(x - 10, y - 10, 20, 20)
        }
      }
      ctx!.globalAlpha = 1
    }

    const loop = (now: number) => {
      draw(now)
      raf = requestAnimationFrame(loop)
    }
    if (reduced) draw(start)
    else raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  const locate = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    const c = rect.width / 2
    const R = c - 14
    let best: { blip: Blip; d: number } | null = null
    for (const b of blipsRef.current) {
      const d = Math.hypot(px - (c + Math.cos(b.angle) * b.radius * R), py - (c + Math.sin(b.angle) * b.radius * R))
      if (d < 12 && (!best || d < best.d)) best = { blip: b, d }
    }
    return best ? { blip: best.blip, left: px, top: py } : null
  }

  return (
    <div ref={wrapRef} className="relative mx-auto aspect-square w-full max-w-[560px] rounded-full bg-radar">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Radar display of ${signals.length} held-out signals. Green dots are predicted good, orange dots are predicted bad, white rings mark misclassified signals.`}
        className="block w-full cursor-crosshair rounded-full"
        onMouseMove={(e) => {
          const hit = locate(e.clientX, e.clientY)
          hoverRef.current = hit?.blip.id ?? null
          setHover(hit)
        }}
        onMouseLeave={() => {
          hoverRef.current = null
          setHover(null)
        }}
        onClick={(e) => {
          const hit = locate(e.clientX, e.clientY)
          if (hit) onSelect(hit.blip.id)
        }}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-md bg-card px-2.5 py-1.5 text-xs text-card-foreground shadow-md ring-1 ring-border"
          style={{ left: hover.left, top: hover.top }}
        >
          <span className="font-mono">Signal #{hover.blip.id}</span>
          <span className="text-muted-foreground"> · truth {hover.blip.truth} · predicted {hover.blip.predicted}</span>
          <span className="font-mono"> · P(good) {hover.blip.prob_good.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}
