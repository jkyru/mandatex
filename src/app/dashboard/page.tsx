import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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

  // Check for active evaluation
  const activeEvaluation = await prisma.advisorEvaluation.findFirst({
    where: {
      prospect: { userId },
      status: { in: ['ACTIVE', 'COMPLETED'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  })

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
            where: { isLatest: true },
            include: {
              advisor: true,
              previousResponse: true,
              revisionRequest: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          revisionRequests: {
            where: { status: { in: ['PENDING', 'VIEWED'] } },
            select: { advisorId: true, status: true },
          },
          comparisonView: true,
          sourceEvaluation: true,
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

  // Build set of advisorIds with pending revision requests
  const pendingRevisionAdvisorIds = new Set(
    rfp.revisionRequests.map((rr: { advisorId: string }) => rr.advisorId)
  )

  // Build existing advisor data from source evaluation (if came from evaluate flow)
  const existingAdvisorData = (() => {
    const evalData = rfp.sourceEvaluation
    if (!evalData) return null
    const AUM_MIDPOINTS: Record<string, number> = {
      '$1M-$3M': 2_000_000,
      '$3M-$5M': 4_000_000,
      '$5M-$10M': 7_500_000,
      '$10M-$25M': 17_500_000,
      '$25M+': 37_500_000,
    }
    const feeBps = evalData.advisoryFeeBps ? JSON.parse(evalData.advisoryFeeBps) : null
    const lendBps = evalData.lendingSpreadBps ? JSON.parse(evalData.lendingSpreadBps) : null
    const satisfaction = evalData.serviceModel ? JSON.parse(evalData.serviceModel) : null
    const customization = evalData.portfolioCustomization ? JSON.parse(evalData.portfolioCustomization) : null
    const feeValue = feeBps ? (feeBps.confidence === 'high' ? feeBps.value : feeBps.estimated_value) : 0
    const lendValue = lendBps ? (lendBps.confidence === 'high' ? lendBps.value : lendBps.estimated_value) : null
    const aumMid = AUM_MIDPOINTS[prospect.assetsRange] || 7_500_000
    const satisfactionLabels = ['', 'Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']
    const customizationLabels = ['', 'Pure Model', 'Mostly Model', 'Some Customization', 'Mostly Custom', 'Fully Customized']
    const satValue = satisfaction ? (satisfaction.confidence === 'high' ? satisfaction.value : satisfaction.estimated_value) : 3
    const custValue = customization ? (customization.confidence === 'high' ? customization.value : customization.estimated_value) : 3
    return {
      advisoryFeeBps: feeValue,
      estimatedAnnualCost: Math.round((feeValue / 10000) * aumMid),
      lendingSpreadBps: lendValue,
      satisfaction: satisfactionLabels[satValue] || `Level ${satValue}`,
      portfolioCustomization: customizationLabels[custValue] || `Level ${custValue}`,
    }
  })()

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
        {activeEvaluation && (
          <Link
            href="/evaluate/dashboard"
            className="block mb-6 bg-neutral-50 border border-neutral-200 rounded-lg px-5 py-4 hover:border-neutral-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900">Advisor Evaluation</p>
                <p className="text-xs text-neutral-500 mt-0.5">You have an active evaluation of your current advisor arrangement.</p>
              </div>
              <span className="text-sm text-neutral-400">View &rarr;</span>
            </div>
          </Link>
        )}

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
            responses={rfp.responses.map((r) => {
              const prev = r.previousResponse
              return {
                id: r.id,
                firmName: r.advisor.firmName,
                leadAdvisorName: r.advisor.leadAdvisorName,
                submissionName: r.submissionName,
                submissionFirm: r.submissionFirm,
                firmType: r.advisor.firmType,
                city: r.advisor.city,
                aumFeeBps: r.aumFeeBps,
                estimatedAnnualCost: r.estimatedAnnualCost,
                lendingSpreadBps: r.lendingSpreadBps,
                publicMarketsOfferings: r.publicMarketsOfferings ? JSON.parse(r.publicMarketsOfferings) : null,
                publicMarketsOther: r.publicMarketsOther,
                publicMarketsDueDiligence: r.publicMarketsDueDiligence,
                privateMarketsOfferings: r.privateMarketsOfferings ? JSON.parse(r.privateMarketsOfferings) : null,
                privateMarketsDueDiligence: r.privateMarketsDueDiligence,
                privateMarketsAccess: r.privateMarketsAccess,
                clientsPerAdvisor: r.clientsPerAdvisor,
                taxCoordinationLevel: r.taxCoordinationLevel,
                differentiationText: r.differentiationText,
                concessionsText: r.concessionsText,
                normalizedData: r.normalizedData ? JSON.parse(r.normalizedData) : null,
                brokerCheckVerified: (() => {
                  if (!r.advisor.brokerCheckVerified) return false
                  if (!r.advisor.brokerCheckData) return false
                  const bcData = JSON.parse(r.advisor.brokerCheckData)
                  // Check isActivelyRegistered (new field) or fall back to currentFirm presence
                  if ('isActivelyRegistered' in bcData) return bcData.isActivelyRegistered
                  return !!bcData.currentFirm
                })(),
                crdNumber: r.advisor.crdNumber,
                disclosureCount: r.advisor.brokerCheckData ? JSON.parse(r.advisor.brokerCheckData).disclosureCount : undefined,
                brokerCheckFirm: r.advisor.brokerCheckData ? JSON.parse(r.advisor.brokerCheckData).currentFirm : undefined,
                registrationStatus: r.advisor.brokerCheckData ? JSON.parse(r.advisor.brokerCheckData).registrationStatus : undefined,
                iaStatus: r.advisor.brokerCheckData ? JSON.parse(r.advisor.brokerCheckData).iaStatus : undefined,
                advisorId: r.advisorId,
                invitationId: r.invitationId,
                version: r.version,
                hasRevisionPending: pendingRevisionAdvisorIds.has(r.advisorId),
                previousValues: prev ? {
                  aumFeeBps: prev.aumFeeBps,
                  estimatedAnnualCost: prev.estimatedAnnualCost,
                  lendingSpreadBps: prev.lendingSpreadBps,
                  clientsPerAdvisor: prev.clientsPerAdvisor,
                  taxCoordinationLevel: prev.taxCoordinationLevel,
                } : null,
              }
            })}
            freeLimit={freeLimit}
            isPaid={isPaid}
            rfpId={rfp.id}
            unlockPrice={rfp.paidUnlockPrice}
            existingAdvisor={existingAdvisorData}
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
