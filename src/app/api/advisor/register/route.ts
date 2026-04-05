import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
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

    const {
      firmName,
      leadAdvisorName,
      firmType,
      city,
      clientMinimum,
      bio,
      servicesOffered,
      crdNumber,
    } = await req.json()

    if (!firmName || !leadAdvisorName || !firmType || !city || !clientMinimum) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    // Check if profile already exists by userId
    const existingByUser = await prisma.advisor.findUnique({
      where: { userId: user.id },
    })

    if (existingByUser) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 409 })
    }

    // Check if a placeholder advisor exists for this email (created when a client invited them)
    const placeholderByEmail = await prisma.advisor.findFirst({
      where: { email: user.email, userId: null },
    })

    let advisor
    if (placeholderByEmail) {
      // Update the placeholder with the real profile data and link to user
      advisor = await prisma.advisor.update({
        where: { id: placeholderByEmail.id },
        data: {
          userId: user.id,
          firmName,
          leadAdvisorName,
          firmType,
          city,
          clientMinimum,
          bio: bio || null,
          servicesOffered: servicesOffered ? JSON.stringify(servicesOffered) : null,
          crdNumber: crdNumber || null,
          isPublic: true,
        },
      })
    } else {
      // No placeholder — create fresh
      advisor = await prisma.advisor.create({
        data: {
          userId: user.id,
          firmName,
          leadAdvisorName,
          email: user.email,
          firmType,
          city,
          clientMinimum,
          bio: bio || null,
          servicesOffered: servicesOffered ? JSON.stringify(servicesOffered) : null,
          crdNumber: crdNumber || null,
          isPublic: true,
        },
      })
    }

    return NextResponse.json({ success: true, advisorId: advisor.id })
  } catch (e) {
    console.error('Advisor registration error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
