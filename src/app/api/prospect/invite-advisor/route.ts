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

    const { rfpId, name, firm, city, email, crdNumber, brokerCheckData } = await req.json()

    if (!rfpId || !name || !firm) {
      return NextResponse.json({ error: 'RFP ID, name, and firm are required' }, { status: 400 })
    }

    // Verify the RFP belongs to this user
    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      include: { prospect: true },
    })
    if (!rfp || rfp.prospect.userId !== user.id) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 })
    }

    // Find existing advisor by CRD number or name+firm+email combo
    let advisor = null
    if (crdNumber) {
      advisor = await prisma.advisor.findFirst({
        where: { crdNumber: crdNumber.toString() },
      })
    }
    if (!advisor && email) {
      advisor = await prisma.advisor.findFirst({
        where: { email: email.trim().toLowerCase() },
      })
    }

    if (!advisor) {
      // Create advisor record
      advisor = await prisma.advisor.create({
        data: {
          leadAdvisorName: name.trim(),
          firmName: firm.trim(),
          email: email?.trim().toLowerCase() || '',
          city: city?.trim() || '',
          firmType: 'TBD',
          clientMinimum: 'TBD',
          isPublic: false,
          crdNumber: crdNumber?.toString() || null,
          brokerCheckVerified: !!brokerCheckData,
          brokerCheckData: brokerCheckData ? JSON.stringify(brokerCheckData) : null,
        },
      })
    } else {
      // Update with BrokerCheck data if we have it and they don't
      if (brokerCheckData && !advisor.brokerCheckVerified) {
        await prisma.advisor.update({
          where: { id: advisor.id },
          data: {
            crdNumber: crdNumber?.toString() || advisor.crdNumber,
            brokerCheckVerified: true,
            brokerCheckData: JSON.stringify(brokerCheckData),
            leadAdvisorName: name.trim(),
            firmName: firm.trim(),
            city: city?.trim() || advisor.city,
          },
        })
      }
    }

    // Check if already invited to this RFP
    const existing = await prisma.rfpInvitation.findFirst({
      where: { rfpId, advisorId: advisor.id },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        invitation: {
          token: existing.inviteToken,
          advisorId: advisor.id,
          name: advisor.leadAdvisorName,
          firm: advisor.firmName,
          city: advisor.city,
          email: advisor.email,
          crdNumber: advisor.crdNumber,
          brokerCheckData: advisor.brokerCheckData
            ? JSON.parse(advisor.brokerCheckData)
            : null,
          alreadyInvited: true,
        },
      })
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

    return NextResponse.json({
      success: true,
      invitation: {
        token,
        advisorId: advisor.id,
        name: advisor.leadAdvisorName,
        firm: advisor.firmName,
        city: advisor.city,
        email: advisor.email,
        crdNumber: advisor.crdNumber,
        brokerCheckData: advisor.brokerCheckData
          ? JSON.parse(advisor.brokerCheckData)
          : null,
        alreadyInvited: false,
      },
    })
  } catch (e) {
    console.error('Invite advisor error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
