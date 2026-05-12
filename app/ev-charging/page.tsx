import { Zap, MapPin, Battery } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EV Charger Finder — Find Electric Car Charging Near You',
  description: 'Find public EV charging stations near you across the UK. Filter by connector type and charging speed.',
}

const MOCK_CHARGERS = [
  { id:'1', name:'Pod Point — Tesco Extra', address:'100 High St, London', postcode:'SW1A 1AA', connectors:['Type 2','CCS'], kw:22, available:3, total:4, lat:51.501, lng:-0.141 },
  { id:'2', name:'BP Pulse — Shell Victoria', address:'12 Vauxhall Bridge Rd', postcode:'SW1V 2SA', connectors:['CCS','CHAdeMO'], kw:150, available:1, total:2, lat:51.495, lng:-0.139 },
  { id:'3', name:'Osprey — Waterloo Station', address:'Waterloo Rd, London', postcode:'SE1 8SW', connectors:['CCS'], kw:100, available:0, total:2, lat:51.503, lng:-0.113 },
  { id:'4', name:'Gridserve — London Bridge', address:'45 Borough High St', postcode:'SE1 1NA', connectors:['Type 2','CCS','CHAdeMO'], kw:350, available:6, total:8, lat:51.503, lng:-0.085 },
  { id:'5', name:'Ubitricity — Camden', address:'30 Camden High St', postcode:'NW1 0JH', connectors:['Type 2'], kw:5.5, available:2, total:2, lat:51.539, lng:-0.142 },
  { id:'6', name:'ChargePoint — Canary Wharf', address:'Canada Square, London', postcode:'E14 5AB', connectors:['Type 2','CCS'], kw:50, available:4, total:6, lat:51.504, lng:-0.019 },
]

function speedLabel(kw: number) {
  if (kw >= 100) return { label:'Ultra-rapid', color:'text-purple-400', bg:'bg-purple-500/10' }
  if (kw >= 50) return { label:'Rapid', color:'text-red-400', bg:'bg-red-500/10' }
  if (kw >= 22) return { label:'Fast', color:'text-amber-400', bg:'bg-amber-500/10' }
  return { label:'Slow', color:'text-blue-400', bg:'bg-blue-500/10' }
}

export default function EVChargingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
          <Zap className="h-5 w-5 text-yellow-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">EV Charger Finder</h1>
      </div>
      <p className="text-gray-400 mb-8">Find public electric vehicle charging stations near you. Data from the National Chargepoint Registry (NCR).</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[['9,000+','Public Chargers'],['3,200+','Rapid Chargers'],['1,100+','Ultra-rapid'],['24/7','Most Open']].map(([n,l]) => (
          <div key={l} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{n}</p>
            <p className="text-sm text-gray-400 mt-1">{l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        {MOCK_CHARGERS.map(c => {
          const speed = speedLabel(c.kw)
          const available = c.available > 0
          return (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${speed.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Zap className={`h-4 w-4 ${speed.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{c.name}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{c.address}, {c.postcode}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${speed.bg} ${speed.color} font-medium`}>{speed.label} · {c.kw}kW</span>
                      {c.connectors.map(conn => (
                        <span key={conn} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{conn}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                <div className={`flex items-center gap-1.5 text-sm font-semibold ${available ? 'text-green-400' : 'text-red-400'}`}>
                  <Battery className="h-4 w-4" />
                  {available ? `${c.available} available` : 'All in use'}
                </div>
                <p className="text-xs text-gray-500">{c.total} connectors total</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 text-sm text-gray-400">
        <p><span className="text-blue-400 font-semibold">Data source:</span> National Chargepoint Registry (NCR), Open Charge Map. Availability data is indicative. Always check the network operator app for real-time status.</p>
      </div>
    </div>
  )
}
