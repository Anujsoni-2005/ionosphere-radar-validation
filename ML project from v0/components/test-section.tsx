'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { CsvTest } from '@/components/csv-test'
import { LoadState, SectionShell } from '@/components/section-shell'
import { SignalResultView } from '@/components/signal-result'
import { fetcher, parseResponse, type Benchmarks, type SignalResult } from '@/lib/api'

export type TestTab = 'signal' | 'custom' | 'csv'

const TABS: { id: TestTab; label: string }[] = [
  { id: 'signal', label: 'Dataset signal' },
  { id: 'custom', label: 'Custom values' },
  { id: 'csv', label: 'CSV upload' },
]

type Props = {
  tab: TestTab
  onTabChange: (tab: TestTab) => void
  signalId: number | null
  onSignalChange: (id: number) => void
  selectedModel: string
}

export function TestSection({ tab, onTabChange, signalId, onSignalChange, selectedModel }: Props) {
  const benchmarks = useSWR<Benchmarks>('/api/benchmarks', fetcher)
  const models = benchmarks.data?.models

  return (
    <SectionShell
      id="test"
      index={4}
      title="Test a signal"
      description="Run a radar return through all five trained models at once. Use a signal from the dataset, paste your own 34 values, or classify a whole CSV file."
    >
      <div role="tablist" aria-label="Input method" className="mb-8 inline-flex rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => onTabChange(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
              tab === t.id ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <LoadState error={benchmarks.error} />
      {models && (
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'signal' && (
            <DatasetSignalTest
              models={models}
              selectedModel={selectedModel}
              signalId={signalId}
              onSignalChange={onSignalChange}
            />
          )}
          {tab === 'custom' && <CustomTest models={models} selectedModel={selectedModel} />}
          {tab === 'csv' && <CsvTest models={models} selectedModel={selectedModel} />}
        </div>
      )}
    </SectionShell>
  )
}

type ModelProps = { models: NonNullable<Benchmarks['models']>; selectedModel: string }

function DatasetSignalTest({
  models,
  selectedModel,
  signalId,
  onSignalChange,
}: ModelProps & { signalId: number | null; onSignalChange: (id: number) => void }) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [randomError, setRandomError] = useState<Error>()
  const { data, error } = useSWR<SignalResult>(signalId !== null ? `/api/signals/${signalId}` : null, fetcher)

  const pickRandom = async (split: 'test' | 'any') => {
    setBusy(true)
    setRandomError(undefined)
    try {
      const s = await parseResponse<SignalResult>(await fetch(`/api/signals/random?split=${split}`))
      if (s.id !== null) onSignalChange(s.id)
    } catch (e) {
      setRandomError(e instanceof Error ? e : new Error('Request failed'))
    } finally {
      setBusy(false)
    }
  }

  const submitId = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(draft)
    if (Number.isInteger(n) && n >= 0) onSignalChange(n)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <Button onClick={() => pickRandom('test')} disabled={busy}>
          Random held-out signal
        </Button>
        <Button variant="outline" onClick={() => pickRandom('any')} disabled={busy}>
          Random from all 351
        </Button>
        <form onSubmit={submitId} className="flex items-end gap-2">
          <div>
            <label htmlFor="signal-id" className="mb-1 block text-xs text-muted-foreground">
              Signal number (0–350)
            </label>
            <input
              id="signal-id"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. 42"
              className="h-8 w-28 rounded-lg border border-input bg-card px-2.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" variant="outline">
            Run
          </Button>
        </form>
      </div>

      <div className="mt-8">
        <LoadState error={error ?? randomError} />
        {!data && !error && (
          <p className="text-sm text-muted-foreground">
            Pick a signal above, or click a dot on the radar, to see how each model classifies it.
          </p>
        )}
        {data && <SignalResultView signal={data} models={models} selectedModel={selectedModel} />}
      </div>
    </div>
  )
}

function CustomTest({ models, selectedModel }: ModelProps) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<SignalResult>()
  const [error, setError] = useState<Error>()
  const [busy, setBusy] = useState(false)

  const parse = () =>
    text
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map(Number)
  const count = text.trim() ? parse().length : 0

  const loadExample = async () => {
    setError(undefined)
    try {
      const s = await parseResponse<SignalResult>(await fetch('/api/signals/random?split=test'))
      setText(s.values.join(', '))
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Request failed'))
    }
  }

  const run = async () => {
    setBusy(true)
    setError(undefined)
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: parse() }),
      })
      setResult(await parseResponse<SignalResult>(res))
    } catch (e) {
      setResult(undefined)
      setError(e instanceof Error ? e : new Error('Request failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label htmlFor="custom-values" className="mb-1.5 block text-sm font-medium">
        34 signal values
      </label>
      <textarea
        id="custom-values"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        spellCheck={false}
        placeholder="1, 0, 0.62335, -0.0349, …  (a01 to a34, separated by commas or spaces)"
        className="w-full max-w-3xl rounded-lg border border-input bg-card p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={busy || count !== 34}>
          {busy ? 'Classifying…' : 'Classify'}
        </Button>
        <Button variant="outline" onClick={loadExample}>
          Fill with a real signal
        </Button>
        <span className={`font-mono text-xs ${count === 34 || count === 0 ? 'text-muted-foreground' : 'text-bad'}`}>
          {count} / 34 values
        </span>
      </div>

      <div className="mt-8">
        <LoadState error={error} />
        {result && <SignalResultView signal={result} models={models} selectedModel={selectedModel} />}
      </div>
    </div>
  )
}
