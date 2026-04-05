'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProspectData {
  id: string
  userName: string
  userEmail: string
  assetsRange: string
  primaryGoal: string
  status: string
  rfpCount: number
  responseCount: number
  createdAt: string
}

interface AdvisorData {
  id: string
  firmName: string
  leadAdvisorName: string
  email: string
  firmType: string
  city: string
  clientMinimum: string
  invitationCount: number
  responseCount: number
}

interface RfpData {
  id: string
  title: string
  status: string
  prospectName: string
  invitations: { id: string; advisorName: string; status: string }[]
  responseCount: number
  createdAt: string
}

interface Props {
  prospects: ProspectData[]
  advisors: AdvisorData[]
  rfps: RfpData[]
}

export function AdminPanel({ prospects, advisors, rfps }: Props) {
  const [tab, setTab] = useState<'prospects' | 'advisors' | 'rfps'>('prospects')
  const [showAddAdvisor, setShowAddAdvisor] = useState(false)
  const [showInvite, setShowInvite] = useState<string | null>(null)
  const [selectedAdvisors, setSelectedAdvisors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [newAdvisor, setNewAdvisor] = useState({
    firmName: '',
    leadAdvisorName: '',
    email: '',
    firmType: '',
    city: '',
    clientMinimum: '',
  })

  async function handleCreateAdvisor(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/advisors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAdvisor),
    })
    if (res.ok) {
      setShowAddAdvisor(false)
      setNewAdvisor({ firmName: '', leadAdvisorName: '', email: '', firmType: '', city: '', clientMinimum: '' })
      router.refresh()
    }
    setLoading(false)
  }

  async function handleSendInvitations() {
    if (!showInvite || selectedAdvisors.length === 0) return
    setLoading(true)
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfpId: showInvite, advisorIds: selectedAdvisors }),
    })
    if (res.ok) {
      const data = await res.json()
      // Show invitation links
      if (data.invitations) {
        alert('Invitations created. Token links:\n\n' + data.invitations.map((inv: any) => `${inv.advisorName}: ${window.location.origin}/advisor/${inv.token}`).join('\n'))
      }
      setShowInvite(null)
      setSelectedAdvisors([])
      router.refresh()
    }
    setLoading(false)
  }

  const tabs = [
    { key: 'prospects' as const, label: 'Prospects', count: prospects.length },
    { key: 'advisors' as const, label: 'Advisors', count: advisors.length },
    { key: 'rfps' as const, label: 'RFPs', count: rfps.length },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Prospects Tab */}
      {tab === 'prospects' && (
        <div className="space-y-4">
          {prospects.length === 0 ? (
            <p className="text-neutral-500 text-sm">No prospects yet.</p>
          ) : (
            prospects.map((p) => (
              <Card key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">{p.userName}</p>
                  <p className="text-sm text-neutral-500">{p.userEmail}</p>
                  <div className="flex gap-3 mt-2 text-xs text-neutral-400">
                    <span>{p.assetsRange}</span>
                    <span className="capitalize">{p.primaryGoal.replace(/-/g, ' ')}</span>
                    <span>{p.rfpCount} RFP{p.rfpCount !== 1 ? 's' : ''}</span>
                    <span>{p.responseCount} response{p.responseCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <Badge variant={p.status === 'ACTIVE' ? 'success' : 'neutral'}>{p.status}</Badge>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Advisors Tab */}
      {tab === 'advisors' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setShowAddAdvisor(!showAddAdvisor)}>
              {showAddAdvisor ? 'Cancel' : 'Add Advisor'}
            </Button>
          </div>

          {showAddAdvisor && (
            <Card className="mb-6">
              <form onSubmit={handleCreateAdvisor} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input id="firmName" label="Firm Name" value={newAdvisor.firmName} onChange={(e) => setNewAdvisor(p => ({...p, firmName: e.target.value}))} required />
                  <Input id="leadAdvisorName" label="Lead Advisor" value={newAdvisor.leadAdvisorName} onChange={(e) => setNewAdvisor(p => ({...p, leadAdvisorName: e.target.value}))} required />
                  <Input id="email" label="Email" type="email" value={newAdvisor.email} onChange={(e) => setNewAdvisor(p => ({...p, email: e.target.value}))} required />
                  <Input id="firmType" label="Firm Type" value={newAdvisor.firmType} onChange={(e) => setNewAdvisor(p => ({...p, firmType: e.target.value}))} placeholder="e.g. RIA, Wirehouse" required />
                  <Input id="city" label="City" value={newAdvisor.city} onChange={(e) => setNewAdvisor(p => ({...p, city: e.target.value}))} required />
                  <Input id="clientMinimum" label="Client Minimum" value={newAdvisor.clientMinimum} onChange={(e) => setNewAdvisor(p => ({...p, clientMinimum: e.target.value}))} placeholder="e.g. $1M" required />
                </div>
                <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Advisor'}</Button>
              </form>
            </Card>
          )}

          <div className="space-y-4">
            {advisors.map((a) => (
              <Card key={a.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">{a.firmName}</p>
                  <p className="text-sm text-neutral-500">{a.leadAdvisorName} — {a.email}</p>
                  <div className="flex gap-3 mt-2 text-xs text-neutral-400">
                    <span>{a.firmType}</span>
                    <span>{a.city}</span>
                    <span>Min: {a.clientMinimum}</span>
                    <span>{a.invitationCount} invitation{a.invitationCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* RFPs Tab */}
      {tab === 'rfps' && (
        <div className="space-y-4">
          {rfps.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-medium text-neutral-900">{r.title}</p>
                  <p className="text-sm text-neutral-500">from {r.prospectName}</p>
                  <div className="flex gap-3 mt-2 text-xs text-neutral-400">
                    <span>{r.invitations.length} invitation{r.invitations.length !== 1 ? 's' : ''}</span>
                    <span>{r.responseCount} response{r.responseCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === 'OPEN' ? 'success' : 'neutral'}>{r.status}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => { setShowInvite(showInvite === r.id ? null : r.id); setSelectedAdvisors([]) }}>
                    Invite Advisors
                  </Button>
                </div>
              </div>

              {/* Existing invitations */}
              {r.invitations.length > 0 && (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">Invitations</p>
                  <div className="space-y-2">
                    {r.invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-700">{inv.advisorName}</span>
                        <Badge variant={inv.status === 'SUBMITTED' ? 'success' : inv.status === 'OPENED' ? 'warning' : 'neutral'}>
                          {inv.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite form */}
              {showInvite === r.id && (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <p className="text-sm font-medium text-neutral-900 mb-3">Select advisors to invite</p>
                  <div className="space-y-2 mb-4">
                    {advisors.map((a) => {
                      const alreadyInvited = r.invitations.some((inv) => inv.advisorName === a.firmName)
                      return (
                        <label key={a.id} className={`flex items-center gap-3 p-3 rounded-md border transition-colors cursor-pointer ${
                          alreadyInvited ? 'opacity-50 cursor-not-allowed border-neutral-100' :
                          selectedAdvisors.includes(a.id) ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedAdvisors.includes(a.id)}
                            disabled={alreadyInvited}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAdvisors((prev) => [...prev, a.id])
                              } else {
                                setSelectedAdvisors((prev) => prev.filter((id) => id !== a.id))
                              }
                            }}
                            className="rounded border-neutral-300"
                          />
                          <div>
                            <p className="text-sm font-medium text-neutral-900">{a.firmName}</p>
                            <p className="text-xs text-neutral-500">{a.leadAdvisorName}{alreadyInvited ? ' (already invited)' : ''}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <Button onClick={handleSendInvitations} disabled={selectedAdvisors.length === 0 || loading} size="sm">
                    {loading ? 'Sending...' : `Send ${selectedAdvisors.length} Invitation${selectedAdvisors.length !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
