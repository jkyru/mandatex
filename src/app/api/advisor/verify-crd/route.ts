import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

interface BrokerCheckIndividual {
  individualName?: string
  currentEmployments?: Array<{
    firmName?: string
    branchCity?: string
    branchState?: string
  }>
  disclosures?: Array<{
    disclosureType?: string
    disclosureDate?: string
    disclosureDetail?: string
    disclosureResolution?: string
  }>
  industry?: {
    registrations?: Array<{
      registrationType?: string
    }>
  }
}

export async function POST(req: Request) {
  try {
    const { crdNumber, advisorId, inviteToken } = await req.json()

    // Allow access if authenticated as advisor OR if a valid invite token is provided
    let authorizedUserId: string | null = null

    if (inviteToken) {
      // Token-based access from submission page
      const invitation = await prisma.rfpInvitation.findUnique({
        where: { inviteToken },
      })
      if (!invitation) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
      }
    } else {
      // Authenticated access from registration page
      const session = await auth()
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      })
      if (!user || user.role !== 'ADVISOR') {
        return NextResponse.json({ error: 'Not an advisor account' }, { status: 403 })
      }
      authorizedUserId = user.id
    }

    if (!crdNumber) {
      return NextResponse.json({ error: 'CRD number is required' }, { status: 400 })
    }

    const crd = crdNumber.toString().trim()

    // Call FINRA BrokerCheck public API
    const brokerCheckRes = await fetch(
      `https://api.brokercheck.finra.org/individual/individual/${crd}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!brokerCheckRes.ok) {
      if (brokerCheckRes.status === 404) {
        return NextResponse.json({
          verified: false,
          error: 'No advisor found with this CRD number',
        })
      }
      return NextResponse.json({
        verified: false,
        error: 'Unable to verify CRD at this time',
      })
    }

    const data = await brokerCheckRes.json()

    // Extract individual data from response
    const hits = data?.hits?.hits
    if (!hits || hits.length === 0) {
      return NextResponse.json({
        verified: false,
        error: 'No advisor found with this CRD number',
      })
    }

    const individual: BrokerCheckIndividual = hits[0]?._source || {}
    const name = individual.individualName || 'Unknown'
    const currentFirm = individual.currentEmployments?.[0]?.firmName || null
    const firmCity = individual.currentEmployments?.[0]?.branchCity || null
    const firmState = individual.currentEmployments?.[0]?.branchState || null

    // Extract disclosures
    const disclosures = (individual.disclosures || []).map((d) => ({
      type: d.disclosureType || 'Unknown',
      date: d.disclosureDate || null,
      detail: d.disclosureDetail || null,
      resolution: d.disclosureResolution || null,
    }))

    const brokerCheckData = {
      name,
      crdNumber: crd,
      currentFirm,
      firmLocation: firmCity && firmState ? `${firmCity}, ${firmState}` : null,
      disclosureCount: disclosures.length,
      disclosures,
      verifiedAt: new Date().toISOString(),
    }

    // Update advisor record if advisorId provided
    if (advisorId) {
      const advisor = await prisma.advisor.findUnique({
        where: { id: advisorId },
      })

      if (advisor && (advisor.userId === authorizedUserId || !advisor.userId || inviteToken)) {
        await prisma.advisor.update({
          where: { id: advisorId },
          data: {
            crdNumber: crd,
            brokerCheckVerified: true,
            brokerCheckData: JSON.stringify(brokerCheckData),
          },
        })
      }
    }

    return NextResponse.json({
      verified: true,
      data: brokerCheckData,
    })
  } catch (e) {
    console.error('BrokerCheck verification error:', e)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
