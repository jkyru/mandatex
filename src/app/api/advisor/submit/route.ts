import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      token,
      invitationId,
      rfpId,
      advisorId,
      aumFeeBps,
      estimatedAnnualCost,
      lendingSpreadBps,
      privateMarketsAccess,
      clientsPerAdvisor,
      taxCoordinationLevel,
      differentiationText,
      concessionsText,
    } = body

    // Validate invitation
    const invitation = await prisma.rfpInvitation.findUnique({
      where: { inviteToken: token },
    })

    if (!invitation || invitation.id !== invitationId) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 400 })
    }

    if (invitation.status === 'SUBMITTED') {
      return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
    }

    // Create response
    await prisma.advisorResponse.create({
      data: {
        rfpId,
        advisorId,
        invitationId,
        aumFeeBps,
        estimatedAnnualCost,
        lendingSpreadBps,
        privateMarketsAccess,
        clientsPerAdvisor,
        taxCoordinationLevel,
        differentiationText,
        concessionsText,
        status: 'SUBMITTED',
      },
    })

    // Update invitation status
    await prisma.rfpInvitation.update({
      where: { id: invitationId },
      data: { status: 'SUBMITTED' },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Advisor submission error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
