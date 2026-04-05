'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Invitation {
  email: string
  token: string
}

interface Props {
  rfpId: string
  existingInvitations: Invitation[]
}

export function InviteAdvisors({ rfpId, existingInvitations }: Props) {
  const [email, setEmail] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>(existingInvitations)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  function addEmail() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address')
      return
    }
    if (emails.includes(trimmed) || invitations.some((inv) => inv.email === trimmed)) {
      setError('This email has already been added')
      return
    }
    setEmails((prev) => [...prev, trimmed])
    setEmail('')
    setError('')
  }

  function removeEmail(emailToRemove: string) {
    setEmails((prev) => prev.filter((e) => e !== emailToRemove))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addEmail()
    }
  }

  async function handleSendInvitations() {
    if (emails.length === 0) return
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/prospect/invite-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfpId, emails }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setSending(false)
        return
      }
      // Add new invitations to the list
      setInvitations((prev) => [...prev, ...data.invitations])
      setEmails([])
    } catch {
      setError('Something went wrong')
    }
    setSending(false)
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
        Enter the email addresses of advisors you'd like to invite. Each will receive a unique link to submit their proposal.
      </p>

      {/* Email input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <Input
            id="advisor-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="advisor@example.com"
          />
        </div>
        <Button type="button" variant="secondary" onClick={addEmail}>
          Add
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Pending emails */}
      {emails.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-2">
            Ready to invite ({emails.length})
          </p>
          <div className="space-y-2">
            {emails.map((e) => (
              <div key={e} className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 rounded-md border border-neutral-200">
                <span className="text-sm text-neutral-700">{e}</span>
                <button
                  onClick={() => removeEmail(e)}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <Button
            className="w-full mt-4"
            onClick={handleSendInvitations}
            disabled={sending}
          >
            {sending ? 'Sending...' : `Send ${emails.length} Invitation${emails.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      )}

      {/* Sent invitations with copy links */}
      {invitations.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3">
            Invited ({invitations.length})
          </p>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.token} className="flex items-center justify-between px-4 py-3 bg-neutral-50 rounded-md border border-neutral-200">
                <div>
                  <p className="text-sm font-medium text-neutral-700">{inv.email}</p>
                  <p className="text-xs text-neutral-400 mt-0.5 font-mono truncate max-w-xs">
                    /advisor/{inv.token.slice(0, 8)}...
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyLink(inv.token)}
                >
                  {copied === inv.token ? 'Copied' : 'Copy Link'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
