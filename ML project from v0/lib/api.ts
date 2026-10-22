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
