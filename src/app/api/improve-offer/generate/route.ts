import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You are a negotiation strategist for a prospective wealth management client who is comparing multiple advisor proposals. Your role is to draft a professional but assertive note to one specific advisor, encouraging them to improve their proposal terms.

Rules:
- Address the advisor by firm name
- Reference specific areas where competitors offer better terms WITHOUT naming competitor firms (say "another firm" or "a competing proposal")
- Focus on the 2-3 most impactful areas where improvement is possible
- Be professional and respectful — this is a negotiation, not a demand
- Be concise (150-250 words)
- End with an invitation to submit a revised proposal via the provided link
- Never fabricate competitive data — only reference what is provided
- Never name competing firms
- Never make promises on behalf of the client
- Never suggest the advisor is likely to lose — frame it as an opportunity
- Maintain a tone that preserves the professional relationship

Return ONLY the note text. No JSON, no markdown wrapping, no commentary.`

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
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

    const { responseId, rfpId } = await req.json()
    if (!responseId || !rfpId) {
      return NextResponse.json({ error: 'Missing responseId or rfpId' }, { status: 400 })
    }

    // Verify RFP belongs to user
    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      include: { prospect: true },
    })

    if (!rfp || rfp.prospect.userId !== user.id) {
      return NextResponse.json({ error: 'RFP not found or unauthorized' }, { status: 403 })
    }

    // Fetch target response
    const targetResponse = await prisma.advisorResponse.findUnique({
      where: { id: responseId },
      include: { advisor: true },
    })

    if (!targetResponse) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    // Fetch all other latest responses for the same RFP
    const otherResponses = await prisma.advisorResponse.findMany({
      where: {
        rfpId,
        isLatest: true,
        id: { not: responseId },
      },
    })

    if (otherResponses.length < 1) {
      return NextResponse.json(
        { error: 'Need at least 2 proposals to generate competitive analysis' },
        { status: 400 }
      )
    }

    // Compute competitive benchmarks
    const aumFees = otherResponses.map((r) => r.aumFeeBps)
    const annualCosts = otherResponses.map((r) => r.estimatedAnnualCost)
    const lendingSpreads = otherResponses
      .filter((r) => r.lendingSpreadBps != null)
      .map((r) => r.lendingSpreadBps!)
    const clientsPerAdvisorArr = otherResponses.map((r) => r.clientsPerAdvisor)
    const taxLevels = [...new Set(otherResponses.map((r) => r.taxCoordinationLevel))]
    const privateMarketsCount = otherResponses.filter(
      (r) => r.privateMarketsAccess && r.privateMarketsAccess !== 'Not offered'
    ).length
    const concessionsCount = otherResponses.filter(
      (r) => r.concessionsText && r.concessionsText.trim() !== ''
    ).length

    const benchmarks = {
      aumFeeBps: { min: Math.min(...aumFees), max: Math.max(...aumFees), median: median(aumFees) },
      estimatedAnnualCost: {
        min: Math.min(...annualCosts),
        max: Math.max(...annualCosts),
        median: median(annualCosts),
      },
      lendingSpreadBps:
        lendingSpreads.length > 0
          ? { min: Math.min(...lendingSpreads), max: Math.max(...lendingSpreads) }
          : null,
      clientsPerAdvisor: {
        min: Math.min(...clientsPerAdvisorArr),
        max: Math.max(...clientsPerAdvisorArr),
        median: median(clientsPerAdvisorArr),
      },
      taxCoordinationLevels: taxLevels,
      privateMarketsCount,
      concessionsCount,
      totalCompetitors: otherResponses.length,
    }

    // Compute competitive gaps
    const gaps: string[] = []
    if (targetResponse.aumFeeBps > benchmarks.aumFeeBps.median) {
      const worseCount = aumFees.filter((f) => f < targetResponse.aumFeeBps).length
      gaps.push(
        `AUM fee of ${targetResponse.aumFeeBps}bps is higher than ${worseCount} of ${otherResponses.length} competitors (median: ${benchmarks.aumFeeBps.median}bps)`
      )
    }
    if (targetResponse.estimatedAnnualCost > benchmarks.estimatedAnnualCost.median) {
      const worseCount = annualCosts.filter((c) => c < targetResponse.estimatedAnnualCost).length
      gaps.push(
        `Estimated annual cost of $${targetResponse.estimatedAnnualCost.toLocaleString()} is higher than ${worseCount} of ${otherResponses.length} competitors (median: $${benchmarks.estimatedAnnualCost.median.toLocaleString()})`
      )
    }
    if (targetResponse.clientsPerAdvisor > benchmarks.clientsPerAdvisor.median) {
      gaps.push(
        `Clients per advisor ratio of ${targetResponse.clientsPerAdvisor} is higher than median of ${benchmarks.clientsPerAdvisor.median}`
      )
    }
    if (
      lendingSpreads.length > 0 &&
      targetResponse.lendingSpreadBps != null &&
      targetResponse.lendingSpreadBps > Math.min(...lendingSpreads)
    ) {
      gaps.push(
        `Lending spread of ${targetResponse.lendingSpreadBps}bps is above the best competing offer of ${Math.min(...lendingSpreads)}bps`
      )
    }
    if (
      (!targetResponse.privateMarketsAccess ||
        targetResponse.privateMarketsAccess === 'Not offered') &&
      privateMarketsCount > 0
    ) {
      gaps.push(
        `Does not offer private markets access, while ${privateMarketsCount} competitor(s) do`
      )
    }

    // Keep top 3 gaps
    const keyGaps = gaps.slice(0, 3)

    // Build user message
    const lendingSpreadDisplay =
      benchmarks.lendingSpreadBps
        ? `${benchmarks.lendingSpreadBps.min}bps - ${benchmarks.lendingSpreadBps.max}bps`
        : 'N/A'

    const userMessage = `TARGET ADVISOR:
Firm: ${targetResponse.advisor.firmName}
Lead Advisor: ${targetResponse.advisor.leadAdvisorName}
Current AUM Fee: ${targetResponse.aumFeeBps} bps (${(targetResponse.aumFeeBps / 100).toFixed(2)}%)
Estimated Annual Cost: $${targetResponse.estimatedAnnualCost.toLocaleString()}
Lending Spread: ${targetResponse.lendingSpreadBps != null ? `${targetResponse.lendingSpreadBps} bps` : 'N/A'}
Clients per Advisor: ${targetResponse.clientsPerAdvisor}
Tax Coordination: ${targetResponse.taxCoordinationLevel}
Private Markets: ${targetResponse.privateMarketsAccess || 'Not offered'}
Concessions: ${targetResponse.concessionsText || 'None'}

COMPETITIVE BENCHMARKS (${otherResponses.length} other proposals):
- AUM Fee range: ${benchmarks.aumFeeBps.min}bps - ${benchmarks.aumFeeBps.max}bps (median: ${benchmarks.aumFeeBps.median}bps)
- Annual Cost range: $${benchmarks.estimatedAnnualCost.min.toLocaleString()} - $${benchmarks.estimatedAnnualCost.max.toLocaleString()} (median: $${benchmarks.estimatedAnnualCost.median.toLocaleString()})
- Lending Spread range: ${lendingSpreadDisplay}
- Clients per Advisor range: ${benchmarks.clientsPerAdvisor.min} - ${benchmarks.clientsPerAdvisor.max} (median: ${benchmarks.clientsPerAdvisor.median})
- Tax Coordination levels: ${benchmarks.taxCoordinationLevels.join(', ')}
- ${benchmarks.privateMarketsCount} of ${benchmarks.totalCompetitors} competitors offer private markets access
- ${benchmarks.concessionsCount} of ${benchmarks.totalCompetitors} competitors offered fee concessions

KEY COMPETITIVE GAPS:
${keyGaps.length > 0 ? keyGaps.map((g) => `- ${g}`).join('\n') : '- No significant gaps identified'}`

    // Call Anthropic
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI not configured. Add ANTHROPIC_API_KEY to .env' },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({ apiKey })

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = aiResponse.content.find((b) => b.type === 'text')
    const aiGeneratedNote = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : ''

    if (!aiGeneratedNote) {
      return NextResponse.json({ error: 'AI failed to generate note' }, { status: 500 })
    }

    // Find the RfpInvitation for this advisor+rfp
    const invitation = await prisma.rfpInvitation.findFirst({
      where: {
        rfpId,
        advisorId: targetResponse.advisorId,
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Create RevisionRequest
    const revisionRequest = await prisma.revisionRequest.create({
      data: {
        rfpId,
        advisorId: targetResponse.advisorId,
        invitationId: invitation.id,
        revisionToken: uuidv4(),
        aiGeneratedNote,
        finalNote: aiGeneratedNote,
        competitiveContext: JSON.stringify(benchmarks),
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      revisionRequestId: revisionRequest.id,
      revisionToken: revisionRequest.revisionToken,
      aiGeneratedNote,
      advisorName: targetResponse.advisor.leadAdvisorName,
      advisorEmail: targetResponse.advisor.email,
    })
  } catch (e) {
    console.error('Improve offer generation error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
