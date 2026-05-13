import { NextRequest, NextResponse } from 'next/server'

// UK CMA Mandatory Open Data sources — no auth needed
const CMA_SOURCES = [
  { brand: 'Tesco', url: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json' },
  { brand: 'Asda', url: 'https://storelocator.asda.com/fuel_prices_data.json' },
  { brand: "Sainsbury's", url: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json' },
  { brand: 'Morrisons', url: 'https://www.morrisons.com/fuel-prices/fuel.json' },
]

interface CMAStation {
  site_id: string
  brand: string
  address: string
  postcode: string
  location: { latitude: number; longitude: number }
  prices: { E10?: number; B7?: number; SDV?: number; E5?: number }
}

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

async function fetchBrand(source: typeof CMA_SOURCES[0]): Promise<CMAStation[]> {
  try {
    const res = await fetch(source.url, { next: { revalidate: 900 }, headers: { 'User-Agent': 'FuelGeniusPro/1.0' } })
    if (!res.ok) return []
    const data = await res.json()
    // Different brands have slightly different schemas
    const stations = data.stations || data.data?.stations || data.stationList || []
    return stations.map((s: Record<string, unknown>) => ({
      site_id: String(s.site_id || s.id || s.storeId || Math.random()),
      brand: source.brand,
      address: String(s.address || s.storeName || ''),
      postcode: String(s.postcode || s.postal_code || ''),
      location: {
        latitude: Number((s.location as Record<string,unknown>)?.latitude ?? s.lat ?? s.latitude ?? 0),
        longitude: Number((s.location as Record<string,unknown>)?.longitude ?? s.lng ?? s.longitude ?? 0),
      },
      prices: (s.prices as Record<string,number>) || {},
    }))
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '51.5074')
  const lng = parseFloat(searchParams.get('lng') || '-0.1278')
  const radius = parseFloat(searchParams.get('radius') || '5')

  try {
    // Try Fuel Finder API first if credentials exist
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
        })
        if (tokenRes.ok) {
          const { access_token } = await tokenRes.json()
          const dataRes = await fetch(`${apiBase}/stations?lat=${lat}&lng=${lng}&radius=${radius}`, {
            headers: { Authorization: `Bearer ${access_token}` },
          })
          if (dataRes.ok) {
            const data = await dataRes.json()
            return NextResponse.json({ stations: data.stations || data, source: 'fuel_finder' })
          }
        }
      } catch { /* fall through to CMA */ }
    }

    // Fall back to CMA open data
    const allResults = await Promise.allSettled(CMA_SOURCES.map(fetchBrand))
    const allStations: CMAStation[] = allResults.flatMap(r => r.status === 'fulfilled' ? r.value : [])

    // Filter by radius and shape into our format
    const nearby = allStations
      .filter(s => s.location.latitude && s.location.longitude)
      .map(s => ({
        ...s,
        distanceMiles: distanceMiles(lat, lng, s.location.latitude, s.location.longitude)
      }))
      .filter(s => s.distanceMiles <= radius)
      .sort((a, b) => (a.prices.E10 ?? 999) - (b.prices.E10 ?? 999))
      .slice(0, 50)
      .map(s => ({
        id: s.site_id,
        name: `${s.brand} ${s.postcode}`,
        brand: s.brand,
        address: s.address,
        postcode: s.postcode,
        lat: s.location.latitude,
        lng: s.location.longitude,
        petrol: s.prices.E10 ? s.prices.E10 / 10 : null,   // CMA data is in pence*10
        diesel: s.prices.B7 ? s.prices.B7 / 10 : null,
        super_unleaded: s.prices.E5 ? s.prices.E5 / 10 : null,
        lastUpdated: new Date().toISOString(),
        distanceMiles: s.distanceMiles,
      }))

    if (nearby.length > 0) {
      return NextResponse.json({ stations: nearby, source: 'cma_open_data' })
    }
  } catch (e) {
    console.error('Fuel prices error:', e)
  }

  // Final fallback: return empty so client uses its own mock
  return NextResponse.json({ stations: [], source: 'unavailable' })
}
