import { NextRequest, NextResponse } from 'next/server'

/**
 * Official UK Government Fuel Finder API
 * Base: https://api.fuelfinder.service.gov.uk/v1
 * Auth: POST form-encoded with scope
 * Covers ALL 8,000+ UK stations — BP, Shell, Esso, Tesco, Asda, Morrisons etc.
 * Prices are in pence (e.g. 142.9 = 142.9p/litre) — NO conversion needed
 */

const API_BASE  = process.env.FUEL_FINDER_API_BASE  || 'https://api.fuelfinder.service.gov.uk/v1'
const TOKEN_URL = process.env.FUEL_FINDER_TOKEN_URL || 'https://api.fuelfinder.service.gov.uk/v1/oauth/generate_access_token'

// CMA direct supermarket feeds as fallback
const CMA_SOURCES = [
  { brand: 'Tesco',        url: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json' },
  { brand: "Sainsbury's",  url: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json' },
  { brand: 'Asda',         url: 'https://storelocator.asda.com/fuel_prices_data.json' },
  { brand: 'Morrisons',    url: 'https://www.morrisons.com/fuel-prices/fuel.json' },
]

let cachedToken: { token: string; expires: number } | null = null

async function getToken(): Promise<string | null> {
  const clientId     = process.env.FUEL_FINDER_CLIENT_ID
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET
  if (!clientId || !clientSecret) { console.log('No Fuel Finder credentials'); return null }
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token

  try {
    // Auth is FORM-ENCODED per official docs
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'fuel_finder',
      }),
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()
    console.log(`Token response ${res.status}:`, text.slice(0, 200))
    if (!res.ok) return null

    const data = JSON.parse(text)
    cachedToken = {
      token:   data.access_token,
      expires: Date.now() + ((data.expires_in ?? 3600) - 120) * 1000,
    }
    return cachedToken.token
  } catch (e) {
    console.error('Token error:', e)
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

// Map real amenities from Gov API response
function mapAmenities(amenities: Record<string, boolean> = {}): string[] {
  const map: Record<string, string> = {
    car_wash:             'car_wash',
    air_pump_or_screenwash: 'air_water',
    water_filling:        'air_water',
    customer_toilets:     'toilet',
    twenty_four_hour_fuel:'open_24h',
    lpg_pumps:            'lpg',
    adblue_pumps:         'adblue',
  }
  return Object.entries(amenities)
    .filter(([, v]) => v === true)
    .map(([k]) => map[k])
    .filter(Boolean)
}

// Map official API station response to our format
// Official fields: node_id, trading_name, brand_name, location{address_line_1, postcode, latitude, longitude}, amenities{...}
// Fuel prices: fuel_prices[]{fuel_type, price, price_last_updated}
function mapGovStation(s: Record<string, unknown>, lat: number, lng: number) {
  const loc      = (s.location as Record<string, unknown>) ?? {}
  const amenities= (s.amenities as Record<string, boolean>) ?? {}
  const fuelPrices = (s.fuel_prices as Array<Record<string, unknown>>) ?? []

  const sLat = Number(loc.latitude  ?? 0)
  const sLng = Number(loc.longitude ?? 0)
  const brand = String(s.brand_name ?? s.trading_name ?? '')
  const address = [loc.address_line_1, loc.address_line_2].filter(Boolean).join(', ')
  const postcode = String(loc.postcode ?? '')

  // Prices: already in pence (e.g. 142.9)
  const getPrice = (type: string) => {
    const fp = fuelPrices.find(f => String(f.fuel_type).toLowerCase() === type.toLowerCase())
    return fp ? Number(fp.price) : null
  }

  return {
    id:             String(s.node_id ?? s.id ?? Math.random()),
    name:           address ? `${brand} – ${String(loc.address_line_1 ?? '').split(',')[0]}` : `${brand} ${postcode}`,
    brand,
    address,
    postcode,
    lat:            sLat,
    lng:            sLng,
    petrol:         getPrice('E10'),
    diesel:         getPrice('B7_Standard'),
    super_unleaded: getPrice('E5'),
    premium_diesel: getPrice('B7_Premium'),
    facilities:     mapAmenities(amenities),
    lastUpdated:    String(fuelPrices[0]?.price_last_updated ?? new Date().toISOString()),
    distanceMiles:  distanceMiles(lat, lng, sLat, sLng),
  }
}

async function fetchGovData(token: string, lat: number, lng: number, radius: number) {
  // Try combined endpoint first, then separate PFS + prices
  const endpoints = [
    `${API_BASE}/pfs?lat=${lat}&lng=${lng}&radius=${radius}&include_prices=true`,
    `${API_BASE}/stations?lat=${lat}&lng=${lng}&radius=${radius}`,
    `${API_BASE}/prices?lat=${lat}&lng=${lng}&radius=${radius}`,
    `${API_BASE}/pfs`,  // paginated all-stations fallback
  ]

  for (const url of endpoints) {
    try {
      console.log('Trying endpoint:', url)
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal:  AbortSignal.timeout(10000),
        next:    { revalidate: 900 },
      })
      console.log(`${url} → ${res.status}`)
      if (!res.ok) continue

      const data = await res.json()
      // Handle various response shapes
      const raw: Record<string, unknown>[] =
        data.stations ?? data.pfs ?? data.data ?? data.results ??
        (Array.isArray(data) ? data : [])

      if (!Array.isArray(raw) || raw.length === 0) continue

      const stations = raw
        .map(s => mapGovStation(s, lat, lng))
        .filter(s => s.lat && s.lng)
        .filter(s => url.includes('lat=') ? true : s.distanceMiles <= radius)
        .sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999))
        .slice(0, 100)

      console.log(`Got ${stations.length} stations from ${url}`)
      if (stations.length > 0) return { stations, endpoint: url }
    } catch (e) {
      console.error('Endpoint failed:', url, e)
    }
  }
  return { stations: [], endpoint: null }
}

// Fallback: CMA direct supermarket feeds
function normalisePrice(raw: number | undefined | null): number | null {
  if (!raw || raw <= 0) return null
  if (raw > 500) return raw / 10
  if (raw > 50)  return raw
  return null
}

async function fetchCMABrand(source: typeof CMA_SOURCES[0]) {
  try {
    const res = await fetch(source.url, {
      next: { revalidate: 900 },
      headers: { 'User-Agent': 'FuelGeniusPro/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const stations: Record<string, unknown>[] = data.stations ?? data.data?.stations ?? []
    return stations.map(s => {
      const prices  = (s.prices as Record<string, number>) ?? {}
      const loc     = (s.location as Record<string, number>) ?? {}
      const address = String(s.address ?? s.storeName ?? '')
      const postcode = String(s.postcode ?? '')
      return {
        id:             String(s.site_id ?? s.id ?? Math.random()),
        name:           address ? `${source.brand} – ${address.split(',')[0]}` : `${source.brand} ${postcode}`,
        brand:          source.brand,
        address, postcode,
        lat:            Number(loc.latitude ?? loc.lat ?? s.lat ?? 0),
        lng:            Number(loc.longitude ?? loc.lng ?? s.lng ?? 0),
        petrol:         normalisePrice(prices.E10 ?? prices.e10),
        diesel:         normalisePrice(prices.B7  ?? prices.b7),
        super_unleaded: normalisePrice(prices.E5  ?? prices.e5),
        premium_diesel: null,
        facilities:     ['parking', 'convenience', 'atm', 'toilet'],
        lastUpdated:    new Date().toISOString(),
      }
    })
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat    = parseFloat(searchParams.get('lat')    || '51.752')
  const lng    = parseFloat(searchParams.get('lng')    || '-1.257')
  const radius = parseFloat(searchParams.get('radius') || '10')

  // 1. Official Gov Fuel Finder
  const token = await getToken()
  if (token) {
    const { stations, endpoint } = await fetchGovData(token, lat, lng, radius)
    if (stations.length > 0) {
      return NextResponse.json({ stations, source: 'gov_fuel_finder', endpoint, total: stations.length })
    }
  }

  // 2. CMA direct feeds fallback
  console.log('Falling back to CMA direct feeds')
  const results  = await Promise.allSettled(CMA_SOURCES.map(fetchCMABrand))
  const all      = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  const nearby   = all
    .filter(s => s.lat && s.lng)
    .map(s => ({ ...s, distanceMiles: distanceMiles(lat, lng, Number(s.lat), Number(s.lng)) }))
    .filter(s => s.distanceMiles <= radius)
    .sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999))
    .slice(0, 100)

  return NextResponse.json({ stations: nearby, source: 'cma_direct', total: nearby.length })
}
