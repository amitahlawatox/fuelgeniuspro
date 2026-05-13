import Link from 'next/link'
import { Fuel } from 'lucide-react'

const cities = ['london','birmingham','manchester','leeds','glasgow','sheffield','liverpool','bristol','cardiff','nottingham']

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg text-white mb-3">
              <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center"><Fuel className="h-4 w-4 text-white" /></div>
              FuelGeniusPro
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">Live UK petrol & diesel prices. Save money every fill-up.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Tools</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {[['Fuel Price Map','/fuel-tracker'],['Journey Calculator','/journey'],['EV Charger Finder','/ev-charging'],['Car Health Check','/car-health']].map(([l,h])=>(
                <li key={h}><Link href={h} className="hover:text-green-400 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Top Cities</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {cities.slice(0,5).map(c=>(
                <li key={c}><Link href={`/fuel/${c}`} className="hover:text-green-400 transition-colors capitalize">{c}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">More Cities</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {cities.slice(5).map(c=>(
                <li key={c}><Link href={`/fuel/${c}`} className="hover:text-green-400 transition-colors capitalize">{c}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-xs text-gray-500 space-y-1">
          <p>© {new Date().getFullYear()} FuelGeniusPro. Fuel price data sourced under the UK CMA Fuel Price Open Data initiative.</p>
          <p>DVLA data © Driver & Vehicle Licensing Agency. Not financial or motoring advice. Prices for guidance only.</p>
        </div>
      </div>
    </footer>
  )
}
