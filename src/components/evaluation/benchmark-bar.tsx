'use client'

import type { BenchmarkVerdict } from '@/lib/types/evaluation'

interface BenchmarkBarProps {
  value: number
  median: number
  range: [number, number]
  verdict: BenchmarkVerdict
  formatValue: (v: number) => string
  higherIsBetter?: boolean
}

export function BenchmarkBar({ value, median, range, verdict, formatValue, higherIsBetter }: BenchmarkBarProps) {
  // Compute visual position as percentage of range (with some padding)
  const spread = range[1] - range[0]
  const visualMin = range[0] - spread * 0.3
  const visualMax = range[1] + spread * 0.3
  const totalSpread = visualMax - visualMin

  const valuePct = Math.max(0, Math.min(100, ((value - visualMin) / totalSpread) * 100))
  const medianPct = ((median - visualMin) / totalSpread) * 100
  const rangeStartPct = ((range[0] - visualMin) / totalSpread) * 100
  const rangeWidthPct = (spread / totalSpread) * 100

  const verdictColors: Record<BenchmarkVerdict, string> = higherIsBetter
    ? { above_market: 'bg-emerald-500', in_line: 'bg-neutral-400', below_market: 'bg-amber-500' }
    : { above_market: 'bg-amber-500', in_line: 'bg-neutral-400', below_market: 'bg-emerald-500' }

  const verdictLabels: Record<BenchmarkVerdict, string> = {
    above_market: 'Above market',
    in_line: 'In line with market',
    below_market: 'Below market',
  }

  const verdictTextColors: Record<BenchmarkVerdict, string> = higherIsBetter
    ? { above_market: 'text-emerald-700', in_line: 'text-neutral-600', below_market: 'text-amber-700' }
    : { above_market: 'text-amber-700', in_line: 'text-neutral-600', below_market: 'text-emerald-700' }

  return (
    <div className="space-y-1.5">
      {/* Bar */}
      <div className="relative h-2 bg-neutral-100 rounded-full">
        {/* Market range band */}
        <div
          className="absolute h-full bg-neutral-200 rounded-full"
          style={{ left: `${rangeStartPct}%`, width: `${rangeWidthPct}%` }}
        />
        {/* Median line */}
        <div
          className="absolute top-0 h-full w-px bg-neutral-400"
          style={{ left: `${medianPct}%` }}
        />
        {/* User value dot */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${verdictColors[verdict]}`}
          style={{ left: `${valuePct}%`, transform: `translateX(-50%) translateY(-50%)` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${verdictTextColors[verdict]}`}>
          {verdictLabels[verdict]}
        </span>
        <span className="text-neutral-400">
          Median: {formatValue(median)}
        </span>
      </div>
    </div>
  )
}
