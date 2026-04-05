import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function generateRfpQuestions(profile: {
  assetsRange: string
  primaryGoal: string
  isBusinessOwner: boolean
  hasConcentratedStock: boolean
  wantsPrivateMarkets: boolean
  wantsLendingSolutions: boolean
  needsTaxCoordination: boolean
  servicePreference: string
  investmentStylePreference: string
}): Promise<{ id: number; question: string }[]> {
  const profileSummary = [
    `Portfolio size: ${profile.assetsRange}`,
    `Primary goal: ${profile.primaryGoal.replace(/-/g, ' ')}`,
    `Service preference: ${profile.servicePreference}`,
    `Investment style: ${profile.investmentStylePreference}`,
    profile.isBusinessOwner ? 'Is a business owner' : null,
    profile.hasConcentratedStock ? 'Has concentrated stock positions' : null,
    profile.wantsPrivateMarkets ? 'Interested in private markets' : null,
    profile.wantsLendingSolutions ? 'Needs lending/credit solutions' : null,
    profile.needsTaxCoordination ? 'Requires tax coordination' : null,
  ].filter(Boolean).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an expert in wealth management RFP design. Generate 5-7 precise, structured questions that a prospective client should ask wealth advisors competing for their business.

Client profile:
${profileSummary}

Requirements:
- Questions must be specific to THIS client's profile and needs
- Always include a fee/cost question with specific reference to their portfolio size
- Always include a service model/team structure question
- Always include a differentiation question
- Add questions tailored to the specific flags (business ownership, concentrated stock, private markets, lending, tax coordination) where applicable
- Always end with a fee concessions/special terms question
- Questions should be institutional in tone — direct, precise, no fluff
- Each question should require a substantive, measurable answer from the advisor

Return ONLY a JSON array of objects with "id" (sequential integer starting at 1) and "question" (string) fields. No other text.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  // Extract JSON from the response (handle possible markdown wrapping)
  let jsonStr = content.text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  return JSON.parse(jsonStr)
}

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
