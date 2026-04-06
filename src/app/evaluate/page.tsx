'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfidenceSlider } from '@/components/evaluation/confidence-slider'
import type { ConfidenceField } from '@/lib/types/evaluation'

const ASSET_RANGES = [
  { value: '$1M-$3M', label: '$1M — $3M' },
  { value: '$3M-$5M', label: '$3M — $5M' },
  { value: '$5M-$10M', label: '$5M — $10M' },
  { value: '$10M-$25M', label: '$10M — $25M' },
  { value: '$25M+', label: '$25M+' },
]

const GOALS = [
  { value: 'wealth-preservation', label: 'Wealth Preservation' },
  { value: 'growth', label: 'Growth' },
  { value: 'income-generation', label: 'Income Generation' },
  { value: 'tax-optimization', label: 'Tax Optimization' },
  { value: 'estate-planning', label: 'Estate Planning' },
  { value: 'comprehensive', label: 'Comprehensive Wealth Management' },
]

interface Estimates {
  advisoryFeeBps: { median: number; range: [number, number] }
  lendingSpreadBps: { median: number; range: [number, number] }
  serviceModel: { median: number; range: [number, number] }
  portfolioCustomization: { median: number; range: [number, number] }
}

function makeDefaultField(estimate: { median: number; range: [number, number] }): ConfidenceField {
  return {
    value: estimate.median,
    estimated_value: estimate.median,
    range: estimate.range,
    confidence: 'low',
    source: 'estimated',
  }
}

export default function EvaluatePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [estimates, setEstimates] = useState<Estimates | null>(null)

  const [assetsRange, setAssetsRange] = useState('')
  const [primaryGoal, setPrimaryGoal] = useState('')
  const [isBusinessOwner, setIsBusinessOwner] = useState(false)
  const [hasConcentratedStock, setHasConcentratedStock] = useState(false)
  const [wantsPrivateMarkets, setWantsPrivateMarkets] = useState(false)
  const [wantsLendingSolutions, setWantsLendingSolutions] = useState(false)
  const [needsTaxCoordination, setNeedsTaxCoordination] = useState(false)

  const [advisoryFeeBps, setAdvisoryFeeBps] = useState<ConfidenceField | null>(null)
  const [lendingSpreadBps, setLendingSpreadBps] = useState<ConfidenceField | null>(null)
  const [serviceModel, setServiceModel] = useState<ConfidenceField | null>(null)
  const [portfolioCustomization, setPortfolioCustomization] = useState<ConfidenceField | null>(null)

  const totalSteps = 6
  const stepLabels = ['Assets', 'Goals', 'Complexity', 'Current Fees', 'Current Service', 'Review']

  // Fetch estimates when assets range changes
  useEffect(() => {
    if (!assetsRange) return
    fetch(`/api/evaluation/estimates?assetsRange=${encodeURIComponent(assetsRange)}`)
      .then((r) => r.json())
      .then((data: Estimates) => {
        setEstimates(data)
        // Initialize fields with estimates if not already set by user
        if (!advisoryFeeBps || advisoryFeeBps.confidence === 'low') {
          setAdvisoryFeeBps(makeDefaultField(data.advisoryFeeBps))
        }
        if (!lendingSpreadBps || lendingSpreadBps.confidence === 'low') {
          setLendingSpreadBps(makeDefaultField(data.lendingSpreadBps))
        }
        if (!serviceModel || serviceModel.confidence === 'low') {
          setServiceModel(makeDefaultField(data.serviceModel))
        }
        if (!portfolioCustomization || portfolioCustomization.confidence === 'low') {
          setPortfolioCustomization(makeDefaultField(data.portfolioCustomization))
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsRange])

  function canProceed(): boolean {
    switch (step) {
      case 0: return !!assetsRange
      case 1: return !!primaryGoal
      case 2: return true
      case 3: return !!advisoryFeeBps
      case 4: return !!serviceModel
      case 5: return true
      default: return false
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetsRange,
          primaryGoal,
          isBusinessOwner,
          hasConcentratedStock,
          wantsPrivateMarkets,
          wantsLendingSolutions,
          needsTaxCoordination,
          advisoryFeeBps,
          lendingSpreadBps,
          serviceModel,
          portfolioCustomization,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }
      router.push('/evaluate/dashboard')
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  function formatBps(bps: number): string {
    return `${(bps / 100).toFixed(2)}%`
  }

  function formatSpread(bps: number): string {
    return `SOFR + ${(bps / 100).toFixed(2)}%`
  }

  function formatServiceLevel(level: number): string {
    const labels = ['', 'Fully Reactive', 'Mostly Reactive', 'Balanced', 'Mostly Proactive', 'Fully Proactive']
    return labels[level] || `Level ${level}`
  }

  function formatCustomization(level: number): string {
    const labels = ['', 'Pure Model', 'Mostly Model', 'Some Customization', 'Mostly Custom', 'Fully Customized']
    return labels[level] || `Level ${level}`
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Evaluate Your Current Advisor</h1>
          <p className="mt-1 text-sm text-neutral-500">Step {step + 1} of {totalSteps} — {stepLabels[step]}</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="h-1 bg-neutral-200 rounded-full">
            <div
              className="h-1 bg-neutral-900 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <Card className="p-8">
          {/* Step 0: Assets */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-900 mb-1">Investable Assets</h2>
              <p className="text-sm text-neutral-500 mb-6">Select the range that best describes your total investable assets.</p>
              <div className="space-y-3">
                {ASSET_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setAssetsRange(range.value)}
                    className={`w-full text-left px-5 py-4 rounded-md border transition-colors ${
                      assetsRange === range.value
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-neutral-900">{range.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Goals */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-900 mb-1">Primary Goal</h2>
              <p className="text-sm text-neutral-500 mb-6">What is the primary objective for your wealth management relationship?</p>
              <div className="space-y-3">
                {GOALS.map((goal) => (
                  <button
                    key={goal.value}
                    onClick={() => setPrimaryGoal(goal.value)}
                    className={`w-full text-left px-5 py-4 rounded-md border transition-colors ${
                      primaryGoal === goal.value
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-neutral-900">{goal.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Complexity */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-neutral-900 mb-1">Complexity Factors</h2>
              <p className="text-sm text-neutral-500 mb-6">Select any that apply to your financial situation.</p>
              <div className="space-y-4">
                {[
                  { state: isBusinessOwner, set: setIsBusinessOwner, label: 'Business owner', desc: 'You own or have a significant stake in a business' },
                  { state: hasConcentratedStock, set: setHasConcentratedStock, label: 'Concentrated stock position', desc: 'A large portion of your wealth is in a single security' },
                  { state: wantsPrivateMarkets, set: setWantsPrivateMarkets, label: 'Private markets access', desc: 'Interest in private equity, venture capital, or private credit' },
                  { state: wantsLendingSolutions, set: setWantsLendingSolutions, label: 'Lending solutions', desc: 'Interest in securities-based lending or custom credit facilities' },
                  { state: needsTaxCoordination, set: setNeedsTaxCoordination, label: 'Tax coordination', desc: 'Need for multi-entity tax planning or coordination with your CPA' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => item.set(!item.state)}
                    className={`w-full text-left px-5 py-4 rounded-md border transition-colors ${
                      item.state
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-neutral-900">{item.label}</span>
                    <p className="text-xs text-neutral-500 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Current Fees */}
          {step === 3 && estimates && advisoryFeeBps && lendingSpreadBps && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-medium text-neutral-900 mb-1">Current Advisory Fees</h2>
                <p className="text-sm text-neutral-500 mb-6">What does your current advisor charge? If you're not sure, we'll estimate based on your profile.</p>
              </div>

              <ConfidenceSlider
                label="Advisory Fee"
                description="All-in management fee as a percentage of assets under management"
                min={25}
                max={200}
                step={5}
                formatValue={formatBps}
                markers={[
                  { value: 50, label: '0.50%' },
                  { value: 75, label: '0.75%' },
                  { value: 100, label: '1.00%' },
                  { value: 125, label: '1.25%' },
                  { value: 150, label: '1.50%' },
                ]}
                estimatedValue={estimates.advisoryFeeBps.median}
                estimatedRange={estimates.advisoryFeeBps.range}
                value={advisoryFeeBps}
                onChange={setAdvisoryFeeBps}
              />

              {wantsLendingSolutions && (
                <ConfidenceSlider
                  label="Lending Spread"
                  description="Spread above SOFR for securities-based lending"
                  min={0}
                  max={400}
                  step={25}
                  formatValue={formatSpread}
                  markers={[
                    { value: 100, label: '+1%' },
                    { value: 200, label: '+2%' },
                    { value: 300, label: '+3%' },
                  ]}
                  estimatedValue={estimates.lendingSpreadBps.median}
                  estimatedRange={estimates.lendingSpreadBps.range}
                  value={lendingSpreadBps}
                  onChange={setLendingSpreadBps}
                />
              )}
            </div>
          )}

          {/* Step 4: Current Service */}
          {step === 4 && estimates && serviceModel && portfolioCustomization && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-medium text-neutral-900 mb-1">Current Service Level</h2>
                <p className="text-sm text-neutral-500 mb-6">How would you describe your advisor's service model?</p>
              </div>

              <ConfidenceSlider
                label="Service Model"
                description="How proactive is your advisor in managing your wealth?"
                min={1}
                max={5}
                step={1}
                formatValue={formatServiceLevel}
                estimatedValue={estimates.serviceModel.median}
                estimatedRange={estimates.serviceModel.range}
                value={serviceModel}
                onChange={setServiceModel}
              />

              <ConfidenceSlider
                label="Portfolio Customization"
                description="How customized is your investment portfolio?"
                min={1}
                max={5}
                step={1}
                formatValue={formatCustomization}
                estimatedValue={estimates.portfolioCustomization.median}
                estimatedRange={estimates.portfolioCustomization.range}
                value={portfolioCustomization}
                onChange={setPortfolioCustomization}
              />
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-neutral-900 mb-1">Review Your Evaluation</h2>
              <p className="text-sm text-neutral-500 mb-6">Review your inputs before we generate your evaluation.</p>

              <div className="divide-y divide-neutral-100">
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Investable Assets</p>
                    <p className="text-sm text-neutral-900 mt-1">{assetsRange}</p>
                  </div>
                  <button onClick={() => setStep(0)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                </div>
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Primary Goal</p>
                    <p className="text-sm text-neutral-900 mt-1">{GOALS.find(g => g.value === primaryGoal)?.label || primaryGoal}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                </div>
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Complexity</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {isBusinessOwner && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Business Owner</span>}
                      {hasConcentratedStock && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Concentrated Stock</span>}
                      {wantsPrivateMarkets && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Private Markets</span>}
                      {wantsLendingSolutions && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Lending</span>}
                      {needsTaxCoordination && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Tax Coordination</span>}
                      {!isBusinessOwner && !hasConcentratedStock && !wantsPrivateMarkets && !wantsLendingSolutions && !needsTaxCoordination && <span className="text-sm text-neutral-500">None selected</span>}
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                </div>
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Advisory Fee</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-neutral-900">
                        {advisoryFeeBps?.confidence === 'high' ? formatBps(advisoryFeeBps.value) : `${formatBps(advisoryFeeBps?.range[0] ?? 0)} - ${formatBps(advisoryFeeBps?.range[1] ?? 0)}`}
                      </p>
                      <Badge variant={advisoryFeeBps?.confidence === 'low' ? 'warning' : 'default'}>
                        {advisoryFeeBps?.confidence === 'low' ? 'Estimated' : 'Your Input'}
                      </Badge>
                    </div>
                  </div>
                  <button onClick={() => setStep(3)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                </div>
                {wantsLendingSolutions && (
                  <div className="py-4 flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Lending Spread</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-neutral-900">
                          {lendingSpreadBps?.confidence === 'high' ? formatSpread(lendingSpreadBps.value) : `${formatSpread(lendingSpreadBps?.range[0] ?? 0)} - ${formatSpread(lendingSpreadBps?.range[1] ?? 0)}`}
                        </p>
                        <Badge variant={lendingSpreadBps?.confidence === 'low' ? 'warning' : 'default'}>
                          {lendingSpreadBps?.confidence === 'low' ? 'Estimated' : 'Your Input'}
                        </Badge>
                      </div>
                    </div>
                    <button onClick={() => setStep(3)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                  </div>
                )}
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Service Model</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-neutral-900">
                        {serviceModel?.confidence === 'high' ? formatServiceLevel(serviceModel.value) : `${formatServiceLevel(serviceModel?.range[0] ?? 1)} - ${formatServiceLevel(serviceModel?.range[1] ?? 5)}`}
                      </p>
                      <Badge variant={serviceModel?.confidence === 'low' ? 'warning' : 'default'}>
                        {serviceModel?.confidence === 'low' ? 'Estimated' : 'Your Input'}
                      </Badge>
                    </div>
                  </div>
                  <button onClick={() => setStep(4)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                </div>
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Portfolio Customization</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-neutral-900">
                        {portfolioCustomization?.confidence === 'high' ? formatCustomization(portfolioCustomization.value) : `${formatCustomization(portfolioCustomization?.range[0] ?? 1)} - ${formatCustomization(portfolioCustomization?.range[1] ?? 5)}`}
                      </p>
                      <Badge variant={portfolioCustomization?.confidence === 'low' ? 'warning' : 'default'}>
                        {portfolioCustomization?.confidence === 'low' ? 'Estimated' : 'Your Input'}
                      </Badge>
                    </div>
                  </div>
                  <button onClick={() => setStep(4)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-neutral-100">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              Back
            </Button>

            {step < totalSteps - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Evaluating...' : 'Generate Evaluation'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
