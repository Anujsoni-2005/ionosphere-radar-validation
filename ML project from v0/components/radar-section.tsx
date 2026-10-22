'use client'

import useSWR from 'swr'
import { fetcher, pct, type RadarData } from '@/lib/api'
import { RadarCanvas } from '@/components/radar-canvas'
import { LoadState, SectionShell, Stat } from '@/components/section-shell'

type Props = {
  model: string
  modelName: string
  selectedId: number | null
  onSelect: (id: number) => void
}

export function RadarSection({ model, modelName, selectedId, onSelect }: Props) {
  const { data, error, isLoading } = useSWR<RadarData>(`/api/radar?model=${model}`, fetcher, {
    keepPreviousData: true,
  })

  const signals = data?.signals ?? []
  const wrong = signals.filter((s) => s.predicted !== s.truth)
  const predictedGood = signals.filter((s) => s.predicted === 'good').length

  return (
    <SectionShell
      id="radar"
      index={1}
      title="Radar view of the held-out test signals"
      description="Each dot is one radar return the model never saw during training. Its position is its PCA projection, its colour is the selected model's prediction, and a white ring marks a mistake. Click a dot to test that signal below."
    >
      <LoadState error={error} loading={isLoading && !data} />
      {data && (
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,560px)_1fr]">
          <RadarCanvas signals={signals} selectedId={selectedId} onSelect={onSelect} />
          <div>
            <p className="text-sm text-muted-foreground">
              Model: <span className="font-medium text-foreground">{modelName}</span>
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-5">
              <Stat label="Signals shown" value={signals.length} />
              <Stat
                label="Correct"
                value={pct((signals.length - wrong.length) / signals.length)}
                hint={`${signals.length - wrong.length} of ${signals.length}`}
              />
              <Stat label="Predicted good" value={predictedGood} />
              <Stat label="Predicted bad" value={signals.length - predictedGood} />
            </dl>
            <ul className="mt-8 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-full bg-good" /> Predicted good (reflects the ionosphere)
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-full bg-bad" /> Predicted bad (passes through)
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-full border-2 border-foreground/70" /> Misclassified (
                {wrong.length})
              </li>
            </ul>
          </div>
        </div>
      )}
    </SectionShell>
  )
}
