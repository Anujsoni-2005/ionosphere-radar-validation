'use client'

import useSWR from 'swr'
import { fetcher, pct, type Benchmarks, type ModelBenchmark } from '@/lib/api'
import { LoadState, SectionShell } from '@/components/section-shell'
import { XYChart } from '@/components/xy-chart'

type Props = { model: string; onModelChange: (key: string) => void }

export function BenchmarkSection({ model, onModelChange }: Props) {
  const { data, error, isLoading } = useSWR<Benchmarks>('/api/benchmarks', fetcher)
  const selected = data?.models.find((m) => m.key === model)
  const bestAccuracy = data ? Math.max(...data.models.map((m) => m.accuracy)) : 0

  return (
    <SectionShell
      id="benchmarks"
      index={3}
      title="Model benchmarks"
      description={
        data
          ? `Five classifiers trained on the same split and scored on the same ${data.test_size} held-out signals. Select a row to see its confusion matrix and ROC curve.`
          : 'Five classifiers trained on the same split and scored on the same held-out signals.'
      }
    >
      <LoadState error={error} loading={isLoading} />
      {data && selected && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">Benchmark results for the five models on the held-out test set</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">Model</th>
                  <Th>CV acc.</Th>
                  <Th>Test acc.</Th>
                  <Th>Precision</Th>
                  <Th>Recall</Th>
                  <Th>F1</Th>
                  <Th>ROC-AUC</Th>
                  <Th>FP</Th>
                  <Th>FN</Th>
                </tr>
              </thead>
              <tbody>
                {data.models.map((m) => {
                  const active = m.key === model
                  return (
                    <tr key={m.key} className={`border-b border-border ${active ? 'bg-accent' : ''}`}>
                      <th scope="row" className="py-1 pr-4 text-left font-normal">
                        <button
                          type="button"
                          onClick={() => onModelChange(m.key)}
                          aria-pressed={active}
                          className="flex w-full items-center gap-2 rounded-sm py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span
                            aria-hidden
                            className={`size-2 rounded-full ${active ? 'bg-foreground' : 'border border-muted-foreground/60'}`}
                          />
                          <span className={active ? 'font-medium' : ''}>{m.name}</span>
                          {m.accuracy === bestAccuracy && (
                            <span className="rounded bg-good/12 px-1.5 py-0.5 text-[10px] font-medium text-good">best</span>
                          )}
                        </button>
                      </th>
                      <Td>{pct(m.cv_accuracy)}</Td>
                      <Td strong>{pct(m.accuracy)}</Td>
                      <Td>{pct(m.precision)}</Td>
                      <Td>{pct(m.recall)}</Td>
                      <Td>{pct(m.f1)}</Td>
                      <Td>{m.roc_auc.toFixed(3)}</Td>
                      <Td>{m.confusion_matrix.fp}</Td>
                      <Td>{m.confusion_matrix.fn}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            CV acc. is 5-fold cross-validation on the training split. FP is a ghost alarm (bad predicted good), FN is a missed
            target (good predicted bad).
          </p>

          <div className="mt-12 grid gap-12 lg:grid-cols-2">
            <ConfusionMatrix model={selected} />
            <RocChart models={data.models} selectedKey={model} />
          </div>
        </>
      )}
    </SectionShell>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-3 py-2 text-right font-medium">
      {children}
    </th>
  )
}

function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`px-3 py-1.5 text-right font-mono tabular-nums ${strong ? 'font-semibold' : ''}`}>{children}</td>
}

function ConfusionMatrix({ model }: { model: ModelBenchmark }) {
  const { tn, fp, fn, tp } = model.confusion_matrix
  const max = Math.max(tn, fp, fn, tp, 1)
  const cells = [
    { v: tn, name: 'Ghost rejected', ok: true },
    { v: fp, name: 'Ghost alarm', ok: false },
    { v: fn, name: 'Missed target', ok: false },
    { v: tp, name: 'Target detected', ok: true },
  ]

  return (
    <figure>
      <h3 className="mb-3 text-sm font-medium">
        Confusion matrix <span className="font-normal text-muted-foreground">· {model.name}</span>
      </h3>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-xs">
        <div />
        <div className="pb-1 text-center text-muted-foreground">Predicted bad</div>
        <div className="pb-1 text-center text-muted-foreground">Predicted good</div>
        {[0, 1].map((row) => (
          <Row key={row} label={row === 0 ? 'Actual bad' : 'Actual good'}>
            {cells.slice(row * 2, row * 2 + 2).map((c) => (
              <div
                key={c.name}
                className="flex aspect-[5/3] flex-col items-center justify-center rounded-md"
                style={{
                  backgroundColor: `color-mix(in oklab, var(${c.ok ? '--good' : '--bad'}) ${Math.round(10 + (c.v / max) * 38)}%, transparent)`,
                }}
              >
                <span className="font-mono text-3xl font-semibold tabular-nums">{c.v}</span>
                <span className="mt-1 text-muted-foreground">{c.name}</span>
              </div>
            ))}
          </Row>
        ))}
      </div>
    </figure>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-end pr-2 text-muted-foreground [writing-mode:vertical-rl] [transform:rotate(180deg)]">
        {label}
      </div>
      {children}
    </>
  )
}

function RocChart({ models, selectedKey }: { models: ModelBenchmark[]; selectedKey: string }) {
  const selected = models.find((m) => m.key === selectedKey)
  const toPoints = (m: ModelBenchmark) => m.roc.fpr.map((x, i) => [x, m.roc.tpr[i]] as [number, number])
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <figure>
      <h3 className="mb-3 text-sm font-medium">
        ROC curve <span className="font-normal text-muted-foreground">· {selected?.name}, AUC {selected?.roc_auc.toFixed(3)}</span>
      </h3>
      <XYChart
        label="ROC curves of all five models with the selected model highlighted"
        xDomain={[0, 1]}
        yDomain={[0, 1.02]}
        xTicks={ticks}
        yTicks={ticks}
        xFormat={(v) => v.toFixed(2)}
        yFormat={(v) => v.toFixed(2)}
        xLabel="False positive rate (ghost alarms)"
        yLabel="True positive rate (targets detected)"
        lines={[
          { id: 'chance', points: [[0, 0], [1, 1]], color: 'var(--muted-foreground)', dashed: true, width: 1, opacity: 0.6 },
          ...models
            .filter((m) => m.key !== selectedKey)
            .map((m) => ({ id: m.key, points: toPoints(m), color: 'var(--muted-foreground)', width: 1.5, opacity: 0.4, step: true })),
          ...(selected ? [{ id: selected.key, points: toPoints(selected), color: 'var(--good)', width: 2.5, step: true }] : []),
        ]}
      />
      <figcaption className="mt-2 text-xs text-muted-foreground">Grey curves are the other four models.</figcaption>
    </figure>
  )
}
