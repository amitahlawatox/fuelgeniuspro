import { NextRequest, NextResponse } from 'next/server'

/**
 * Official UK Government Fuel Finder API
 * Base: https://www.fuel-finder.service.gov.uk
 * Token: POST /api/v1/oauth/generate_access_token — JSON body, NO scope
 * Stations: GET /api/v1/pfs?page=N — paginated, all UK stations
 * Prices:   GET /api/v1/pfs/fuel-prices?page=N — paginated, all prices
 * Rate limit: 100 req/min — fetch paginated, cache results
 */

const API_BASE  = 'https://www.fuel-finder.service.gov.uk'
const TOKEN_URL = `${API_BASE}/api/v1/oauth/generate_access_token`

// CMA supermarket direct feeds as fallback
const CMA_SOURCES = [
  { brand: 'Tesco',        url: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json' },
  { brand: "Sainsbury's",  url: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json' },
  { brand: 'Asda',         url: 'https://storelocator.asda.com/fuel_prices_data.json' },
  { brand: 'Morrisons',    url: 'https://www.morrisons.com/fuel-prices/fuel.json' },
]

// Token cache
let cachedToken: { token: string; expires: number } | null = null

async function getToken(): Promise<string | null> {
  const clientId     = process.env.FUEL_FINDER_CLIENT_ID
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token

  try {
    // Auth uses JSON body — no scope parameter
    const res = await fetch(TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()
    console.log(`Token ${res.status}:`, text.slice(0, 150))
    if (!res.ok) return null

    const data = JSON.parse(text)
    cachedToken = {
      token:   data.access_token,
      expires: Date.now() + ((data.expires_in ?? 3600) - 120) * 1000,
    }
    return cachedToken.token
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

// Fetch all paginated pages from an endpoint
async function fetchAllPages(endpoint: string, token: string): Promise<Record<string,unknown>[]> {
  const results: Record<string,unknown>[] = []
  let page = 1
  let lastReq = 0

  while (true) {
    const elapsed = Date.now() - lastReq
    if (elapsed < 700) await sleep(700 - elapsed) // respect 100 RPM limit
    lastReq = Date.now()

    const res = await fetch(`${API_BASE}${endpoint}?page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal:  AbortSignal.timeout(10000),
      next:    { revalidate: 900 },
    })
    console.log(`GET ${endpoint} page ${page} → ${res.status}`)
    if (!res.ok) break

    const data = await res.json()
    // Handle response shape: items array or direct array
    const items: Record<string,unknown>[] = data.items ?? data.data ?? (Array.isArray(data) ? data : [])
    if (items.length === 0) break

    results.push(...items)
    if (!data.next_page && !data.hasMore && items.length < 500) break
    page++

    // Safety: stop after 40 pages (~20k stations)
    if (page > 40) break
  }
  return results
}

function mapAmenities(a: Record<string, boolean> = {}) {
  const r: string[] = []
  if (a.car_wash)               r.push('car_wash')
  if (a.air_pump_or_screenwash) r.push('air_water')
  if (a.water_filling)          r.push('air_water')
  if (a.customer_toilets)       r.push('toilet')
  if (a.twenty_four_hour_fuel)  r.push('open_24h')
  if (a.lpg_pumps)              r.push('lpg')
  return [...new Set(r)]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat    = parseFloat(searchParams.get('lat')    || '51.752')
  const lng    = parseFloat(searchParams.get('lng')    || '-1.257')
  const radius = parseFloat(searchParams.get('radius') || '10')

  // 1. Official Gov Fuel Finder API
  const token = await getToken()
  if (token) {
    try {
      // Fetch stations and prices concurrently
      const [stationsRaw, pricesRaw] = await Promise.all([
        fetchAllPages('/api/v1/pfs', token),
        fetchAllPages('/api/v1/pfs/fuel-prices', token),
      ])
      console.log(`Gov API: ${stationsRaw.length} stations, ${pricesRaw.length} price records`)

      // Build price lookup by node_id
      const priceMap = new Map<string, Record<string, number>>()
      for (const p of pricesRaw) {
        const nodeId = String(p.node_id ?? '')
        if (!nodeId) continue
        const existing = priceMap.get(nodeId) ?? {}
        // Each record has fuel_type + price
        const fuelType = String(p.fuel_type ?? '')
        const price    = Number(p.price ?? 0)
        if (fuelType && price) existing[fuelType] = price
        priceMap.set(nodeId, existing)
      }

      // Filter stations within radius
      const nearby = stationsRaw
        .map(s => {
          const loc      = (s.location as Record<string,unknown>) ?? {}
          const amenities= (s.amenities as Record<string,boolean>) ?? {}
          const sLat     = Number(loc.latitude  ?? 0)
          const sLng     = Number(loc.longitude ?? 0)
          if (!sLat || !sLng) return null

          const dist = distanceMiles(lat, lng, sLat, sLng)
          if (dist > radius) return null

          const nodeId = String(s.node_id ?? '')
          const prices = priceMap.get(nodeId) ?? {}
          const brand  = String(s.brand_name ?? s.trading_name ?? '')
          const addr1  = String(loc.address_line_1 ?? '')
          const postcode = String(loc.postcode ?? '')

          return {
            id:             nodeId || String(Math.random()),
            name:           addr1 ? `${brand} – ${addr1.split(',')[0]}` : `${brand} ${postcode}`,
            brand,
            address:        [addr1, loc.address_line_2].filter(Boolean).join(', '),
            postcode,
            lat:            sLat,
            lng:            sLng,
            petrol:         prices['E10']         ?? prices['e10']         ?? null,
            diesel:         prices['B7_Standard'] ?? prices['B7_STANDARD'] ?? null,
            super_unleaded: prices['E5']          ?? prices['e5']          ?? null,
            premium_diesel: prices['B7_Premium']  ?? prices['B7_PREMIUM']  ?? null,
            facilities:     mapAmenities(amenities),
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
      console.log('Gov API returned 0 nearby stations')
    } catch (e) {
      console.error('Gov API error:', String(e))
    }
  }

  // 2. CMA direct feeds fallback
  const results = await Promise.allSettled(CMA_SOURCES.map(async source => {
    try {
      const res = await fetch(source.url, {
        next: { revalidate: 900 },
        headers: { 'User-Agent': 'FuelGeniusPro/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return []
      const data = await res.json()
      const stations: Record<string,unknown>[] = data.stations ?? data.data?.stations ?? []
      return stations.map(s => {
        const prices = (s.prices as Record<string,number>) ?? {}
        const loc    = (s.location as Record<string,number>) ?? {}
        const addr   = String(s.address ?? s.storeName ?? '')
        const pc     = String(s.postcode ?? '')
        const sLat   = Number(loc.latitude ?? loc.lat ?? s.lat ?? 0)
        const sLng   = Number(loc.longitude ?? loc.lng ?? s.lng ?? 0)
        const p = (v: number | undefined) => (!v || v <= 0) ? null : v > 500 ? v/10 : v > 50 ? v : null
        return {
          id: String(s.site_id ?? s.id ?? Math.random()),
          name: addr ? `${source.brand} – ${addr.split(',')[0]}` : `${source.brand} ${pc}`,
          brand: source.brand, address: addr, postcode: pc,
          lat: sLat, lng: sLng,
          petrol: p(prices.E10 ?? prices.e10),
          diesel: p(prices.B7  ?? prices.b7),
          super_unleaded: p(prices.E5 ?? prices.e5),
          premium_diesel: null,
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
