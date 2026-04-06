import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      revisionToken,
      submissionName,
      submissionFirm,
      aumFeeBps,
      estimatedAnnualCost,
      lendingSpreadBps,
      publicMarketsOfferings,
      publicMarketsOther,
      publicMarketsDueDiligence,
      privateMarketsOfferings,
      privateMarketsDueDiligence,
      clientsPerAdvisor,
      taxCoordinationLevel,
      differentiationText,
      concessionsText,
    } = body

    // Look up RevisionRequest by revisionToken
    const revisionRequest = await prisma.revisionRequest.findUnique({
      where: { revisionToken },
      include: { invitation: true },
    })

    if (!revisionRequest) {
      return NextResponse.json({ error: 'Invalid revision token' }, { status: 400 })
    }

    if (revisionRequest.status === 'REVISED' || revisionRequest.status === 'EXPIRED') {
      return NextResponse.json(
        { error: `Revision request is already ${revisionRequest.status.toLowerCase()}` },
        { status: 409 }
      )
    }

    // Find the latest AdvisorResponse for this invitation
    const oldResponse = await prisma.advisorResponse.findFirst({
      where: {
        invitationId: revisionRequest.invitationId,
        isLatest: true,
      },
    })

    if (!oldResponse) {
      return NextResponse.json({ error: 'No existing response found' }, { status: 404 })
    }

    // Perform all updates in a transaction
    await prisma.$transaction([
      // Mark old response as no longer latest
      prisma.advisorResponse.update({
        where: { id: oldResponse.id },
        data: { isLatest: false },
      }),
      // Create new response with incremented version
      prisma.advisorResponse.create({
        data: {
          rfpId: oldResponse.rfpId,
          advisorId: oldResponse.advisorId,
          invitationId: oldResponse.invitationId,
          submissionName,
          submissionFirm,
          aumFeeBps,
          estimatedAnnualCost,
          lendingSpreadBps,
          publicMarketsOfferings,
          publicMarketsOther,
          publicMarketsDueDiligence,
          privateMarketsOfferings,
          privateMarketsDueDiligence,
          clientsPerAdvisor,
          taxCoordinationLevel,
          differentiationText,
          concessionsText,
          version: oldResponse.version + 1,
          isLatest: true,
          previousResponseId: oldResponse.id,
          revisionRequestId: revisionRequest.id,
          status: 'SUBMITTED',
        },
      }),
      // Update revision request status
      prisma.revisionRequest.update({
        where: { id: revisionRequest.id },
        data: { status: 'REVISED' },
      }),
      // Update invitation status
      prisma.rfpInvitation.update({
        where: { id: revisionRequest.invitationId },
        data: { status: 'SUBMITTED' },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Revision submission error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
