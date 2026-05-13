'use client'
import { useEffect, useRef } from 'react'
import type { FuelStation } from '@/lib/mockData'
import { priceBandColor } from '@/lib/mockData'

interface FuelMapProps {
  stations: FuelStation[]
  center?: [number, number]
  zoom?: number
}

export default function FuelMap({ stations, center = [52.3555, -1.1743], zoom = 11 }: FuelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return
    if ((mapRef.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
    if (mapInstanceRef.current) return

    let map: import('leaflet').Map

    const init = async () => {
      if (!mapRef.current) return
      const L = (await import('leaflet')).default

      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      if ((mapRef.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      map = L.map(mapRef.current, { center, zoom, zoomControl: true, attributionControl: true })
      mapInstanceRef.current = map

      // Light tile layer — CartoDB Positron
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      stations.forEach(station => {
        const price = station.petrol ?? station.diesel
        if (!price || !station.lat || !station.lng) return
        const color = priceBandColor(price)

        // Petrol pump SVG icon
        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              display:flex;flex-direction:column;align-items:center;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
            ">
              <div style="
                background:${color};
                color:#fff;
                font-size:11px;
                font-weight:800;
                padding:4px 7px;
                border-radius:8px;
                white-space:nowrap;
                line-height:1.2;
                border:2px solid rgba(255,255,255,0.8);
                min-width:44px;
                text-align:center;
              ">${price.toFixed(1)}p</div>
              <div style="
                width:0;height:0;
                border-left:6px solid transparent;
                border-right:6px solid transparent;
                border-top:8px solid ${color};
                margin-top:-1px;
              "></div>
            </div>`,
          iconAnchor: [22, 42],
          iconSize: [44, 42],
        })

        L.marker([station.lat, station.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px;font-family:-apple-system,sans-serif">
              <div style="font-weight:700;font-size:14px;color:#111;margin-bottom:4px">
                ⛽ ${station.name}
              </div>
              <div style="color:#666;font-size:12px;margin-bottom:6px">${station.brand} · ${station.address}</div>
              <hr style="border:none;border-top:1px solid #eee;margin:6px 0"/>
              ${station.petrol ? `<div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#555">Petrol E10</span><span style="color:#16a34a;font-weight:800;font-size:15px">${station.petrol.toFixed(1)}p</span></div>` : ''}
              ${station.diesel ? `<div style="display:flex;justify-content:space-between"><span style="color:#555">Diesel B7</span><span style="color:#2563eb;font-weight:800;font-size:15px">${station.diesel.toFixed(1)}p</span></div>` : ''}
              <div style="color:#aaa;font-size:10px;margin-top:6px">Updated: ${new Date(station.lastUpdated).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          `, { maxWidth: 220 })
      })

      if (stations.length > 0) {
        const validStations = stations.filter(s => s.lat && s.lng)
        if (validStations.length > 1) {
          const bounds = L.latLngBounds(validStations.map(s => [s.lat, s.lng]))
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
        } else if (validStations.length === 1) {
          map.setView([validStations[0].lat, validStations[0].lng], 13)
        }
      }
    }

    init()
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [stations, center, zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: '500px' }} />
}
