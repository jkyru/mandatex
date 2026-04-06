import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { EvaluationDashboard } from '@/components/evaluation/evaluation-dashboard'
import type { EvaluationDashboardData, ConfidenceField, BenchmarkResult } from '@/lib/types/evaluation'
import Link from 'next/link'

export default async function EvaluationDashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect('/login')

  // Find the latest evaluation for this user
  const evaluation = await prisma.advisorEvaluation.findFirst({
    where: {
      prospect: { userId: user.id },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      prospect: true,
    },
  })

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <nav className="border-b border-neutral-100 bg-white">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
            <Link href="/" className="text-xl font-semibold tracking-tight text-neutral-900">MandateX</Link>
          </div>
        </nav>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-3">No Evaluation Found</h1>
            <p className="text-neutral-500 mb-6">You haven't completed an advisor evaluation yet.</p>
            <Link
              href="/evaluate"
              className="inline-flex items-center justify-center h-11 px-6 text-sm font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Start Evaluation
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Parse JSON fields
  const defaultField: ConfidenceField = {
    value: 0, estimated_value: 0, range: [0, 0], confidence: 'low', source: 'estimated'
  }

  const dashboardData: EvaluationDashboardData = {
    id: evaluation.id,
    status: evaluation.status,
    assetsRange: evaluation.prospect.assetsRange,
    primaryGoal: evaluation.prospect.primaryGoal,
    advisoryFeeBps: evaluation.advisoryFeeBps ? JSON.parse(evaluation.advisoryFeeBps) : defaultField,
    lendingSpreadBps: evaluation.lendingSpreadBps ? JSON.parse(evaluation.lendingSpreadBps) : defaultField,
    serviceModel: evaluation.serviceModel ? JSON.parse(evaluation.serviceModel) : defaultField,
    portfolioCustomization: evaluation.portfolioCustomization ? JSON.parse(evaluation.portfolioCustomization) : defaultField,
    benchmarkResults: evaluation.benchmarkResults ? JSON.parse(evaluation.benchmarkResults) : [],
    aiInsights: evaluation.aiInsights ? JSON.parse(evaluation.aiInsights) : [],
    convertedRfpId: evaluation.convertedRfpId,
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b border-neutral-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight text-neutral-900">MandateX</Link>
          <span className="text-sm text-neutral-500">{session.user.email}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <EvaluationDashboard
          evaluation={dashboardData}
          prospectName={user.fullName}
        />
      </div>
    </div>
  )
}
