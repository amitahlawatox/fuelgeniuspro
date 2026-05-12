'use client'
import { useEffect, useRef } from 'react'
import type { FuelStation } from '@/lib/mockData'
import { priceBandColor } from '@/lib/mockData'

interface FuelMapProps {
  stations: FuelStation[]
  center?: [number, number]
  zoom?: number
}

export default function FuelMap({ stations, center = [52.3555, -1.1743], zoom = 6 }: FuelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    let L: typeof import('leaflet')
    let map: import('leaflet').Map

    const init = async () => {
      L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      map = L.map(mapRef.current!, { center, zoom, zoomControl: true, attributionControl: true })
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      stations.forEach(station => {
        const price = station.petrol ?? station.diesel
        if (!price) return
        const color = priceBandColor(price)

        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color};color:#111;font-size:10px;font-weight:700;padding:3px 5px;border-radius:6px;border:2px solid rgba(255,255,255,0.3);white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.5);">${price.toFixed(1)}p</div>`,
          iconAnchor: [20, 10],
        })

        L.marker([station.lat, station.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px">
              <strong style="font-size:14px">${station.name}</strong>
              <p style="color:#888;font-size:12px;margin:2px 0">${station.brand}</p>
              <p style="font-size:12px">${station.address}</p>
              <hr style="border-color:#444;margin:6px 0"/>
              ${station.petrol ? `<p style="color:#22c55e;font-weight:700">⛽ Petrol: ${station.petrol.toFixed(1)}p</p>` : ''}
              ${station.diesel ? `<p style="color:#60a5fa;font-weight:700">🚛 Diesel: ${station.diesel.toFixed(1)}p</p>` : ''}
              <p style="color:#666;font-size:11px;margin-top:4px">Updated: ${new Date(station.lastUpdated).toLocaleTimeString('en-GB')}</p>
            </div>
          `)
      })

      if (stations.length > 1) {
        const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng]))
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    }

    init()
    return () => { map?.remove(); mapInstanceRef.current = null }
  }, [stations, center, zoom])

  return (
    <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" style={{ minHeight: '500px' }} />
  )
}
