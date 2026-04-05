import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { firmName, leadAdvisorName, email, firmType, city, clientMinimum } = await req.json()

  const advisor = await prisma.advisor.create({
    data: { firmName, leadAdvisorName, email, firmType, city, clientMinimum },
  })

  return NextResponse.json(advisor)
}
