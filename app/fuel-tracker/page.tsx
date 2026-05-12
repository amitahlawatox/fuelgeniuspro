import dynamic from 'next/dynamic'
import { MOCK_STATIONS, UK_AVG_PRICES } from '@/lib/mockData'
import PriceCard from '@/components/PriceCard'
import type { Metadata } from 'next'

const FuelMap = dynamic(() => import('@/components/FuelMap'), { ssr: false, loading: () => <div className="w-full h-[500px] bg-gray-900 rounded-xl flex items-center justify-center text-gray-500">Loading map…</div> })

export const metadata: Metadata = {
  title: 'Live Fuel Price Map — Petrol & Diesel Near You',
  description: 'Interactive map of UK petrol and diesel prices. Find the cheapest fuel station near you right now.',
}

export default function FuelTrackerPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Live UK Fuel Price Map</h1>
      <p className="text-gray-400 mb-6">Hover a pin to see the price. Click for full details. Updated hourly from the CMA dataset.</p>
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-lg">
        <PriceCard label="UK Avg Petrol" price={UK_AVG_PRICES.petrol} change={-1.2} />
        <PriceCard label="UK Avg Diesel" price={UK_AVG_PRICES.diesel} change={0.4} />
      </div>
      <div className="h-[550px] mb-8 rounded-xl overflow-hidden border border-gray-800">
        <FuelMap stations={MOCK_STATIONS} />
      </div>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">All Stations</h2>
          <span className="text-xs text-gray-400">{MOCK_STATIONS.length} stations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="text-left px-4 py-3">Station</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Address</th>
                <th className="text-right px-4 py-3">Petrol</th>
                <th className="text-right px-4 py-3">Diesel</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[...MOCK_STATIONS].sort((a,b)=>(a.petrol??999)-(b.petrol??999)).map(s => (
                <tr key={s.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{s.name}</p>
                    <p className="text-gray-500 text-xs">{s.brand}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs">{s.address}, {s.postcode}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-400">{s.petrol ? `${s.petrol.toFixed(1)}p` : '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-400">{s.diesel ? `${s.diesel.toFixed(1)}p` : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs hidden sm:table-cell">{new Date(s.lastUpdated).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
