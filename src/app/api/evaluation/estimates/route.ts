import { NextResponse } from 'next/server'
import { getAllEstimates } from '@/lib/benchmarks'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const assetsRange = searchParams.get('assetsRange')

  if (!assetsRange) {
    return NextResponse.json({ error: 'assetsRange is required' }, { status: 400 })
  }

  const estimates = getAllEstimates(assetsRange)
  return NextResponse.json(estimates)
}
