import { NextRequest, NextResponse } from 'next/server'

const CMA_SOURCES = [
  { brand: 'Tesco', url: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json' },
  { brand: 'Asda', url: 'https://storelocator.asda.com/fuel_prices_data.json' },
  { brand: "Sainsbury's", url: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json' },
  { brand: 'Morrisons', url: 'https://www.morrisons.com/fuel-prices/fuel.json' },
]

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// Smart price normaliser — handles pence*10 integers (Tesco: 1429) AND decimal pence (Sainsburys: 142.9)
function normalisePrice(raw: number | undefined | null): number | null {
  if (!raw || raw <= 0) return null
  if (raw > 500) return raw / 10      // e.g. 1429 → 142.9p
  if (raw > 50)  return raw           // e.g. 142.9 → already in pence
  if (raw > 0)   return raw * 100     // e.g. 1.429 → rare, convert
  return null
}

async function fetchBrand(source: typeof CMA_SOURCES[0]) {
  try {
    const res = await fetch(source.url, {
      next: { revalidate: 900 },
      headers: { 'User-Agent': 'FuelGeniusPro/1.0 (fuel price aggregator)', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const stations = data.stations ?? data.data?.stations ?? data.stationList ?? data ?? []
    if (!Array.isArray(stations)) return []
    return stations.map((s: Record<string, unknown>) => {
      const prices = (s.prices as Record<string, number>) ?? {}
      const loc = (s.location as Record<string, number>) ?? {}
      return {
        id: String(s.site_id ?? s.id ?? s.storeId ?? Math.random()),
        brand: source.brand,
        address: String(s.address ?? s.storeName ?? s.store_name ?? ''),
        postcode: String(s.postcode ?? s.postal_code ?? ''),
        lat: Number(loc.latitude ?? loc.lat ?? s.lat ?? s.latitude ?? 0),
        lng: Number(loc.longitude ?? loc.lng ?? s.lng ?? s.longitude ?? 0),
        petrol: normalisePrice(prices.E10 ?? prices.e10 ?? prices.Unleaded),
        diesel: normalisePrice(prices.B7 ?? prices.b7 ?? prices.Diesel ?? prices.diesel),
        super_unleaded: normalisePrice(prices.E5 ?? prices.e5 ?? prices.SuperUnleaded),
        lastUpdated: new Date().toISOString(),
      }
    })
  } catch (e) {
    console.error(`Failed to fetch ${source.brand}:`, e)
    return []
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '51.752')
  const lng = parseFloat(searchParams.get('lng') || '-1.257')
  const radius = parseFloat(searchParams.get('radius') || '10')

  try {
    // Try Fuel Finder API first
    const clientId = process.env.FUEL_FINDER_CLIENT_ID
    const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET
    const tokenUrl = process.env.FUEL_FINDER_TOKEN_URL
    const apiBase = process.env.FUEL_FINDER_API_BASE

    if (clientId && clientSecret && tokenUrl && apiBase) {
      try {
        const tokenRes = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
          signal: AbortSignal.timeout(5000),
        })
        if (tokenRes.ok) {
          const { access_token } = await tokenRes.json()
          const dataRes = await fetch(`${apiBase}/stations?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`, {
            headers: { Authorization: `Bearer ${access_token}` },
            signal: AbortSignal.timeout(8000),
          })
          if (dataRes.ok) {
            const data = await dataRes.json()
            const stations = data.stations || data
            if (Array.isArray(stations) && stations.length > 0) {
              return NextResponse.json({ stations, source: 'fuel_finder' })
            }
          }
        }
      } catch { /* fall through */ }
    }

    // CMA open data — fetch all brands in parallel
    const results = await Promise.allSettled(CMA_SOURCES.map(fetchBrand))
    const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])

    const nearby = all
      .filter(s => s.lat !== 0 && s.lng !== 0)
      .map(s => ({ ...s, distanceMiles: distanceMiles(lat, lng, s.lat, s.lng) }))
      .filter(s => s.distanceMiles <= radius)
      .sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999))
      .slice(0, 100)

    console.log(`CMA: fetched ${all.length} total, ${nearby.length} within ${radius} miles of ${lat},${lng}`)

    return NextResponse.json({
      stations: nearby,
      source: nearby.length > 0 ? 'cma_open_data' : 'unavailable',
      total: nearby.length,
    })

  } catch (e) {
    console.error('Fuel prices API error:', e)
    return NextResponse.json({ stations: [], source: 'error' }, { status: 500 })
  }
}
