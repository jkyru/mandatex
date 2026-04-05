import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prospects = await prisma.prospect.findMany({
    include: {
      user: { select: { fullName: true, email: true } },
      profile: true,
      rfps: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(prospects)
}
