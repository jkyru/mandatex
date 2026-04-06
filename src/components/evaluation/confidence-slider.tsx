'use client'

import { useState } from 'react'
import type { ConfidenceField } from '@/lib/types/evaluation'

interface ConfidenceSliderProps {
  label: string
  description: string
  min: number
  max: number
  step: number
  formatValue: (value: number) => string
  formatRange?: (range: [number, number]) => string
  markers?: { value: number; label: string }[]
  estimatedValue: number
  estimatedRange: [number, number]
  value: ConfidenceField
  onChange: (field: ConfidenceField) => void
}

export function ConfidenceSlider({
  label,
  description,
  min,
  max,
  step,
  formatValue,
  formatRange,
  markers,
  estimatedValue,
  estimatedRange,
  value,
  onChange,
}: ConfidenceSliderProps) {
  const [lastManualValue, setLastManualValue] = useState<number>(estimatedValue)
  const isEstimated = value.confidence === 'low'

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = Number(e.target.value)
    setLastManualValue(newValue)
    onChange({
      value: newValue,
      estimated_value: estimatedValue,
      range: estimatedRange,
      confidence: 'high',
      source: 'user',
    })
  }

  function handleCheckboxChange(checked: boolean) {
    if (checked) {
      onChange({
        value: estimatedValue,
        estimated_value: estimatedValue,
        range: estimatedRange,
        confidence: 'low',
        source: 'estimated',
      })
    } else {
      onChange({
        value: lastManualValue,
        estimated_value: estimatedValue,
        range: estimatedRange,
        confidence: 'high',
        source: 'user',
      })
    }
  }

  const displayValue = isEstimated
    ? (formatRange
        ? formatRange(estimatedRange)
        : `${formatValue(estimatedRange[0])} - ${formatValue(estimatedRange[1])}`)
    : formatValue(value.value)

  const sliderPercent = ((value.value - min) / (max - min)) * 100

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
      </div>

      <div className={`space-y-2 ${isEstimated ? 'opacity-50' : ''}`}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value.value}
          onChange={handleSliderChange}
          disabled={isEstimated}
          className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-900 disabled:cursor-not-allowed"
        />

        {markers && markers.length > 0 && (
          <div className="relative h-4 -mt-1">
            {markers.map((marker) => {
              const pct = ((marker.value - min) / (max - min)) * 100
              return (
                <span
                  key={marker.value}
                  className="absolute text-[10px] text-neutral-400 -translate-x-1/2"
                  style={{ left: `${pct}%` }}
                >
                  {marker.label}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-900 font-medium">
          {displayValue}
          {isEstimated && (
            <span className="ml-2 text-xs font-normal text-amber-600">estimated</span>
          )}
        </p>
        {!isEstimated && (
          <div
            className="h-1 w-16 bg-neutral-100 rounded-full overflow-hidden"
            title={`${Math.round(sliderPercent)}% of range`}
          >
            <div
              className="h-full bg-neutral-900 rounded-full transition-all"
              style={{ width: `${sliderPercent}%` }}
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isEstimated}
          onChange={(e) => handleCheckboxChange(e.target.checked)}
          className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
        />
        <span className="text-xs text-neutral-500">I'm not sure -- estimate for me</span>
      </label>
    </div>
  )
}
