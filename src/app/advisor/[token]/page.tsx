import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AdvisorSubmissionForm } from './submission-form'

export default async function AdvisorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const invitation = await prisma.rfpInvitation.findUnique({
    where: { inviteToken: token },
    include: {
      advisor: true,
      rfp: {
        include: {
          prospect: {
            include: { profile: true },
          },
        },
      },
    },
  })

  if (!invitation) return notFound()

  if (invitation.status === 'SUBMITTED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-3">Proposal Already Submitted</h1>
          <p className="text-neutral-500">A response has already been submitted for this invitation.</p>
        </div>
      </div>
    )
  }

  // Mark invitation as opened
  if (invitation.status === 'SENT') {
    await prisma.rfpInvitation.update({
      where: { id: invitation.id },
      data: { status: 'OPENED' },
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Submit Your Proposal</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {invitation.rfp.title}
          </p>
        </div>

        {/* RFP Context */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">Client Requirements</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-500">Assets</p>
              <p className="font-medium text-neutral-900">{invitation.rfp.prospect.assetsRange}</p>
            </div>
            <div>
              <p className="text-neutral-500">Primary Goal</p>
              <p className="font-medium text-neutral-900 capitalize">{invitation.rfp.prospect.primaryGoal.replace(/-/g, ' ')}</p>
            </div>
            {invitation.rfp.prospect.profile && (
              <>
                <div>
                  <p className="text-neutral-500">Service Preference</p>
                  <p className="font-medium text-neutral-900 capitalize">{invitation.rfp.prospect.profile.servicePreference.replace(/-/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Investment Style</p>
                  <p className="font-medium text-neutral-900 capitalize">{invitation.rfp.prospect.profile.investmentStylePreference}</p>
                </div>
              </>
            )}
          </div>
          {invitation.rfp.prospect.profile && (
            <div className="mt-4 flex flex-wrap gap-2">
              {invitation.rfp.prospect.profile.isBusinessOwner && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Business Owner</span>}
              {invitation.rfp.prospect.profile.hasConcentratedStock && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Concentrated Stock</span>}
              {invitation.rfp.prospect.profile.wantsPrivateMarkets && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Private Markets</span>}
              {invitation.rfp.prospect.profile.wantsLendingSolutions && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Lending</span>}
              {invitation.rfp.prospect.profile.needsTaxCoordination && <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">Tax Coordination</span>}
            </div>
          )}
        </div>

        <AdvisorSubmissionForm
          token={token}
          advisorName={invitation.advisor.leadAdvisorName}
          advisorFirm={invitation.advisor.firmName}
          invitationId={invitation.id}
          rfpId={invitation.rfpId}
          advisorId={invitation.advisorId}
          existingCrd={invitation.advisor.crdNumber}
          alreadyVerified={invitation.advisor.brokerCheckVerified}
        />
      </div>
    </div>
  )
}
