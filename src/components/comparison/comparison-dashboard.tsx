'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ImproveOfferModal } from './improve-offer-modal'

interface NormalizedData {
  privateMarkets: {
    assetClasses: string[]
    minimumInvestment: string | null
    accessType: string | null
    additionalDetails: string | null
  }
  differentiation: {
    teamSize: string | null
    yearsExperience: string | null
    certifications: string[]
    specializations: string[]
    keyCapabilities: string[]
  }
  concessions: {
    feeDiscounts: string | null
    waivedMinimums: string | null
    specialTerms: string | null
    isPermanent: boolean | null
  }
}

interface ResponseData {
  id: string
  firmName: string
  leadAdvisorName: string
  submissionName?: string | null
  submissionFirm?: string | null
  firmType: string
  city: string
  aumFeeBps: number
  estimatedAnnualCost: number
  lendingSpreadBps: number | null
  publicMarketsOfferings?: string[] | null
  publicMarketsOther?: string | null
  publicMarketsDueDiligence?: string | null
  privateMarketsOfferings?: string[] | null
  privateMarketsDueDiligence?: string | null
  privateMarketsAccess: string | null
  clientsPerAdvisor: number
  taxCoordinationLevel: string
  differentiationText: string
  concessionsText: string | null
  normalizedData?: NormalizedData | null
  brokerCheckVerified?: boolean
  crdNumber?: string | null
  disclosureCount?: number
  brokerCheckFirm?: string | null
  advisorId?: string
  invitationId?: string
  version?: number
  hasRevisionPending?: boolean
  previousValues?: {
    aumFeeBps: number
    estimatedAnnualCost: number
    lendingSpreadBps: number | null
    clientsPerAdvisor: number
    taxCoordinationLevel: string
  } | null
}

interface ExistingAdvisorData {
  advisoryFeeBps: number
  estimatedAnnualCost: number
  lendingSpreadBps: number | null
  satisfaction: string
  portfolioCustomization: string
}

interface Props {
  responses: ResponseData[]
  freeLimit: number
  isPaid: boolean
  rfpId: string
  unlockPrice: number
  existingAdvisor?: ExistingAdvisorData | null
}

export function ComparisonDashboard({ responses, freeLimit, isPaid: initialIsPaid, rfpId, unlockPrice, existingAdvisor }: Props) {
  const [isPaid, setIsPaid] = useState(initialIsPaid)
  const [paying, setPaying] = useState(false)
  const [viewMode, setViewMode] = useState<'raw' | 'normalized'>('normalized')
  const [normalizing, setNormalizing] = useState(false)
  const [normalizedMap, setNormalizedMap] = useState<Record<string, NormalizedData>>({})
  const [improveTarget, setImproveTarget] = useState<ResponseData | null>(null)
  const router = useRouter()

  const visibleResponses = isPaid ? responses : responses.slice(0, freeLimit)
  const lockedCount = isPaid ? 0 : Math.max(0, responses.length - freeLimit)

  // Load pre-existing normalized data
  useEffect(() => {
    const existing: Record<string, NormalizedData> = {}
    for (const r of responses) {
      if (r.normalizedData) {
        existing[r.id] = r.normalizedData
      }
    }
    if (Object.keys(existing).length > 0) {
      setNormalizedMap(existing)
    }
  }, [responses])

  // Auto-normalize on first load if not already done
  useEffect(() => {
    const hasUnnormalized = visibleResponses.some((r) => !r.normalizedData && !normalizedMap[r.id])
    if (hasUnnormalized && !normalizing && visibleResponses.length > 0) {
      handleNormalize()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleNormalize() {
    setNormalizing(true)
    try {
      const res = await fetch('/api/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfpId }),
      })
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, NormalizedData> = { ...normalizedMap }
        for (const item of data.normalized) {
          if (item.normalizedData) {
            map[item.responseId] = item.normalizedData
          }
        }
        setNormalizedMap(map)
      }
    } catch {
      // silently fail — raw view is always available
    }
    setNormalizing(false)
  }

  async function handleUnlock() {
    setPaying(true)
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfpId }),
      })
      if (res.ok) {
        setIsPaid(true)
        router.refresh()
      }
    } catch {
      // ignore
    }
    setPaying(false)
  }

  function formatBps(bps: number) {
    return `${(bps / 100).toFixed(2)}%`
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const hasNormalized = Object.keys(normalizedMap).length > 0

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex bg-neutral-100 rounded-md p-0.5">
          <button
            onClick={() => setViewMode('normalized')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'normalized'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Standardized View
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'raw'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Raw Responses
          </button>
        </div>
        {normalizing && (
          <span className="text-xs text-neutral-400">Standardizing responses...</span>
        )}
        {!normalizing && !hasNormalized && (
          <button onClick={handleNormalize} className="text-xs text-neutral-500 hover:text-neutral-900 underline">
            Retry standardization
          </button>
        )}
      </div>

      {/* Comparison Cards */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-6 min-w-full pb-4">
          {/* Existing Advisor Card (from evaluation flow) */}
          {existingAdvisor && (
            <div className="w-80 flex-shrink-0 rounded-lg overflow-hidden border border-amber-200 bg-amber-50/30">
              <div className="bg-amber-100 px-6 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Your Existing Advisor</p>
              </div>
              <div className="p-6 border-b border-amber-100">
                <h3 className="text-base font-semibold text-neutral-900">Current Arrangement</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Based on your evaluation inputs</p>
              </div>
              <div className="divide-y divide-amber-100">
                <div className="px-6 py-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">AUM Fee</p>
                  <p className="text-lg font-semibold text-neutral-900 mt-1">{formatBps(existingAdvisor.advisoryFeeBps)}</p>
                </div>
                <div className="px-6 py-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Est. Annual Cost</p>
                  <p className="text-lg font-semibold text-neutral-900 mt-1">{formatCurrency(existingAdvisor.estimatedAnnualCost)}</p>
                </div>
                <div className="px-6 py-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Lending Spread</p>
                  <p className="text-sm text-neutral-900 mt-1">{existingAdvisor.lendingSpreadBps != null ? formatBps(existingAdvisor.lendingSpreadBps) : 'N/A'}</p>
                </div>
                <div className="px-6 py-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Satisfaction</p>
                  <p className="text-sm text-neutral-900 mt-1">{existingAdvisor.satisfaction}</p>
                </div>
                <div className="px-6 py-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Portfolio Customization</p>
                  <p className="text-sm text-neutral-900 mt-1">{existingAdvisor.portfolioCustomization}</p>
                </div>
              </div>
            </div>
          )}

          {visibleResponses.map((r) => {
            const norm = normalizedMap[r.id]
            return (
              <div key={r.id} className="w-80 flex-shrink-0 bg-white border border-neutral-200 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-neutral-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-neutral-900">{r.submissionFirm || r.firmName}</h3>
                    {r.brokerCheckVerified && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-[10px] font-medium text-green-700">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Verified
                      </span>
                    )}
                    {r.version && r.version > 1 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-medium text-blue-700">
                        Revised
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 mt-0.5">{r.submissionName || r.leadAdvisorName}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{r.firmType} — {r.city}</p>
                  {r.crdNumber && (
                    <div className="mt-2 text-xs text-neutral-400 space-y-0.5">
                      <p>CRD #{r.crdNumber}{r.brokerCheckFirm ? ` — ${r.brokerCheckFirm}` : ''}</p>
                      {!r.brokerCheckVerified && (
                        <p className="text-amber-500">Not currently registered</p>
                      )}
                      {r.brokerCheckVerified && (
                        <p>
                          Disclosures: {r.disclosureCount && r.disclosureCount > 0 ? (
                            <span className="text-amber-500">Yes ({r.disclosureCount})</span>
                          ) : (
                            <span>No</span>
                          )}
                        </p>
                      )}
                      <p>
                        <a
                          href={`https://brokercheck.finra.org/individual/summary/${r.crdNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-neutral-600"
                        >
                          View on BrokerCheck
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Structured metrics (always shown) */}
                <div className="divide-y divide-neutral-100">
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">AUM Fee</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-lg font-semibold text-neutral-900">{formatBps(r.aumFeeBps)}</p>
                      {r.previousValues && r.previousValues.aumFeeBps !== r.aumFeeBps && (
                        <span className="text-xs text-neutral-400 line-through">{formatBps(r.previousValues.aumFeeBps)}</span>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Est. Annual Cost</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-lg font-semibold text-neutral-900">{formatCurrency(r.estimatedAnnualCost)}</p>
                      {r.previousValues && r.previousValues.estimatedAnnualCost !== r.estimatedAnnualCost && (
                        <span className="text-xs text-neutral-400 line-through">{formatCurrency(r.previousValues.estimatedAnnualCost)}</span>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Lending Spread</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-sm text-neutral-900">{r.lendingSpreadBps ? formatBps(r.lendingSpreadBps) : 'N/A'}</p>
                      {r.previousValues && r.previousValues.lendingSpreadBps !== r.lendingSpreadBps && r.previousValues.lendingSpreadBps != null && (
                        <span className="text-xs text-neutral-400 line-through">{formatBps(r.previousValues.lendingSpreadBps)}</span>
                      )}
                    </div>
                  </div>

                  {/* Public Markets */}
                  {(r.publicMarketsOfferings && r.publicMarketsOfferings.length > 0) || r.publicMarketsOther ? (
                    <div className="px-6 py-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Public Markets</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {r.publicMarketsOfferings?.map((pm) => (
                          <span key={pm} className="px-2 py-0.5 bg-neutral-100 text-xs text-neutral-700 rounded">{pm}</span>
                        ))}
                        {r.publicMarketsOther && (
                          <span className="px-2 py-0.5 bg-neutral-100 text-xs text-neutral-700 rounded">{r.publicMarketsOther}</span>
                        )}
                      </div>
                      {r.publicMarketsDueDiligence && (
                        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">{r.publicMarketsDueDiligence}</p>
                      )}
                    </div>
                  ) : null}

                  {/* Private Markets (structured) */}
                  {(r.privateMarketsOfferings && r.privateMarketsOfferings.length > 0) ? (
                    <div className="px-6 py-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Private Markets</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {r.privateMarketsOfferings.map((pm) => (
                          <span key={pm} className="px-2 py-0.5 bg-neutral-100 text-xs text-neutral-700 rounded">{pm}</span>
                        ))}
                      </div>
                      {r.privateMarketsDueDiligence && (
                        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">{r.privateMarketsDueDiligence}</p>
                      )}
                    </div>
                  ) : null}

                  <div className="px-6 py-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Clients per Advisor</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-sm text-neutral-900">{r.clientsPerAdvisor}</p>
                      {r.previousValues && r.previousValues.clientsPerAdvisor !== r.clientsPerAdvisor && (
                        <span className="text-xs text-neutral-400 line-through">{r.previousValues.clientsPerAdvisor}</span>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Tax Coordination</p>
                    <p className="text-sm text-neutral-900 mt-1 capitalize">{r.taxCoordinationLevel}</p>
                  </div>

                  {/* Normalized view */}
                  {viewMode === 'normalized' && norm ? (
                    <>
                      {/* Private Markets - Normalized */}
                      <div className="px-6 py-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Private Markets</p>
                        {norm.privateMarkets.assetClasses.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {norm.privateMarkets.assetClasses.map((ac) => (
                                <span key={ac} className="px-2 py-0.5 bg-neutral-100 text-xs text-neutral-700 rounded">
                                  {ac}
                                </span>
                              ))}
                            </div>
                            {norm.privateMarkets.minimumInvestment && (
                              <p className="text-xs text-neutral-500">Min: {norm.privateMarkets.minimumInvestment}</p>
                            )}
                            {norm.privateMarkets.accessType && (
                              <p className="text-xs text-neutral-500">Access: {norm.privateMarkets.accessType}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-500 mt-1">Not available</p>
                        )}
                      </div>

                      {/* Differentiation - Normalized */}
                      <div className="px-6 py-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Firm Profile</p>
                        <div className="mt-2 space-y-2">
                          {norm.differentiation.teamSize && (
                            <p className="text-xs text-neutral-700">Team: {norm.differentiation.teamSize}</p>
                          )}
                          {norm.differentiation.yearsExperience && (
                            <p className="text-xs text-neutral-700">Experience: {norm.differentiation.yearsExperience}</p>
                          )}
                          {norm.differentiation.certifications.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {norm.differentiation.certifications.map((c) => (
                                <span key={c} className="px-2 py-0.5 bg-neutral-100 text-xs text-neutral-700 rounded font-medium">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                          {norm.differentiation.specializations.length > 0 && (
                            <div>
                              <p className="text-xs text-neutral-500 mb-1">Specializations</p>
                              <ul className="text-xs text-neutral-700 space-y-0.5">
                                {norm.differentiation.specializations.map((s) => (
                                  <li key={s}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {norm.differentiation.keyCapabilities.length > 0 && (
                            <div>
                              <p className="text-xs text-neutral-500 mb-1">Capabilities</p>
                              <ul className="text-xs text-neutral-700 space-y-0.5">
                                {norm.differentiation.keyCapabilities.map((k) => (
                                  <li key={k}>{k}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Concessions - Normalized */}
                      {(norm.concessions.feeDiscounts || norm.concessions.waivedMinimums || norm.concessions.specialTerms) && (
                        <div className="px-6 py-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Concessions</p>
                          <div className="mt-2 space-y-1.5">
                            {norm.concessions.feeDiscounts && (
                              <p className="text-xs text-neutral-700">{norm.concessions.feeDiscounts}</p>
                            )}
                            {norm.concessions.waivedMinimums && (
                              <p className="text-xs text-neutral-700">{norm.concessions.waivedMinimums}</p>
                            )}
                            {norm.concessions.specialTerms && (
                              <p className="text-xs text-neutral-700">{norm.concessions.specialTerms}</p>
                            )}
                            {norm.concessions.isPermanent !== null && (
                              <p className="text-xs text-neutral-400">
                                {norm.concessions.isPermanent ? 'Permanent terms' : 'Time-limited terms'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Raw view */}
                      <div className="px-6 py-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Private Markets</p>
                        <p className="text-sm text-neutral-900 mt-1">{r.privateMarketsAccess || 'Not available'}</p>
                      </div>
                      <div className="px-6 py-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Differentiation</p>
                        <p className="text-sm text-neutral-700 mt-1 leading-relaxed">{r.differentiationText}</p>
                      </div>
                      {r.concessionsText && (
                        <div className="px-6 py-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Concessions</p>
                          <p className="text-sm text-neutral-700 mt-1 leading-relaxed">{r.concessionsText}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Improve Offer action */}
                  <div className="px-6 py-4">
                    {r.hasRevisionPending ? (
                      <p className="text-xs text-amber-600 font-medium text-center">Revision Requested</p>
                    ) : responses.length >= 2 ? (
                      <button
                        onClick={() => setImproveTarget(r)}
                        className="w-full h-9 rounded-md border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Improve Offer
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Locked cards placeholder */}
          {lockedCount > 0 && (
            <div className="w-80 flex-shrink-0 bg-white border border-neutral-200 rounded-lg overflow-hidden relative">
              <div className="absolute inset-0 backdrop-blur-sm bg-white/80 flex flex-col items-center justify-center p-8 z-10">
                <div className="text-center">
                  <p className="text-lg font-semibold text-neutral-900 mb-2">
                    {lockedCount} more proposal{lockedCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-neutral-500 mb-6">
                    Unlock full comparison for {formatCurrency(unlockPrice)}
                  </p>
                  <Button onClick={handleUnlock} disabled={paying}>
                    {paying ? 'Processing...' : 'Unlock Full Comparison'}
                  </Button>
                </div>
              </div>
              <div className="p-6 border-b border-neutral-100">
                <div className="h-5 bg-neutral-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-neutral-100 rounded w-1/2" />
              </div>
              <div className="divide-y divide-neutral-100">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="h-3 bg-neutral-100 rounded w-1/3 mb-2" />
                    <div className="h-5 bg-neutral-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Improve Offer Modal */}
      {improveTarget && (
        <ImproveOfferModal
          response={improveTarget}
          rfpId={rfpId}
          onClose={() => setImproveTarget(null)}
        />
      )}
    </div>
  )
}
