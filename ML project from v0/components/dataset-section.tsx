'use client'

import useSWR from 'swr'
import { fetcher, pct, type PcaData, type Summary } from '@/lib/api'
import { LoadState, SectionShell, Stat } from '@/components/section-shell'
import { niceTicks, XYChart } from '@/components/xy-chart'

export function DatasetSection() {
  const summary = useSWR<Summary>('/api/dataset/summary', fetcher)
  const pca = useSWR<PcaData>('/api/dataset/pca', fetcher)
  const s = summary.data

  return (
    <SectionShell
      id="dataset"
      index={2}
      title="Dataset"
      description="UCI Ionosphere: radar returns from a phased array at Goose Bay. A return is labelled good if it shows structure in the ionosphere and bad if the signal passes straight through."
    >
      <LoadState error={summary.error} loading={summary.isLoading} />
      {s && (
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,520px)]">
          <div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              <Stat label="Signals" value={s.samples} />
              <Stat label="Raw features" value={s.raw_features} hint="17 pulse lags × (real, imaginary)" />
              <Stat label="Model inputs" value={s.model_features} />
              <Stat label="Good" value={s.good} hint={pct(s.good / s.samples)} />
              <Stat label="Bad" value={s.bad} hint={pct(s.bad / s.samples)} />
              <Stat label="Train / test" value={`${s.train} / ${s.test}`} hint="stratified 80/20" />
            </dl>

            <h3 className="mt-10 text-sm font-medium">Preprocessing</h3>
            <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>
                <span className="font-mono text-foreground">1</span> Drop{' '}
                <span className="font-mono text-foreground">{s.dropped[0].column}</span>: its variance is{' '}
                {s.dropped[0].variance}, so it carries no information.
              </li>
              <li>
                <span className="font-mono text-foreground">2</span> Add {s.engineered.length} engineered features:{' '}
                <span className="font-mono text-foreground">{s.engineered.join(', ')}</span>.
              </li>
              <li>
                <span className="font-mono text-foreground">3</span> Standardise, then fit each of the five classifiers on the
                training split.
              </li>
            </ol>
          </div>

          <figure>
            <LoadState error={pca.error} loading={pca.isLoading} />
            {pca.data && <PcaScatter data={pca.data} />}
          </figure>
        </div>
      )}
    </SectionShell>
  )
}

function PcaScatter({ data }: { data: PcaData }) {
  const xs = data.points.map((p) => p.x)
  const ys = data.points.map((p) => p.y)
  const pad = (a: number[]) => {
    const lo = Math.min(...a)
    const hi = Math.max(...a)
    const m = (hi - lo) * 0.05
    return [lo - m, hi + m] as [number, number]
  }
  const xDomain = pad(xs)
  const yDomain = pad(ys)

  return (
    <>
      <XYChart
        label="Scatter plot of the two main PCA components, coloured by true class"
        xDomain={xDomain}
        yDomain={yDomain}
        xTicks={niceTicks(xDomain, 6)}
        yTicks={niceTicks(yDomain, 5)}
        xLabel={`PC1 (${pct(data.explained[0])} of variance)`}
        yLabel={`PC2 (${pct(data.explained[1])})`}
        dots={data.points.map((p) => ({
          x: p.x,
          y: p.y,
          color: p.truth === 'good' ? 'var(--good)' : 'var(--bad)',
          ring: p.split === 'test',
          opacity: p.split === 'test' ? 1 : 0.6,
        }))}
      />
      <figcaption className="mt-2 text-xs text-muted-foreground">
        PCA of all {data.points.length} signals by true class. Filled dots are training signals, hollow rings are the held-out test
        set.
      </figcaption>
    </>
  )
}
