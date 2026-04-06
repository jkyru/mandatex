import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clampValue, getEstimate, computeAllBenchmarks } from '@/lib/benchmarks'
import type { ConfidenceField } from '@/lib/types/evaluation'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function processField(field: string, input: Partial<ConfidenceField> | null, assetsRange: string): ConfidenceField {
  const estimate = getEstimate(field, assetsRange)

  if (!input || input.confidence === 'low' || input.value == null) {
    return {
      value: estimate.median,
      estimated_value: estimate.median,
      range: estimate.range,
      confidence: 'low',
      source: 'estimated',
    }
  }

  const clamped = clampValue(field, input.value)
  return {
    value: clamped,
    estimated_value: estimate.median,
    range: estimate.range,
    confidence: 'high',
    source: 'user',
  }
}

function formatFieldValue(field: string, value: number): string {
  if (field === 'advisoryFeeBps') return `${(value / 100).toFixed(2)}%`
  if (field === 'lendingSpreadBps') return `SOFR + ${(value / 100).toFixed(2)}%`
  if (field === 'serviceModel') {
    const labels = ['', 'Fully Reactive', 'Mostly Reactive', 'Balanced', 'Mostly Proactive', 'Fully Proactive']
    return labels[value] || `Level ${value}`
  }
  if (field === 'portfolioCustomization') {
    const labels = ['', 'Pure Model', 'Mostly Model', 'Some Customization', 'Mostly Custom', 'Fully Customized']
    return labels[value] || `Level ${value}`
  }
  return String(value)
}

async function generateEvaluationInsights(params: {
  assetsRange: string
  primaryGoal: string
  benchmarkResults: { label: string; userValue: number; benchmarkMedian: number; verdict: string; field: string }[]
  complexityFlags: string[]
  hasEstimatedFields: boolean
}): Promise<string[]> {
  const benchmarkSummary = params.benchmarkResults.map((r) =>
    `${r.label}: Client's value is ${formatFieldValue(r.field, r.userValue)}, market median is ${formatFieldValue(r.field, r.benchmarkMedian)}, verdict: ${r.verdict.replace('_', ' ')}`
  ).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a wealth management analyst. A client with ${params.assetsRange} in investable assets, focused on ${params.primaryGoal.replace(/-/g, ' ')}, is evaluating their current advisor.

Benchmark comparisons:
${benchmarkSummary}

Complexity factors: ${params.complexityFlags.length > 0 ? params.complexityFlags.join(', ') : 'None'}

${params.hasEstimatedFields ? 'Note: Some values are estimated based on market benchmarks because the client was unsure of exact figures. Use soft language like "likely", "estimated", "based on similar clients" for any observations.' : ''}

Generate 3-5 concise, neutral observations about this advisor arrangement. Be factual, not prescriptive. Note where the client may be paying above market and where they are getting good value. If complexity factors are present, note whether the fee level may be justified by the additional complexity.

Return ONLY a JSON array of strings. No other text.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

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

    const body = await req.json()
    const {
      assetsRange,
      primaryGoal,
      isBusinessOwner,
      hasConcentratedStock,
      wantsPrivateMarkets,
      wantsLendingSolutions,
      needsTaxCoordination,
    } = body

    if (!assetsRange || !primaryGoal) {
      return NextResponse.json({ error: 'Assets range and primary goal are required' }, { status: 400 })
    }

    // Process confidence fields
    const advisoryFeeBps = processField('advisoryFeeBps', body.advisoryFeeBps, assetsRange)
    const lendingSpreadBps = processField('lendingSpreadBps', body.lendingSpreadBps, assetsRange)
    const serviceModel = processField('serviceModel', body.serviceModel, assetsRange)
    const portfolioCustomization = processField('portfolioCustomization', body.portfolioCustomization, assetsRange)

    // Compute benchmarks
    const fields = { advisoryFeeBps, lendingSpreadBps, serviceModel, portfolioCustomization }
    const benchmarkResults = computeAllBenchmarks(assetsRange, fields)

    // Build complexity flags list
    const complexityFlags: string[] = []
    if (isBusinessOwner) complexityFlags.push('Business owner')
    if (hasConcentratedStock) complexityFlags.push('Concentrated stock position')
    if (wantsPrivateMarkets) complexityFlags.push('Private markets interest')
    if (wantsLendingSolutions) complexityFlags.push('Lending solutions needed')
    if (needsTaxCoordination) complexityFlags.push('Tax coordination required')

    const hasEstimatedFields = [advisoryFeeBps, lendingSpreadBps, serviceModel, portfolioCustomization]
      .some((f) => f.confidence === 'low')

    // Generate AI insights
    const aiInsights = await generateEvaluationInsights({
      assetsRange,
      primaryGoal,
      benchmarkResults: benchmarkResults.map((r) => ({ ...r, field: r.field })),
      complexityFlags,
      hasEstimatedFields,
    })

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const prospect = await tx.prospect.create({
        data: {
          userId: user.id,
          assetsRange,
          primaryGoal,
          intent: 'evaluating_existing_advisor',
          status: 'ACTIVE',
          profile: {
            create: {
              isBusinessOwner: !!isBusinessOwner,
              hasConcentratedStock: !!hasConcentratedStock,
              wantsPrivateMarkets: !!wantsPrivateMarkets,
              wantsLendingSolutions: !!wantsLendingSolutions,
              needsTaxCoordination: !!needsTaxCoordination,
            },
          },
        },
      })

      const evaluation = await tx.advisorEvaluation.create({
        data: {
          prospectId: prospect.id,
          advisoryFeeBps: JSON.stringify(advisoryFeeBps),
          lendingSpreadBps: JSON.stringify(lendingSpreadBps),
          serviceModel: JSON.stringify(serviceModel),
          portfolioCustomization: JSON.stringify(portfolioCustomization),
          benchmarkResults: JSON.stringify(benchmarkResults),
          aiInsights: JSON.stringify(aiInsights),
        },
      })

      return { prospect, evaluation }
    })

    return NextResponse.json({ success: true, evaluationId: result.evaluation.id })
  } catch (e) {
    console.error('Evaluation error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
