import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rfpId, advisorIds } = await req.json()

  if (!rfpId || !advisorIds?.length) {
    return NextResponse.json({ error: 'RFP ID and advisor IDs required' }, { status: 400 })
  }

  const invitations = []
  for (const advisorId of advisorIds) {
    const advisor = await prisma.advisor.findUnique({ where: { id: advisorId } })
    if (!advisor) continue

    const invitation = await prisma.rfpInvitation.create({
      data: {
        rfpId,
        advisorId,
        inviteToken: uuidv4(),
        status: 'SENT',
      },
    })

    invitations.push({
      id: invitation.id,
      advisorName: advisor.firmName,
      token: invitation.inviteToken,
    })
  }

  return NextResponse.json({ invitations })
}
