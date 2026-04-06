import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateRfpQuestions } from '@/lib/rfp-generator'

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

    const userId = user.id

    const {
      assetsRange,
      primaryGoal,
      isBusinessOwner,
      hasConcentratedStock,
      wantsPrivateMarkets,
      wantsLendingSolutions,
      needsTaxCoordination,
      servicePreference,
      investmentStylePreference,
    } = await req.json()

    if (!assetsRange || !primaryGoal) {
      return NextResponse.json({ error: 'Assets range and primary goal are required' }, { status: 400 })
    }

    // Create prospect
    const prospect = await prisma.prospect.create({
      data: {
        userId,
        assetsRange,
        primaryGoal,
        status: 'ACTIVE',
        profile: {
          create: {
            isBusinessOwner: !!isBusinessOwner,
            hasConcentratedStock: !!hasConcentratedStock,
            wantsPrivateMarkets: !!wantsPrivateMarkets,
            wantsLendingSolutions: !!wantsLendingSolutions,
            needsTaxCoordination: !!needsTaxCoordination,
            servicePreference: servicePreference || 'full-service',
            investmentStylePreference: investmentStylePreference || 'moderate',
          },
        },
      },
    })

    // Generate RFP questions using Claude
    const questions = await generateRfpQuestions({
      assetsRange,
      primaryGoal,
      isBusinessOwner: !!isBusinessOwner,
      hasConcentratedStock: !!hasConcentratedStock,
      wantsPrivateMarkets: !!wantsPrivateMarkets,
      wantsLendingSolutions: !!wantsLendingSolutions,
      needsTaxCoordination: !!needsTaxCoordination,
      servicePreference: servicePreference || 'full-service',
      investmentStylePreference: investmentStylePreference || 'moderate',
    })

    // Create RFP
    const rfp = await prisma.rfp.create({
      data: {
        prospectId: prospect.id,
        title: `Wealth Management RFP — ${assetsRange} Portfolio`,
        status: 'OPEN',
        questions: JSON.stringify(questions),
      },
    })

    // Create comparison view
    await prisma.comparisonView.create({
      data: {
        rfpId: rfp.id,
        prospectId: prospect.id,
        visibleResponseCount: 3,
        isPaywalled: true,
        paymentStatus: 'UNPAID',
      },
    })

    return NextResponse.json({ success: true, rfpId: rfp.id })
  } catch (e) {
    console.error('Questionnaire error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
