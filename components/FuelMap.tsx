'use client'
import { useEffect, useRef } from 'react'

interface Station {
  id: string; name: string; brand: string; address: string; postcode: string
  lat: number; lng: number; petrol: number | null; diesel: number | null
  super_unleaded?: number | null; lastUpdated: string; distanceMiles?: number
  facilities?: string[]
}

interface FuelMapProps {
  stations: Station[]
  center?: [number, number]
  zoom?: number
}

function priceBandColor(p: number): string {
  if (p <= 140) return '#16a34a'
  if (p <= 150) return '#d97706'
  if (p <= 160) return '#ea580c'
  return '#dc2626'
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

      map = L.map(mapRef.current, { center, zoom, zoomControl: true })
      mapInstanceRef.current = map

      // Light map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd', maxZoom: 19,
      }).addTo(map)

      stations.forEach(station => {
        const price = station.petrol ?? station.diesel
        if (!price || !station.lat || !station.lng) return
        const color = priceBandColor(price)
        const stationName = station.name || station.address || `${station.brand} ${station.postcode}`
        const facilities = station.facilities ?? []

        const icon = L.divIcon({
          className: '',
          html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3))">
            <div style="background:${color};color:#fff;font-size:12px;font-weight:800;padding:4px 8px;border-radius:8px;white-space:nowrap;border:2px solid rgba(255,255,255,0.9);min-width:50px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)">${price.toFixed(1)}p</div>
            <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${color};margin-top:-1px"></div>
          </div>`,
          iconAnchor: [25, 45], iconSize: [50, 45],
        })

        const facilitiesHtml = facilities.length
          ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0">
               <div style="font-size:10px;color:#888;font-weight:600;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px">Facilities</div>
               <div style="display:flex;flex-wrap:wrap;gap:4px">
                 ${facilities.map(f => `<span style="background:#f3f4f6;border-radius:4px;padding:2px 6px;font-size:11px;color:#374151">${f}</span>`).join('')}
               </div>
             </div>`
          : ''

        L.marker([station.lat, station.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:200px;max-width:240px;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:18px">⛽</span>
                <div>
                  <div style="font-weight:700;font-size:13px;color:#111;line-height:1.3">${stationName}</div>
                  <div style="color:#888;font-size:11px">${station.brand} · ${station.postcode}</div>
                </div>
              </div>
              <hr style="border:none;border-top:1px solid #f0f0f0;margin:8px 0"/>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                ${station.petrol ? `<div style="background:#f0fdf4;border-radius:8px;padding:6px 8px"><div style="font-size:10px;color:#15803d;font-weight:600">PETROL E10</div><div style="font-size:18px;font-weight:800;color:#16a34a">${station.petrol.toFixed(1)}p</div></div>` : ''}
                ${station.diesel ? `<div style="background:#eff6ff;border-radius:8px;padding:6px 8px"><div style="font-size:10px;color:#1d4ed8;font-weight:600">DIESEL B7</div><div style="font-size:18px;font-weight:800;color:#2563eb">${station.diesel.toFixed(1)}p</div></div>` : ''}
                ${station.super_unleaded ? `<div style="background:#fdf4ff;border-radius:8px;padding:6px 8px"><div style="font-size:10px;color:#7e22ce;font-weight:600">SUPER</div><div style="font-size:16px;font-weight:800;color:#9333ea">${station.super_unleaded.toFixed(1)}p</div></div>` : ''}
              </div>
              ${facilitiesHtml}
              <div style="margin-top:8px">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}" target="_blank"
                   style="display:block;text-align:center;background:#111;color:#fff;border-radius:8px;padding:7px;font-size:12px;font-weight:600;text-decoration:none">
                  🗺️ Get Directions
                </a>
              </div>
              <div style="color:#ccc;font-size:10px;margin-top:5px;text-align:center">Updated: ${new Date(station.lastUpdated).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          `, { maxWidth: 260 })
      })

      if (stations.length > 0) {
        const valid = stations.filter(s => s.lat && s.lng)
        if (valid.length > 1) {
          map.fitBounds(L.latLngBounds(valid.map(s => [s.lat, s.lng])), { padding: [40, 40], maxZoom: 13 })
        } else if (valid.length === 1) {
          map.setView([valid[0].lat, valid[0].lng], 13)
        }
      }
    }

    init()
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [stations, center, zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: '500px' }} />
}
