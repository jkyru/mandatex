'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface Props {
  token: string
  advisorName: string
  invitationId: string
  rfpId: string
  advisorId: string
}

export function AdvisorSubmissionForm({ token, advisorName, invitationId, rfpId, advisorId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    aumFeeBps: '',
    estimatedAnnualCost: '',
    lendingSpreadBps: '',
    privateMarketsAccess: '',
    clientsPerAdvisor: '',
    taxCoordinationLevel: 'basic',
    differentiationText: '',
    concessionsText: '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
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
