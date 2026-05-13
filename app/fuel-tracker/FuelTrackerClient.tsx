'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, SlidersHorizontal, Star, StarOff, TrendingDown, Fuel, ChevronDown, ChevronUp, Search, X, Info, RefreshCw, Navigation, Loader2, AlertCircle } from 'lucide-react'

const FuelMap = dynamic(() => import('@/components/FuelMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading map…</p>
      </div>
    </div>
  ),
})

type FuelType = 'petrol' | 'diesel' | 'super' | 'premium_diesel'
type SortType = 'price' | 'distance' | 'updated'

interface Station {
  id: string; name: string; brand: string; address: string; postcode: string
  lat: number; lng: number; petrol: number | null; diesel: number | null
  super_unleaded?: number | null; premium_diesel?: number | null
  lastUpdated: string; distanceMiles?: number
}

const BRANDS = ['All','Asda','BP','Co-op','Esso','Gulf','Jet','Morrisons',"Sainsbury's",'Shell','Tesco','Texaco']

const UK_CITIES: Record<string, [number,number]> = {
  'london':[51.5074,-0.1278],'birmingham':[52.4862,-1.8904],'manchester':[53.4808,-2.2426],
  'leeds':[53.8008,-1.5491],'oxford':[51.752,-1.257],'bristol':[51.4545,-2.5879],
  'cardiff':[51.4816,-3.1791],'edinburgh':[55.9533,-3.1883],'glasgow':[55.8642,-4.2518],
  'liverpool':[53.4084,-2.9916],'sheffield':[53.3811,-1.4701],'nottingham':[52.9548,-1.1581],
}

function freshnessLabel(isoDate: string) {
  const mins = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000)
  if (mins < 15) return { label: `${mins}m ago`, color: 'text-green-600', dot: 'bg-green-500' }
  if (mins < 60) return { label: `${mins}m ago`, color: 'text-amber-600', dot: 'bg-amber-500' }
  const hrs = Math.floor(mins / 60)
  return { label: `${hrs}h ago`, color: 'text-red-500', dot: 'bg-red-500' }
}

function getPrice(s: Station, ft: FuelType): number | null {
  if (ft === 'petrol') return s.petrol
  if (ft === 'diesel') return s.diesel
  if (ft === 'super') return s.super_unleaded ?? null
  return s.premium_diesel ?? null
}

export default function FuelTrackerClient() {
  const [fuelType, setFuelType] = useState<FuelType>('petrol')
  const [sortBy, setSortBy] = useState<SortType>('price')
  const [selectedBrand, setSelectedBrand] = useState('All')
  const [radius, setRadius] = useState(5)
  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [locationLabel, setLocationLabel] = useState('Near you')
  const [favourites, setFavourites] = useState<string[]>([])
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [tankSize, setTankSize] = useState(55)
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [source, setSource] = useState('')
  const [mapCenter, setMapCenter] = useState<[number,number]>([51.752,-1.257])
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => {
    try { setFavourites(JSON.parse(localStorage.getItem('fgp_favs') || '[]')) } catch {}
    fetchByLocation()
  }, [])

  async function fetchByLocation() {
    setLoading(true); setError('')
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }))
      const { latitude: lat, longitude: lng } = pos.coords
      setMapCenter([lat, lng])
      setLocationLabel('Your location')
      await loadStations(lat, lng)
    } catch {
      await loadStations(51.752, -1.257) // default Oxford
      setLocationLabel('Oxford')
    }
  }

  async function loadStations(lat: number, lng: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/fuel-prices?lat=${lat}&lng=${lng}&radius=${radius}`)
      const data = await res.json()
      if (data.stations?.length > 0) {
        setStations(data.stations)
        setSource(data.source)
      } else {
        setError('No stations found nearby. Try increasing the radius.')
      }
    } catch {
      setError('Could not load prices. Please try again.')
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }

  async function searchLocation(query: string) {
    if (!query.trim()) return
    setLoading(true); setError('')
    const cityKey = query.toLowerCase().trim()
    if (UK_CITIES[cityKey]) {
      const [lat, lng] = UK_CITIES[cityKey]
      setMapCenter([lat, lng])
      setLocationLabel(query)
      await loadStations(lat, lng)
      return
    }
    // Try geocoding via nominatim
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query+', UK')}&format=json&limit=1`)
      const data = await res.json()
      if (data[0]) {
        const lat = parseFloat(data[0].lat); const lng = parseFloat(data[0].lon)
        setMapCenter([lat, lng])
        setLocationLabel(data[0].display_name.split(',')[0])
        await loadStations(lat, lng)
      } else {
        setError('Location not found. Try a postcode or town name.')
        setLoading(false)
      }
    } catch { setError('Search failed.'); setLoading(false) }
  }

  const toggleFav = (id: string) => {
    const u = favourites.includes(id) ? favourites.filter(f=>f!==id) : [...favourites, id]
    setFavourites(u)
    try { localStorage.setItem('fgp_favs', JSON.stringify(u)) } catch {}
  }

  const filtered = stations
    .filter(s => selectedBrand === 'All' || s.brand === selectedBrand)
    .filter(s => getPrice(s, fuelType) !== null)

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price') return (getPrice(a,fuelType)??999)-(getPrice(b,fuelType)??999)
    if (sortBy === 'distance') return (a.distanceMiles??99)-(b.distanceMiles??99)
    return new Date(b.lastUpdated).getTime()-new Date(a.lastUpdated).getTime()
  })

  const prices = sorted.map(s=>getPrice(s,fuelType)!).filter(Boolean)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const maxPrice = prices.length ? Math.max(...prices) : 0
  const avgPrice = prices.length ? prices.reduce((a,b)=>a+b,0)/prices.length : 0
  const potentialSaving = ((avgPrice - minPrice) * tankSize / 100)
  const cheapest = sorted[0]

  const fuelLabels: Record<FuelType,string> = { petrol:'Unleaded E10', diesel:'Diesel B7', super:'Super Unleaded', premium_diesel:'Premium Diesel' }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0 shadow-sm">
        <div className="max-w-full flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input value={searchInput} onChange={e=>setSearchInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&searchInput){ searchLocation(searchInput); setSearchInput('') }}}
              placeholder="Postcode or town…"
              className="bg-transparent text-gray-900 placeholder-gray-400 text-sm w-full focus:outline-none" />
            {searchInput && <button onClick={()=>setSearchInput('')}><X className="h-3 w-3 text-gray-400" /></button>}
          </div>

          {/* Use my location */}
          <button onClick={fetchByLocation} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Navigation className="h-4 w-4 text-green-600" /> Use my location
          </button>

          {/* Fuel type tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['petrol','diesel','super','premium_diesel'] as FuelType[]).map(ft=>(
              <button key={ft} onClick={()=>setFuelType(ft)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${fuelType===ft ? 'bg-white shadow text-green-700 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}>
                {ft==='petrol'?'Petrol E10':ft==='diesel'?'Diesel':ft==='super'?'Super':'Premium Diesel'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['price','distance','updated'] as SortType[]).map(s=>(
              <button key={s} onClick={()=>setSortBy(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy===s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {s==='updated'?'Recent':s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>

          <button onClick={()=>setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${showFilters?'bg-green-50 border-green-300 text-green-700':'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <SlidersHorizontal className="h-4 w-4" /> Filters {showFilters?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>}
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <button onClick={()=>{setLoading(true);fetchByLocation()}} className="hover:text-green-600"><RefreshCw className={`h-3.5 w-3.5 ${loading?'animate-spin':''}`} /></button>
            <span>Updated {lastRefresh.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
            {source && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{source==='cma_open_data'?'Live CMA Data':source==='fuel_finder'?'Live Fuel Finder':'Sample'}</span>}
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap font-medium">Brand:</label>
              <select value={selectedBrand} onChange={e=>setSelectedBrand(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-green-500">
                {BRANDS.map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap font-medium">Radius: {radius} miles</label>
              <input type="range" min="1" max="20" value={radius} onChange={e=>setRadius(Number(e.target.value))} className="w-28 accent-green-600" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap font-medium">Tank: {tankSize}L</label>
              <input type="range" min="30" max="100" step="5" value={tankSize} onChange={e=>setTankSize(Number(e.target.value))} className="w-24 accent-green-600" />
            </div>
          </div>
        )}
      </div>

      {/* Savings banner */}
      {cheapest && !loading && (
        <div className="bg-green-600 px-4 py-2 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-200" />
              <span className="text-white font-semibold">Cheapest near {locationLabel}:</span>
              <span className="text-white font-extrabold text-base">{getPrice(cheapest,fuelType)?.toFixed(1)}p/litre</span>
              <span className="text-green-200">at {cheapest.name}</span>
            </div>
            <div className="flex items-center gap-2 text-green-100">
              <Fuel className="h-4 w-4 text-green-200" />
              <span>Fill {tankSize}L tank vs average: save <span className="text-white font-bold">£{potentialSaving.toFixed(2)}</span></span>
            </div>
            <div className="ml-auto flex items-center gap-4 text-xs text-green-200">
              <span>Lowest: <span className="text-white font-semibold">{minPrice.toFixed(1)}p</span></span>
              <span>Avg: <span className="text-white font-semibold">{avgPrice.toFixed(1)}p</span></span>
              <span>Highest: <span className="text-white font-semibold">{maxPrice.toFixed(1)}p</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Station list */}
        <div className="w-80 xl:w-96 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">{sorted.length} stations · {fuelLabels[fuelType]}</span>
            <span className="text-xs text-gray-400 flex items-center gap-1"><Navigation className="h-3 w-3"/>{locationLabel}</span>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-3" />
              <p className="text-sm">Fetching live prices…</p>
            </div>
          )}

          {error && !loading && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {!loading && !error && (
            <div className="divide-y divide-gray-100">
              {sorted.map((station, idx) => {
                const price = getPrice(station, fuelType)!
                const fresh = freshnessLabel(station.lastUpdated)
                const isFav = favourites.includes(station.id)
                const isSelected = selectedStation === station.id
                const isCheapest = idx === 0
                const diff = price - minPrice

                return (
                  <div key={station.id} onClick={()=>setSelectedStation(isSelected?null:station.id)}
                    className={`p-3 cursor-pointer transition-colors ${isSelected?'bg-green-50 border-l-2 border-green-500':'hover:bg-gray-50 border-l-2 border-transparent'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          {isCheapest && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">CHEAPEST</span>}
                          <p className="text-gray-900 font-semibold text-sm truncate">{station.name}</p>
                        </div>
                        <p className="text-gray-500 text-xs truncate">{station.address}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {station.distanceMiles && <span className="text-xs text-gray-400">{station.distanceMiles.toFixed(1)} mi</span>}
                          <span className="text-gray-300">·</span>
                          <span className={`text-xs flex items-center gap-1 ${fresh.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${fresh.dot}`}/>{fresh.label}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{station.brand}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`text-lg font-extrabold px-2.5 py-0.5 rounded-lg border ${diff<=0?'bg-green-50 text-green-700 border-green-200':diff<=3?'bg-amber-50 text-amber-700 border-amber-200':'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {price.toFixed(1)}p
                        </span>
                        <button onClick={e=>{e.stopPropagation();toggleFav(station.id)}}
                          className={`${isFav?'text-amber-500':'text-gray-300 hover:text-gray-400'} transition-colors`}>
                          {isFav?<Star className="h-4 w-4 fill-current"/>:<StarOff className="h-4 w-4"/>}
                        </button>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          {station.petrol&&<div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Petrol E10</p><p className="text-gray-900 font-bold">{station.petrol.toFixed(1)}p</p></div>}
                          {station.diesel&&<div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Diesel B7</p><p className="text-gray-900 font-bold">{station.diesel.toFixed(1)}p</p></div>}
                          {station.super_unleaded&&<div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Super</p><p className="text-gray-900 font-bold">{station.super_unleaded.toFixed(1)}p</p></div>}
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-xs mb-2">
                          <p className="text-gray-600">Full tank ({tankSize}L): <span className="text-gray-900 font-bold">£{(price*tankSize/100).toFixed(2)}</span></p>
                          {diff > 0 && <p className="text-gray-500 mt-0.5">vs cheapest: <span className="text-red-500 font-bold">+£{(diff*tankSize/100).toFixed(2)}</span></p>}
                        </div>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e=>e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 w-full bg-gray-900 hover:bg-gray-800 text-white text-xs py-2 rounded-lg transition-colors font-medium">
                          <Navigation className="h-3 w-3"/> Get Directions
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-500"/>
              <div>
                <p className="text-blue-600 font-medium mb-1">What&apos;s in your pump price?</p>
                {avgPrice>0&&<p>At {avgPrice.toFixed(1)}p/litre: <span className="text-gray-700 font-medium">Duty 52.95p · VAT {(avgPrice*0.1667).toFixed(1)}p · Wholesale & margin {(avgPrice-52.95-avgPrice*0.1667).toFixed(1)}p</span></p>}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <FuelMap stations={sorted.map(s=>({id:s.id,name:s.name,brand:s.brand,address:s.address,postcode:s.postcode,lat:s.lat,lng:s.lng,petrol:s.petrol,diesel:s.diesel,lastUpdated:s.lastUpdated}))} center={mapCenter} zoom={12} />

          <div className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-xl p-3 text-xs shadow-lg pointer-events-none">
            <p className="text-gray-500 font-medium mb-2">Price guide</p>
            {[['bg-green-500','text-green-700','Cheapest'],['bg-amber-500','text-amber-700','Average'],['bg-red-500','text-red-600','Higher']].map(([c,t,l])=>(
              <div key={l} className="flex items-center gap-2 mb-1">
                <span className={`w-3 h-3 rounded ${c}`}/><span className={`${t} font-medium`}>{l}</span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-xl p-3 text-xs shadow-lg pointer-events-none">
            <p className="text-gray-500 font-medium mb-2">Data freshness</p>
            {[['bg-green-500','< 15 mins'],['bg-amber-500','15–60 mins'],['bg-red-500','> 1 hour']].map(([c,l])=>(
              <div key={l} className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${c}`}/><span className="text-gray-600">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
