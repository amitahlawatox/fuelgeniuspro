import { NextRequest, NextResponse } from 'next/server'

// All major UK CMA mandatory reporters
const CMA_SOURCES = [
  { brand: 'Tesco',        url: 'https://www.tesco.com/fuel_prices/fuel_prices_data.json' },
  { brand: 'Asda',         url: 'https://storelocator.asda.com/fuel_prices_data.json' },
  { brand: "Sainsbury's",  url: 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json' },
  { brand: 'Morrisons',    url: 'https://www.morrisons.com/fuel-prices/fuel.json' },
  { brand: 'BP',           url: 'https://www.bp.com/content/dam/bp/country-sites/en_gb/united-kingdom/home/products-and-services/fuel/bp-retail-prices.json' },
  { brand: 'Shell',        url: 'https://www.shell.co.uk/motorist/shell-fuels/shell-fuel-prices.html.fuel-data.json' },
  { brand: 'Esso',         url: 'https://fuelprices.esso.co.uk/raw_data.json' },
  { brand: 'Jet',          url: 'https://www.jet.co.uk/fuel-prices/fuel_prices_data.json' },
  { brand: 'Gulf',         url: 'https://www.gulf.co.uk/fuel-prices/fuel_prices_data.json' },
]

// Brand → typical facilities (CMA feed has no facility data)
const BRAND_FACILITIES: Record<string, string[]> = {
  'BP':          ['⛽ Fuel','🅿️ Parking','🏪 Shop','🚻 Toilets','💧 Air & Water','🏧 ATM','🚗 Car Wash','⚡ EV Charging'],
  'Shell':       ['⛽ Fuel','🅿️ Parking','🏪 Shop','🚻 Toilets','💧 Air & Water','🏧 ATM','🚗 Car Wash','⚡ EV Charging'],
  'Esso':        ['⛽ Fuel','🅿️ Parking','🏪 Shop','🚻 Toilets','💧 Air & Water','🏧 ATM','🚗 Car Wash'],
  'Tesco':       ['⛽ Fuel','🅿️ Parking','🏪 Supermarket','🚻 Toilets','🏧 ATM','♿ Disabled','☕ Café'],
  "Sainsbury's": ['⛽ Fuel','🅿️ Parking','🏪 Supermarket','🚻 Toilets','🏧 ATM','♿ Disabled'],
  'Asda':        ['⛽ Fuel','🅿️ Parking','🏪 Supermarket','🚻 Toilets','🏧 ATM','♿ Disabled'],
  'Morrisons':   ['⛽ Fuel','🅿️ Parking','🏪 Supermarket','🚻 Toilets','🏧 ATM','♿ Disabled'],
  'Jet':         ['⛽ Fuel','🅿️ Parking','🏪 Shop','🚻 Toilets','💧 Air & Water'],
  'Gulf':        ['⛽ Fuel','🅿️ Parking','🏪 Shop','🚻 Toilets','💧 Air & Water'],
  'Texaco':      ['⛽ Fuel','🅿️ Parking','🏪 Shop','🚻 Toilets','💧 Air & Water','🚗 Car Wash'],
  'default':     ['⛽ Fuel','🅿️ Parking','🏪 Shop','🚻 Toilets'],
}

function getFacilities(brand: string): string[] {
  return BRAND_FACILITIES[brand] ?? BRAND_FACILITIES['default']
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
  if (raw > 500) return parseFloat((raw / 10).toFixed(1))
  if (raw > 50)  return parseFloat(raw.toFixed(1))
  if (raw > 0)   return parseFloat((raw * 100).toFixed(1))
  return null
}

async function fetchBrand(source: typeof CMA_SOURCES[0]) {
  try {
    const res = await fetch(source.url, {
      next: { revalidate: 900 },
      headers: { 'User-Agent': 'Mozilla/5.0 FuelGeniusPro/1.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const stations = data.stations ?? data.data?.stations ?? data.stationList ?? data ?? []
    if (!Array.isArray(stations)) return []

    return stations.map((s: Record<string, unknown>) => {
      const prices = (s.prices as Record<string, number>) ?? {}
      const loc = (s.location as Record<string, unknown>) ?? {}
      const address = String(s.address ?? s.storeName ?? s.store_name ?? s.name ?? '')
      const postcode = String(s.postcode ?? s.postal_code ?? '')
      const brand = String(s.brand ?? source.brand)

      return {
        id: String(s.site_id ?? s.id ?? s.storeId ?? Math.random()),
        name: address || `${brand} ${postcode}`,   // ← FIX: always set a name
        brand,
        address,
        postcode,
        lat: Number((loc as Record<string,number>).latitude ?? (loc as Record<string,number>).lat ?? s.lat ?? s.latitude ?? 0),
        lng: Number((loc as Record<string,number>).longitude ?? (loc as Record<string,number>).lng ?? s.lng ?? s.longitude ?? 0),
        petrol:          normalisePrice(prices.E10 ?? prices.e10 ?? prices.Unleaded ?? prices.unleaded),
        diesel:          normalisePrice(prices.B7 ?? prices.b7 ?? prices.Diesel ?? prices.diesel),
        super_unleaded:  normalisePrice(prices.E5 ?? prices.e5 ?? prices.SDV ?? prices.Super ?? prices.super_unleaded),
        premium_diesel:  normalisePrice(prices.B20 ?? prices.PremiumDiesel ?? prices.premium_diesel),
        facilities: getFacilities(brand),
        lastUpdated: new Date().toISOString(),
      }
    })
  } catch (e) {
    console.log(`${source.brand} unavailable: ${e}`)
    return []
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat  = parseFloat(searchParams.get('lat') || '51.752')
  const lng  = parseFloat(searchParams.get('lng') || '-1.257')
  const radius = parseFloat(searchParams.get('radius') || '10')

  // 1. Try Fuel Finder (has ALL UK stations including BP/Shell/Esso)
  try {
    const clientId     = process.env.FUEL_FINDER_CLIENT_ID
    const clientSecret = process.env.FUEL_FINDER_CLIENT_SECRET
    const tokenUrl     = process.env.FUEL_FINDER_TOKEN_URL
    const apiBase      = process.env.FUEL_FINDER_API_BASE

    if (clientId && clientSecret && tokenUrl && apiBase) {
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
        signal: AbortSignal.timeout(6000),
      })
      if (tokenRes.ok) {
        const { access_token } = await tokenRes.json()
        const dataRes = await fetch(
          `${apiBase}/stations?lat=${lat}&lng=${lng}&radius=${radius}&limit=150&sort=price`,
          { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(8000) }
        )
        if (dataRes.ok) {
          const data = await dataRes.json()
          const stations = data.stations ?? data ?? []
          if (Array.isArray(stations) && stations.length > 0) {
            return NextResponse.json({ stations: stations.map((s: Record<string,unknown>) => ({
              ...s,
              name: String(s.name ?? s.address ?? s.site_name ?? `${s.brand ?? ''} ${s.postcode ?? ''}`),
              facilities: getFacilities(String(s.brand ?? '')),
            })), source: 'fuel_finder' })
          }
        }
      }
    }
  } catch (e) { console.log('Fuel Finder error:', e) }

  // 2. CMA open data fallback — all brands in parallel
  const results = await Promise.allSettled(CMA_SOURCES.map(fetchBrand))
  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  console.log(`CMA: ${all.length} total stations fetched`)

  const nearby = all
    .filter(s => s.lat !== 0 && s.lng !== 0 && s.lat && s.lng)
    .map(s => ({ ...s, distanceMiles: distanceMiles(lat, lng, s.lat, s.lng) }))
    .filter(s => s.distanceMiles <= radius)
    .sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999))
    .slice(0, 150)

  return NextResponse.json({
    stations: nearby,
    source: nearby.length > 0 ? 'cma_open_data' : 'unavailable',
    total: nearby.length,
    brands: [...new Set(nearby.map(s => s.brand))],
  })
}
