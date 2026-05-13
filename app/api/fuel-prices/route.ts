import { NextRequest, NextResponse } from 'next/server'

const CMA_SOURCES = [
  { brand: 'Tesco',        url: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json' },
  { brand: "Sainsbury's",  url: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json' },
  { brand: 'Asda',         url: 'https://storelocator.asda.com/fuel_prices_data.json' },
  { brand: 'Morrisons',    url: 'https://www.morrisons.com/fuel-prices/fuel.json' },
  { brand: 'BP',           url: 'https://www.bp.com/content/dam/bp/business-sites/en/global/corporate/pdfs/energy-economics/statistical-review/bp-stats-review-2022-full-report.pdf' },
]

// Brand-to-facilities mapping (best effort — CMA feed doesn't include facilities)
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
  'default':      ['air_water'],
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
  if (raw > 500)  return raw / 10   // 1429 → 142.9p
  if (raw > 50)   return raw        // 142.9 → already pence
  if (raw > 0.5)  return raw * 100  // 1.429 → 142.9p
  return null
}

async function fetchBrand(source: { brand: string; url: string }) {
  try {
    const res = await fetch(source.url, {
      next: { revalidate: 900 },
      headers: { 'User-Agent': 'FuelGeniusPro/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) { console.log(`${source.brand}: HTTP ${res.status}`); return [] }

    const data = await res.json()

    // Handle various response shapes across retailers
    const stations: Record<string,unknown>[] =
      data.stations ?? data.data?.stations ?? data.stationList ??
      (Array.isArray(data) ? data : [])

    if (!Array.isArray(stations) || stations.length === 0) {
      console.log(`${source.brand}: no stations in response`)
      return []
    }

    console.log(`${source.brand}: ${stations.length} stations fetched`)

    return stations.map((s) => {
      const prices = (s.prices as Record<string,number>) ?? {}
      const loc    = (s.location as Record<string,number>) ?? {}

      const lat = Number(loc.latitude  ?? loc.lat ?? s.lat ?? s.latitude  ?? 0)
      const lng = Number(loc.longitude ?? loc.lng ?? s.lng ?? s.longitude ?? 0)

      // Build a readable name
      const rawAddress = String(s.address ?? s.storeName ?? s.store_name ?? '')
      const postcode   = String(s.postcode ?? s.postal_code ?? '')
      const name       = rawAddress
        ? `${source.brand} – ${rawAddress.split(',')[0]}`
        : `${source.brand} ${postcode}`

      return {
        id:             String(s.site_id ?? s.id ?? s.storeId ?? `${source.brand}-${Math.random()}`),
        name,
        brand:          source.brand,
        address:        rawAddress,
        postcode,
        lat, lng,
        petrol:         normalisePrice(prices.E10  ?? prices.e10  ?? prices.Unleaded   ?? (prices as Record<string,number>)['unleaded']),
        diesel:         normalisePrice(prices.B7   ?? prices.b7   ?? prices.Diesel     ?? (prices as Record<string,number>)['diesel']),
        super_unleaded: normalisePrice(prices.E5   ?? prices.e5   ?? prices.SuperUnleaded ?? prices.super),
        premium_diesel: normalisePrice(prices.SDV  ?? prices.sdv  ?? prices.PremiumDiesel),
        facilities:     BRAND_FACILITIES[source.brand] ?? BRAND_FACILITIES['default'],
        lastUpdated:    new Date().toISOString(),
      }
    })
  } catch (e) {
    console.error(`${source.brand} fetch failed:`, e)
    return []
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat    = parseFloat(searchParams.get('lat')    || '51.752')
  const lng    = parseFloat(searchParams.get('lng')    || '-1.257')
  const radius = parseFloat(searchParams.get('radius') || '10')

  // 1. Try Fuel Finder first (covers ALL brands incl. BP, Shell, Esso)
  const clientId     = process.env.FUEL_FINDER_CLIENT_ID
  const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET
  const tokenUrl     = process.env.FUEL_FINDER_TOKEN_URL
  const apiBase      = process.env.FUEL_FINDER_API_BASE

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
          const fuelFinderStations = data.stations || data
          if (Array.isArray(fuelFinderStations) && fuelFinderStations.length > 0) {
            // Add facilities to Fuel Finder stations too
            const enriched = fuelFinderStations.map((s: Record<string,unknown>) => ({
              ...s,
              facilities: BRAND_FACILITIES[String(s.brand ?? '')] ?? BRAND_FACILITIES['default'],
            }))
            return NextResponse.json({ stations: enriched, source: 'fuel_finder' })
          }
        }
      }
    } catch { /* fall through */ }
  }

  // 2. CMA open data — fetch all supermarket brands in parallel
  const results  = await Promise.allSettled(CMA_SOURCES.slice(0,4).map(fetchBrand))
  const all      = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  const nearby = all
    .filter(s => s.lat !== 0 && s.lng !== 0)
    .map(s => ({ ...s, distanceMiles: distanceMiles(lat, lng, s.lat, s.lng) }))
    .filter(s => s.distanceMiles <= radius)
    .sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999))
    .slice(0, 100)

  console.log(`CMA result: ${all.length} total stations, ${nearby.length} within ${radius}mi`)

  return NextResponse.json({
    stations: nearby,
    source:   nearby.length > 0 ? 'cma_open_data' : 'unavailable',
    total:    nearby.length,
  })
}
