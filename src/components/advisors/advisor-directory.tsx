'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AdvisorData {
  id: string
  firmName: string
  leadAdvisorName: string
  firmType: string
  city: string
  clientMinimum: string
  bio: string | null
  servicesOffered: string[]
}

interface Props {
  advisors: AdvisorData[]
  rfpId: string
  existingInvitations: { advisorId: string; status: string }[]
}

export function AdvisorDirectory({ advisors, rfpId, existingInvitations }: Props) {
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<Set<string>>(
    new Set(existingInvitations.map((inv) => inv.advisorId))
  )
  const [filter, setFilter] = useState('')
  const router = useRouter()

  async function handleInvite(advisorId: string) {
    setSending(advisorId)
    try {
      const res = await fetch('/api/prospect/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfpId, advisorId }),
      })
      if (res.ok) {
        setSent((prev) => new Set([...prev, advisorId]))
        router.refresh()
      }
    } catch {
      // ignore
    }
    setSending(null)
  }

  const filteredAdvisors = advisors.filter((a) => {
    if (!filter) return true
    const search = filter.toLowerCase()
    return (
      a.firmName.toLowerCase().includes(search) ||
      a.city.toLowerCase().includes(search) ||
      a.firmType.toLowerCase().includes(search) ||
      a.servicesOffered.some((s) => s.toLowerCase().includes(search))
    )
  })

  function getInvitationStatus(advisorId: string): string | null {
    const inv = existingInvitations.find((i) => i.advisorId === advisorId)
    return inv?.status || null
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by firm name, city, type, or service..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full h-11 rounded-md border border-neutral-300 bg-white px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
      </div>

      {/* Count */}
      <p className="text-sm text-neutral-500 mb-4">
        {filteredAdvisors.length} advisor{filteredAdvisors.length !== 1 ? 's' : ''} available
        {sent.size > 0 && ` — ${sent.size} invited`}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAdvisors.map((advisor) => {
          const isInvited = sent.has(advisor.id)
          const invStatus = getInvitationStatus(advisor.id)
          const isSending = sending === advisor.id

          return (
            <Card key={advisor.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{advisor.firmName}</h3>
                    <p className="text-sm text-neutral-500">{advisor.leadAdvisorName}</p>
                  </div>
                  {isInvited && (
                    <Badge variant={invStatus === 'SUBMITTED' ? 'success' : invStatus === 'OPENED' ? 'warning' : 'neutral'}>
                      {invStatus === 'SUBMITTED' ? 'Responded' : invStatus === 'OPENED' ? 'Opened' : 'Invited'}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400 mb-3">
                  <span>{advisor.firmType}</span>
                  <span>{advisor.city}</span>
                  <span>Min: {advisor.clientMinimum}</span>
                </div>

                {advisor.bio && (
                  <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{advisor.bio}</p>
                )}

                {advisor.servicesOffered.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {advisor.servicesOffered.map((service) => (
                      <span key={service} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                        {service}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {isInvited ? (
                  <Button variant="secondary" size="sm" className="w-full" disabled>
                    {invStatus === 'SUBMITTED' ? 'Proposal Received' : 'Invitation Sent'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleInvite(advisor.id)}
                    disabled={isSending}
                  >
                    {isSending ? 'Sending...' : 'Invite to Submit Proposal'}
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {filteredAdvisors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500">No advisors match your filter.</p>
        </div>
      )}
    </div>
  )
}
