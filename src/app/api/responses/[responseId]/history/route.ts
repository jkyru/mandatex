import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ responseId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { responseId } = await params

    // Find the target response to get invitationId and advisorId
    const targetResponse = await prisma.advisorResponse.findUnique({
      where: { id: responseId },
    })

    if (!targetResponse) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    // Fetch all versions for this invitation + advisor chain, ordered by version
    const allVersions = await prisma.advisorResponse.findMany({
      where: {
        invitationId: targetResponse.invitationId,
        advisorId: targetResponse.advisorId,
      },
      orderBy: { version: 'asc' },
    })

    // Compute changes between consecutive versions
    const versions = allVersions.map((response, index) => {
      let changes: Record<string, { from: number | string | null; to: number | string | null }> | null = null

      if (index > 0) {
        const prev = allVersions[index - 1]
        changes = {}

        // Numeric fields
        if (response.aumFeeBps !== prev.aumFeeBps) {
          changes.aumFeeBps = { from: prev.aumFeeBps, to: response.aumFeeBps }
        }
        if (response.estimatedAnnualCost !== prev.estimatedAnnualCost) {
          changes.estimatedAnnualCost = { from: prev.estimatedAnnualCost, to: response.estimatedAnnualCost }
        }
        if (response.lendingSpreadBps !== prev.lendingSpreadBps) {
          changes.lendingSpreadBps = { from: prev.lendingSpreadBps, to: response.lendingSpreadBps }
        }
        if (response.clientsPerAdvisor !== prev.clientsPerAdvisor) {
          changes.clientsPerAdvisor = { from: prev.clientsPerAdvisor, to: response.clientsPerAdvisor }
        }

        // String fields
        if (response.taxCoordinationLevel !== prev.taxCoordinationLevel) {
          changes.taxCoordinationLevel = { from: prev.taxCoordinationLevel, to: response.taxCoordinationLevel }
        }
        if (response.privateMarketsAccess !== prev.privateMarketsAccess) {
          changes.privateMarketsAccess = { from: prev.privateMarketsAccess, to: response.privateMarketsAccess }
        }
        if (response.differentiationText !== prev.differentiationText) {
          changes.differentiationText = { from: prev.differentiationText, to: response.differentiationText }
        }
        if (response.concessionsText !== prev.concessionsText) {
          changes.concessionsText = { from: prev.concessionsText, to: response.concessionsText }
        }

        // If no changes detected, set to empty object
        if (Object.keys(changes).length === 0) {
          changes = {}
        }
      }

      return {
        id: response.id,
        version: response.version,
        isLatest: response.isLatest,
        status: response.status,
        createdAt: response.createdAt,
        aumFeeBps: response.aumFeeBps,
        estimatedAnnualCost: response.estimatedAnnualCost,
        lendingSpreadBps: response.lendingSpreadBps,
        privateMarketsAccess: response.privateMarketsAccess,
        clientsPerAdvisor: response.clientsPerAdvisor,
        taxCoordinationLevel: response.taxCoordinationLevel,
        differentiationText: response.differentiationText,
        concessionsText: response.concessionsText,
        previousResponseId: response.previousResponseId,
        revisionRequestId: response.revisionRequestId,
        changes,
      }
    })

    return NextResponse.json({ versions })
  } catch (e) {
    console.error('Response history error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
