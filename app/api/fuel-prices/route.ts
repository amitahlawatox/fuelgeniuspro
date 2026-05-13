import { NextRequest, NextResponse } from 'next/server'

// Official UK Government Fuel Finder API
// https://www.fuel-finder.service.gov.uk/api/v1
// Covers ALL 8,000+ UK stations — BP, Shell, Esso, Tesco, Asda, Sainsbury's, independents etc.

const GOV_API_BASE  = 'https://www.fuel-finder.service.gov.uk/api/v1'
const GOV_TOKEN_URL = 'https://www.fuel-finder.service.gov.uk/api/v1/oauth/generate_access_token'

// CMA supermarket feeds as fallback
const CMA_SOURCES = [
  { brand: 'Tesco',        url: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json' },
  { brand: "Sainsbury's",  url: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json' },
  { brand: 'Asda',         url: 'https://storelocator.asda.com/fuel_prices_data.json' },
  { brand: 'Morrisons',    url: 'https://www.morrisons.com/fuel-prices/fuel.json' },
]

const BRAND_FACILITIES: Record<string, string[]> = {
  'Tesco':        ['parking','convenience','atm','toilet','car_wash'],
  "Sainsbury's":  ['parking','convenience','atm','toilet'],
  'Asda':         ['parking','convenience','atm','toilet','car_wash'],
  'Morrisons':    ['parking','convenience','atm','toilet','car_wash'],
  'BP':           ['convenience','air_water','toilet','ev_charging','car_wash','wifi'],
  'Shell':        ['convenience','air_water','toilet','ev_charging','car_wash','wifi'],
  'Esso':         ['convenience','air_water','toilet'],
  'Jet':          ['air_water'],
  'Gulf':         ['air_water','convenience'],
  'Texaco':       ['air_water','convenience'],
  'Co-op':        ['convenience','atm'],
}

// Token cache
let cachedToken: { token: string; expires: number } | null = null

async function getGovToken(): Promise<string | null> {
  const clientId     = process.env.FUEL_FINDER_CLIENT_ID
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token

  try {
    // Government API uses JSON body (not form-encoded)
    const res = await fetch(GOV_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error('Gov token error:', res.status, await res.text())
      return null
    }
    const data = await res.json()
    cachedToken = {
      token:   data.access_token,
      expires: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
    }
    return cachedToken.token
  } catch (e) {
    console.error('Gov token fetch failed:', e)
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

function normalisePrice(raw: number | undefined | null): number | null {
  if (!raw || raw <= 0) return null
  if (raw > 500)  return raw / 10
  if (raw > 50)   return raw
  if (raw > 0.5)  return raw * 100
  return null
}

function mapGovStation(s: Record<string, unknown>, lat: number, lng: number) {
  const loc    = (s.location as Record<string,number>) ?? {}
  const prices = (s.prices as Record<string,number>)   ?? {}
  const sLat   = Number(loc.latitude  ?? loc.lat ?? 0)
  const sLng   = Number(loc.longitude ?? loc.lng ?? 0)
  const brand  = String(s.brand ?? s.operator ?? '')
  const address = String(s.address ?? s.site_address ?? '')
  const postcode = String(s.postcode ?? '')

  return {
    id:             String(s.site_id ?? s.id ?? Math.random()),
    name:           address ? `${brand} – ${address.split(',')[0]}` : `${brand} ${postcode}`,
    brand,
    address,
    postcode,
    lat:            sLat,
    lng:            sLng,
    petrol:         normalisePrice(prices.E10  ?? prices.e10),
    diesel:         normalisePrice(prices.B7   ?? prices.b7),
    super_unleaded: normalisePrice(prices.E5   ?? prices.e5),
    premium_diesel: normalisePrice(prices.SDV  ?? prices.sdv),
    facilities:     BRAND_FACILITIES[brand] ?? ['air_water'],
    lastUpdated:    String(s.last_updated ?? s.updated_at ?? new Date().toISOString()),
    distanceMiles:  distanceMiles(lat, lng, sLat, sLng),
  }
}

async function fetchGovStations(token: string, lat: number, lng: number, radius: number) {
  // Fetch pages until we have enough nearby stations
  const stations = []
  let page = 1
  const maxPages = 20 // ~10,000 stations max

  while (page <= maxPages) {
    try {
      const res = await fetch(`${GOV_API_BASE}/pfs?page=${page}&per_page=500`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
        next: { revalidate: 900 },
      })
      if (!res.ok) {
        console.error(`Gov API page ${page} error:`, res.status)
        break
      }
      const data = await res.json()
      const pageStations: Record<string,unknown>[] = data.stations ?? data.data ?? data ?? []
      
      if (!Array.isArray(pageStations) || pageStations.length === 0) break

      const nearby = pageStations
        .map(s => mapGovStation(s, lat, lng))
        .filter(s => s.lat && s.lng && s.distanceMiles <= radius)

      stations.push(...nearby)
      console.log(`Page ${page}: ${pageStations.length} stations, ${nearby.length} nearby, total: ${stations.length}`)

      // If this page had no nearby stations and we've already found some, we can likely stop
      if (nearby.length === 0 && stations.length > 0 && page > 3) break
      if (pageStations.length < 500) break // Last page
      page++
    } catch (e) {
      console.error(`Gov API page ${page} failed:`, e)
      break
    }
  }

  return stations.sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999)).slice(0, 100)
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
    const stations: Record<string,unknown>[] = data.stations ?? data.data?.stations ?? []
    return stations.map(s => {
      const prices  = (s.prices as Record<string,number>) ?? {}
      const loc     = (s.location as Record<string,number>) ?? {}
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
        premium_diesel: normalisePrice(prices.SDV ?? prices.sdv),
        facilities:     BRAND_FACILITIES[source.brand] ?? ['air_water'],
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

  // 1. Try Official Government Fuel Finder API (all 8,000+ stations)
  const token = await getGovToken()
  if (token) {
    console.log('Using Official Gov Fuel Finder API')
    const stations = await fetchGovStations(token, lat, lng, radius)
    if (stations.length > 0) {
      return NextResponse.json({ stations, source: 'gov_fuel_finder', total: stations.length })
    }
    console.log('Gov API returned 0 nearby stations, falling back to CMA direct feeds')
  }

  // 2. Fallback: CMA direct supermarket feeds
  console.log('Using CMA direct feeds fallback')
  const results  = await Promise.allSettled(CMA_SOURCES.map(fetchCMABrand))
  const all      = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  const nearby   = all
    .filter(s => s.lat && s.lng)
    .map(s => ({ ...s, distanceMiles: distanceMiles(lat, lng, s.lat, s.lng) }))
    .filter(s => s.distanceMiles <= radius)
    .sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999))
    .slice(0, 100)

  return NextResponse.json({
    stations: nearby,
    source:   nearby.length > 0 ? 'cma_direct' : 'unavailable',
    total:    nearby.length,
  })
}
