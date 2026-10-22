# Ionosphere Radar Return Classifier — v0 Next.js Project
## Complete Full-Stack Codebase & Technical Documentation

> **Architecture**: Next.js 16 (Turbopack) + React 19 + TailwindCSS v4 + FastAPI + Scikit-Learn 5-Model Suite
> **Purpose**: Clean, monolithic code bundle of the v0 radar classification dashboard for code review with Claude.

## Table of Contents
1. [package.json](#package-json) — *Project dependencies and scripts*
2. [next.config.mjs](#next-config-mjs) — *Next.js configuration & API proxy rewrite rules*
3. [tsconfig.json](#tsconfig-json) — *TypeScript compiler configuration*
4. [postcss.config.mjs](#postcss-config-mjs) — *PostCSS & TailwindCSS v4 plugin configuration*
5. [app\layout.tsx](#app-layout-tsx) — *Root HTML layout & theme configuration*
6. [app\page.tsx](#app-page-tsx) — *Main Page entry point (renders Dashboard)*
7. [app\globals.css](#app-globals-css) — *TailwindCSS v4 theme tokens and global styles*
8. [lib\api.ts](#lib-api-ts) — *Client-side API service & SWR fetcher methods*
9. [lib\utils.ts](#lib-utils-ts) — *Utility functions (cn class merging)*
10. [components\ui\button.tsx](#components-ui-button-tsx) — *Base UI accessible button component*
11. [components\site-header.tsx](#components-site-header-tsx) — *Top navigation header & live API health indicator*
12. [components\dashboard.tsx](#components-dashboard-tsx) — *Master dashboard coordinating all radar & ML sections*
13. [components\section-shell.tsx](#components-section-shell-tsx) — *Reusable card container with sci-fi grid styling*
14. [components\radar-section.tsx](#components-radar-section-tsx) — *Radar overview panel & model selector*
15. [components\radar-canvas.tsx](#components-radar-canvas-tsx) — *HTML5 360-degree interactive rotating radar sweep*
16. [components\signal-result.tsx](#components-signal-result-tsx) — *Target classification card with confidence gauges*
17. [components\test-section.tsx](#components-test-section-tsx) — *Viva Testing Lab (Presets & 34-feature paste box)*
18. [components\csv-test.tsx](#components-csv-test-tsx) — *Batch CSV dropzone upload & accuracy validator*
19. [components\benchmark-section.tsx](#components-benchmark-section-tsx) — *Multi-model benchmark matrix, ROC curves & confusion matrix*
20. [components\dataset-section.tsx](#components-dataset-section-tsx) — *2D PCA projection & raw feature dataset explorer*
21. [components\xy-chart.tsx](#components-xy-chart-tsx) — *Canvas chart for ROC curves & pulse envelopes*
22. [backend\requirements.txt](#backend-requirements-txt) — *FastAPI backend Python dependencies*
23. [backend\main.py](#backend-main-py) — *FastAPI REST API endpoints & signal dispatcher*
24. [backend\ml.py](#backend-ml-py) — *End-to-end 5-model ML trainer, PCA engine & joblib bundle*

---

## 1. package.json <a id='package-json'></a>

**Description**: Project dependencies and scripts  
**File Location**: `ML project from v0/package.json`

```json
{
  "name": "my-project",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@12.3.4",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "api": "cd backend && python -m uvicorn main:app --port 8000"
  },
  "dependencies": {
    "@base-ui/react": "^1.5.0",
    "@vercel/analytics": "1.6.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.16.0",
    "next": "16.4.0",
    "react": "^19",
    "react-dom": "^19",
    "shadcn": "^4.11.0",
    "swr": "^2.5.1",
    "tailwind-merge": "^3.3.1",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.3",
    "@types/node": "^24",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "postcss": "^8.5",
    "tailwindcss": "^4.3.3",
    "typescript": "5.7.3"
  }
}

```

---

## 2. next.config.mjs <a id='next-config-mjs'></a>

**Description**: Next.js configuration & API proxy rewrite rules  
**File Location**: `ML project from v0/next.config.mjs`

```javascript
const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }]
  },
}

export default nextConfig

```

---

## 3. tsconfig.json <a id='tsconfig-json'></a>

**Description**: TypeScript compiler configuration  
**File Location**: `ML project from v0/tsconfig.json`

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "target": "ES6",
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}

```

---

## 4. postcss.config.mjs <a id='postcss-config-mjs'></a>

**Description**: PostCSS & TailwindCSS v4 plugin configuration  
**File Location**: `ML project from v0/postcss.config.mjs`

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config

```

---

## 5. app\layout.tsx <a id='app-layout-tsx'></a>

**Description**: Root HTML layout & theme configuration  
**File Location**: `ML project from v0/app\layout.tsx`

```typescript
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Ionosphere Radar Classifier',
  description:
    'Classifying Goose Bay radar returns as good or bad with five machine learning models, evaluated on a held-out test set.',
}

export const viewport: Viewport = {
  themeColor: '#f6f5f0',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

```

---

## 6. app\page.tsx <a id='app-page-tsx'></a>

**Description**: Main Page entry point (renders Dashboard)  
**File Location**: `ML project from v0/app\page.tsx`

```typescript
import { Dashboard } from '@/components/dashboard'

export default function Page() {
  return <Dashboard />
}

```

---

## 7. app\globals.css <a id='app-globals-css'></a>

**Description**: TailwindCSS v4 theme tokens and global styles  
**File Location**: `ML project from v0/app\globals.css`

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

@theme inline {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  --color-destructive: var(--destructive);
  --color-good: var(--good);
  --color-bad: var(--bad);
  --color-radar: var(--radar);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

:root {
  color-scheme: light;
  --background: oklch(0.97 0.006 95);
  --foreground: oklch(0.2 0.01 150);
  --card: oklch(0.99 0.004 95);
  --card-foreground: oklch(0.2 0.01 150);
  --primary: oklch(0.24 0.02 155);
  --primary-foreground: oklch(0.98 0.005 95);
  --secondary: oklch(0.94 0.008 95);
  --secondary-foreground: oklch(0.24 0.02 155);
  --muted: oklch(0.94 0.008 95);
  --muted-foreground: oklch(0.5 0.012 150);
  --accent: oklch(0.93 0.01 95);
  --accent-foreground: oklch(0.24 0.02 155);
  --destructive: oklch(0.55 0.2 28);
  --border: oklch(0.88 0.01 95);
  --input: oklch(0.88 0.01 95);
  --ring: oklch(0.55 0.13 155);
  --good: oklch(0.52 0.13 155);
  --bad: oklch(0.6 0.19 35);
  --radar: oklch(0.17 0.025 160);
  --radius: 0.5rem;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    scroll-behavior: smooth;
    scroll-padding-top: 4.5rem;
  }
  body {
    @apply bg-background text-foreground font-sans;
  }
  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }
}

```

---

## 8. lib\api.ts <a id='lib-api-ts'></a>

**Description**: Client-side API service & SWR fetcher methods  
**File Location**: `ML project from v0/lib\api.ts`

```typescript
export type Label = 'good' | 'bad'

export type Prediction = { label: Label; prob_good: number }
export type Predictions = Record<string, Prediction>

export type Summary = {
  samples: number
  raw_features: number
  model_features: number
  good: number
  bad: number
  train: number
  test: number
  engineered: string[]
  dropped: { column: string; variance: number }[]
}

export type PcaData = {
  explained: number[]
  points: { id: number; x: number; y: number; truth: Label; split: 'train' | 'test' }[]
}

export type ModelBenchmark = {
  key: string
  name: string
  cv_accuracy: number
  accuracy: number
  precision: number
  recall: number
  f1: number
  roc_auc: number
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number }
  roc: { fpr: number[]; tpr: number[] }
}

export type Benchmarks = { test_size: number; models: ModelBenchmark[] }

export type RadarSignal = {
  id: number
  x: number
  y: number
  truth: Label
  predicted: Label
  prob_good: number
}

export type RadarData = { model: string; signals: RadarSignal[] }

export type SignalResult = {
  id: number | null
  split: 'train' | 'test' | null
  truth: Label | null
  values: number[]
  real: number[]
  imaginary: number[]
  envelope: number[]
  predictions: Predictions
}

export type CsvResult = {
  count: number
  has_labels: boolean
  accuracy: Record<string, number> | null
  rows: { row: number; truth: Label | null; predictions: Predictions }[]
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return parseResponse<T>(res)
}

export async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') message = body.detail
    } catch {
      if (res.status >= 500) message = 'Backend is not reachable. Start it with: pnpm api'
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`

```

---

## 9. lib\utils.ts <a id='lib-utils-ts'></a>

**Description**: Utility functions (cn class merging)  
**File Location**: `ML project from v0/lib\utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

---

## 10. components\ui\button.tsx <a id='components-ui-button-tsx'></a>

**Description**: Base UI accessible button component  
**File Location**: `ML project from v0/components\ui\button.tsx`

```typescript
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

```

---

## 11. components\site-header.tsx <a id='components-site-header-tsx'></a>

**Description**: Top navigation header & live API health indicator  
**File Location**: `ML project from v0/components\site-header.tsx`

```typescript
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

```

---

## 12. components\dashboard.tsx <a id='components-dashboard-tsx'></a>

**Description**: Master dashboard coordinating all radar & ML sections  
**File Location**: `ML project from v0/components\dashboard.tsx`

```typescript
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

```

---

## 13. components\section-shell.tsx <a id='components-section-shell-tsx'></a>

**Description**: Reusable card container with sci-fi grid styling  
**File Location**: `ML project from v0/components\section-shell.tsx`

```typescript
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

```

---

## 14. components\radar-section.tsx <a id='components-radar-section-tsx'></a>

**Description**: Radar overview panel & model selector  
**File Location**: `ML project from v0/components\radar-section.tsx`

```typescript
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

```

---

## 15. components\radar-canvas.tsx <a id='components-radar-canvas-tsx'></a>

**Description**: HTML5 360-degree interactive rotating radar sweep  
**File Location**: `ML project from v0/components\radar-canvas.tsx`

```typescript
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

```

---

## 16. components\signal-result.tsx <a id='components-signal-result-tsx'></a>

**Description**: Target classification card with confidence gauges  
**File Location**: `ML project from v0/components\signal-result.tsx`

```typescript
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

```

---

## 17. components\test-section.tsx <a id='components-test-section-tsx'></a>

**Description**: Viva Testing Lab (Presets & 34-feature paste box)  
**File Location**: `ML project from v0/components\test-section.tsx`

```typescript
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

```

---

## 18. components\csv-test.tsx <a id='components-csv-test-tsx'></a>

**Description**: Batch CSV dropzone upload & accuracy validator  
**File Location**: `ML project from v0/components\csv-test.tsx`

```typescript
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

```

---

## 19. components\benchmark-section.tsx <a id='components-benchmark-section-tsx'></a>

**Description**: Multi-model benchmark matrix, ROC curves & confusion matrix  
**File Location**: `ML project from v0/components\benchmark-section.tsx`

```typescript
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

```

---

## 20. components\dataset-section.tsx <a id='components-dataset-section-tsx'></a>

**Description**: 2D PCA projection & raw feature dataset explorer  
**File Location**: `ML project from v0/components\dataset-section.tsx`

```typescript
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

```

---

## 21. components\xy-chart.tsx <a id='components-xy-chart-tsx'></a>

**Description**: Canvas chart for ROC curves & pulse envelopes  
**File Location**: `ML project from v0/components\xy-chart.tsx`

```typescript
export type ChartLine = {
  id: string
  points: [number, number][]
  color: string
  width?: number
  dashed?: boolean
  step?: boolean
  opacity?: number
}

export type ChartDot = {
  x: number
  y: number
  color: string
  ring?: boolean
  opacity?: number
}

type Props = {
  lines?: ChartLine[]
  dots?: ChartDot[]
  xDomain: [number, number]
  yDomain: [number, number]
  xTicks: number[]
  yTicks: number[]
  xLabel: string
  yLabel: string
  xFormat?: (v: number) => string
  yFormat?: (v: number) => string
  label: string
}

const W = 520
const H = 340
const M = { l: 52, r: 14, t: 12, b: 44 }

export function niceTicks([min, max]: [number, number], count = 5): number[] {
  const span = max - min
  const rough = span / count
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? rough
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = first; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(10)))
  return ticks
}

export function XYChart({
  lines = [],
  dots = [],
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  xFormat = String,
  yFormat = String,
  label,
}: Props) {
  const sx = (v: number) => M.l + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * (W - M.l - M.r)
  const sy = (v: number) => H - M.b - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * (H - M.t - M.b)

  const pathFor = (line: ChartLine) => {
    const pts = line.points
    if (!line.step) return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x)},${sy(y)}`).join(' ')
    return pts
      .map(([x, y], i) => (i ? `L${sx(x)},${sy(pts[i - 1][1])} L${sx(x)},${sy(y)}` : `M${sx(x)},${sy(y)}`))
      .join(' ')
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} className="stroke-border" strokeWidth={1} />
          <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
            {yFormat(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text
          key={`x${t}`}
          x={sx(t)}
          y={H - M.b + 18}
          textAnchor="middle"
          className="fill-muted-foreground font-mono text-[11px]"
        >
          {xFormat(t)}
        </text>
      ))}
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} className="stroke-foreground/40" />
      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} className="stroke-foreground/40" />
      <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-xs">
        {xLabel}
      </text>
      <text
        transform={`translate(13 ${(M.t + H - M.b) / 2}) rotate(-90)`}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {yLabel}
      </text>

      {lines.map((l) => (
        <path
          key={l.id}
          d={pathFor(l)}
          fill="none"
          style={{ stroke: l.color }}
          strokeWidth={l.width ?? 2}
          strokeDasharray={l.dashed ? '5 4' : undefined}
          opacity={l.opacity ?? 1}
          strokeLinejoin="round"
        />
      ))}
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={sx(d.x)}
          cy={sy(d.y)}
          r={d.ring ? 4 : 3.2}
          style={{ fill: d.ring ? 'transparent' : d.color, stroke: d.color }}
          strokeWidth={d.ring ? 1.6 : 0}
          opacity={d.opacity ?? 0.85}
        />
      ))}
    </svg>
  )
}

```

---

## 22. backend\requirements.txt <a id='backend-requirements-txt'></a>

**Description**: FastAPI backend Python dependencies  
**File Location**: `ML project from v0/backend\requirements.txt`

```plaintext
fastapi
uvicorn[standard]
python-multipart
numpy
pandas
scikit-learn
joblib

```

---

## 23. backend\main.py <a id='backend-main-py'></a>

**Description**: FastAPI REST API endpoints & signal dispatcher  
**File Location**: `ML project from v0/backend\main.py`

```python
"""FastAPI backend for the ionosphere radar-return classifier."""
from __future__ import annotations

import io

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

import ml

app = FastAPI(title="Ionosphere Radar API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

raw_df = ml.load_raw()
features_df = ml.engineer(raw_df)
bundle = ml.load_or_train()
models = bundle["models"]
split = bundle["split"]
LABEL_NAME = {1: "good", 0: "bad"}
MAX_CSV_ROWS = 5000


def _check_model(key: str) -> str:
    if key not in models:
        raise HTTPException(404, f"Unknown model '{key}'. Options: {list(models)}")
    return key


def _predict_all(raw: pd.DataFrame) -> dict[str, dict[str, np.ndarray]]:
    """Run every model on rows of the 34 raw pulse columns."""
    X = ml.engineer(raw)
    out = {}
    for key, model in models.items():
        out[key] = {"label": model.predict(X), "prob_good": model.predict_proba(X)[:, 1]}
    return out


def _predictions_for_row(preds: dict, i: int) -> dict:
    return {
        key: {"label": LABEL_NAME[int(p["label"][i])], "prob_good": float(p["prob_good"][i])}
        for key, p in preds.items()
    }


def _signal_payload(values: list[float], extra: dict) -> dict:
    raw = pd.DataFrame([values], columns=ml.RAW_COLS)
    real = raw[ml.REAL_COLS].to_numpy(dtype=float)[0]
    imag = raw[ml.IMAG_COLS].to_numpy(dtype=float)[0]
    preds = _predict_all(raw)
    return {
        **extra,
        "values": values,
        "real": real.tolist(),
        "imaginary": imag.tolist(),
        "envelope": np.sqrt(real**2 + imag**2).tolist(),
        "predictions": _predictions_for_row(preds, 0),
    }


def _dataset_signal(signal_id: int) -> dict:
    row = raw_df.iloc[signal_id]
    values = [float(row[c]) for c in ml.RAW_COLS]
    return _signal_payload(
        values,
        {"id": signal_id, "split": split[signal_id], "truth": LABEL_NAME[int(row["label"])]},
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "samples": len(raw_df), "models": list(models)}


@app.get("/api/dataset/summary")
def dataset_summary():
    good = int(raw_df["label"].sum())
    return {
        "samples": len(raw_df),
        "raw_features": len(ml.RAW_COLS),
        "model_features": len(ml.FEATURE_COLS),
        "good": good,
        "bad": len(raw_df) - good,
        "train": bundle["n_train"],
        "test": bundle["n_test"],
        "engineered": ml.ENGINEERED,
        "dropped": [{"column": "a02", "variance": bundle["a02_variance"]}],
    }


@app.get("/api/dataset/pca")
def dataset_pca():
    pca = bundle["pca"]
    points = [
        {
            "id": i,
            "x": pca["x"][i],
            "y": pca["y"][i],
            "truth": LABEL_NAME[int(raw_df["label"].iloc[i])],
            "split": split[i],
        }
        for i in range(len(raw_df))
    ]
    return {"explained": pca["explained"], "points": points}


@app.get("/api/benchmarks")
def benchmarks():
    return {"test_size": bundle["n_test"], "models": bundle["benchmarks"]}


@app.get("/api/radar")
def radar(model: str = Query("svm")):
    """Held-out test signals with their PCA position and the chosen model's prediction."""
    key = _check_model(model)
    test_ids = [i for i, s in enumerate(split) if s == "test"]
    X = features_df.iloc[test_ids]
    labels = models[key].predict(X)
    probs = models[key].predict_proba(X)[:, 1]
    pca = bundle["pca"]
    return {
        "model": key,
        "signals": [
            {
                "id": sid,
                "x": pca["x"][sid],
                "y": pca["y"][sid],
                "truth": LABEL_NAME[int(raw_df["label"].iloc[sid])],
                "predicted": LABEL_NAME[int(labels[n])],
                "prob_good": float(probs[n]),
            }
            for n, sid in enumerate(test_ids)
        ],
    }


@app.get("/api/signals/random")
def random_signal(split_name: str = Query("test", alias="split")):
    pool = [i for i, s in enumerate(split) if split_name == "any" or s == split_name]
    if not pool:
        raise HTTPException(400, "split must be 'test', 'train' or 'any'")
    return _dataset_signal(int(np.random.choice(pool)))


@app.get("/api/signals/{signal_id}")
def get_signal(signal_id: int):
    if not 0 <= signal_id < len(raw_df):
        raise HTTPException(404, f"Signal id must be between 0 and {len(raw_df) - 1}")
    return _dataset_signal(signal_id)


class CustomSignal(BaseModel):
    values: list[float]


@app.post("/api/predict")
def predict_custom(req: CustomSignal):
    if len(req.values) != len(ml.RAW_COLS):
        raise HTTPException(400, f"Provide exactly {len(ml.RAW_COLS)} values (a01 to a34).")
    if not np.all(np.isfinite(req.values)):
        raise HTTPException(400, "Values must be finite numbers.")
    return _signal_payload(req.values, {"id": None, "split": None, "truth": None})


def _parse_csv(content: bytes) -> tuple[pd.DataFrame, pd.Series | None]:
    try:
        df = pd.read_csv(io.BytesIO(content), header=None)
    except Exception as exc:
        raise HTTPException(400, f"Could not read CSV: {exc}") from exc

    first = pd.to_numeric(df.iloc[0, : len(ml.RAW_COLS)], errors="coerce")
    if first.isna().any():  # first row is a header
        df = df.iloc[1:].reset_index(drop=True)

    if df.shape[1] not in (len(ml.RAW_COLS), len(ml.RAW_COLS) + 1):
        raise HTTPException(
            400, f"Expected 34 columns (or 35 with a g/b label), found {df.shape[1]}."
        )
    if len(df) == 0:
        raise HTTPException(400, "CSV has no data rows.")
    if len(df) > MAX_CSV_ROWS:
        raise HTTPException(400, f"Limit is {MAX_CSV_ROWS} rows per upload.")

    values = df.iloc[:, : len(ml.RAW_COLS)].apply(pd.to_numeric, errors="coerce")
    if values.isna().any().any() or not np.isfinite(values.to_numpy(dtype=float)).all():
        raise HTTPException(400, "All 34 signal columns must be numeric.")
    values.columns = ml.RAW_COLS

    truth = None
    if df.shape[1] == len(ml.RAW_COLS) + 1:
        mapped = df.iloc[:, -1].astype(str).str.strip().str.lower().map(
            {"g": 1, "b": 0, "1": 1, "0": 0}
        )
        if mapped.isna().any():
            raise HTTPException(400, "Label column must contain only g/b (or 1/0).")
        truth = mapped.astype(int)
    return values, truth


@app.post("/api/predict/csv")
async def predict_csv(file: UploadFile = File(...)):
    values, truth = _parse_csv(await file.read())
    preds = _predict_all(values)

    rows = []
    for i in range(len(values)):
        rows.append(
            {
                "row": i + 1,
                "truth": LABEL_NAME[int(truth.iloc[i])] if truth is not None else None,
                "predictions": _predictions_for_row(preds, i),
            }
        )

    accuracy = None
    if truth is not None:
        accuracy = {
            key: float((p["label"] == truth.to_numpy()).mean()) for key, p in preds.items()
        }
    return {"count": len(rows), "has_labels": truth is not None, "accuracy": accuracy, "rows": rows}


@app.get("/api/dataset/sample-csv")
def sample_csv(n: int = Query(20, ge=1, le=200)):
    """A ready-to-upload CSV built from held-out test signals (34 values + g/b label)."""
    test_ids = [i for i, s in enumerate(split) if s == "test"][:n]
    out = raw_df.iloc[test_ids][ml.RAW_COLS + ["target"]]
    return Response(
        out.to_csv(index=False, header=False),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="radar_test_signals.csv"'},
    )

```

---

## 24. backend\ml.py <a id='backend-ml-py'></a>

**Description**: End-to-end 5-model ML trainer, PCA engine & joblib bundle  
**File Location**: `ML project from v0/backend\ml.py`

```python
"""Ionosphere radar-return classifier: data, features, training and evaluation.

Everything the frontend shows is computed here from backend/data/ionosphere.csv.
"""
from __future__ import annotations

import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "ionosphere.csv"
ARTIFACT_PATH = BASE_DIR / "artifacts" / "bundle.joblib"

RANDOM_STATE = 42
TEST_SIZE = 0.20

RAW_COLS = [f"a{i:02d}" for i in range(1, 35)]
REAL_COLS = RAW_COLS[0::2]  # a01, a03, ... a33
IMAG_COLS = RAW_COLS[1::2]  # a02, a04, ... a34
ENGINEERED = ["mean_pulse_amplitude", "std_pulse_amplitude", "lag_smoothness"]
# a02 (imaginary part of lag 0) is constant 0 in the data, so it is dropped.
FEATURE_COLS = [c for c in RAW_COLS if c != "a02"] + ENGINEERED

MODEL_NAMES = {
    "logistic_regression": "Logistic Regression",
    "knn": "k-Nearest Neighbors (k=3)",
    "random_forest": "Random Forest",
    "svm": "SVM (RBF kernel)",
    "neural_network": "Neural Network (MLP)",
}


def load_raw() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, header=None, names=RAW_COLS + ["target"])
    df["label"] = df["target"].astype(str).str.lower().map({"g": 1, "b": 0}).astype(int)
    return df


def engineer(raw: pd.DataFrame) -> pd.DataFrame:
    """Build the model input matrix from the 34 raw pulse columns."""
    real = raw[REAL_COLS].to_numpy(dtype=float)
    imag = raw[IMAG_COLS].to_numpy(dtype=float)
    envelope = np.sqrt(real**2 + imag**2)
    feats = raw[[c for c in RAW_COLS if c != "a02"]].astype(float).copy()
    feats["mean_pulse_amplitude"] = envelope.mean(axis=1)
    feats["std_pulse_amplitude"] = envelope.std(axis=1)
    feats["lag_smoothness"] = np.abs(np.diff(real, axis=1)).mean(axis=1)
    return feats[FEATURE_COLS]


def _build_models() -> dict[str, Pipeline]:
    def pipe(clf):
        return Pipeline([("scaler", StandardScaler()), ("clf", clf)])

    return {
        "logistic_regression": pipe(LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)),
        "knn": pipe(KNeighborsClassifier(n_neighbors=3)),
        "random_forest": pipe(RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE)),
        "svm": pipe(SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE)),
        "neural_network": pipe(
            MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=500, random_state=RANDOM_STATE)
        ),
    }


def train() -> dict:
    raw = load_raw()
    X = engineer(raw)
    y = raw["label"]

    idx_train, idx_test = train_test_split(
        np.arange(len(raw)), test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )
    X_train, X_test = X.iloc[idx_train], X.iloc[idx_test]
    y_train, y_test = y.iloc[idx_train], y.iloc[idx_test]

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    models, benchmarks = {}, []

    for key, pipeline in _build_models().items():
        cv_acc = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="accuracy").mean()
        pipeline.fit(X_train, y_train)
        pred = pipeline.predict(X_test)
        prob = pipeline.predict_proba(X_test)[:, 1]
        tn, fp, fn, tp = confusion_matrix(y_test, pred, labels=[0, 1]).ravel()
        fpr, tpr, _ = roc_curve(y_test, prob)
        benchmarks.append(
            {
                "key": key,
                "name": MODEL_NAMES[key],
                "cv_accuracy": float(cv_acc),
                "accuracy": float(accuracy_score(y_test, pred)),
                "precision": float(precision_score(y_test, pred)),
                "recall": float(recall_score(y_test, pred)),
                "f1": float(f1_score(y_test, pred)),
                "roc_auc": float(roc_auc_score(y_test, prob)),
                "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
                "roc": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
            }
        )
        models[key] = pipeline

    scaled = StandardScaler().fit_transform(X)
    pca = PCA(n_components=2, random_state=RANDOM_STATE)
    coords = pca.fit_transform(scaled)

    split = np.full(len(raw), "train", dtype=object)
    split[idx_test] = "test"

    return {
        "models": models,
        "benchmarks": benchmarks,
        "pca": {
            "x": coords[:, 0].tolist(),
            "y": coords[:, 1].tolist(),
            "explained": pca.explained_variance_ratio_.tolist(),
        },
        "split": split.tolist(),
        "n_train": int(len(idx_train)),
        "n_test": int(len(idx_test)),
        "a02_variance": float(raw["a02"].var()),
    }


def load_or_train() -> dict:
    if ARTIFACT_PATH.exists():
        try:
            return joblib.load(ARTIFACT_PATH)
        except Exception:
            ARTIFACT_PATH.unlink(missing_ok=True)
    bundle = train()
    ARTIFACT_PATH.parent.mkdir(exist_ok=True)
    joblib.dump(bundle, ARTIFACT_PATH)
    return bundle


if __name__ == "__main__":
    ARTIFACT_PATH.unlink(missing_ok=True)
    result = load_or_train()
    for b in result["benchmarks"]:
        print(f"{b['name']:<28} acc={b['accuracy']:.4f} auc={b['roc_auc']:.4f} cm={b['confusion_matrix']}")

```

---
