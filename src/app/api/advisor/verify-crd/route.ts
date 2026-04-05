import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

interface BrokerCheckIndividual {
  ind_source_id?: string
  ind_firstname?: string
  ind_lastname?: string
  ind_other_names?: string[]
  ind_bc_scope?: string
  ind_ia_scope?: string
  ind_bc_disclosure_fl?: string
  ind_current_employments?: Array<{
    firm_name?: string
    branch_city?: string
    branch_state?: string
  }>
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

    // Call FINRA BrokerCheck search API
    const brokerCheckRes = await fetch(
      `https://api.brokercheck.finra.org/search/individual?query=${crd}&hl=true&nrows=1&start=0&r=25&sort=score+desc&wt=json`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!brokerCheckRes.ok) {
      return NextResponse.json({
        verified: false,
        found: false,
        error: 'Unable to verify CRD at this time',
      })
    }

    const data = await brokerCheckRes.json()

    // Extract individual data from search response
    const hits = data?.hits?.hits
    if (!hits || hits.length === 0) {
      return NextResponse.json({
        verified: false,
        found: false,
        error: 'No advisor found with this CRD number',
      })
    }

    const individual: BrokerCheckIndividual = hits[0]?._source || {}

    // Verify the CRD actually matches (search could return fuzzy results)
    if (individual.ind_source_id !== crd) {
      return NextResponse.json({
        verified: false,
        found: false,
        error: 'No advisor found with this CRD number',
      })
    }

    const name = [individual.ind_firstname, individual.ind_lastname].filter(Boolean).join(' ') || 'Unknown'
    const currentEmployments = individual.ind_current_employments || []
    const currentFirm = currentEmployments[0]?.firm_name || null
    const firmCity = currentEmployments[0]?.branch_city || null
    const firmState = currentEmployments[0]?.branch_state || null
    const hasDisclosures = individual.ind_bc_disclosure_fl === 'Y'

    // Only consider "verified" if the advisor has an active registration
    const isActivelyRegistered = currentEmployments.length > 0

    const disclosures: Array<{ type: string; date: string | null; detail: string | null; resolution: string | null }> = []
    const disclosureCount = hasDisclosures ? 1 : 0

    const brokerCheckData = {
      name,
      crdNumber: crd,
      currentFirm,
      firmLocation: firmCity && firmState ? `${firmCity}, ${firmState}` : null,
      disclosureCount,
      disclosures,
      registrationStatus: individual.ind_bc_scope || null,
      iaStatus: individual.ind_ia_scope || null,
      isActivelyRegistered,
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
            brokerCheckVerified: isActivelyRegistered,
            brokerCheckData: JSON.stringify(brokerCheckData),
          },
        })
      }
    }

    return NextResponse.json({
      verified: isActivelyRegistered,
      found: true,
      data: brokerCheckData,
    })
  } catch (e) {
    console.error('BrokerCheck verification error:', e)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
