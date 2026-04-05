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

    const { rfpId, emails } = await req.json()

    if (!rfpId || !emails?.length) {
      return NextResponse.json({ error: 'RFP ID and emails required' }, { status: 400 })
    }

    // Verify the RFP belongs to this user
    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      include: { prospect: true },
    })

    if (!rfp || rfp.prospect.userId !== user.id) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 })
    }

    const invitations: { email: string; token: string }[] = []

    for (const email of emails) {
      const trimmedEmail = email.trim().toLowerCase()

      // Find or create advisor by email
      let advisor = await prisma.advisor.findFirst({
        where: { email: trimmedEmail },
      })

      if (!advisor) {
        // Create a placeholder advisor record
        advisor = await prisma.advisor.create({
          data: {
            firmName: trimmedEmail.split('@')[0],
            leadAdvisorName: trimmedEmail.split('@')[0],
            email: trimmedEmail,
            firmType: 'TBD',
            city: 'TBD',
            clientMinimum: 'TBD',
            isPublic: false,
          },
        })
      }

      // Check if already invited
      const existing = await prisma.rfpInvitation.findFirst({
        where: { rfpId, advisorId: advisor.id },
      })

      if (existing) {
        // Already invited, add to results with existing token
        invitations.push({ email: trimmedEmail, token: existing.inviteToken })
        continue
      }

      // Create invitation
      const token = uuidv4()
      await prisma.rfpInvitation.create({
        data: {
          rfpId,
          advisorId: advisor.id,
          inviteToken: token,
          status: 'SENT',
        },
      })

      invitations.push({ email: trimmedEmail, token })
    }

    return NextResponse.json({ success: true, invitations })
  } catch (e) {
    console.error('Invite by email error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
