'use client'
import { useState } from 'react'
import { Car, Search, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

interface VehicleData {
  registrationNumber: string
  make: string
  colour: string
  fuelType: string
  yearOfManufacture: number
  engineCapacity: number
  co2Emissions: number
  motStatus: string
  taxStatus: string
  taxDueDate?: string
  motExpiryDate?: string
  typeApproval?: string
  wheelplan?: string
  monthOfFirstRegistration?: string
}

function StatusBadge({ status }: { status: string }) {
  const ok = ['Taxed','Valid','Not due'].some(s => status.toLowerCase().includes(s.toLowerCase()))
  const warn = status.toLowerCase().includes('sorn') || status.toLowerCase().includes('expired')
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
      ok ? 'bg-green-500/15 text-green-400' : warn ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
    }`}>
      {ok ? <CheckCircle className="h-3 w-3"/> : warn ? <AlertTriangle className="h-3 w-3"/> : <XCircle className="h-3 w-3"/>}
      {status}
    </span>
  )
}

export default function CarHealthPage() {
  const [reg, setReg] = useState('')
  const [loading, setLoading] = useState(false)
  const [vehicle, setVehicle] = useState<VehicleData | null>(null)
  const [error, setError] = useState('')

  async function lookup() {
    const clean = reg.replace(/\s/g,'').toUpperCase()
    if (!clean) return
    setLoading(true); setError(''); setVehicle(null)
    try {
      const res = await fetch('/api/dvla', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ registrationNumber: clean }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Vehicle not found')
      setVehicle(data)
    } catch(e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not find that vehicle. Check the registration and try again.')
    } finally { setLoading(false) }
  }

  const rows = vehicle ? [
    ['Make', vehicle.make],
    ['Colour', vehicle.colour],
    ['Fuel Type', vehicle.fuelType],
    ['Year', String(vehicle.yearOfManufacture)],
    ['Engine', vehicle.engineCapacity ? `${vehicle.engineCapacity}cc` : '—'],
    ['CO₂', vehicle.co2Emissions ? `${vehicle.co2Emissions}g/km` : '—'],
    ['First Registered', vehicle.monthOfFirstRegistration ?? '—'],
    ['Wheelplan', vehicle.wheelplan ?? '—'],
  ] : []

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
          <Car className="h-5 w-5 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Car Health Check</h1>
      </div>
      <p className="text-gray-400 mb-8">Enter any UK number plate to check MOT status, tax, fuel type and more via the official DVLA database.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Number Plate</label>
        <div className="flex gap-3">
          <input
            value={reg}
            onChange={e => setReg(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="e.g. AB12 CDE"
            className="flex-1 bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-4 py-3 text-yellow-300 placeholder-yellow-600 font-mono text-lg font-bold tracking-widest uppercase focus:outline-none focus:border-yellow-400"
          />
          <button onClick={lookup} disabled={loading}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center gap-2">
            <Search className="h-4 w-4" />
            {loading ? 'Checking…' : 'Check'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Powered by the official DVLA Vehicle Enquiry Service API</p>
      </div>

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <XCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {vehicle && (
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800 px-5 py-4 flex items-center justify-between">
            <div>
              <span className="font-mono text-xl font-bold text-yellow-300 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 rounded">{vehicle.registrationNumber}</span>
              <span className="ml-3 text-white font-semibold">{vehicle.make}</span>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">MOT Status</p>
                <StatusBadge status={vehicle.motStatus} />
                {vehicle.motExpiryDate && <p className="text-xs text-gray-500 mt-1">Expires: {vehicle.motExpiryDate}</p>}
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Tax Status</p>
                <StatusBadge status={vehicle.taxStatus} />
                {vehicle.taxDueDate && <p className="text-xs text-gray-500 mt-1">Due: {vehicle.taxDueDate}</p>}
              </div>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-800">
                {rows.map(([k,v]) => (
                  <tr key={k}>
                    <td className="py-2.5 text-gray-400 w-1/2">{k}</td>
                    <td className="py-2.5 text-white font-medium capitalize">{v?.toLowerCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
