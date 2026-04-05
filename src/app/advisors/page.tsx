import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AdvisorDirectory } from '@/components/advisors/advisor-directory'

export default async function AdvisorsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect('/login')

  // Get the prospect's latest RFP
  const prospect = await prisma.prospect.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      rfps: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          invitations: {
            select: { advisorId: true, status: true },
          },
        },
      },
    },
  })

  const rfp = prospect?.rfps[0]
  const existingInvitations = rfp?.invitations || []

  // Get all public advisors
  const advisors = await prisma.advisor.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b border-neutral-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight text-neutral-900">MandateX</span>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">Dashboard</a>
            <span className="text-sm text-neutral-500">{session.user.email}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">Advisor Directory</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Browse qualified advisors and invite them to submit proposals for your RFP.
          </p>
        </div>

        {!rfp ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
            <h2 className="text-lg font-medium text-neutral-900 mb-2">No Active RFP</h2>
            <p className="text-neutral-500 mb-6">Complete the questionnaire first to create an RFP.</p>
            <a href="/questionnaire" className="inline-flex items-center justify-center h-11 px-6 text-sm font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800">
              Start Questionnaire
            </a>
          </div>
        ) : (
          <AdvisorDirectory
            advisors={advisors.map((a) => ({
              id: a.id,
              firmName: a.firmName,
              leadAdvisorName: a.leadAdvisorName,
              firmType: a.firmType,
              city: a.city,
              clientMinimum: a.clientMinimum,
              bio: a.bio,
              servicesOffered: a.servicesOffered ? JSON.parse(a.servicesOffered) : [],
            }))}
            rfpId={rfp.id}
            existingInvitations={existingInvitations.map((inv) => ({
              advisorId: inv.advisorId,
              status: inv.status,
            }))}
          />
        )}
      </div>
    </div>
  )
}
