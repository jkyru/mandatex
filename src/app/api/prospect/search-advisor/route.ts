import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

interface BrokerCheckHit {
  _source: {
    ind_source_id?: string
    ind_firstname?: string
    ind_lastname?: string
    ind_middlename?: string
    ind_other_names?: string[]
    ind_bc_scope?: string
    ind_ia_scope?: string
    ind_bc_disclosure_fl?: string
    ind_industry_cal_date_range?: string
    ind_current_employments?: Array<{
      firm_name?: string
      firm_bc_scope?: string
      branch_city?: string
      branch_state?: string
    }>
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, firm, city } = await req.json()
    if (!name || !firm) {
      return NextResponse.json({ error: 'Name and firm are required' }, { status: 400 })
    }

    // Build FINRA BrokerCheck search query
    const query = encodeURIComponent(name.trim())
    const firmFilter = encodeURIComponent(`currEmps=${firm.trim()}`)
    const url = `https://api.brokercheck.finra.org/search/individual?query=${query}&filter=${firmFilter}&hl=true&nrows=12&start=0&r=25&sort=score+desc&wt=json`

    const brokerCheckRes = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!brokerCheckRes.ok) {
      return NextResponse.json({ matches: [], error: 'BrokerCheck unavailable' })
    }

    const data = await brokerCheckRes.json()
    const hits: BrokerCheckHit[] = data?.hits?.hits || []

    // Optionally filter by city if provided
    const cityLower = city?.trim().toLowerCase()

    const matches = await Promise.all(hits.map(async (hit) => {
      const s = hit._source
      const emp = s.ind_current_employments?.[0]
      const fullName = [s.ind_firstname, s.ind_middlename, s.ind_lastname]
        .filter(Boolean)
        .join(' ')
      const location =
        emp?.branch_city && emp?.branch_state
          ? `${emp.branch_city}, ${emp.branch_state}`
          : null

      // Compute years of experience from industry date range
      let yearsExperience: number | null = null
      if (s.ind_industry_cal_date_range) {
        const match = s.ind_industry_cal_date_range.match(/(\d{2})\/(\d{2})\/(\d{4})/)
        if (match) {
          const startYear = parseInt(match[3])
          yearsExperience = new Date().getFullYear() - startYear
        }
      }

      // Fetch real disclosure count from detail endpoint if flagged
      let disclosureCount = 0
      if (s.ind_bc_disclosure_fl === 'Y' && s.ind_source_id) {
        try {
          const detailRes = await fetch(
            `https://api.brokercheck.finra.org/search/individual/${s.ind_source_id}`,
            { headers: { Accept: 'application/json' } }
          )
          if (detailRes.ok) {
            const detailData = await detailRes.json()
            const contentStr = detailData?.hits?.hits?.[0]?._source?.content
            const content = typeof contentStr === 'string' ? JSON.parse(contentStr) : contentStr
            if (content?.disclosures && Array.isArray(content.disclosures)) {
              disclosureCount = content.disclosures.length
            } else {
              disclosureCount = 1 // fallback
            }
          } else {
            disclosureCount = 1 // fallback
          }
        } catch {
          disclosureCount = 1 // fallback
        }
      }

      return {
        crdNumber: s.ind_source_id || null,
        name: fullName,
        firmName: emp?.firm_name || null,
        location,
        city: emp?.branch_city || null,
        state: emp?.branch_state || null,
        disclosureCount,
        yearsExperience,
        registrationStatus: s.ind_bc_scope || null,
        iaStatus: s.ind_ia_scope || null,
      }
    }))

    // Filter by city if provided
    const filtered = cityLower
      ? matches.filter(
          (m) =>
            m.city?.toLowerCase().includes(cityLower.split(',')[0].trim()) ||
            m.location?.toLowerCase().includes(cityLower)
        )
      : matches

    // If city filter yields nothing but we had matches, return all
    const results = cityLower && filtered.length === 0 ? matches : filtered

    return NextResponse.json({ matches: results })
  } catch (e) {
    console.error('Advisor search error:', e)
    return NextResponse.json({ matches: [], error: 'Search failed' })
  }
}
