'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface BrokerCheckResult {
  verified: boolean
  found?: boolean
  error?: string
  data?: {
    name: string
    crdNumber: string
    currentFirm: string | null
    firmLocation: string | null
    disclosureCount: number
    isActivelyRegistered?: boolean
    disclosures: Array<{
      type: string
      date: string | null
      detail: string | null
      resolution: string | null
    }>
    verifiedAt: string
  }
}

interface Props {
  token: string
  advisorName: string
  invitationId: string
  rfpId: string
  advisorId: string
  existingCrd?: string | null
  alreadyVerified?: boolean
}

export function AdvisorSubmissionForm({ token, advisorName, invitationId, rfpId, advisorId, existingCrd, alreadyVerified }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [crdVerifying, setCrdVerifying] = useState(false)
  const [crdResult, setCrdResult] = useState<BrokerCheckResult | null>(null)

  const [form, setForm] = useState({
    aumFeeBps: '',
    estimatedAnnualCost: '',
    lendingSpreadBps: '',
    privateMarketsAccess: '',
    clientsPerAdvisor: '',
    taxCoordinationLevel: 'basic',
    differentiationText: '',
    concessionsText: '',
    crdNumber: existingCrd || '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function verifyCrd() {
    if (!form.crdNumber.trim()) return
    setCrdVerifying(true)
    setCrdResult(null)
    try {
      const res = await fetch('/api/advisor/verify-crd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crdNumber: form.crdNumber.trim(), advisorId, inviteToken: token }),
      })
      const data = await res.json()
      setCrdResult(data)
    } catch {
      setCrdResult({ verified: false, error: 'Verification failed' })
    }
    setCrdVerifying(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/advisor/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          invitationId,
          rfpId,
          advisorId,
          aumFeeBps: parseInt(form.aumFeeBps),
          estimatedAnnualCost: parseFloat(form.estimatedAnnualCost),
          lendingSpreadBps: form.lendingSpreadBps ? parseInt(form.lendingSpreadBps) : null,
          privateMarketsAccess: form.privateMarketsAccess || null,
          clientsPerAdvisor: parseInt(form.clientsPerAdvisor),
          taxCoordinationLevel: form.taxCoordinationLevel,
          differentiationText: form.differentiationText,
          concessionsText: form.concessionsText || null,
          crdNumber: form.crdNumber.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      setSubmitted(true)
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-6">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-neutral-900 mb-3">Proposal Submitted</h2>
        <p className="text-neutral-500 mb-6">Your proposal has been received and will be shared with the prospective client.</p>
        <Link href="/advisor/dashboard">
          <Button>Return to Dashboard</Button>
        </Link>
      </Card>
    )
  }

  return (
    <Card className="p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Firm info */}
        <div>
          <p className="text-sm text-neutral-500">Submitting as</p>
          <p className="text-lg font-medium text-neutral-900">{advisorName}</p>
        </div>

        {/* CRD Verification */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">BrokerCheck Verification</h3>
          <div className="space-y-1.5">
            <label htmlFor="crdNumber" className="block text-sm font-medium text-neutral-700">
              CRD Number <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-neutral-500">
              Your FINRA Central Registration Depository number. Verified advisors earn a trust badge visible to clients.
            </p>
            {alreadyVerified ? (
              <div className="flex items-center gap-2 py-2">
                <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-green-700">Already verified via BrokerCheck</span>
                {existingCrd && <span className="text-sm text-neutral-400">CRD #{existingCrd}</span>}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    id="crdNumber"
                    type="text"
                    value={form.crdNumber}
                    onChange={(e) => {
                      update('crdNumber', e.target.value)
                      setCrdResult(null)
                    }}
                    placeholder="e.g. 1234567"
                    className="flex h-11 w-full rounded-md border border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={verifyCrd}
                    disabled={!form.crdNumber.trim() || crdVerifying}
                    className="h-11 px-4 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {crdVerifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>

                {crdResult && crdResult.verified && crdResult.data && (
                  <div className="mt-3 rounded-md border border-neutral-200 bg-white p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium text-green-700">Verified via FINRA BrokerCheck</span>
                    </div>
                    <div className="text-sm text-neutral-600 space-y-1 pl-7">
                      <p><span className="text-neutral-400">Name:</span> {crdResult.data.name}</p>
                      {crdResult.data.currentFirm && (
                        <p><span className="text-neutral-400">Firm:</span> {crdResult.data.currentFirm}</p>
                      )}
                      {crdResult.data.firmLocation && (
                        <p><span className="text-neutral-400">Location:</span> {crdResult.data.firmLocation}</p>
                      )}
                      <p>
                        <span className="text-neutral-400">Disclosures:</span>{' '}
                        {crdResult.data.disclosureCount === 0 ? (
                          <span className="text-green-600">None</span>
                        ) : (
                          <span className="text-amber-600">
                            {crdResult.data.disclosureCount} disclosure{crdResult.data.disclosureCount !== 1 ? 's' : ''} on record
                          </span>
                        )}
                      </p>
                    </div>
                    {crdResult.data.disclosureCount > 0 && (
                      <div className="pl-7 mt-2">
                        <details className="text-sm">
                          <summary className="text-neutral-500 cursor-pointer hover:text-neutral-700">
                            View disclosures
                          </summary>
                          <div className="mt-2 space-y-2">
                            {crdResult.data.disclosures.map((d, i) => (
                              <div key={i} className="rounded border border-neutral-100 p-3 bg-neutral-50">
                                <p className="text-xs font-medium text-neutral-700">{d.type}</p>
                                {d.date && <p className="text-xs text-neutral-500 mt-0.5">{d.date}</p>}
                                {d.detail && <p className="text-xs text-neutral-500 mt-1">{d.detail}</p>}
                                {d.resolution && (
                                  <p className="text-xs text-neutral-400 mt-1">Resolution: {d.resolution}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}

                {crdResult && !crdResult.verified && crdResult.found && crdResult.data && (
                  <div className="mt-3 rounded-md border border-neutral-200 bg-white p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium text-amber-700">CRD found but not currently registered</span>
                    </div>
                    <div className="text-sm text-neutral-600 space-y-1 pl-7">
                      <p><span className="text-neutral-400">Name:</span> {crdResult.data.name}</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        An active broker or investment adviser registration is required for the verified badge.
                      </p>
                    </div>
                  </div>
                )}

                {crdResult && !crdResult.verified && !crdResult.found && (
                  <p className="mt-2 text-sm text-red-600">{crdResult.error}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Fees */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Fee Structure</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="aumFeeBps"
              label="AUM Fee (basis points)"
              type="number"
              value={form.aumFeeBps}
              onChange={(e) => update('aumFeeBps', e.target.value)}
              placeholder="e.g. 75"
              required
            />
            <Input
              id="estimatedAnnualCost"
              label="Estimated Annual Cost ($)"
              type="number"
              value={form.estimatedAnnualCost}
              onChange={(e) => update('estimatedAnnualCost', e.target.value)}
              placeholder="e.g. 37500"
              required
            />
          </div>
        </div>

        {/* Lending */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Lending</h3>
          <Input
            id="lendingSpreadBps"
            label="Lending Spread (basis points, if applicable)"
            type="number"
            value={form.lendingSpreadBps}
            onChange={(e) => update('lendingSpreadBps', e.target.value)}
            placeholder="e.g. 150"
          />
        </div>

        {/* Private Markets */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Private Markets</h3>
          <Textarea
            id="privateMarketsAccess"
            label="Private Markets Access (describe available offerings)"
            value={form.privateMarketsAccess}
            onChange={(e) => update('privateMarketsAccess', e.target.value)}
            placeholder="Describe any private equity, venture capital, private credit, or other alternative investment access..."
          />
        </div>

        {/* Service Model */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Service Model</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="clientsPerAdvisor"
              label="Clients per Lead Advisor"
              type="number"
              value={form.clientsPerAdvisor}
              onChange={(e) => update('clientsPerAdvisor', e.target.value)}
              placeholder="e.g. 50"
              required
            />
            <div className="space-y-1.5">
              <label htmlFor="taxCoordinationLevel" className="block text-sm font-medium text-neutral-700">Tax Coordination</label>
              <select
                id="taxCoordinationLevel"
                value={form.taxCoordinationLevel}
                onChange={(e) => update('taxCoordinationLevel', e.target.value)}
                className="flex h-11 w-full rounded-md border border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              >
                <option value="basic">Basic</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Narrative</h3>
          <Textarea
            id="differentiationText"
            label="What differentiates your firm?"
            value={form.differentiationText}
            onChange={(e) => update('differentiationText', e.target.value)}
            placeholder="Describe your unique value proposition, team expertise, and approach..."
            required
          />
          <Textarea
            id="concessionsText"
            label="Fee concessions or special terms (optional)"
            value={form.concessionsText}
            onChange={(e) => update('concessionsText', e.target.value)}
            placeholder="Any fee reductions, waived minimums, or special terms you'd offer..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="pt-4 border-t border-neutral-100">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Proposal'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
