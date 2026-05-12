'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Fuel, Menu, X, Zap, MapPin, Car, Calculator, BookOpen } from 'lucide-react'

const links = [
  { href: '/fuel-tracker', label: 'Fuel Map', icon: MapPin },
  { href: '/ev-charging', label: 'EV Charging', icon: Zap },
  { href: '/journey', label: 'Journey Cost', icon: Calculator },
  { href: '/car-health', label: 'Car Health', icon: Car },
  { href: '/blog', label: 'Blog', icon: BookOpen },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
            <Fuel className="h-6 w-6 text-green-500" />
            <span>Fuel<span className="text-green-500">Genius</span>Pro</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 pb-4 pt-2 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
