import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateRfpQuestions } from '@/lib/rfp-generator'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { evaluationId } = await req.json()
    if (!evaluationId) {
      return NextResponse.json({ error: 'evaluationId is required' }, { status: 400 })
    }

    const evaluation = await prisma.advisorEvaluation.findUnique({
      where: { id: evaluationId },
      include: {
        prospect: {
          include: { profile: true },
        },
      },
    })

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    // Verify ownership
    if (evaluation.prospect.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (evaluation.status === 'CONVERTED') {
      return NextResponse.json({ error: 'Evaluation already converted to RFP' }, { status: 409 })
    }

    const prospect = evaluation.prospect
    const profile = prospect.profile

    // Generate RFP questions
    const questions = await generateRfpQuestions({
      assetsRange: prospect.assetsRange,
      primaryGoal: prospect.primaryGoal,
      isBusinessOwner: profile?.isBusinessOwner ?? false,
      hasConcentratedStock: profile?.hasConcentratedStock ?? false,
      wantsPrivateMarkets: profile?.wantsPrivateMarkets ?? false,
      wantsLendingSolutions: profile?.wantsLendingSolutions ?? false,
      needsTaxCoordination: profile?.needsTaxCoordination ?? false,
      servicePreference: profile?.servicePreference ?? 'full-service',
      investmentStylePreference: profile?.investmentStylePreference ?? 'moderate',
    })

    // Create RFP and update evaluation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const rfp = await tx.rfp.create({
        data: {
          prospectId: prospect.id,
          title: `Wealth Management RFP — ${prospect.assetsRange} Portfolio`,
          status: 'OPEN',
          questions: JSON.stringify(questions),
        },
      })

      await tx.comparisonView.create({
        data: {
          rfpId: rfp.id,
          prospectId: prospect.id,
          visibleResponseCount: 3,
          isPaywalled: true,
          paymentStatus: 'UNPAID',
        },
      })

      await tx.advisorEvaluation.update({
        where: { id: evaluationId },
        data: {
          status: 'CONVERTED',
          convertedRfpId: rfp.id,
        },
      })

      await tx.prospect.update({
        where: { id: prospect.id },
        data: { intent: 'finding_advisor' },
      })

      return rfp
    })

    return NextResponse.json({ success: true, rfpId: result.id })
  } catch (e) {
    console.error('Evaluation conversion error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
