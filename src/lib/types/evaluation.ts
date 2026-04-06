export interface ConfidenceField {
  value: number
  estimated_value: number
  range: [number, number]
  confidence: 'high' | 'low'
  source: 'user' | 'estimated'
}

export type BenchmarkVerdict = 'above_market' | 'in_line' | 'below_market'

export interface BenchmarkResult {
  field: 'advisoryFeeBps' | 'lendingSpreadBps' | 'serviceModel' | 'portfolioCustomization'
  label: string
  userValue: number
  benchmarkMedian: number
  benchmarkRange: [number, number]
  verdict: BenchmarkVerdict
  percentile: number
}

export interface EvaluationDashboardData {
  id: string
  status: string
  assetsRange: string
  primaryGoal: string
  advisoryFeeBps: ConfidenceField
  lendingSpreadBps: ConfidenceField
  serviceModel: ConfidenceField
  portfolioCustomization: ConfidenceField
  benchmarkResults: BenchmarkResult[]
  aiInsights: string[]
  convertedRfpId: string | null
}
