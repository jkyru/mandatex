import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function AdvisorDashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect('/login')
  if (user.role !== 'ADVISOR') redirect('/dashboard')

  // Find advisor profile
  const advisor = await prisma.advisor.findUnique({
    where: { userId: user.id },
  })

  // Also find invitations by email (for advisors invited before they signed up)
  const invitationsByEmail = await prisma.rfpInvitation.findMany({
    where: {
      advisor: { email: user.email },
    },
    include: {
      rfp: {
        include: {
          prospect: {
            include: {
              user: { select: { fullName: true } },
              profile: true,
            },
          },
        },
      },
      advisor: true,
      response: true,
    },
    orderBy: { rfp: { createdAt: 'desc' } },
  })

  // Also find invitations linked to advisor profile
  const invitationsByProfile = advisor
    ? await prisma.rfpInvitation.findMany({
        where: { advisorId: advisor.id },
        include: {
          rfp: {
            include: {
              prospect: {
                include: {
                  user: { select: { fullName: true } },
                  profile: true,
                },
              },
            },
          },
          advisor: true,
          response: true,
        },
        orderBy: { rfp: { createdAt: 'desc' } },
      })
    : []

  // Merge and deduplicate
  const allInvitations = [...invitationsByEmail, ...invitationsByProfile]
  const seen = new Set<string>()
  const invitations = allInvitations.filter((inv) => {
    if (seen.has(inv.id)) return false
    seen.add(inv.id)
    return true
  })

  const hasProfile = !!advisor

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b border-neutral-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight text-neutral-900">MandateX</span>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Advisor</span>
            <span className="text-sm text-neutral-500">{session.user.email}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Advisor Dashboard</h1>
        <p className="text-sm text-neutral-500 mb-8">
          {invitations.length} active RFP invitation{invitations.length !== 1 ? 's' : ''}
        </p>

        {!hasProfile && (
          <Card className="p-6 mb-6 border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900">Complete your firm profile</p>
                <p className="text-sm text-neutral-600 mt-1">Set up your firm profile to appear in the advisor directory.</p>
              </div>
              <Link href="/advisor/register">
                <Button size="sm">Complete Profile</Button>
              </Link>
            </div>
          </Card>
        )}

        {invitations.length === 0 ? (
          <Card className="p-12 text-center">
            <h2 className="text-lg font-medium text-neutral-900 mb-2">No Active Invitations</h2>
            <p className="text-neutral-500">When clients invite you to submit a proposal, it will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {invitations.map((inv) => {
              const hasResponded = inv.status === 'SUBMITTED' || !!inv.response
              return (
                <Card key={inv.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">{inv.rfp.title}</p>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      from {inv.rfp.prospect.user.fullName}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-neutral-400">
                      <span>{inv.rfp.prospect.assetsRange}</span>
                      <span className="capitalize">{inv.rfp.prospect.primaryGoal.replace(/-/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={hasResponded ? 'success' : 'warning'}>
                      {hasResponded ? 'Submitted' : 'Pending'}
                    </Badge>
                    {!hasResponded && (
                      <Link href={`/advisor/${inv.inviteToken}`}>
                        <Button size="sm">Submit Proposal</Button>
                      </Link>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
