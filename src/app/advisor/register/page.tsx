'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const FIRM_TYPES = [
  { value: '', label: 'Select firm type' },
  { value: 'RIA', label: 'RIA' },
  { value: 'Wirehouse', label: 'Wirehouse' },
  { value: 'Multi-Family Office', label: 'Multi-Family Office' },
  { value: 'Regional Bank', label: 'Regional Bank' },
  { value: 'Independent', label: 'Independent' },
  { value: 'Other', label: 'Other' },
]

const CLIENT_MINIMUMS = [
  { value: '', label: 'Select minimum' },
  { value: '$500K', label: '$500K' },
  { value: '$1M', label: '$1M' },
  { value: '$3M', label: '$3M' },
  { value: '$5M', label: '$5M' },
  { value: '$10M', label: '$10M' },
  { value: '$25M+', label: '$25M+' },
]

const SERVICES = [
  'Wealth Management',
  'Tax Planning',
  'Estate Planning',
  'Private Markets',
  'Lending Solutions',
  'Business Advisory',
  'Retirement Planning',
  'Philanthropic Advisory',
]

interface FormData {
  firmName: string
  leadAdvisorName: string
  firmType: string
  city: string
  clientMinimum: string
  bio: string
  servicesOffered: string[]
  crdNumber: string
}

interface BrokerCheckResult {
  verified: boolean
  error?: string
  data?: {
    name: string
    crdNumber: string
    currentFirm: string | null
    firmLocation: string | null
    disclosureCount: number
    disclosures: Array<{
      type: string
      date: string | null
      detail: string | null
      resolution: string | null
    }>
    verifiedAt: string
  }
}

export default function AdvisorRegisterPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [crdVerifying, setCrdVerifying] = useState(false)
  const [crdResult, setCrdResult] = useState<BrokerCheckResult | null>(null)

  const [form, setForm] = useState<FormData>({
    firmName: '',
    leadAdvisorName: '',
    firmType: '',
    city: '',
    clientMinimum: '',
    bio: '',
    servicesOffered: [],
    crdNumber: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (status === 'authenticated') {
      const userRole = (session?.user as any)?.role
      if (userRole !== 'ADVISOR') {
        router.push('/')
      }
      if (session?.user?.name && !form.leadAdvisorName) {
        setForm((prev) => ({ ...prev, leadAdvisorName: session.user?.name || '' }))
      }
    }
  }, [status, session, router, form.leadAdvisorName])

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function toggleService(service: string) {
    setForm((prev) => ({
      ...prev,
      servicesOffered: prev.servicesOffered.includes(service)
        ? prev.servicesOffered.filter((s) => s !== service)
        : [...prev.servicesOffered, service],
    }))
  }

  async function verifyCrd() {
    if (!form.crdNumber.trim()) return
    setCrdVerifying(true)
    setCrdResult(null)
    try {
      const res = await fetch('/api/advisor/verify-crd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crdNumber: form.crdNumber.trim() }),
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
    setError('')

    if (!form.firmName || !form.leadAdvisorName || !form.firmType || !form.city || !form.clientMinimum) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/advisor/register', {
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

      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    )
  }

  if (status === 'unauthenticated' || (status === 'authenticated' && (session?.user as any)?.role !== 'ADVISOR')) {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-neutral-900">
            MandateX
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Register Your Firm</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Complete your profile to start receiving RFP invitations from prospective clients.
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Firm Name */}
            <Input
              id="firmName"
              label="Firm Name"
              type="text"
              value={form.firmName}
              onChange={(e) => updateForm({ firmName: e.target.value })}
              placeholder="Acme Wealth Partners"
              required
            />

            {/* Lead Advisor Name */}
            <Input
              id="leadAdvisorName"
              label="Lead Advisor Name"
              type="text"
              value={form.leadAdvisorName}
              onChange={(e) => updateForm({ leadAdvisorName: e.target.value })}
              placeholder="Jane Smith, CFA"
              required
            />

            {/* CRD Number */}
            <div className="space-y-1.5">
              <label htmlFor="crdNumber" className="block text-sm font-medium text-neutral-700">
                CRD Number <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-neutral-500">
                Your FINRA Central Registration Depository number. We verify it via BrokerCheck.
              </p>
              <div className="flex gap-2">
                <input
                  id="crdNumber"
                  type="text"
                  value={form.crdNumber}
                  onChange={(e) => {
                    updateForm({ crdNumber: e.target.value })
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

              {crdResult && !crdResult.verified && (
                <p className="mt-2 text-sm text-red-600">{crdResult.error}</p>
              )}
            </div>

            {/* Firm Type */}
            <Select
              id="firmType"
              label="Firm Type"
              options={FIRM_TYPES}
              value={form.firmType}
              onChange={(e) => updateForm({ firmType: e.target.value })}
              required
            />

            {/* City */}
            <Input
              id="city"
              label="City"
              type="text"
              value={form.city}
              onChange={(e) => updateForm({ city: e.target.value })}
              placeholder="New York, NY"
              required
            />

            {/* Client Minimum */}
            <Select
              id="clientMinimum"
              label="Client Minimum"
              options={CLIENT_MINIMUMS}
              value={form.clientMinimum}
              onChange={(e) => updateForm({ clientMinimum: e.target.value })}
              required
            />

            {/* Bio */}
            <Textarea
              id="bio"
              label="Bio / Firm Description"
              value={form.bio}
              onChange={(e) => updateForm({ bio: e.target.value })}
              placeholder="Tell prospective clients about your firm, investment philosophy, and what sets you apart..."
            />

            {/* Services Offered */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                Services Offered
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Select all services your firm provides.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SERVICES.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`text-left px-4 py-3 rounded-md border transition-colors ${
                      form.servicesOffered.includes(service)
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-neutral-900">{service}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="pt-4 border-t border-neutral-100">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating profile...' : 'Complete Registration'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
