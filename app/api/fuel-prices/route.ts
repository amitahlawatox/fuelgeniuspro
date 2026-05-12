import { NextRequest, NextResponse } from 'next/server'
import { MOCK_STATIONS } from '@/lib/mockData'

let cachedToken: { token: string; expires: number } | null = null

async function getFuelFinderToken(): Promise<string | null> {
  const clientId = process.env.FUEL_FINDER_CLIENT_ID
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET
  const tokenUrl = process.env.FUEL_FINDER_TOKEN_URL

  if (!clientId || !clientSecret || !tokenUrl) return null
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
  return cachedToken.token
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = searchParams.get('lat') || '51.5074'
    const lng = searchParams.get('lng') || '-0.1278'
    const radius = searchParams.get('radius') || '5'

    const token = await getFuelFinderToken()
    const apiBase = process.env.FUEL_FINDER_API_BASE

    if (!token || !apiBase) {
      // Fall back to mock data
      return NextResponse.json({ stations: MOCK_STATIONS, source: 'mock' })
    }

    const res = await fetch(`${apiBase}/stations?lat=${lat}&lng=${lng}&radius=${radius}&fuel_types=E10,B7`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ stations: MOCK_STATIONS, source: 'mock' })
    }

    const data = await res.json()
    return NextResponse.json({ stations: data.stations || data, source: 'live' })
  } catch (e) {
    console.error('Fuel prices route error:', e)
    return NextResponse.json({ stations: MOCK_STATIONS, source: 'mock' })
  }
}
