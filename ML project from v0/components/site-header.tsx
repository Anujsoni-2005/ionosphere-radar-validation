'use client'

import type { ModelBenchmark } from '@/lib/api'

const LINKS = [
  { href: '#radar', label: 'Radar' },
  { href: '#dataset', label: 'Dataset' },
  { href: '#benchmarks', label: 'Benchmarks' },
  { href: '#test', label: 'Test' },
]

type Props = {
  models: ModelBenchmark[]
  model: string
  onModelChange: (key: string) => void
}

export function SiteHeader({ models, model, onModelChange }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <a href="#" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span aria-hidden className="relative size-5 rounded-full bg-radar">
            <span className="absolute inset-[5px] rounded-full bg-good" />
          </span>
          Ionosphere Radar
        </a>
        <nav aria-label="Sections" className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="model-select" className="hidden text-xs text-muted-foreground sm:block">
            Model
          </label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={models.length === 0}
            className="h-8 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {models.length === 0 && <option value={model}>Loading…</option>}
            {models.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  )
}
