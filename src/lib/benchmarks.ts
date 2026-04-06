import type { ConfidenceField, BenchmarkResult, BenchmarkVerdict } from './types/evaluation'

interface BenchmarkEntry {
  median: number
  range: [number, number] // [p25, p75]
}

const ADVISORY_FEE_BENCHMARKS: Record<string, BenchmarkEntry> = {
  '$1M-$3M':   { median: 100, range: [85, 125] },
  '$3M-$5M':   { median: 90,  range: [75, 110] },
  '$5M-$10M':  { median: 80,  range: [60, 100] },
  '$10M-$25M': { median: 70,  range: [50, 90] },
  '$25M+':     { median: 55,  range: [35, 75] },
}

const LENDING_SPREAD_BENCHMARKS: Record<string, BenchmarkEntry> = {
  '$1M-$3M':   { median: 225, range: [175, 300] },
  '$3M-$5M':   { median: 200, range: [150, 275] },
  '$5M-$10M':  { median: 175, range: [100, 250] },
  '$10M-$25M': { median: 150, range: [75, 225] },
  '$25M+':     { median: 100, range: [50, 175] },
}

const SERVICE_MODEL_BENCHMARKS: Record<string, BenchmarkEntry> = {
  '$1M-$3M':   { median: 3, range: [2, 4] },
  '$3M-$5M':   { median: 3, range: [2, 4] },
  '$5M-$10M':  { median: 4, range: [3, 5] },
  '$10M-$25M': { median: 4, range: [3, 5] },
  '$25M+':     { median: 5, range: [4, 5] },
}

const PORTFOLIO_CUSTOMIZATION_BENCHMARKS: Record<string, BenchmarkEntry> = {
  '$1M-$3M':   { median: 2, range: [1, 3] },
  '$3M-$5M':   { median: 2, range: [1, 3] },
  '$5M-$10M':  { median: 3, range: [2, 4] },
  '$10M-$25M': { median: 4, range: [3, 5] },
  '$25M+':     { median: 5, range: [4, 5] },
}

const BENCHMARK_TABLES: Record<string, Record<string, BenchmarkEntry>> = {
  advisoryFeeBps: ADVISORY_FEE_BENCHMARKS,
  lendingSpreadBps: LENDING_SPREAD_BENCHMARKS,
  serviceModel: SERVICE_MODEL_BENCHMARKS,
  portfolioCustomization: PORTFOLIO_CUSTOMIZATION_BENCHMARKS,
}

const FIELD_BOUNDS: Record<string, [number, number]> = {
  advisoryFeeBps: [25, 200],
  lendingSpreadBps: [0, 400],
  serviceModel: [1, 5],
  portfolioCustomization: [1, 5],
}

const FIELD_LABELS: Record<string, string> = {
  advisoryFeeBps: 'Advisory Fee',
  lendingSpreadBps: 'Lending Spread',
  serviceModel: 'Service Model',
  portfolioCustomization: 'Portfolio Customization',
}

export function getEstimate(field: string, assetsRange: string): BenchmarkEntry {
  const table = BENCHMARK_TABLES[field]
  if (!table) return { median: 0, range: [0, 0] }
  return table[assetsRange] || table['$5M-$10M'] // fallback to middle bucket
}

export function clampValue(field: string, value: number): number {
  const bounds = FIELD_BOUNDS[field]
  if (!bounds) return value
  return Math.max(bounds[0], Math.min(bounds[1], value))
}

function computePercentile(value: number, range: [number, number]): number {
  const [low, high] = range
  if (high === low) return 50
  const pct = ((value - low) / (high - low)) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

function computeVerdict(value: number, range: [number, number], field: string): BenchmarkVerdict {
  // For fees/spreads: higher = worse for client (above_market)
  // For service/customization: higher = better for client (below_market if low)
  const isHigherBetter = field === 'serviceModel' || field === 'portfolioCustomization'

  if (isHigherBetter) {
    if (value < range[0]) return 'below_market'
    if (value > range[1]) return 'above_market'
    return 'in_line'
  } else {
    if (value > range[1]) return 'above_market'
    if (value < range[0]) return 'below_market'
    return 'in_line'
  }
}

export function computeBenchmark(field: string, assetsRange: string, userValue: number): BenchmarkResult {
  const estimate = getEstimate(field, assetsRange)
  return {
    field: field as BenchmarkResult['field'],
    label: FIELD_LABELS[field] || field,
    userValue,
    benchmarkMedian: estimate.median,
    benchmarkRange: estimate.range,
    verdict: computeVerdict(userValue, estimate.range, field),
    percentile: computePercentile(userValue, estimate.range),
  }
}

export function computeAllBenchmarks(
  assetsRange: string,
  fields: Record<string, ConfidenceField>
): BenchmarkResult[] {
  const results: BenchmarkResult[] = []
  for (const [field, data] of Object.entries(fields)) {
    if (!BENCHMARK_TABLES[field]) continue
    const value = data.confidence === 'high' ? data.value : data.estimated_value
    results.push(computeBenchmark(field, assetsRange, value))
  }
  return results
}

export function getAllEstimates(assetsRange: string): Record<string, BenchmarkEntry> {
  return {
    advisoryFeeBps: getEstimate('advisoryFeeBps', assetsRange),
    lendingSpreadBps: getEstimate('lendingSpreadBps', assetsRange),
    serviceModel: getEstimate('serviceModel', assetsRange),
    portfolioCustomization: getEstimate('portfolioCustomization', assetsRange),
  }
}
