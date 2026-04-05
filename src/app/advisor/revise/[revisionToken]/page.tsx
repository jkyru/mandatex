import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { RevisionSubmissionForm } from './revision-form'
import Link from 'next/link'

export default async function RevisionPage({ params }: { params: Promise<{ revisionToken: string }> }) {
  const { revisionToken } = await params

  const revisionRequest = await prisma.revisionRequest.findUnique({
    where: { revisionToken },
    include: {
      advisor: true,
      invitation: true,
    },
  })

  if (!revisionRequest) return notFound()

  if (revisionRequest.status === 'REVISED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-3">Revised Proposal Already Submitted</h1>
          <p className="text-neutral-500 mb-6">You have already submitted a revised proposal for this request.</p>
          <Link href="/advisor/dashboard" className="text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (revisionRequest.status === 'EXPIRED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-3">This revision request has expired</h1>
          <p className="text-neutral-500 mb-6">The deadline to submit a revised proposal has passed.</p>
          <Link href="/advisor/dashboard" className="text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Mark as viewed if currently pending
  if (revisionRequest.status === 'PENDING') {
    await prisma.revisionRequest.update({
      where: { id: revisionRequest.id },
      data: { status: 'VIEWED' },
    })
  }

  // Find the latest advisor response for this invitation
  const latestResponse = await prisma.advisorResponse.findFirst({
    where: {
      invitationId: revisionRequest.invitationId,
      isLatest: true,
    },
  })

  if (!latestResponse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-3">Error</h1>
          <p className="text-neutral-500">No existing proposal was found to revise. Please contact support if this issue persists.</p>
        </div>
      </div>
    )
  }

  const previousResponse = {
    aumFeeBps: latestResponse.aumFeeBps,
    estimatedAnnualCost: latestResponse.estimatedAnnualCost,
    lendingSpreadBps: latestResponse.lendingSpreadBps,
    privateMarketsAccess: latestResponse.privateMarketsAccess,
    clientsPerAdvisor: latestResponse.clientsPerAdvisor,
    taxCoordinationLevel: latestResponse.taxCoordinationLevel,
    differentiationText: latestResponse.differentiationText,
    concessionsText: latestResponse.concessionsText,
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Revise Your Proposal</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {revisionRequest.advisor.firmName}
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg mb-8 text-center">
          <p className="text-sm font-medium text-amber-900">You have been requested to revise your offer.</p>
        </div>

        <RevisionSubmissionForm
          revisionToken={revisionToken}
          advisorName={revisionRequest.advisor.firmName}
          previousResponse={previousResponse}
        />
      </div>
    </div>
  )
}
