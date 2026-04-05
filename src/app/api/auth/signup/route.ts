import { NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { email, password, fullName, role } = await req.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const validRoles = ['PROSPECT', 'ADVISOR']
    const userRole = validRoles.includes(role) ? role : 'PROSPECT'

    // Normalize email to lowercase to match invitation records
    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName,
        role: userRole,
        authProvider: 'EMAIL',
      },
    })

    // If signing up as ADVISOR, link any existing placeholder advisor record
    // (created when a client invited this email before the advisor signed up)
    if (userRole === 'ADVISOR') {
      const placeholderAdvisor = await prisma.advisor.findFirst({
        where: { email: normalizedEmail, userId: null },
      })
      if (placeholderAdvisor) {
        await prisma.advisor.update({
          where: { id: placeholderAdvisor.id },
          data: { userId: newUser.id },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Signup error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Something went wrong' },
      { status: 500 }
    )
  }
}
