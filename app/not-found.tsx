import Link from 'next/link'
import { Fuel } from 'lucide-react'
export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center">
        <Fuel className="h-16 w-16 text-green-500 mx-auto mb-4 opacity-50" />
        <h1 className="text-6xl font-extrabold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-400 mb-6">Page not found — the tank is empty here.</p>
        <Link href="/" className="bg-green-600 hover:bg-green-500 text-gray-900 font-semibold px-6 py-3 rounded-xl transition-colors">Back to Home</Link>
      </div>
    </div>
  )
}
