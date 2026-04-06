'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface PreviousResponse {
  submissionName: string | null
  submissionFirm: string | null
  aumFeeBps: number
  estimatedAnnualCost: number
  lendingSpreadBps: number | null
  publicMarketsOfferings: string | null
  publicMarketsOther: string | null
  publicMarketsDueDiligence: string | null
  privateMarketsOfferings: string | null
  privateMarketsDueDiligence: string | null
  privateMarketsAccess: string | null
  clientsPerAdvisor: number
  taxCoordinationLevel: string
  differentiationText: string
  concessionsText: string | null
}

interface Props {
  revisionToken: string
  advisorName: string
  previousResponse: PreviousResponse
}

export function RevisionSubmissionForm({ revisionToken, advisorName, previousResponse }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    submissionName: previousResponse.submissionName || '',
    submissionFirm: previousResponse.submissionFirm || '',
    aumFeeBps: String(previousResponse.aumFeeBps),
    estimatedAnnualCost: String(previousResponse.estimatedAnnualCost),
    lendingSpreadBps: previousResponse.lendingSpreadBps != null ? String(previousResponse.lendingSpreadBps) : '',
    publicMarketsOther: previousResponse.publicMarketsOther || '',
    publicMarketsDueDiligence: previousResponse.publicMarketsDueDiligence || '',
    privateMarketsDueDiligence: previousResponse.privateMarketsDueDiligence || '',
    clientsPerAdvisor: String(previousResponse.clientsPerAdvisor),
    taxCoordinationLevel: previousResponse.taxCoordinationLevel,
    differentiationText: previousResponse.differentiationText,
    concessionsText: previousResponse.concessionsText || '',
  })

  const [publicMarketsSelected, setPublicMarketsSelected] = useState<string[]>(
    previousResponse.publicMarketsOfferings ? JSON.parse(previousResponse.publicMarketsOfferings) : []
  )
  const [privateMarketsSelected, setPrivateMarketsSelected] = useState<string[]>(
    previousResponse.privateMarketsOfferings ? JSON.parse(previousResponse.privateMarketsOfferings) : []
  )

  const PUBLIC_MARKETS_OPTIONS = [
    'Separately Managed Accounts (SMAs)',
    'Model Portfolios',
    'Direct Indexing',
    'Proprietary Products',
    'Locally Managed Equity Portfolio',
    'Bond Ladders',
  ]

  const PRIVATE_MARKETS_OPTIONS = [
    'Drawdown Private Equity/Credit',
    'Evergreen Private Equity/Credit',
    'Real Estate',
    'Real Assets',
    'Event Driven Hedge Funds',
    'Long/Short Hedge Funds',
  ]

  function toggleCheckbox(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/advisor/submit-revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionToken,
          submissionName: form.submissionName.trim() || null,
          submissionFirm: form.submissionFirm.trim() || null,
          aumFeeBps: parseInt(form.aumFeeBps),
          estimatedAnnualCost: parseFloat(form.estimatedAnnualCost),
          lendingSpreadBps: form.lendingSpreadBps ? parseInt(form.lendingSpreadBps) : null,
          publicMarketsOfferings: publicMarketsSelected.length > 0 ? JSON.stringify(publicMarketsSelected) : null,
          publicMarketsOther: form.publicMarketsOther.trim() || null,
          publicMarketsDueDiligence: form.publicMarketsDueDiligence.trim() || null,
          privateMarketsOfferings: privateMarketsSelected.length > 0 ? JSON.stringify(privateMarketsSelected) : null,
          privateMarketsDueDiligence: form.privateMarketsDueDiligence.trim() || null,
          clientsPerAdvisor: parseInt(form.clientsPerAdvisor),
          taxCoordinationLevel: form.taxCoordinationLevel,
          differentiationText: form.differentiationText,
          concessionsText: form.concessionsText || null,
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
        <h2 className="text-2xl font-semibold text-neutral-900 mb-3">Revised Proposal Submitted</h2>
        <p className="text-neutral-500 mb-6">Your updated proposal has been received and will replace your previous submission in the client&apos;s comparison.</p>
        <Link href="/advisor/dashboard">
          <Button>Return to Dashboard</Button>
        </Link>
      </Card>
    )
  }

  return (
    <Card className="p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Name & Firm */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Your Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="submissionName"
              label="Lead Advisor Name"
              type="text"
              value={form.submissionName}
              onChange={(e) => update('submissionName', e.target.value)}
              placeholder={advisorName}
            />
            <Input
              id="submissionFirm"
              label="Firm Name"
              type="text"
              value={form.submissionFirm}
              onChange={(e) => update('submissionFirm', e.target.value)}
              placeholder="Your firm name"
            />
          </div>
        </div>

        {/* Fees */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Fee Structure</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                id="aumFeeBps"
                label="AUM Fee (basis points)"
                type="number"
                value={form.aumFeeBps}
                onChange={(e) => update('aumFeeBps', e.target.value)}
                placeholder="e.g. 75"
                required
              />
              <p className="text-xs text-neutral-400 mt-1">(Previous: {previousResponse.aumFeeBps} bps)</p>
            </div>
            <div>
              <Input
                id="estimatedAnnualCost"
                label="Estimated Annual Cost ($)"
                type="number"
                value={form.estimatedAnnualCost}
                onChange={(e) => update('estimatedAnnualCost', e.target.value)}
                placeholder="e.g. 37500"
                required
              />
              <p className="text-xs text-neutral-400 mt-1">(Previous: ${previousResponse.estimatedAnnualCost.toLocaleString()})</p>
            </div>
          </div>
        </div>

        {/* Lending */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Lending</h3>
          <div>
            <Input
              id="lendingSpreadBps"
              label="Lending Spread (basis points, if applicable)"
              type="number"
              value={form.lendingSpreadBps}
              onChange={(e) => update('lendingSpreadBps', e.target.value)}
              placeholder="e.g. 150"
            />
            <p className="text-xs text-neutral-400 mt-1">
              (Previous: {previousResponse.lendingSpreadBps != null ? `${previousResponse.lendingSpreadBps} bps` : 'N/A'})
            </p>
          </div>
        </div>

        {/* Public Markets */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Public Markets</h3>
          <div className="space-y-2">
            {PUBLIC_MARKETS_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicMarketsSelected.includes(option)}
                  onChange={() => toggleCheckbox(publicMarketsSelected, setPublicMarketsSelected, option)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                />
                <span className="text-sm text-neutral-700">{option}</span>
              </label>
            ))}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.publicMarketsOther}
                onChange={(e) => {
                  if (!e.target.checked) update('publicMarketsOther', '')
                }}
                readOnly={!!form.publicMarketsOther}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
              />
              <span className="text-sm text-neutral-700">Other</span>
            </label>
            <input
              type="text"
              value={form.publicMarketsOther}
              onChange={(e) => update('publicMarketsOther', e.target.value)}
              placeholder="Specify other public market offering..."
              className="ml-7 flex h-10 w-[calc(100%-1.75rem)] rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
          </div>
          <Textarea
            id="publicMarketsDueDiligence"
            label="Due diligence and portfolio construction process"
            value={form.publicMarketsDueDiligence}
            onChange={(e) => update('publicMarketsDueDiligence', e.target.value)}
            placeholder="Describe your due diligence process, portfolio construction methodology..."
          />
        </div>

        {/* Private Markets */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Private Markets</h3>
          <div className="space-y-2">
            {PRIVATE_MARKETS_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privateMarketsSelected.includes(option)}
                  onChange={() => toggleCheckbox(privateMarketsSelected, setPrivateMarketsSelected, option)}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                />
                <span className="text-sm text-neutral-700">{option}</span>
              </label>
            ))}
          </div>
          <Textarea
            id="privateMarketsDueDiligence"
            label="Due diligence process, how you use in client portfolios, and fee approach"
            value={form.privateMarketsDueDiligence}
            onChange={(e) => update('privateMarketsDueDiligence', e.target.value)}
            placeholder="Describe your due diligence process for private market investments..."
          />
        </div>

        {/* Service Model */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Service Model</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                id="clientsPerAdvisor"
                label="Clients per Lead Advisor"
                type="number"
                value={form.clientsPerAdvisor}
                onChange={(e) => update('clientsPerAdvisor', e.target.value)}
                placeholder="e.g. 50"
                required
              />
              <p className="text-xs text-neutral-400 mt-1">(Previous: {previousResponse.clientsPerAdvisor})</p>
            </div>
            <div>
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
              <p className="text-xs text-neutral-400 mt-1">(Previous: {previousResponse.taxCoordinationLevel})</p>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Narrative</h3>
          <div>
            <Textarea
              id="differentiationText"
              label="What differentiates your firm?"
              value={form.differentiationText}
              onChange={(e) => update('differentiationText', e.target.value)}
              placeholder="Describe your unique value proposition, team expertise, and approach..."
              required
            />
            <p className="text-xs text-neutral-400 mt-1">(Previous: {previousResponse.differentiationText})</p>
          </div>
          <div>
            <Textarea
              id="concessionsText"
              label="Fee concessions or special terms (optional)"
              value={form.concessionsText}
              onChange={(e) => update('concessionsText', e.target.value)}
              placeholder="Any fee reductions, waived minimums, or special terms you'd offer..."
            />
            <p className="text-xs text-neutral-400 mt-1">(Previous: {previousResponse.concessionsText || 'N/A'})</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="pt-4 border-t border-neutral-100">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Revised Proposal'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
