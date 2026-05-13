import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface PriceCardProps {
  label: string
  price: number
  change?: number
  unit?: string
}

export default function PriceCard({ label, price, change = 0, unit = 'p/litre' }: PriceCardProps) {
  const color = price <= 139.9 ? 'text-green-600' : price <= 145.9 ? 'text-amber-600' : 'text-red-600'
  const bg = price <= 139.9 ? 'bg-green-50 border-green-200' : price <= 145.9 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  return (
    <div className={`rounded-xl border p-5 ${bg}`}>
      <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{price.toFixed(1)}<span className="text-lg font-normal text-gray-400 ml-1">{unit}</span></p>
      {change !== 0 && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${change < 0 ? 'text-green-600' : 'text-red-500'}`}>
          {change < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          <span>{Math.abs(change).toFixed(1)}p vs last week</span>
        </div>
      )}
      {change === 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <Minus className="h-3 w-3" /><span>Unchanged vs last week</span>
        </div>
      )}
    </div>
  )
}
