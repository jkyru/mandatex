import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

const NORMALIZATION_PROMPT = `You are a neutral financial data processor. Your job is to extract structured, comparable facts from free-form advisor proposal text. You must NEVER rank, recommend, editorialize, or use superlatives. Extract only what is explicitly stated.

For each advisor response, extract the following JSON structure from the three free-form fields provided:

{
  "privateMarkets": {
    "assetClasses": string[],       // e.g. ["Private Equity", "Venture Capital", "Private Credit", "Real Estate"]
    "minimumInvestment": string | null,  // e.g. "$250,000" or null if not stated
    "accessType": string | null,         // e.g. "Direct", "Feeder fund", "Co-invest", or null
    "additionalDetails": string | null   // any other factual detail stated, or null
  },
  "differentiation": {
    "teamSize": string | null,           // e.g. "12 professionals" or null
    "yearsExperience": string | null,    // e.g. "25+ years" or null
    "certifications": string[],          // e.g. ["CFA", "CFP", "CAIA"]
    "specializations": string[],        // e.g. ["tech executives", "business owners"]
    "keyCapabilities": string[]         // factual capabilities mentioned, max 4
  },
  "concessions": {
    "feeDiscounts": string | null,       // e.g. "25bps reduction on AUM above $10M"
    "waivedMinimums": string | null,     // e.g. "No account minimum for first year"
    "specialTerms": string | null,       // any other concession stated
    "isPermanent": boolean | null        // true if permanent, false if time-limited, null if unclear
  }
}

Rules:
- Only include information explicitly stated in the text
- Use null for anything not mentioned
- Never infer, assume, or embellish
- Keep extracted strings concise and factual
- Return valid JSON only, no commentary`

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rfpId } = await req.json()
  if (!rfpId) {
    return NextResponse.json({ error: 'Missing rfpId' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI normalization not configured. Add ANTHROPIC_API_KEY to .env' }, { status: 500 })
  }

  const responses = await prisma.advisorResponse.findMany({
    where: { rfpId },
    include: { advisor: true },
  })

  if (responses.length === 0) {
    return NextResponse.json({ error: 'No responses found' }, { status: 404 })
  }

  // Only normalize responses that haven't been normalized yet
  const toNormalize = responses.filter((r) => !r.normalizedData)

  if (toNormalize.length === 0) {
    // All already normalized, return existing data
    const normalized = responses.map((r) => ({
      responseId: r.id,
      normalizedData: JSON.parse(r.normalizedData || '{}'),
    }))
    return NextResponse.json({ normalized })
  }

  const client = new Anthropic({ apiKey })

  const results = []

  for (const r of toNormalize) {
    const userMessage = `Normalize the following advisor proposal fields:

FIRM: ${r.advisor.firmName}

PRIVATE MARKETS ACCESS:
${r.privateMarketsAccess || '(Not provided)'}

DIFFERENTIATION / VALUE PROPOSITION:
${r.differentiationText}

FEE CONCESSIONS:
${r.concessionsText || '(Not provided)'}`

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: NORMALIZATION_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      })

      const text = response.content.find((b) => b.type === 'text')
      if (text && text.type === 'text') {
        // Strip markdown code fences if present
        let jsonStr = text.text.trim()
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        const parsed = JSON.parse(jsonStr)

        await prisma.advisorResponse.update({
          where: { id: r.id },
          data: { normalizedData: JSON.stringify(parsed) },
        })

        results.push({ responseId: r.id, normalizedData: parsed })
      }
    } catch (err) {
      console.error(`Failed to normalize response ${r.id}:`, err)
      results.push({ responseId: r.id, error: 'Normalization failed' })
    }
  }

  // Include already-normalized ones
  for (const r of responses) {
    if (r.normalizedData && !results.find((x) => x.responseId === r.id)) {
      results.push({ responseId: r.id, normalizedData: JSON.parse(r.normalizedData) })
    }
  }

  return NextResponse.json({ normalized: results })
}
