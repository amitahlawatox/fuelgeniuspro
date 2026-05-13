import { NextRequest, NextResponse } from 'next/server'

// Force this serverless function to run from London (UK) — Gov API blocks non-UK IPs
export const preferredRegion = 'lhr1'
export const maxDuration = 30

const API_BASE  = 'https://www.fuel-finder.service.gov.uk'

// CMA direct feeds as fallback
const CMA_SOURCES = [
  { brand: 'Tesco',        url: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json' },
  { brand: "Sainsbury's",  url: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json' },
  { brand: 'Asda',         url: 'https://storelocator.asda.com/fuel_prices_data.json' },
  { brand: 'Morrisons',    url: 'https://www.morrisons.com/fuel-prices/fuel.json' },
]

let cachedToken: { access_token: string; refresh_token?: string; expires_at: number } | null = null

function now() { return Math.floor(Date.now() / 1000) }

async function getToken(): Promise<string | null> {
  const clientId     = process.env.FUEL_FINDER_CLIENT_ID
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  // Use cached token if still valid (with 30s skew)
  if (cachedToken?.access_token && cachedToken.expires_at > now() + 30) {
    return cachedToken.access_token
  }

  // Try multiple auth formats — gov portal docs show form-encoded, working apps show JSON
  const attempts = [
    // Format 1: JSON no grant_type (Node-RED working code)
    { ct: 'application/json', body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }) },
    // Format 2: JSON with grant_type (dev.to article)
    { ct: 'application/json', body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }) },
    // Format 3: Form-encoded with grant_type (official PDF docs)
    { ct: 'application/x-www-form-urlencoded', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString() },
    // Format 4: Form-encoded with scope
    { ct: 'application/x-www-form-urlencoded', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'fuel_finder' }).toString() },
  ]

  try {
    for (const attempt of attempts) {
      const res = await fetch(`${API_BASE}/api/v1/oauth/generate_access_token`, {
        method:  'POST',
        headers: { 'Content-Type': attempt.ct, Accept: 'application/json' },
        body:    attempt.body,
        signal:  AbortSignal.timeout(10000),
      })
      const text = await res.text()
      console.log(`Token ${res.status} [${attempt.ct.includes('json')?'JSON':'FORM'}]:`, text.slice(0, 300))
      if (!res.ok) continue

      const data = JSON.parse(text)
      cachedToken = {
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_at:    now() + Math.max(60, Number(data.expires_in ?? 3600)),
      }
      return cachedToken.access_token
    }
    return null
  } catch (e) {
    console.error('Token error:', String(e))
    return null
  }
}

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchBatched(path: string, token: string): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = []
  let page = 1
  let lastReq = 0

  while (page <= 40) {
    const gap = Date.now() - lastReq
    if (gap < 700) await sleep(700 - gap)
    lastReq = Date.now()

    const res = await fetch(`${API_BASE}${path}?page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 900 },
    })
    console.log(`${path} page ${page} → ${res.status}`)
    if (!res.ok) break

    const batch: Record<string, unknown>[] = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    results.push(...batch)
    if (batch.length < 500) break
    page++
  }
  return results
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat    = parseFloat(searchParams.get('lat')    || '51.752')
  const lng    = parseFloat(searchParams.get('lng')    || '-1.257')
  const radius = parseFloat(searchParams.get('radius') || '10')

  // 1. Official Gov Fuel Finder (all 8000+ UK stations)
  const token = await getToken()
  if (token) {
    try {
      const [stations, prices] = await Promise.all([
        fetchBatched('/api/v1/pfs', token),
        fetchBatched('/api/v1/pfs/fuel-prices', token),
      ])
      console.log(`Got ${stations.length} stations, ${prices.length} prices`)

      // Build price lookup: node_id → { fuel_type: price }
      const priceMap = new Map<string, Record<string, number>>()
      for (const p of prices) {
        const id = String(p.node_id ?? '')
        if (!id) continue
        const m = priceMap.get(id) ?? {}
        m[String(p.fuel_type ?? '')] = Number(p.price ?? 0)
        priceMap.set(id, m)
      }

      const nearby = stations
        .map(s => {
          const loc = (s.location as Record<string, unknown>) ?? {}
          const am  = (s.amenities as Record<string, boolean>) ?? {}
          const sLat = Number(loc.latitude ?? 0)
          const sLng = Number(loc.longitude ?? 0)
          if (!sLat || !sLng) return null
          const dist = distanceMiles(lat, lng, sLat, sLng)
          if (dist > radius) return null

          const id    = String(s.node_id ?? Math.random())
          const p     = priceMap.get(id) ?? {}
          const brand = String(s.brand_name ?? s.trading_name ?? '')
          const addr  = String(loc.address_line_1 ?? '')
          const pc    = String(loc.postcode ?? '')
          const facs: string[] = []
          if (am.car_wash)               facs.push('car_wash')
          if (am.air_pump_or_screenwash) facs.push('air_water')
          if (am.customer_toilets)       facs.push('toilet')
          if (am.twenty_four_hour_fuel)  facs.push('open_24h')
          if (am.lpg_pumps)              facs.push('lpg')

          return {
            id, brand,
            name:           addr ? `${brand} – ${addr.split(',')[0]}` : `${brand} ${pc}`,
            address:        addr, postcode: pc, lat: sLat, lng: sLng,
            petrol:         p['E10']         ?? p['e10']         ?? null,
            diesel:         p['B7_Standard'] ?? p['B7_STANDARD'] ?? p['B7']  ?? null,
            super_unleaded: p['E5']          ?? p['e5']          ?? null,
            premium_diesel: p['B7_Premium']  ?? p['B7_PREMIUM']  ?? null,
            facilities:     facs,
            lastUpdated:    String(s.last_updated ?? new Date().toISOString()),
            distanceMiles:  dist,
          }
        })
        .filter(Boolean)
        .sort((a, b) => (a!.petrol ?? 999) - (b!.petrol ?? 999))
        .slice(0, 100)

      if (nearby.length > 0) {
        return NextResponse.json({ stations: nearby, source: 'gov_fuel_finder', total: nearby.length })
      }
    } catch (e) {
      console.error('Gov API error:', String(e))
    }
  }

  // 2. CMA fallback
  const results = await Promise.allSettled(CMA_SOURCES.map(async src => {
    try {
      const res = await fetch(src.url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) })
      if (!res.ok) return []
      const data = await res.json()
      const ss: Record<string, unknown>[] = data.stations ?? data.data?.stations ?? []
      return ss.map(s => {
        const pr = (s.prices as Record<string, number>) ?? {}
        const lo = (s.location as Record<string, number>) ?? {}
        const ad = String(s.address ?? s.storeName ?? '')
        const pc = String(s.postcode ?? '')
        const p  = (v?: number) => !v || v <= 0 ? null : v > 500 ? v/10 : v > 50 ? v : null
        return {
          id: String(s.site_id ?? s.id ?? Math.random()), brand: src.brand,
          name: ad ? `${src.brand} – ${ad.split(',')[0]}` : `${src.brand} ${pc}`,
          address: ad, postcode: pc,
          lat:  Number(lo.latitude  ?? lo.lat ?? s.lat ?? 0),
          lng:  Number(lo.longitude ?? lo.lng ?? s.lng ?? 0),
          petrol: p(pr.E10 ?? pr.e10), diesel: p(pr.B7 ?? pr.b7),
          super_unleaded: p(pr.E5 ?? pr.e5), premium_diesel: null,
          facilities: ['parking','convenience','atm','toilet'],
          lastUpdated: new Date().toISOString(),
        }
      })
    } catch { return [] }
  }))

  const all    = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  const nearby = all
    .filter(s => s.lat && s.lng)
    .map(s => ({ ...s, distanceMiles: distanceMiles(lat, lng, Number(s.lat), Number(s.lng)) }))
    .filter(s => s.distanceMiles <= radius)
    .sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999))
    .slice(0, 100)

  return NextResponse.json({ stations: nearby, source: 'cma_direct', total: nearby.length })
}
