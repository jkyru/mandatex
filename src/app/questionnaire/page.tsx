'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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

const SERVICE_PREFS = [
  { value: 'full-service', label: 'Full-Service Advisory' },
  { value: 'investment-only', label: 'Investment Management Only' },
  { value: 'financial-planning', label: 'Financial Planning Focus' },
  { value: 'family-office', label: 'Family Office Services' },
]

const INVESTMENT_STYLES = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'growth', label: 'Growth' },
  { value: 'aggressive', label: 'Aggressive' },
]

interface FormData {
  assetsRange: string
  primaryGoal: string
  isBusinessOwner: boolean
  hasConcentratedStock: boolean
  wantsPrivateMarkets: boolean
  wantsLendingSolutions: boolean
  needsTaxCoordination: boolean
  servicePreference: string
  investmentStylePreference: string
}

export default function QuestionnairePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    assetsRange: '',
    primaryGoal: '',
    isBusinessOwner: false,
    hasConcentratedStock: false,
    wantsPrivateMarkets: false,
    wantsLendingSolutions: false,
    needsTaxCoordination: false,
    servicePreference: 'full-service',
    investmentStylePreference: 'moderate',
  })

  const totalSteps = 5
  const stepLabels = ['Assets', 'Goals', 'Complexity', 'Preferences', 'Review']

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return !!form.assetsRange
      case 1: return !!form.primaryGoal
      case 2: return true
      case 3: return !!form.servicePreference && !!form.investmentStylePreference
      case 4: return true
      default: return false
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }
      router.push(`/success?rfpId=${data.rfpId}`)
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Define Your Requirements</h1>
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
                    onClick={() => updateForm({ assetsRange: range.value })}
                    className={`w-full text-left px-5 py-4 rounded-md border transition-colors ${
                      form.assetsRange === range.value
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
                    onClick={() => updateForm({ primaryGoal: goal.value })}
                    className={`w-full text-left px-5 py-4 rounded-md border transition-colors ${
                      form.primaryGoal === goal.value
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
                  { key: 'isBusinessOwner', label: 'Business owner', desc: 'You own or have a significant stake in a business' },
                  { key: 'hasConcentratedStock', label: 'Concentrated stock position', desc: 'A large portion of your wealth is in a single security' },
                  { key: 'wantsPrivateMarkets', label: 'Private markets access', desc: 'Interest in private equity, venture capital, or private credit' },
                  { key: 'wantsLendingSolutions', label: 'Lending solutions', desc: 'Interest in securities-based lending or custom credit facilities' },
                  { key: 'needsTaxCoordination', label: 'Tax coordination', desc: 'Need for multi-entity tax planning or coordination with your CPA' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => updateForm({ [item.key]: !form[item.key as keyof FormData] } as Partial<FormData>)}
                    className={`w-full text-left px-5 py-4 rounded-md border transition-colors ${
                      form[item.key as keyof FormData]
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

          {/* Step 3: Preferences */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-medium text-neutral-900 mb-1">Service Preference</h2>
                <p className="text-sm text-neutral-500 mb-4">What type of advisory relationship are you looking for?</p>
                <div className="space-y-3">
                  {SERVICE_PREFS.map((pref) => (
                    <button
                      key={pref.value}
                      onClick={() => updateForm({ servicePreference: pref.value })}
                      className={`w-full text-left px-5 py-4 rounded-md border transition-colors ${
                        form.servicePreference === pref.value
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="text-sm font-medium text-neutral-900">{pref.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-neutral-900 mb-1">Investment Style</h2>
                <p className="text-sm text-neutral-500 mb-4">What is your general investment philosophy?</p>
                <div className="space-y-3">
                  {INVESTMENT_STYLES.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => updateForm({ investmentStylePreference: style.value })}
                      className={`w-full text-left px-5 py-4 rounded-md border transition-colors ${
                        form.investmentStylePreference === style.value
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="text-sm font-medium text-neutral-900">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-neutral-900 mb-1">Review Your Requirements</h2>
              <p className="text-sm text-neutral-500 mb-6">Please review your responses before submitting.</p>

              <div className="divide-y divide-neutral-100">
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Investable Assets</p>
                    <p className="text-sm text-neutral-900 mt-1">{form.assetsRange || '—'}</p>
                  </div>
                  <button onClick={() => setStep(0)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                </div>
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Primary Goal</p>
                    <p className="text-sm text-neutral-900 mt-1">{GOALS.find(g => g.value === form.primaryGoal)?.label || '—'}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                </div>
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Complexity</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {form.isBusinessOwner && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Business Owner</span>}
                      {form.hasConcentratedStock && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Concentrated Stock</span>}
                      {form.wantsPrivateMarkets && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Private Markets</span>}
                      {form.wantsLendingSolutions && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Lending</span>}
                      {form.needsTaxCoordination && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Tax Coordination</span>}
                      {!form.isBusinessOwner && !form.hasConcentratedStock && !form.wantsPrivateMarkets && !form.wantsLendingSolutions && !form.needsTaxCoordination && <span className="text-sm text-neutral-500">None selected</span>}
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                </div>
                <div className="py-4 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Preferences</p>
                    <p className="text-sm text-neutral-900 mt-1">
                      {SERVICE_PREFS.find(s => s.value === form.servicePreference)?.label} / {INVESTMENT_STYLES.find(s => s.value === form.investmentStylePreference)?.label}
                    </p>
                  </div>
                  <button onClick={() => setStep(3)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
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
                {loading ? 'Submitting...' : 'Submit Requirements'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
