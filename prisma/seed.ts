import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@mandatex.com',
      passwordHash: adminPasswordHash,
      fullName: 'MandateX Admin',
      role: 'ADMIN',
      authProvider: 'EMAIL',
    },
  })
  console.log(`Created admin user: ${adminUser.email}`)

  // 2. Create prospect user
  const prospectPasswordHash = await bcrypt.hash('prospect123', 10)
  const prospectUser = await prisma.user.create({
    data: {
      email: 'prospect@mandatex.com',
      passwordHash: prospectPasswordHash,
      fullName: 'Jane Mitchell',
      role: 'PROSPECT',
      authProvider: 'EMAIL',
    },
  })
  console.log(`Created prospect user: ${prospectUser.email}`)

  // 3. Create prospect record with profile
  const prospect = await prisma.prospect.create({
    data: {
      userId: prospectUser.id,
      assetsRange: '$5M - $10M',
      primaryGoal: 'Comprehensive wealth management with tax optimization',
      status: 'ACTIVE',
      profile: {
        create: {
          isBusinessOwner: true,
          hasConcentratedStock: true,
          wantsPrivateMarkets: true,
          wantsLendingSolutions: true,
          needsTaxCoordination: true,
          servicePreference: 'full-service',
          investmentStylePreference: 'moderate',
          summaryText:
            'Business owner with concentrated stock position seeking comprehensive wealth management. Interested in private markets, lending solutions, and proactive tax coordination across multiple accounts.',
        },
      },
    },
  })
  console.log(`Created prospect: ${prospect.id}`)

  // 4. Create RFP for the prospect
  const rfp = await prisma.rfp.create({
    data: {
      prospectId: prospect.id,
      title: 'Comprehensive Wealth Management RFP - $5M+ Portfolio',
      status: 'OPEN',
      freeResponseLimit: 3,
      paidUnlockPrice: 499,
    },
  })
  console.log(`Created RFP: ${rfp.title}`)

  // 5. Create 5 sample advisors
  const advisorsData = [
    {
      firmName: 'Morgan Stanley Wealth Management',
      leadAdvisorName: 'Robert Chen',
      email: 'rchen@morganstanley.example.com',
      firmType: 'Wirehouse',
      city: 'New York, NY',
      clientMinimum: '$1M',
      bio: 'Full-service wealth management backed by institutional research, global market access, and a dedicated advisory team with 20+ years of experience serving high-net-worth families.',
      servicesOffered: JSON.stringify(['Wealth Management', 'Tax Planning', 'Estate Planning', 'Private Markets', 'Lending Solutions']),
      isPublic: true,
    },
    {
      firmName: 'Evergreen Capital Advisors',
      leadAdvisorName: 'Sarah Thompson',
      email: 'sthompson@evergreencap.example.com',
      firmType: 'Boutique RIA',
      city: 'San Francisco, CA',
      clientMinimum: '$2M',
      bio: 'Independent, fee-only advisory firm specializing in concentrated equity strategies and comprehensive financial planning for tech executives and founders.',
      servicesOffered: JSON.stringify(['Wealth Management', 'Tax Planning', 'Retirement Planning']),
      isPublic: true,
    },
    {
      firmName: 'Crestview Family Office',
      leadAdvisorName: 'Michael Reeves',
      email: 'mreeves@crestviewfo.example.com',
      firmType: 'Multi-Family Office',
      city: 'Chicago, IL',
      clientMinimum: '$5M',
      bio: 'Multi-family office providing institutional-grade investment management, private market access, and multigenerational wealth planning for families with complex financial needs.',
      servicesOffered: JSON.stringify(['Wealth Management', 'Estate Planning', 'Private Markets', 'Business Advisory', 'Philanthropic Advisory']),
      isPublic: true,
    },
    {
      firmName: 'Pacific Northwest Trust',
      leadAdvisorName: 'Emily Nakamura',
      email: 'enakamura@pnwtrust.example.com',
      firmType: 'Regional Bank',
      city: 'Seattle, WA',
      clientMinimum: '$500K',
      bio: 'Regional trust company offering personalized wealth management, trust administration, and lending solutions with a focus on long-term client relationships.',
      servicesOffered: JSON.stringify(['Wealth Management', 'Lending Solutions', 'Retirement Planning', 'Estate Planning']),
      isPublic: true,
    },
    {
      firmName: 'Summit Independent Wealth',
      leadAdvisorName: 'David Martinez',
      email: 'dmartinez@summitiw.example.com',
      firmType: 'Independent RIA',
      city: 'Austin, TX',
      clientMinimum: '$1M',
      bio: 'Independent advisory firm built on transparency and low fees. Specializing in tax-efficient portfolio management and financial planning for business owners.',
      servicesOffered: JSON.stringify(['Wealth Management', 'Tax Planning', 'Business Advisory', 'Retirement Planning']),
      isPublic: true,
    },
  ]

  const advisors = []
  for (const data of advisorsData) {
    const advisor = await prisma.advisor.create({ data })
    advisors.push(advisor)
    console.log(`Created advisor: ${advisor.firmName}`)
  }

  // 6. Create invitations for all 5 advisors
  const invitations = []
  for (const advisor of advisors) {
    const invitation = await prisma.rfpInvitation.create({
      data: {
        rfpId: rfp.id,
        advisorId: advisor.id,
        inviteToken: uuidv4(),
        status: 'SUBMITTED',
      },
    })
    invitations.push(invitation)
    console.log(`Created invitation for: ${advisor.firmName}`)
  }

  // 7. Create 5 advisor responses with realistic financial data
  const responsesData = [
    {
      advisorIndex: 0,
      aumFeeBps: 85,
      estimatedAnnualCost: 42500,
      lendingSpreadBps: 150,
      privateMarketsAccess: 'Full access to proprietary PE, VC, and real estate funds with $250K minimums',
      clientsPerAdvisor: 95,
      taxCoordinationLevel: 'Basic',
      differentiationText:
        'As a leading wirehouse, we offer unmatched scale with access to proprietary research, IPO allocations, and a global banking platform. Our dedicated planning team provides estate and insurance analysis at no additional cost.',
      concessionsText:
        'Willing to reduce AUM fee to 75bps for the first year and waive the financial planning fee for the initial comprehensive plan.',
    },
    {
      advisorIndex: 1,
      aumFeeBps: 75,
      estimatedAnnualCost: 37500,
      lendingSpreadBps: 200,
      privateMarketsAccess: 'Curated access to institutional-quality PE and real estate funds via iCapital platform',
      clientsPerAdvisor: 45,
      taxCoordinationLevel: 'Advanced',
      differentiationText:
        'Our boutique structure means you work directly with senior partners who manage fewer than 50 client relationships. We specialize in concentrated stock monetization strategies and have executed over $500M in structured solutions for tech executives.',
      concessionsText:
        'Can implement a tiered fee schedule: 75bps on first $3M, 50bps on assets above $3M.',
    },
    {
      advisorIndex: 2,
      aumFeeBps: 100,
      estimatedAnnualCost: 50000,
      lendingSpreadBps: 100,
      privateMarketsAccess: 'Direct co-investment opportunities alongside the family office portfolio; $100K minimums',
      clientsPerAdvisor: 30,
      taxCoordinationLevel: 'Comprehensive',
      differentiationText:
        'As a multi-family office, we provide true institutional-level service including in-house tax preparation, bill pay, insurance review, and philanthropic planning. Our CIO manages a $2B model portfolio with direct indexing for maximum tax efficiency.',
      concessionsText: null,
    },
    {
      advisorIndex: 3,
      aumFeeBps: 65,
      estimatedAnnualCost: 32500,
      lendingSpreadBps: 125,
      privateMarketsAccess: 'Limited - access to select real estate and infrastructure funds through third-party platforms',
      clientsPerAdvisor: 80,
      taxCoordinationLevel: 'Moderate',
      differentiationText:
        'Our regional bank trust division offers competitive fees backed by the stability of a 90-year-old institution. We provide integrated banking, lending at preferential rates, and fiduciary trust services under one roof.',
      concessionsText:
        'Can offer a securities-based lending rate of SOFR + 100bps for clients who consolidate $3M+ in managed assets.',
    },
    {
      advisorIndex: 4,
      aumFeeBps: 50,
      estimatedAnnualCost: 25000,
      lendingSpreadBps: 250,
      privateMarketsAccess: 'Access to Yieldstreet and Fundrise institutional share classes; working on direct PE access for 2026',
      clientsPerAdvisor: 55,
      taxCoordinationLevel: 'Advanced',
      differentiationText:
        'We are a fee-only fiduciary with zero proprietary products or revenue sharing. Our transparent model means every recommendation is conflict-free. We use direct indexing with daily tax-loss harvesting and have generated average annual tax alpha of 1.2% for clients in similar situations.',
      concessionsText:
        'Flat fee option available: $25,000/year all-in covering investment management, financial planning, and tax coordination.',
    },
  ]

  for (const data of responsesData) {
    const advisor = advisors[data.advisorIndex]
    const invitation = invitations[data.advisorIndex]

    await prisma.advisorResponse.create({
      data: {
        rfpId: rfp.id,
        advisorId: advisor.id,
        invitationId: invitation.id,
        aumFeeBps: data.aumFeeBps,
        estimatedAnnualCost: data.estimatedAnnualCost,
        lendingSpreadBps: data.lendingSpreadBps,
        privateMarketsAccess: data.privateMarketsAccess,
        clientsPerAdvisor: data.clientsPerAdvisor,
        taxCoordinationLevel: data.taxCoordinationLevel,
        differentiationText: data.differentiationText,
        concessionsText: data.concessionsText,
        status: 'SUBMITTED',
      },
    })
    console.log(`Created response from: ${advisor.firmName}`)
  }

  // 8. Create ComparisonView for the RFP
  await prisma.comparisonView.create({
    data: {
      rfpId: rfp.id,
      prospectId: prospect.id,
      visibleResponseCount: 3,
      isPaywalled: true,
      paymentStatus: 'UNPAID',
    },
  })
  console.log('Created comparison view')

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
