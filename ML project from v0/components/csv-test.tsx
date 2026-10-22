'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LabelBadge, LoadState } from '@/components/section-shell'
import { parseResponse, pct, type CsvResult, type ModelBenchmark } from '@/lib/api'

const PREVIEW_ROWS = 50

export function CsvTest({ models, selectedModel }: { models: ModelBenchmark[]; selectedModel: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<CsvResult>()
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<Error>()
  const [busy, setBusy] = useState(false)

  const upload = async (file: File) => {
    setBusy(true)
    setError(undefined)
    setFileName(file.name)
    try {
      const body = new FormData()
      body.append('file', file)
      setResult(await parseResponse<CsvResult>(await fetch('/api/predict/csv', { method: 'POST', body })))
    } catch (e) {
      setResult(undefined)
      setError(e instanceof Error ? e : new Error('Upload failed'))
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    if (!result) return
    const head = ['row', 'truth', ...models.map((m) => m.key)]
    const lines = result.rows.map((r) =>
      [r.row, r.truth ?? '', ...models.map((m) => r.predictions[m.key]?.label ?? '')].join(','),
    )
    const url = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'predictions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const modelName = models.find((m) => m.key === selectedModel)?.name

  return (
    <div>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Upload a CSV with one signal per row: 34 numeric columns, optionally followed by a <code className="font-mono">g</code> or{' '}
        <code className="font-mono">b</code> label. A header row is detected automatically. Up to 500 rows.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Upload CSV file"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void upload(f)
            e.target.value = ''
          }}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Classifying…' : 'Choose CSV file'}
        </Button>
        <a
          href="/api/dataset/sample-csv?n=30"
          download
          className="text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground"
        >
          Download a sample file
        </a>
        {fileName && <span className="font-mono text-xs text-muted-foreground">{fileName}</span>}
      </div>

      <div className="mt-6">
        <LoadState error={error} />
      </div>

      {result && (
        <div className="mt-2">
          {result.accuracy && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-medium">Accuracy on this file ({result.count} rows)</h3>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
                {models.map((m) => (
                  <div key={m.key}>
                    <dt className="text-xs text-muted-foreground">{m.name}</dt>
                    <dd className="font-mono text-lg tabular-nums">{pct(result.accuracy![m.key])}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between gap-4">
            <h3 className="text-sm font-medium">
              Predictions <span className="font-normal text-muted-foreground">· {modelName}</span>
            </h3>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              Export all models
            </Button>
          </div>
          <div className="max-h-96 overflow-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">Row</th>
                  {result.has_labels && <th className="px-3 py-2 font-medium">True class</th>}
                  <th className="px-3 py-2 font-medium">Predicted</th>
                  <th className="px-3 py-2 text-right font-medium">P(good)</th>
                  {result.has_labels && <th className="px-3 py-2 font-medium">Result</th>}
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, PREVIEW_ROWS).map((r) => {
                  const p = r.predictions[selectedModel]
                  const correct = r.truth ? r.truth === p.label : null
                  return (
                    <tr key={r.row} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 font-mono tabular-nums">{r.row}</td>
                      {result.has_labels && <td className="px-3 py-1.5">{r.truth && <LabelBadge label={r.truth} />}</td>}
                      <td className="px-3 py-1.5">
                        <LabelBadge label={p.label} />
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">{p.prob_good.toFixed(3)}</td>
                      {result.has_labels && (
                        <td className={`px-3 py-1.5 text-xs font-medium ${correct ? 'text-good' : 'text-bad'}`}>
                          {correct ? 'Correct' : 'Wrong'}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {result.count > PREVIEW_ROWS && (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing the first {PREVIEW_ROWS} of {result.count} rows. The export contains all of them.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
