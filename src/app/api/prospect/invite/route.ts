import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

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

    const { rfpId, advisorId } = await req.json()

    if (!rfpId || !advisorId) {
      return NextResponse.json({ error: 'RFP ID and advisor ID required' }, { status: 400 })
    }

    // Verify the RFP belongs to this user
    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      include: { prospect: true },
    })

    if (!rfp || rfp.prospect.userId !== user.id) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 })
    }

    // Check if already invited
    const existing = await prisma.rfpInvitation.findFirst({
      where: { rfpId, advisorId },
    })

    if (existing) {
      return NextResponse.json({ error: 'Already invited' }, { status: 409 })
    }

    // Create invitation
    const invitation = await prisma.rfpInvitation.create({
      data: {
        rfpId,
        advisorId,
        inviteToken: uuidv4(),
        status: 'SENT',
      },
    })

    return NextResponse.json({ success: true, invitationId: invitation.id })
  } catch (e) {
    console.error('Invitation error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
