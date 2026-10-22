'use client'

import { Check, X } from 'lucide-react'
import { LabelBadge } from '@/components/section-shell'
import { niceTicks, XYChart } from '@/components/xy-chart'
import type { Label, ModelBenchmark, Predictions, SignalResult } from '@/lib/api'

type Props = {
  signal: SignalResult
  models: ModelBenchmark[]
  selectedModel: string
}

export function SignalResultView({ signal, models, selectedModel }: Props) {
  const toLine = (id: string, values: number[], color: string, dashed = false) => ({
    id,
    points: values.map((v, i) => [i, v] as [number, number]),
    color,
    dashed,
    width: 2,
  })
  const all = [...signal.real, ...signal.imaginary, ...signal.envelope]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const yDomain: [number, number] = [Math.floor(lo * 4) / 4 - 0.1, Math.ceil(hi * 4) / 4 + 0.1]

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <figure>
        <XYChart
          label="Real and imaginary parts and envelope of the signal across 17 pulse lags"
          xDomain={[0, 16]}
          yDomain={yDomain}
          xTicks={[0, 4, 8, 12, 16]}
          yTicks={niceTicks(yDomain, 5)}
          yFormat={(v) => v.toFixed(1)}
          xLabel="Pulse lag"
          yLabel="Amplitude"
          lines={[
            toLine('real', signal.real, 'var(--good)'),
            toLine('imaginary', signal.imaginary, 'var(--bad)'),
            toLine('envelope', signal.envelope, 'var(--foreground)', true),
          ]}
        />
        <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <Key color="var(--good)">Real part</Key>
          <Key color="var(--bad)">Imaginary part</Key>
          <Key color="var(--foreground)" dashed>
            Envelope
          </Key>
        </figcaption>
      </figure>

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {signal.id !== null ? (
            <span className="font-mono">Signal #{signal.id}</span>
          ) : (
            <span className="font-mono">Custom signal</span>
          )}
          {signal.truth && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              True class <LabelBadge label={signal.truth} />
            </span>
          )}
          {signal.split === 'train' && (
            <span className="text-xs text-bad">Training signal: the models have already seen it.</span>
          )}
          {signal.split === 'test' && <span className="text-xs text-muted-foreground">Held-out test signal</span>}
        </div>
        <PredictionList predictions={signal.predictions} truth={signal.truth} models={models} selectedModel={selectedModel} />
      </div>
    </div>
  )
}

function Key({ color, dashed, children }: { color: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="18" height="6" aria-hidden>
        <line x1="0" x2="18" y1="3" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dashed ? '4 3' : undefined} />
      </svg>
      {children}
    </span>
  )
}

export function PredictionList({
  predictions,
  truth,
  models,
  selectedModel,
}: {
  predictions: Predictions
  truth: Label | null
  models: ModelBenchmark[]
  selectedModel: string
}) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {models.map((m) => {
        const p = predictions[m.key]
        if (!p) return null
        const correct = truth ? p.label === truth : null
        return (
          <li key={m.key} className={`flex items-center gap-3 px-3 py-2.5 ${m.key === selectedModel ? 'bg-accent' : ''}`}>
            <span className="min-w-0 flex-1 text-sm leading-tight">{m.name}</span>
            <div className="hidden w-28 sm:block" aria-hidden>
              <div className="h-1.5 overflow-hidden rounded-full bg-bad/25">
                <div className="h-full bg-good" style={{ width: `${p.prob_good * 100}%` }} />
              </div>
            </div>
            <span className="w-24 text-right font-mono text-xs tabular-nums text-muted-foreground">
              P(good) {p.prob_good.toFixed(2)}
            </span>
            <span className="flex w-24 items-center justify-end gap-1.5">
              <LabelBadge label={p.label} />
              {correct !== null && (
                <span className={correct ? 'text-good' : 'text-bad'}>
                  <span className="sr-only">{correct ? 'Correct' : 'Wrong'}</span>
                  {correct ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
