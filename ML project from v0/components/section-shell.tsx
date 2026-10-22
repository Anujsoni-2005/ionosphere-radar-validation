import type { ReactNode } from 'react'

export function SectionShell({
  id,
  index,
  title,
  description,
  children,
}: {
  id: string
  index: number
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-border py-12">
      <header className="mb-8 max-w-2xl">
        <p className="font-mono text-xs text-muted-foreground">{String(index).padStart(2, '0')}</p>
        <h2 id={`${id}-title`} className="mt-1 text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h2>
        <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-xl font-medium tabular-nums">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function LoadState({ error, loading }: { error?: Error; loading?: boolean }) {
  if (error) {
    return (
      <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {error.message}
      </p>
    )
  }
  if (loading) return <p className="text-sm text-muted-foreground">Loading from backend…</p>
  return null
}

export function LabelBadge({ label }: { label: 'good' | 'bad' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        label === 'good' ? 'bg-good/12 text-good' : 'bg-bad/12 text-bad'
      }`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${label === 'good' ? 'bg-good' : 'bg-bad'}`} />
      {label}
    </span>
  )
}
