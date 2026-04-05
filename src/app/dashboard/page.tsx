import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ComparisonDashboard } from '@/components/comparison/comparison-dashboard'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect('/login')
  if (user.role === 'ADVISOR') redirect('/advisor/dashboard')
  if (user.role === 'ADMIN') redirect('/admin')

  const userId = user.id

  // Get latest prospect and RFP
  const prospect = await prisma.prospect.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      profile: true,
      rfps: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          responses: {
            include: { advisor: true },
            orderBy: { createdAt: 'asc' },
          },
          comparisonView: true,
        },
      },
    },
  })

  if (!prospect || prospect.rfps.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <nav className="border-b border-neutral-100 bg-white">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
            <span className="text-xl font-semibold tracking-tight text-neutral-900">MandateX</span>
          </div>
        </nav>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-3">No Active Search</h1>
            <p className="text-neutral-500 mb-6">You haven't started a search yet.</p>
            <a href="/questionnaire" className="inline-flex items-center justify-center h-11 px-6 text-sm font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800">
              Start Your Search
            </a>
          </div>
        </div>
      </div>
    )
  }

  const rfp = prospect.rfps[0]
  const comparisonView = rfp.comparisonView
  const isPaid = comparisonView?.paymentStatus === 'PAID'
  const freeLimit = rfp.freeResponseLimit
  const totalResponses = rfp.responses.length

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b border-neutral-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight text-neutral-900">MandateX</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">{session.user.email}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">{rfp.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {totalResponses} proposal{totalResponses !== 1 ? 's' : ''} received
          </p>
        </div>

        {totalResponses === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
            <h2 className="text-lg font-medium text-neutral-900 mb-2">Awaiting Proposals</h2>
            <p className="text-neutral-500">Advisors have been invited to submit proposals. Check back soon.</p>
          </div>
        ) : (
          <ComparisonDashboard
            responses={rfp.responses.map((r) => ({
              id: r.id,
              firmName: r.advisor.firmName,
              leadAdvisorName: r.advisor.leadAdvisorName,
              firmType: r.advisor.firmType,
              city: r.advisor.city,
              aumFeeBps: r.aumFeeBps,
              estimatedAnnualCost: r.estimatedAnnualCost,
              lendingSpreadBps: r.lendingSpreadBps,
              privateMarketsAccess: r.privateMarketsAccess,
              clientsPerAdvisor: r.clientsPerAdvisor,
              taxCoordinationLevel: r.taxCoordinationLevel,
              differentiationText: r.differentiationText,
              concessionsText: r.concessionsText,
              normalizedData: r.normalizedData ? JSON.parse(r.normalizedData) : null,
              brokerCheckVerified: r.advisor.brokerCheckVerified,
              crdNumber: r.advisor.crdNumber,
              disclosureCount: r.advisor.brokerCheckData ? JSON.parse(r.advisor.brokerCheckData).disclosureCount : undefined,
              brokerCheckFirm: r.advisor.brokerCheckData ? JSON.parse(r.advisor.brokerCheckData).currentFirm : undefined,
            }))}
            freeLimit={freeLimit}
            isPaid={isPaid}
            rfpId={rfp.id}
            unlockPrice={rfp.paidUnlockPrice}
          />
        )}

        <div className="mt-8 text-center">
          <a
            href={`/success?rfpId=${rfp.id}`}
            className="text-sm text-neutral-500 underline hover:text-neutral-700"
          >
            Invite Additional Advisors
          </a>
        </div>
      </div>
    </div>
  )
}
