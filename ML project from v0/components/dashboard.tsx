'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { BenchmarkSection } from '@/components/benchmark-section'
import { DatasetSection } from '@/components/dataset-section'
import { RadarSection } from '@/components/radar-section'
import { SiteHeader } from '@/components/site-header'
import { TestSection, type TestTab } from '@/components/test-section'
import { fetcher, type Benchmarks, type Summary } from '@/lib/api'

export function Dashboard() {
  const [model, setModel] = useState('random_forest')
  const [signalId, setSignalId] = useState<number | null>(null)
  const [tab, setTab] = useState<TestTab>('signal')
  const benchmarks = useSWR<Benchmarks>('/api/benchmarks', fetcher)
  const summary = useSWR<Summary>('/api/dataset/summary', fetcher)
  const models = benchmarks.data?.models ?? []
  const modelName = models.find((m) => m.key === model)?.name ?? ''

  const openSignal = (id: number) => {
    setSignalId(id)
    setTab('signal')
    document.getElementById('test')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const offline = Boolean(benchmarks.error || summary.error) && !benchmarks.data

  return (
    <>
      <SiteHeader models={models} model={model} onModelChange={setModel} />
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="py-14 sm:py-20">
          <p className="font-mono text-xs text-muted-foreground">UCI Ionosphere · Goose Bay phased array</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Does this radar return reflect the ionosphere?
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {summary.data
              ? `Five machine learning models classify ${summary.data.samples} radar returns as good or bad, and are compared on the same ${summary.data.test} held-out signals.`
              : 'Five machine learning models classify radar returns as good or bad, and are compared on the same held-out signals.'}
          </p>
        </div>

        {offline ? (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 text-sm">
            <p className="font-medium text-destructive">The backend is not reachable.</p>
            <p className="mt-1 text-muted-foreground">
              Start the Python API with <code className="font-mono text-foreground">pnpm api</code> (it listens on port 8000), then
              reload this page.
            </p>
          </div>
        ) : (
          <>
            <RadarSection model={model} modelName={modelName} selectedId={signalId} onSelect={openSignal} />
            <DatasetSection />
            <BenchmarkSection model={model} onModelChange={setModel} />
            <TestSection
              tab={tab}
              onTabChange={setTab}
              signalId={signalId}
              onSignalChange={setSignalId}
              selectedModel={model}
            />
          </>
        )}
      </main>
      <footer className="mt-8 border-t border-border py-8 text-center text-xs text-muted-foreground">
        scikit-learn models served by FastAPI · Dataset: Sigillito et al., UCI Machine Learning Repository
      </footer>
    </>
  )
}
