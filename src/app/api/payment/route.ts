import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rfpId } = await req.json()

    // In production, this would create a Stripe checkout session
    // For MVP, we simulate a successful payment

    const comparisonView = await prisma.comparisonView.findUnique({
      where: { rfpId },
    })

    if (!comparisonView) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.comparisonView.update({
      where: { rfpId },
      data: {
        paymentStatus: 'PAID',
        isPaywalled: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
