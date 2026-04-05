import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AdminPanel } from '@/components/admin/admin-panel'

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/')

  const prospects = await prisma.prospect.findMany({
    include: {
      user: { select: { fullName: true, email: true } },
      profile: true,
      rfps: {
        include: {
          responses: { select: { id: true } },
          invitations: { select: { id: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const advisors = await prisma.advisor.findMany({
    include: {
      invitations: { select: { id: true, status: true } },
      responses: { select: { id: true } },
    },
    orderBy: { firmName: 'asc' },
  })

  const rfps = await prisma.rfp.findMany({
    include: {
      prospect: {
        include: { user: { select: { fullName: true } } },
      },
      invitations: {
        include: { advisor: { select: { firmName: true } } },
      },
      responses: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b border-neutral-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight text-neutral-900">MandateX</span>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Admin</span>
            <span className="text-sm text-neutral-500">{session.user.email}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <AdminPanel
          prospects={prospects.map((p) => ({
            id: p.id,
            userName: p.user.fullName,
            userEmail: p.user.email,
            assetsRange: p.assetsRange,
            primaryGoal: p.primaryGoal,
            status: p.status,
            rfpCount: p.rfps.length,
            responseCount: p.rfps.reduce((acc, r) => acc + r.responses.length, 0),
            createdAt: p.createdAt.toISOString(),
          }))}
          advisors={advisors.map((a) => ({
            id: a.id,
            firmName: a.firmName,
            leadAdvisorName: a.leadAdvisorName,
            email: a.email,
            firmType: a.firmType,
            city: a.city,
            clientMinimum: a.clientMinimum,
            invitationCount: a.invitations.length,
            responseCount: a.responses.length,
          }))}
          rfps={rfps.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            prospectName: r.prospect.user.fullName,
            invitations: r.invitations.map((i) => ({
              id: i.id,
              advisorName: i.advisor.firmName,
              status: i.status,
            })),
            responseCount: r.responses.length,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  )
}
