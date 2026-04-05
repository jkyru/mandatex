'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ResponseData {
  id: string
  firmName: string
  leadAdvisorName: string
  aumFeeBps: number
  estimatedAnnualCost: number
  lendingSpreadBps: number | null
  clientsPerAdvisor: number
  taxCoordinationLevel: string
}

interface Props {
  response: ResponseData
  rfpId: string
  onClose: () => void
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

export function ImproveOfferModal({ response, rfpId, onClose }: Props) {
  const [step, setStep] = useState<'confirm' | 'generating' | 'review' | 'ready'>('confirm')
  const [error, setError] = useState('')
  const [aiNote, setAiNote] = useState('')
  const [editedNote, setEditedNote] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [revisionRequestId, setRevisionRequestId] = useState('')
  const [revisionLink, setRevisionLink] = useState('')
  const [advisorEmail, setAdvisorEmail] = useState('')
  const [copied, setCopied] = useState<'link' | 'message' | null>(null)
  const router = useRouter()

  async function handleGenerate() {
    setStep('generating')
    setError('')
    try {
      const res = await fetch('/api/improve-offer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId: response.id, rfpId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate note')
        setStep('confirm')
        return
      }
      setAiNote(data.aiGeneratedNote)
      setEditedNote(data.aiGeneratedNote)
      setRevisionRequestId(data.revisionRequestId)
      setRevisionLink(`${window.location.origin}/advisor/revise/${data.revisionToken}`)
      setAdvisorEmail(data.advisorEmail || '')
      setStep('review')
    } catch {
      setError('Something went wrong')
      setStep('confirm')
    }
  }

  async function handleFinalize() {
    // If user edited the note, save the edit
    if (editedNote !== aiNote) {
      try {
        await fetch(`/api/improve-offer/${revisionRequestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientEditedNote: editedNote }),
        })
      } catch {
        // non-critical
      }
    }
    setStep('ready')
  }

  async function copyToClipboard(text: string, type: 'link' | 'message') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // fallback
    }
  }

  function handleDone() {
    router.refresh()
    onClose()
  }

  const fullMessage = `${editedNote}\n\nSubmit your revised proposal here:\n${revisionLink}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Improve Offer</h2>
            <p className="text-sm text-neutral-500 mt-0.5">{response.firmName}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <p className="text-sm text-neutral-600">
                Generate a competitive analysis note asking <span className="font-medium">{response.firmName}</span> to improve their proposal terms. The note will reference anonymized benchmarks from other proposals.
              </p>

              <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Current Terms</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-neutral-400">AUM Fee:</span>{' '}
                    <span className="font-medium text-neutral-900">{formatBps(response.aumFeeBps)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Annual Cost:</span>{' '}
                    <span className="font-medium text-neutral-900">{formatCurrency(response.estimatedAnnualCost)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Lending:</span>{' '}
                    <span className="font-medium text-neutral-900">
                      {response.lendingSpreadBps ? formatBps(response.lendingSpreadBps) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Clients/Advisor:</span>{' '}
                    <span className="font-medium text-neutral-900">{response.clientsPerAdvisor}</span>
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button onClick={handleGenerate} className="w-full">
                Generate Improvement Note
              </Button>
            </div>
          )}

          {/* Step 2: Generating */}
          {step === 'generating' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-neutral-500">Analyzing competitive landscape...</p>
            </div>
          )}

          {/* Step 3: Review & Edit */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-700">Draft Note</p>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-neutral-500 underline hover:text-neutral-700"
                >
                  {isEditing ? 'Preview' : 'Edit'}
                </button>
              </div>

              {isEditing ? (
                <textarea
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  className="w-full h-64 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 resize-none"
                />
              ) : (
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                  {editedNote}
                </div>
              )}

              <Button onClick={handleFinalize} className="w-full">
                Finalize Note
              </Button>
            </div>
          )}

          {/* Step 4: Ready */}
          {step === 'ready' && (
            <div className="space-y-5">
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {editedNote}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-neutral-400 mb-1.5">Revision Link</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={revisionLink}
                      className="flex-1 h-9 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-600 truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(revisionLink, 'link')}
                      className="h-9 px-3 rounded-md border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 whitespace-nowrap"
                    >
                      {copied === 'link' ? 'Copied' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {advisorEmail && (
                  <div>
                    <p className="text-xs font-medium text-neutral-400 mb-1">Advisor Email</p>
                    <p className="text-sm text-neutral-700">{advisorEmail}</p>
                  </div>
                )}

                <button
                  onClick={() => copyToClipboard(fullMessage, 'message')}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {copied === 'message' ? 'Copied to Clipboard' : 'Copy Full Message + Link'}
                </button>
              </div>

              <Button onClick={handleDone} className="w-full" variant="secondary">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
