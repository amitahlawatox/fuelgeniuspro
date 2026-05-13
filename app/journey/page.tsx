'use client'
import { useState } from 'react'
import { Calculator, Car } from 'lucide-react'
import { UK_AVG_PRICES } from '@/lib/mockData'

const CARS = [
  { label: 'Small Petrol (e.g. VW Polo)', mpg: 50, fuel: 'petrol' },
  { label: 'Medium Petrol (e.g. Ford Focus)', mpg: 42, fuel: 'petrol' },
  { label: 'Large Petrol (e.g. BMW 5 Series)', mpg: 35, fuel: 'petrol' },
  { label: 'Small Diesel (e.g. VW Golf TDI)', mpg: 60, fuel: 'diesel' },
  { label: 'Medium Diesel (e.g. Volvo V60)', mpg: 52, fuel: 'diesel' },
  { label: 'SUV Diesel (e.g. Land Rover)', mpg: 38, fuel: 'diesel' },
  { label: 'Hybrid (e.g. Toyota Prius)', mpg: 72, fuel: 'petrol' },
  { label: 'Custom', mpg: 45, fuel: 'petrol' },
]

export default function JourneyPage() {
  const [miles, setMiles] = useState('')
  const [carIdx, setCarIdx] = useState(1)
  const [customMpg, setCustomMpg] = useState('45')
  const [customFuel, setCustomFuel] = useState<'petrol'|'diesel'>('petrol')
  const [pricePer, setPricePer] = useState(UK_AVG_PRICES.petrol.toFixed(1))
  const [result, setResult] = useState<{cost:number;litres:number;pence:number}|null>(null)

  const isCustom = carIdx === CARS.length - 1
  const car = CARS[carIdx]
  const mpg = isCustom ? parseFloat(customMpg) || 45 : car.mpg
  const fuelType = isCustom ? customFuel : car.fuel
  const pricePerLitre = parseFloat(pricePer) || (fuelType === 'petrol' ? UK_AVG_PRICES.petrol : UK_AVG_PRICES.diesel)

  function calculate() {
    const m = parseFloat(miles)
    if (!m || m <= 0) return
    const litres = (m / mpg) * 4.54609
    const cost = (litres * pricePerLitre) / 100
    setResult({ cost, litres, pence: litres * pricePerLitre })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <Calculator className="h-5 w-5 text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Journey Cost Calculator</h1>
      </div>
      <p className="text-gray-400 mb-8">Enter your journey distance and car to calculate exact fuel cost.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Journey distance (miles)</label>
          <input type="number" min="1" value={miles} onChange={e=>setMiles(e.target.value)}
            placeholder="e.g. 150"
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Your car</label>
          <select value={carIdx} onChange={e=>setCarIdx(Number(e.target.value))}
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-green-500">
            {CARS.map((c,i) => <option key={i} value={i}>{c.label} {!['Custom'].includes(c.label) ? `(${c.mpg} MPG)` : ''}</option>)}
          </select>
        </div>

        {isCustom && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Your MPG</label>
              <input type="number" value={customMpg} onChange={e=>setCustomMpg(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Fuel type</label>
              <select value={customFuel} onChange={e=>setCustomFuel(e.target.value as 'petrol'|'diesel')}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-green-500">
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">
            {fuelType === 'petrol' ? 'Petrol' : 'Diesel'} price (p/litre)
          </label>
          <input type="number" step="0.1" value={pricePer} onChange={e=>setPricePer(e.target.value)}
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-green-500" />
          <p className="text-xs text-gray-400 mt-1">UK average today: {fuelType==='petrol'?UK_AVG_PRICES.petrol:UK_AVG_PRICES.diesel}p/litre</p>
        </div>

        <button onClick={calculate}
          className="w-full bg-green-600 hover:bg-green-500 text-gray-900 font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          <Calculator className="h-5 w-5" /> Calculate Cost
        </button>
      </div>

      {result && (
        <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-6">
          <h2 className="font-bold text-gray-900 text-xl mb-4">Your Journey Cost</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-extrabold text-green-400">£{result.cost.toFixed(2)}</p>
              <p className="text-sm text-gray-400 mt-1">Total cost</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{result.litres.toFixed(1)}L</p>
              <p className="text-sm text-gray-400 mt-1">Fuel used</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{(result.cost / parseFloat(miles) * 100).toFixed(1)}p</p>
              <p className="text-sm text-gray-400 mt-1">Per mile</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-500/20">
            <p className="text-sm text-gray-400">Based on {mpg} MPG · {pricePerLitre}p/litre · {miles} miles</p>
          </div>
        </div>
      )}
    </div>
  )
}
