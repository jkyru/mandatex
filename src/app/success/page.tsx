import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { InviteAdvisors } from '@/components/invite/invite-advisors'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ rfpId?: string }>
}) {
  const { rfpId } = await searchParams

  let questions: { id: number; question: string }[] = []
  let existingInvitations: { email: string; token: string }[] = []

  if (rfpId) {
    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      select: {
        questions: true,
        invitations: {
          include: { advisor: { select: { email: true } } },
        },
      },
    })
    if (rfp?.questions) {
      try {
        questions = JSON.parse(rfp.questions)
      } catch {
        // fallback
      }
    }
    if (rfp?.invitations) {
      existingInvitations = rfp.invitations.map((inv) => ({
        email: inv.advisor.email,
        token: inv.inviteToken,
      }))
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Confirmation */}
        <Card className="p-10 text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-6">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-3">
            Your search has been created
          </h1>
          <p className="text-neutral-500 leading-relaxed">
            Your RFP has been generated. Invite advisors below to submit proposals.
          </p>
        </Card>

        {/* RFP Questions */}
        {questions.length > 0 && (
          <Card className="p-8 mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-6">
              Questions for Advisors ({questions.length})
            </h2>
            <div className="space-y-5">
              {questions.map((q) => (
                <div key={q.id} className="flex gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-500">
                    {q.id}
                  </span>
                  <p className="text-sm text-neutral-700 leading-relaxed pt-1">
                    {q.question}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Invite Advisors */}
        {rfpId && (
          <InviteAdvisors rfpId={rfpId} existingInvitations={existingInvitations} />
        )}

        {/* FAQ */}
        <Card className="p-8 mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-1">How do advisors receive my RFP?</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">Each advisor you invite receives a unique link to submit their proposal. You can send the link via email or copy and share it directly.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-1">How many advisors can I invite?</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">There is no limit. Invite as many advisors as you like to ensure you get a comprehensive set of proposals to compare.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-1">Can advisors see each other's proposals?</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">No. Each advisor submits independently and has no visibility into other proposals. Only you can view and compare them side by side.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-1">What does the comparison dashboard include?</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">You can compare fee structures, service models, private market access, tax coordination levels, and each advisor's narrative differentiation in one unified view.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-1">Is there a cost?</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">The first three proposals are free to view. To unlock the full comparison with all submitted proposals, a one-time fee of $499 applies.</p>
            </div>
          </div>
        </Card>

        {/* Return to Dashboard */}
        <div className="text-center">
          <Link href="/dashboard">
            <Button className="w-full max-w-xs">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
