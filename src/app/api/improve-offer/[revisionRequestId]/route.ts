import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ revisionRequestId: string }> }
) {
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

    const { revisionRequestId } = await params

    const { clientEditedNote } = await req.json()
    if (!clientEditedNote) {
      return NextResponse.json({ error: 'Missing clientEditedNote' }, { status: 400 })
    }

    // Look up RevisionRequest and verify ownership via rfp -> prospect
    const revisionRequest = await prisma.revisionRequest.findUnique({
      where: { id: revisionRequestId },
      include: {
        rfp: {
          include: { prospect: true },
        },
      },
    })

    if (!revisionRequest) {
      return NextResponse.json({ error: 'Revision request not found' }, { status: 404 })
    }

    if (revisionRequest.rfp.prospect.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update the revision request with client edits
    await prisma.revisionRequest.update({
      where: { id: revisionRequestId },
      data: {
        clientEditedNote,
        finalNote: clientEditedNote,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Revision request update error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
