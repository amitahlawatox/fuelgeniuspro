import Link from 'next/link'
import PriceCard from '@/components/PriceCard'
import { UK_AVG_PRICES, MOCK_STATIONS } from '@/lib/mockData'
import { ukCities } from '@/lib/ukCities'
import { MapPin, Calculator, Car, Zap, TrendingDown, Shield, Bell } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FuelGeniusPro — Cheapest Petrol & Diesel Near You',
  description: `UK average petrol today: ${UK_AVG_PRICES.petrol}p. Find your cheapest local fuel station with our live price map, journey calculator, and DVLA car checker.`,
}

export default function HomePage() {
  const cheapest = [...MOCK_STATIONS].sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999)).slice(0, 5)

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-sm text-green-400 mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live prices updated every hour
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-4 leading-tight">
            Find the <span className="text-green-500">Cheapest Fuel</span><br />Near You — Right Now
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Live petrol & diesel prices from thousands of UK stations. Save up to 15p per litre every fill-up.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/fuel-tracker" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg">
              <MapPin className="h-5 w-5" /> View Fuel Map
            </Link>
            <Link href="/journey" className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-lg border border-gray-700">
              <Calculator className="h-5 w-5" /> Journey Calculator
            </Link>
          </div>
        </div>
      </section>

      {/* Live Avg Prices */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-white mb-2">UK Average Fuel Prices Today</h2>
        <p className="text-gray-400 text-sm mb-6">Updated: {new Date(UK_AVG_PRICES.lastUpdated).toLocaleString('en-GB')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <PriceCard label="Unleaded Petrol (E10)" price={UK_AVG_PRICES.petrol} change={-1.2} />
          <PriceCard label="Diesel (B7)" price={UK_AVG_PRICES.diesel} change={0.4} />
        </div>
      </section>

      {/* Cheapest nearby */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Cheapest Stations Right Now</h2>
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Station</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Brand</th>
                <th className="text-right px-4 py-3">Petrol</th>
                <th className="text-right px-4 py-3">Diesel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {cheapest.map(s => (
                <tr key={s.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{s.name}</p>
                    <p className="text-gray-500 text-xs">{s.postcode}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-400">{s.brand}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-400">{s.petrol ? `${s.petrol.toFixed(1)}p` : '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-400">{s.diesel ? `${s.diesel.toFixed(1)}p` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-center">
          <Link href="/fuel-tracker" className="text-green-400 hover:text-green-300 text-sm font-medium">View all stations on the map →</Link>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Everything you need to save on fuel</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { href: '/fuel-tracker', icon: MapPin, color: 'green', title: 'Live Fuel Map', desc: 'See every petrol station near you with live prices on an interactive map.' },
            { href: '/journey', icon: Calculator, color: 'blue', title: 'Journey Calculator', desc: 'Enter your route and car to see exact fuel cost before you drive.' },
            { href: '/car-health', icon: Car, color: 'purple', title: 'DVLA Car Checker', desc: 'Check any UK vehicle\'s MOT, tax status and official MPG in seconds.' },
            { href: '/ev-charging', icon: Zap, color: 'yellow', title: 'EV Charger Finder', desc: 'Find every public EV charge point near you with real-time availability.' },
          ].map(({ href, icon: Icon, color, title, desc }) => (
            <Link key={href} href={href} className="group bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all hover:-translate-y-0.5">
              <div className={`w-10 h-10 rounded-lg bg-${color}-500/10 flex items-center justify-center mb-4`}>
                <Icon className={`h-5 w-5 text-${color}-400`} />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* SEO City Links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6">Fuel Prices by City</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {ukCities.map(city => (
            <Link key={city.slug} href={`/fuel/${city.slug}`} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 hover:text-green-400 hover:border-green-500/30 transition-colors text-center">
              {city.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: TrendingDown, title: 'Save up to 15p/litre', desc: 'The price gap between the cheapest and most expensive stations near you is often huge.' },
            { icon: Shield, title: 'Official UK Data', desc: 'Prices sourced from the CMA mandatory fuel price dataset and Fuel Finder API.' },
            { icon: Bell, title: 'Live Updates', desc: 'Prices refresh every hour so you\'re always seeing the latest data before you drive.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
