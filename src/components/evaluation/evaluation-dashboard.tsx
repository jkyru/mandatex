'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BenchmarkBar } from './benchmark-bar'
import type { EvaluationDashboardData, ConfidenceField, BenchmarkResult } from '@/lib/types/evaluation'

interface Props {
  evaluation: EvaluationDashboardData
  prospectName: string
}

function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

function formatSpread(bps: number): string {
  return `SOFR + ${(bps / 100).toFixed(2)}%`
}

function formatSatisfaction(level: number): string {
  const labels = ['', 'Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']
  return labels[level] || `Level ${level}`
}

function formatCustomization(level: number): string {
  const labels = ['', 'Pure Model', 'Mostly Model', 'Some Customization', 'Mostly Custom', 'Fully Customized']
  return labels[level] || `Level ${level}`
}

function getFieldFormatter(field: string): (v: number) => string {
  if (field === 'advisoryFeeBps') return formatBps
  if (field === 'lendingSpreadBps') return formatSpread
  if (field === 'serviceModel') return formatSatisfaction
  if (field === 'portfolioCustomization') return formatCustomization
  return (v) => String(v)
}

function FieldRow({ label, field, formatter }: { label: string; field: ConfidenceField; formatter: (v: number) => string }) {
  const isEstimated = field.confidence === 'low'
  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-sm text-neutral-700">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-neutral-900">
          {isEstimated
            ? `${formatter(field.range[0])} - ${formatter(field.range[1])}`
            : formatter(field.value)
          }
        </p>
        <Badge variant={isEstimated ? 'warning' : 'default'}>
          {isEstimated ? 'Estimated' : 'Your Input'}
        </Badge>
      </div>
    </div>
  )
}

export function EvaluationDashboard({ evaluation, prospectName }: Props) {
  const router = useRouter()
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')

  const isConverted = !!evaluation.convertedRfpId

  async function handleConvert() {
    setConverting(true)
    setConvertError('')
    try {
      const res = await fetch('/api/evaluation/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluationId: evaluation.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setConvertError(data.error || 'Something went wrong')
        setConverting(false)
        return
      }
      router.push(`/success?rfpId=${data.rfpId}`)
    } catch {
      setConvertError('Something went wrong')
      setConverting(false)
    }
  }

  const goalLabels: Record<string, string> = {
    'wealth-preservation': 'Wealth Preservation',
    'growth': 'Growth',
    'income-generation': 'Income Generation',
    'tax-optimization': 'Tax Optimization',
    'estate-planning': 'Estate Planning',
    'comprehensive': 'Comprehensive',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Your Advisor Evaluation</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">{evaluation.assetsRange}</span>
          <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">{goalLabels[evaluation.primaryGoal] || evaluation.primaryGoal}</span>
        </div>
      </div>

      {/* Section 1: Your Current Advisor */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">Your Current Advisor</h2>
        <div className="divide-y divide-neutral-100">
          <FieldRow label="Advisory Fee" field={evaluation.advisoryFeeBps} formatter={formatBps} />
          <FieldRow label="Lending Spread" field={evaluation.lendingSpreadBps} formatter={formatSpread} />
          <FieldRow label="Satisfaction" field={evaluation.serviceModel} formatter={formatSatisfaction} />
          <FieldRow label="Portfolio Customization" field={evaluation.portfolioCustomization} formatter={formatCustomization} />
        </div>
      </Card>

      {/* Section 2: Market Comparison */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">Market Comparison</h2>
        <div className="space-y-6">
          {evaluation.benchmarkResults.map((result: BenchmarkResult) => {
            const formatter = getFieldFormatter(result.field)
            const higherIsBetter = result.field === 'serviceModel' || result.field === 'portfolioCustomization'
            return (
              <div key={result.field}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-neutral-900">{result.label}</p>
                  <p className="text-xs text-neutral-500">{formatter(result.userValue)}</p>
                </div>
                <BenchmarkBar
                  value={result.userValue}
                  median={result.benchmarkMedian}
                  range={result.benchmarkRange}
                  verdict={result.verdict}
                  formatValue={formatter}
                  higherIsBetter={higherIsBetter}
                />
              </div>
            )
          })}
        </div>
      </Card>

      {/* Section 3: Insights */}
      {evaluation.aiInsights.length > 0 && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">Insights</h2>
          <ul className="space-y-3">
            {evaluation.aiInsights.map((insight: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm text-neutral-700 leading-relaxed">
                <span className="text-neutral-300 mt-0.5 flex-shrink-0">-</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Section 4: CTA */}
      {isConverted ? (
        <Card className="p-6 text-center">
          <p className="text-sm font-medium text-neutral-900 mb-2">Search Started</p>
          <p className="text-sm text-neutral-500 mb-4">You have converted this evaluation into an advisor search.</p>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </Card>
      ) : (
        <Card className="p-8 text-center bg-neutral-50">
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">Want to see what the market offers?</h2>
          <p className="text-sm text-neutral-500 mb-6 max-w-md mx-auto">
            Start a confidential search to compare proposals from qualified advisors. Your evaluation data will be carried forward.
          </p>
          {convertError && <p className="text-sm text-red-600 mb-4">{convertError}</p>}
          <Button size="lg" onClick={handleConvert} disabled={converting}>
            {converting ? 'Starting...' : 'Start Your Search'}
          </Button>
        </Card>
      )}
    </div>
  )
}
