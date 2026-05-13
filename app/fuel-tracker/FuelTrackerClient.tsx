'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, SlidersHorizontal, Star, StarOff, TrendingDown, Fuel, ChevronDown, ChevronUp, Search, X, Info, RefreshCw, Navigation } from 'lucide-react'

const FuelMap = dynamic(() => import('@/components/FuelMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading map…</p>
      </div>
    </div>
  ),
})

type FuelType = 'petrol' | 'diesel' | 'super' | 'premium_diesel'
type SortType = 'price' | 'distance' | 'updated'

interface Station {
  id: string
  name: string
  brand: string
  address: string
  postcode: string
  lat: number
  lng: number
  petrol: number | null
  diesel: number | null
  super_unleaded: number | null
  premium_diesel: number | null
  lastUpdated: string
  distanceMiles?: number
}

const BRANDS = ['All', 'Asda', 'BP', 'Co-op', 'Esso', 'Gulf', 'Jet', 'Morrisons', 'Sainsbury\'s', 'Shell', 'Tesco', 'Texaco']

const MOCK_STATIONS: Station[] = [
  { id:'1', name:'Tesco Extra', brand:'Tesco', address:'100 High Street', postcode:'OX1 1AA', lat:51.752, lng:-1.257, petrol:136.9, diesel:141.9, super_unleaded:149.9, premium_diesel:154.9, lastUpdated: new Date(Date.now()-8*60000).toISOString(), distanceMiles:0.3 },
  { id:'2', name:'Asda Oxford', brand:'Asda', address:'Cowley Retail Park', postcode:'OX4 2TZ', lat:51.742, lng:-1.219, petrol:137.7, diesel:142.7, super_unleaded:null, premium_diesel:null, lastUpdated: new Date(Date.now()-22*60000).toISOString(), distanceMiles:1.1 },
  { id:'3', name:'Sainsbury\'s Headington', brand:"Sainsbury's", address:'Sandfield Centre', postcode:'OX3 7PX', lat:51.757, lng:-1.213, petrol:138.9, diesel:143.9, super_unleaded:151.9, premium_diesel:null, lastUpdated: new Date(Date.now()-5*60000).toISOString(), distanceMiles:1.4 },
  { id:'4', name:'BP Botley Road', brand:'BP', address:'140 Botley Road', postcode:'OX2 0HP', lat:51.753, lng:-1.278, petrol:143.9, diesel:148.9, super_unleaded:155.9, premium_diesel:158.9, lastUpdated: new Date(Date.now()-180*60000).toISOString(), distanceMiles:1.7 },
  { id:'5', name:'Shell Ring Road', brand:'Shell', address:'Banbury Road', postcode:'OX2 8ED', lat:51.768, lng:-1.267, petrol:145.9, diesel:150.9, super_unleaded:157.9, premium_diesel:160.9, lastUpdated: new Date(Date.now()-35*60000).toISOString(), distanceMiles:2.1 },
  { id:'6', name:'Morrisons Cowley', brand:'Morrisons', address:'Templars Square', postcode:'OX4 3XN', lat:51.737, lng:-1.215, petrol:137.9, diesel:142.9, super_unleaded:null, premium_diesel:null, lastUpdated: new Date(Date.now()-12*60000).toISOString(), distanceMiles:2.3 },
  { id:'7', name:'Esso Abingdon Rd', brand:'Esso', address:'Abingdon Road', postcode:'OX1 4UL', lat:51.735, lng:-1.255, petrol:141.9, diesel:146.9, super_unleaded:153.9, premium_diesel:null, lastUpdated: new Date(Date.now()-45*60000).toISOString(), distanceMiles:2.6 },
  { id:'8', name:'Jet Wolvercote', brand:'Jet', address:'Godstow Road', postcode:'OX2 8NY', lat:51.779, lng:-1.276, petrol:140.9, diesel:145.9, super_unleaded:null, premium_diesel:null, lastUpdated: new Date(Date.now()-90*60000).toISOString(), distanceMiles:3.2 },
  { id:'9', name:'Texaco Kidlington', brand:'Texaco', address:'Oxford Road', postcode:'OX5 1AB', lat:51.822, lng:-1.290, petrol:142.9, diesel:147.9, super_unleaded:154.9, premium_diesel:null, lastUpdated: new Date(Date.now()-15*60000).toISOString(), distanceMiles:4.1 },
  { id:'10', name:'Gulf Wheatley', brand:'Gulf', address:'London Road', postcode:'OX33 1YH', lat:51.752, lng:-1.132, petrol:139.9, diesel:144.9, super_unleaded:null, premium_diesel:null, lastUpdated: new Date(Date.now()-3*60000).toISOString(), distanceMiles:5.8 },
]

function freshnessLabel(isoDate: string): { label: string; color: string; dot: string } {
  const mins = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000)
  if (mins < 15) return { label: `${mins}m ago`, color: 'text-green-400', dot: 'bg-green-400' }
  if (mins < 60) return { label: `${mins}m ago`, color: 'text-amber-400', dot: 'bg-amber-400' }
  const hrs = Math.floor(mins / 60)
  return { label: `${hrs}h ago`, color: 'text-red-400', dot: 'bg-red-400' }
}

function getPrice(s: Station, ft: FuelType): number | null {
  if (ft === 'petrol') return s.petrol
  if (ft === 'diesel') return s.diesel
  if (ft === 'super') return s.super_unleaded
  return s.premium_diesel
}

function priceBg(price: number, min: number): string {
  const diff = price - min
  if (diff <= 0) return 'bg-green-500/15 text-green-300 border-green-500/30'
  if (diff <= 3) return 'bg-amber-500/10 text-amber-300 border-amber-500/30'
  return 'bg-gray-800/50 text-gray-300 border-gray-700/50'
}

export default function FuelTrackerClient() {
  const [fuelType, setFuelType] = useState<FuelType>('petrol')
  const [sortBy, setSortBy] = useState<SortType>('price')
  const [selectedBrand, setSelectedBrand] = useState('All')
  const [radius, setRadius] = useState(5)
  const [showFilters, setShowFilters] = useState(false)
  const [postcode, setPostcode] = useState('Oxford')
  const [searchInput, setSearchInput] = useState('')
  const [favourites, setFavourites] = useState<string[]>([])
  const [selectedStation, setSelectedStation] = useState<string | null>(null)
  const [tankSize, setTankSize] = useState(55)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fgp_favourites') || '[]')
      setFavourites(saved)
    } catch {}
  }, [])

  const toggleFav = (id: string) => {
    const updated = favourites.includes(id) ? favourites.filter(f => f !== id) : [...favourites, id]
    setFavourites(updated)
    try { localStorage.setItem('fgp_favourites', JSON.stringify(updated)) } catch {}
  }

  const filtered = MOCK_STATIONS
    .filter(s => selectedBrand === 'All' || s.brand === selectedBrand)
    .filter(s => (s.distanceMiles ?? 0) <= radius)
    .filter(s => getPrice(s, fuelType) !== null)

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price') return (getPrice(a, fuelType) ?? 999) - (getPrice(b, fuelType) ?? 999)
    if (sortBy === 'distance') return (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99)
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  })

  const prices = sorted.map(s => getPrice(s, fuelType)!).filter(Boolean)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
  const potentialSaving = ((avgPrice - minPrice) * tankSize / 100)
  const cheapestStation = sorted[0]

  const fuelLabels: Record<FuelType, string> = {
    petrol: 'Unleaded E10', diesel: 'Diesel B7',
    super: 'Super Unleaded', premium_diesel: 'Premium Diesel'
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex-shrink-0">
        <div className="max-w-full flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchInput) { setPostcode(searchInput); setSearchInput('') } }}
              placeholder="Postcode or town…"
              className="bg-transparent text-white placeholder-gray-500 text-sm w-full focus:outline-none"
            />
            {searchInput && <button onClick={() => setSearchInput('')}><X className="h-3 w-3 text-gray-500" /></button>}
          </div>

          {/* Fuel type tabs */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {(['petrol','diesel','super','premium_diesel'] as FuelType[]).map(ft => (
              <button key={ft} onClick={() => setFuelType(ft)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${fuelType === ft ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {ft === 'petrol' ? 'Petrol E10' : ft === 'diesel' ? 'Diesel' : ft === 'super' ? 'Super' : 'Premium Diesel'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {(['price','distance','updated'] as SortType[]).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${sortBy === s ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {s === 'updated' ? 'Recent' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Filters toggle */}
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${showFilters ? 'bg-green-600/20 border-green-500/40 text-green-400' : 'border-gray-700 text-gray-400 hover:text-white bg-gray-800'}`}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <RefreshCw className="h-3 w-3" />
            <span>Updated {lastRefresh.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}</span>
          </div>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-800 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 whitespace-nowrap">Brand:</label>
              <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none">
                {BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 whitespace-nowrap">Radius: {radius} miles</label>
              <input type="range" min="1" max="20" value={radius} onChange={e => setRadius(Number(e.target.value))}
                className="w-28 accent-green-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 whitespace-nowrap">Tank size: {tankSize}L</label>
              <input type="range" min="30" max="100" step="5" value={tankSize} onChange={e => setTankSize(Number(e.target.value))}
                className="w-24 accent-green-500" />
            </div>
          </div>
        )}
      </div>

      {/* Savings banner */}
      {cheapestStation && (
        <div className="bg-green-900/30 border-b border-green-500/20 px-4 py-2 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-400" />
              <span className="text-white font-semibold">Cheapest near {postcode}:</span>
              <span className="text-green-400 font-bold">{getPrice(cheapestStation, fuelType)?.toFixed(1)}p/litre</span>
              <span className="text-gray-400">at {cheapestStation.name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Fuel className="h-4 w-4 text-amber-400" />
              <span>Fill your {tankSize}L tank here vs average:</span>
              <span className="text-green-400 font-bold">save £{potentialSaving.toFixed(2)}</span>
            </div>
            <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
              <span>Cheapest: <span className="text-green-400 font-semibold">{minPrice.toFixed(1)}p</span></span>
              <span>Average: <span className="text-amber-400 font-semibold">{avgPrice.toFixed(1)}p</span></span>
              <span>Most expensive: <span className="text-red-400 font-semibold">{maxPrice.toFixed(1)}p</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Main content: list + map */}
      <div className="flex flex-1 overflow-hidden">
        {/* Station list sidebar */}
        <div className="w-80 xl:w-96 flex-shrink-0 bg-gray-950 border-r border-gray-800 overflow-y-auto">
          <div className="p-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">{sorted.length} stations · {fuelLabels[fuelType]}</span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Navigation className="h-3 w-3" /> {postcode}
            </span>
          </div>

          <div className="divide-y divide-gray-800/60">
            {sorted.map((station, idx) => {
              const price = getPrice(station, fuelType)!
              const fresh = freshnessLabel(station.lastUpdated)
              const isFav = favourites.includes(station.id)
              const isSelected = selectedStation === station.id
              const isCheapest = idx === 0

              return (
                <div key={station.id}
                  onClick={() => setSelectedStation(isSelected ? null : station.id)}
                  className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-green-900/20 border-l-2 border-green-500' : 'hover:bg-gray-900 border-l-2 border-transparent'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {isCheapest && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-semibold">CHEAPEST</span>}
                        <p className="text-white font-medium text-sm truncate">{station.name}</p>
                      </div>
                      <p className="text-gray-500 text-xs truncate">{station.address}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-500">{station.distanceMiles?.toFixed(1)} mi</span>
                        <span className="text-gray-700">·</span>
                        <span className={`text-xs flex items-center gap-1 ${fresh.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${fresh.dot}`} />
                          {fresh.label}
                        </span>
                        <span className="text-gray-700">·</span>
                        <span className="text-xs text-gray-500">{station.brand}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-lg font-extrabold px-2 py-0.5 rounded border ${priceBg(price, minPrice)}`}>
                        {price.toFixed(1)}p
                      </span>
                      <button onClick={e => { e.stopPropagation(); toggleFav(station.id) }}
                        className={`${isFav ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'} transition-colors`}>
                        {isFav ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        {station.petrol && <div className="bg-gray-800 rounded p-2"><p className="text-gray-500">Petrol E10</p><p className="text-white font-bold">{station.petrol.toFixed(1)}p</p></div>}
                        {station.diesel && <div className="bg-gray-800 rounded p-2"><p className="text-gray-500">Diesel B7</p><p className="text-white font-bold">{station.diesel.toFixed(1)}p</p></div>}
                        {station.super_unleaded && <div className="bg-gray-800 rounded p-2"><p className="text-gray-500">Super Unleaded</p><p className="text-white font-bold">{station.super_unleaded.toFixed(1)}p</p></div>}
                        {station.premium_diesel && <div className="bg-gray-800 rounded p-2"><p className="text-gray-500">Premium Diesel</p><p className="text-white font-bold">{station.premium_diesel.toFixed(1)}p</p></div>}
                      </div>
                      <div className="bg-green-500/5 border border-green-500/20 rounded p-2 text-xs">
                        <p className="text-gray-400">Full tank ({tankSize}L) cost: <span className="text-white font-bold">£{(price * tankSize / 100).toFixed(2)}</span></p>
                        <p className="text-gray-400 mt-0.5">vs cheapest: <span className="text-green-400 font-bold">+£{((price - minPrice) * tankSize / 100).toFixed(2)}</span></p>
                      </div>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-1.5 w-full bg-gray-800 hover:bg-gray-700 text-white text-xs py-2 rounded-lg transition-colors"
                        onClick={e => e.stopPropagation()}>
                        <Navigation className="h-3 w-3" /> Get Directions
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Price breakdown info */}
          <div className="p-4 border-t border-gray-800 bg-gray-900/50">
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-blue-400" />
              <div>
                <p className="text-blue-400 font-medium mb-1">What's in your pump price?</p>
                <p>At {avgPrice.toFixed(1)}p/litre: <span className="text-white">Fuel duty 52.95p + VAT {(avgPrice * 0.1667).toFixed(1)}p + wholesale & margin {(avgPrice - 52.95 - avgPrice * 0.1667).toFixed(1)}p</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <FuelMap
            stations={sorted.map(s => ({
              id: s.id, name: s.name, brand: s.brand,
              address: s.address, postcode: s.postcode,
              lat: s.lat, lng: s.lng,
              petrol: s.petrol, diesel: s.diesel,
              lastUpdated: s.lastUpdated
            }))}
            center={[51.752, -1.257]}
            zoom={12}
          />

          {/* Map overlay legend */}
          <div className="absolute bottom-4 right-4 bg-gray-900/95 border border-gray-700 rounded-xl p-3 text-xs space-y-1.5 pointer-events-none">
            <p className="text-gray-400 font-medium mb-2">Price legend</p>
            {[['bg-green-500','Cheapest (≤139p)'],['bg-amber-500','Average (140-145p)'],['bg-red-500','Higher (146p+)']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded ${c}`} />
                <span className="text-gray-300">{l}</span>
              </div>
            ))}
          </div>

          {/* Freshness legend */}
          <div className="absolute bottom-4 left-4 bg-gray-900/95 border border-gray-700 rounded-xl p-3 text-xs space-y-1.5 pointer-events-none">
            <p className="text-gray-400 font-medium mb-2">Data freshness</p>
            {[['bg-green-400','< 15 mins'],['bg-amber-400','15–60 mins'],['bg-red-400','> 1 hour']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${c}`} />
                <span className="text-gray-300">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
