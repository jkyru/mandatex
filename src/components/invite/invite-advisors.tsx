'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface BrokerCheckData {
  name: string
  crdNumber: string
  currentFirm: string | null
  firmLocation: string | null
  disclosureCount: number
  registrationStatus: string | null
  iaStatus: string | null
  isActivelyRegistered: boolean
}

interface SearchMatch {
  crdNumber: string | null
  name: string
  firmName: string | null
  location: string | null
  city: string | null
  state: string | null
  disclosureCount: number
  yearsExperience: number | null
  registrationStatus: string | null
  iaStatus: string | null
}

interface InvitedAdvisor {
  token: string
  advisorId: string
  name: string
  firm: string
  city: string
  email: string
  crdNumber: string | null
  brokerCheckData: BrokerCheckData | Record<string, unknown> | null
}

interface Props {
  rfpId: string
  existingInvitations: InvitedAdvisor[]
}

type Step = 'form' | 'searching' | 'disambiguate' | 'inviting'

const MAX_INVITES = 5

export function InviteAdvisors({ rfpId, existingInvitations }: Props) {
  const [advisorName, setAdvisorName] = useState('')
  const [firmName, setFirmName] = useState('')
  const [cityState, setCityState] = useState('')
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [matches, setMatches] = useState<SearchMatch[]>([])
  const [invited, setInvited] = useState<InvitedAdvisor[]>(existingInvitations)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const atCapacity = invited.length >= MAX_INVITES

  async function handleAdd() {
    if (atCapacity) {
      setError(`Maximum of ${MAX_INVITES} advisors allowed`)
      return
    }
    if (!advisorName.trim() || !firmName.trim()) {
      setError('Advisor name and firm are required')
      return
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }
    setError('')
    setStep('searching')

    try {
      const res = await fetch('/api/prospect/search-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: advisorName.trim(),
          firm: firmName.trim(),
          city: cityState.trim() || undefined,
        }),
      })
      const data = await res.json()
      const results: SearchMatch[] = data.matches || []

      if (results.length === 0) {
        // No BrokerCheck match -- invite directly without regulatory data
        await inviteAdvisor(null)
      } else if (results.length === 1) {
        // Single match -- auto-select
        await inviteAdvisor(results[0])
      } else {
        // Multiple matches -- show disambiguation
        setMatches(results)
        setStep('disambiguate')
      }
    } catch {
      setError('Search failed. Please try again.')
      setStep('form')
    }
  }

  async function inviteAdvisor(match: SearchMatch | null) {
    setStep('inviting')
    setError('')

    const brokerCheckData = match
      ? {
          name: match.name,
          crdNumber: match.crdNumber,
          currentFirm: match.firmName,
          firmLocation: match.location,
          disclosureCount: match.disclosureCount,
          registrationStatus: match.registrationStatus,
          iaStatus: match.iaStatus,
          isActivelyRegistered: true,
          verifiedAt: new Date().toISOString(),
        }
      : null

    try {
      const res = await fetch('/api/prospect/invite-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfpId,
          name: match?.name || advisorName.trim(),
          firm: match?.firmName || firmName.trim(),
          city: match?.location || cityState.trim() || undefined,
          email: email.trim() || undefined,
          crdNumber: match?.crdNumber || undefined,
          brokerCheckData,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to add advisor')
        setStep('form')
        return
      }

      // Add to invited list
      setInvited((prev) => {
        // Prevent duplicates
        if (prev.some((a) => a.advisorId === data.invitation.advisorId)) return prev
        return [...prev, data.invitation]
      })

      // Reset form
      setAdvisorName('')
      setFirmName('')
      setCityState('')
      setEmail('')
      setMatches([])
      setStep('form')
    } catch {
      setError('Failed to add advisor. Please try again.')
      setStep('form')
    }
  }

  function handleSkipBrokerCheck() {
    inviteAdvisor(null)
  }

  function handleDisambiguationSelect(match: SearchMatch) {
    inviteAdvisor(match)
  }

  function handleCancelDisambiguation() {
    setMatches([])
    setStep('form')
  }

  async function removeAdvisor(token: string) {
    setInvited((prev) => prev.filter((a) => a.token !== token))
  }

  async function copyLink(token: string) {
    const link = `${window.location.origin}/advisor/${token}`
    await navigator.clipboard.writeText(link)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Card className="p-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-2">
        Invite Advisors
      </h2>
      <p className="text-sm text-neutral-500 mb-6">
        Add the advisors you&apos;re evaluating. We&apos;ll pull their public regulatory record automatically.
      </p>

      {/* Form */}
      {(step === 'form' || step === 'searching' || step === 'inviting') && !atCapacity && (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value)}
                placeholder="e.g. Michael Smith"
                disabled={step !== 'form'}
              />
              <Input
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="e.g. Morgan Stanley"
                disabled={step !== 'form'}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
                placeholder="e.g. Seattle, WA"
                disabled={step !== 'form'}
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="advisor@example.com"
                disabled={step !== 'form'}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="text-xs text-neutral-400">* Name and Firm required</div>
              <Button
                onClick={handleAdd}
                disabled={step !== 'form'}
                size="sm"
              >
                {step === 'searching'
                  ? 'Searching...'
                  : step === 'inviting'
                    ? 'Adding...'
                    : 'Add Advisor'}
              </Button>
            </div>
          </div>
        )}

      {atCapacity && (
        <div className="mb-4 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-md">
          <p className="text-sm text-neutral-600">Maximum of {MAX_INVITES} advisors reached.</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Disambiguation step */}
      {step === 'disambiguate' && matches.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-neutral-700">
              Multiple matches found. Select the correct advisor:
            </p>
            <button
              onClick={handleCancelDisambiguation}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
          <div className="space-y-2">
            {matches.map((m, i) => (
              <button
                key={m.crdNumber || i}
                onClick={() => handleDisambiguationSelect(m)}
                className="w-full text-left px-4 py-3 rounded-md border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {m.name}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {m.firmName || 'Unknown Firm'}
                      {m.location ? ` | ${m.location}` : ''}
                      {m.yearsExperience
                        ? ` | ${m.yearsExperience} yrs experience`
                        : ''}
                    </p>
                  </div>
                  <div className="text-xs text-neutral-400">
                    {m.crdNumber ? `CRD #${m.crdNumber}` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={handleSkipBrokerCheck}
            className="mt-3 text-xs text-neutral-400 hover:text-neutral-700 underline"
          >
            None of these -- add without regulatory data
          </button>
        </div>
      )}

      {/* Invited advisors */}
      {invited.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3">
            Added ({invited.length})
          </p>
          <div className="space-y-3">
            {invited.map((a) => {
              const bc = a.brokerCheckData as BrokerCheckData | null
              return (
                <div
                  key={a.token}
                  className="px-5 py-4 bg-neutral-50 rounded-md border border-neutral-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900">
                        {bc?.name || a.name}
                      </p>
                      {bc?.currentFirm && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {bc.currentFirm}
                        </p>
                      )}
                      {!bc?.currentFirm && a.firm && (
                        <p className="text-xs text-neutral-500 mt-0.5">{a.firm}</p>
                      )}
                      <p className="text-xs text-neutral-400 mt-1">
                        {bc?.firmLocation || a.city || ''}
                        {a.crdNumber ? `${bc?.firmLocation || a.city ? ' | ' : ''}CRD #${a.crdNumber}` : ''}
                        {bc
                          ? ` | ${bc.disclosureCount} Disclosure${bc.disclosureCount !== 1 ? 's' : ''}`
                          : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-green-600">
                          {a.email ? 'Invite sent' : 'Link ready to copy'}
                        </span>
                        <button
                          onClick={() => copyLink(a.token)}
                          className="text-xs text-neutral-400 hover:text-neutral-700 underline"
                        >
                          {copied === a.token ? 'Copied!' : 'Copy link'}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAdvisor(a.token)}
                      className="ml-3 text-neutral-300 hover:text-neutral-600 text-lg leading-none"
                      aria-label="Remove advisor"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
