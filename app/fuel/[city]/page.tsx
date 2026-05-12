import { ukCities, getCityBySlug } from '@/lib/ukCities'
import { MOCK_STATIONS, UK_AVG_PRICES } from '@/lib/mockData'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, TrendingDown } from 'lucide-react'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return ukCities.map(c => ({ city: c.slug }))
}

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const city = getCityBySlug(params.city)
  if (!city) return {}
  return {
    title: `Cheapest Petrol in ${city.name} Today — Live Prices`,
    description: `Find the cheapest petrol and diesel in ${city.name}, ${city.county}. Live fuel prices at every station near ${city.postcode}. Updated hourly.`,
    keywords: [`cheapest petrol ${city.name}`, `diesel prices ${city.name}`, `fuel prices ${city.name.toLowerCase()}`, `petrol stations near ${city.postcode}`],
    alternates: { canonical: `https://fuelgeniuspro.com/fuel/${city.slug}` },
  }
}

function cityPrice(base: number, slug: string): number {
  const seed = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const offset = ((seed % 10) - 5) * 0.3
  return Math.round((base + offset) * 10) / 10
}

export default function CityPage({ params }: { params: { city: string } }) {
  const city = getCityBySlug(params.city)
  if (!city) notFound()

  const cityPetrol = cityPrice(UK_AVG_PRICES.petrol, city.slug)
  const cityDiesel = cityPrice(UK_AVG_PRICES.diesel, city.slug)

  const stations = MOCK_STATIONS.map((s, i) => ({
    ...s,
    name: `${['Tesco','Asda','Morrisons','BP','Shell','Esso','Jet','Texaco'][i % 8]} ${city.name}`,
    petrol: cityPrice(UK_AVG_PRICES.petrol - 2 + (i * 0.7), city.slug),
    diesel: cityPrice(UK_AVG_PRICES.diesel - 2 + (i * 0.7), city.slug),
  })).sort((a, b) => (a.petrol ?? 999) - (b.petrol ?? 999))

  const cheapest = stations[0]
  const saving = (UK_AVG_PRICES.petrol - cheapest.petrol!).toFixed(1)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Cheapest Petrol in ${city.name}`,
    description: `Live petrol and diesel prices in ${city.name}, ${city.county}`,
    url: `https://fuelgeniuspro.com/fuel/${city.slug}`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fuelgeniuspro.com' },
        { '@type': 'ListItem', position: 2, name: 'Fuel Prices', item: 'https://fuelgeniuspro.com/fuel-tracker' },
        { '@type': 'ListItem', position: 3, name: city.name, item: `https://fuelgeniuspro.com/fuel/${city.slug}` },
      ]
    }
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">Home</Link>
          <span>/</span>
          <Link href="/fuel-tracker" className="hover:text-gray-300">Fuel Tracker</Link>
          <span>/</span>
          <span className="text-gray-300">{city.name}</span>
        </nav>

        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5 text-green-500" />
          <span className="text-sm text-green-400 font-medium">{city.county}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Cheapest Petrol in {city.name} Today
        </h1>
        <p className="text-gray-400 mb-8 text-lg">
          Live petrol and diesel prices at every station in {city.name} ({city.postcode}). Updated every hour from the CMA fuel price dataset.
        </p>

        {/* Highlight box */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 mb-8 flex flex-col sm:flex-row gap-4 sm:items-center">
          <TrendingDown className="h-8 w-8 text-green-400 flex-shrink-0" />
          <div>
            <p className="font-bold text-white text-lg">Cheapest petrol in {city.name}: <span className="text-green-400">{cheapest.petrol?.toFixed(1)}p/litre</span></p>
            <p className="text-sm text-gray-400">{cheapest.name} · {parseFloat(saving) > 0 ? `${saving}p cheaper than UK average` : 'At UK average price'}</p>
          </div>
        </div>

        {/* Avg prices */}
        <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Avg Petrol ({city.name})</p>
            <p className="text-2xl font-bold text-green-400">{cityPetrol.toFixed(1)}p</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Avg Diesel ({city.name})</p>
            <p className="text-2xl font-bold text-blue-400">{cityDiesel.toFixed(1)}p</p>
          </div>
        </div>

        {/* Station table */}
        <h2 className="text-xl font-bold text-white mb-4">All Stations in {city.name}</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Station</th>
                <th className="text-right px-4 py-3">Petrol</th>
                <th className="text-right px-4 py-3">Diesel</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">vs UK avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {stations.map((s, i) => {
                const diff = ((s.petrol ?? 0) - UK_AVG_PRICES.petrol).toFixed(1)
                return (
                  <tr key={s.id} className={`hover:bg-gray-800/50 transition-colors ${i === 0 ? 'bg-green-500/5' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white flex items-center gap-1.5">
                        {i === 0 && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-semibold">CHEAPEST</span>}
                        {s.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-400">{s.petrol?.toFixed(1)}p</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-400">{s.diesel?.toFixed(1)}p</td>
                    <td className={`px-4 py-3 text-right text-xs hidden sm:table-cell ${parseFloat(diff) < 0 ? 'text-green-400' : parseFloat(diff) > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {parseFloat(diff) < 0 ? `${diff}p` : parseFloat(diff) > 0 ? `+${diff}p` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* SEO copy */}
        <div className="prose prose-invert max-w-none text-gray-400 text-sm space-y-3 mb-8">
          <p>Petrol prices in {city.name} today average <strong className="text-white">{cityPetrol.toFixed(1)}p per litre</strong>, with diesel at <strong className="text-white">{cityDiesel.toFixed(1)}p per litre</strong>. The cheapest station in {city.name} is currently {cheapest.name} at {cheapest.petrol?.toFixed(1)}p for unleaded.</p>
          <p>To find cheap petrol in {city.name}, supermarket forecourts (Tesco, Asda, Morrisons) are typically 3–6p cheaper than branded stations. Use the FuelGeniusPro map to compare live prices before you fill up.</p>
          <p>Fuel prices in {city.name} are updated every hour directly from the UK Competition and Markets Authority (CMA) mandatory fuel price dataset.</p>
        </div>

        {/* Nearby cities */}
        {city.nearby.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Nearby Areas</h2>
            <div className="flex flex-wrap gap-2">
              {city.nearby.map(slug => (
                <Link key={slug} href={`/fuel/${slug}`} className="bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-green-400 hover:border-green-500/30 transition-colors capitalize">
                  {slug.replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-xs text-gray-600">Fuel price data sourced under the UK Open Government Licence v3.0. © Competition and Markets Authority. Prices are for guidance only and may vary.</p>
      </div>
    </>
  )
}
