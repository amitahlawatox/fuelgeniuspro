'use client'
import { useEffect, useRef } from 'react'
import { priceBandColor } from '@/lib/mockData'

interface Station {
  id: string; name: string; brand: string; address: string; postcode: string
  lat: number; lng: number; petrol: number | null; diesel: number | null
  super_unleaded?: number | null; premium_diesel?: number | null
  facilities?: string[]; lastUpdated: string
}

interface FuelMapProps {
  stations: Station[]
  center?: [number, number]
  zoom?: number
}

const FACILITY_ICONS: Record<string, { icon: string; label: string }> = {
  parking:      { icon: '🅿️', label: 'Parking' },
  convenience:  { icon: '🛒', label: 'Shop' },
  atm:          { icon: '🏧', label: 'ATM' },
  toilet:       { icon: '🚻', label: 'Toilets' },
  car_wash:     { icon: '🚿', label: 'Car Wash' },
  air_water:    { icon: '💨', label: 'Air & Water' },
  ev_charging:  { icon: '⚡', label: 'EV Charging' },
  wifi:         { icon: '📶', label: 'WiFi' },
  restaurant:   { icon: '🍴', label: 'Restaurant' },
  disabled:     { icon: '♿', label: 'Disabled' },
  open_24h:     { icon: '🕐', label: '24/7' },
  alcohol:      { icon: '🍷', label: 'Alcohol' },
}

const BRAND_COLORS: Record<string, string> = {
  'Tesco': '#00539F', "Sainsbury's": '#FF7600', 'Asda': '#78BE20',
  'Morrisons': '#005E3D', 'BP': '#009900', 'Shell': '#DD1D21',
  'Esso': '#007AC0', 'Jet': '#E31F26', 'Gulf': '#FF6600',
  'Texaco': '#CC0000', 'Co-op': '#00B5E2',
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

      // Light CartoDB Positron tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd', maxZoom: 19,
      }).addTo(map)

      stations.forEach(station => {
        const price = station.petrol ?? station.diesel
        if (!price || !station.lat || !station.lng) return

        const priceColor = priceBandColor(price)
        const brandColor = BRAND_COLORS[station.brand] ?? '#374151'

        // Marker: brand-coloured pump icon with price badge
        const icon = L.divIcon({
          className: '',
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.2));">
              <div style="
                background:white;
                border:3px solid ${brandColor};
                border-radius:10px;
                padding:3px 8px;
                display:flex;
                align-items:center;
                gap:4px;
                white-space:nowrap;
              ">
                <span style="font-size:10px;font-weight:900;color:${priceColor}">${price.toFixed(1)}p</span>
              </div>
              <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${brandColor};margin-top:-2px;"></div>
            </div>`,
          iconAnchor: [24, 34],
          iconSize: [48, 34],
        })

        // Build facilities HTML
        const facilityHtml = (station.facilities ?? [])
          .map(f => {
            const fi = FACILITY_ICONS[f]
            return fi ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;min-width:52px;font-family:-apple-system,sans-serif">
              <span style="font-size:16px">${fi.icon}</span>
              <span style="font-size:9px;color:#64748b;font-weight:500;text-align:center">${fi.label}</span>
            </div>` : ''
          })
          .filter(Boolean)
          .join('')

        // Full popup
        const stationDisplayName = station.name || `${station.brand} ${station.postcode}`
        const popup = `
          <div style="min-width:220px;max-width:280px;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="background:${brandColor};color:white;font-size:10px;font-weight:700;padding:3px 7px;border-radius:6px">${station.brand.toUpperCase()}</div>
              <div style="font-weight:700;font-size:13px;color:#111;line-height:1.3">${stationDisplayName}</div>
            </div>
            <div style="color:#6b7280;font-size:11px;margin-bottom:10px">
              📍 ${station.address}${station.postcode ? ', ' + station.postcode : ''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
              ${station.petrol ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 10px"><div style="font-size:10px;color:#6b7280">Petrol E10</div><div style="font-size:16px;font-weight:800;color:#16a34a">${station.petrol.toFixed(1)}p</div></div>` : ''}
              ${station.diesel ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px 10px"><div style="font-size:10px;color:#6b7280">Diesel B7</div><div style="font-size:16px;font-weight:800;color:#2563eb">${station.diesel.toFixed(1)}p</div></div>` : ''}
              ${station.super_unleaded ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:6px 10px"><div style="font-size:10px;color:#6b7280">Super Unleaded</div><div style="font-size:15px;font-weight:800;color:#ea580c">${station.super_unleaded.toFixed(1)}p</div></div>` : ''}
              ${station.premium_diesel ? `<div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:6px 10px"><div style="font-size:10px;color:#6b7280">Premium Diesel</div><div style="font-size:15px;font-weight:800;color:#7c3aed">${station.premium_diesel.toFixed(1)}p</div></div>` : ''}
            </div>
            ${facilityHtml ? `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:#6b7280;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em">Facilities</div><div style="display:flex;flex-wrap:wrap;gap:4px">${facilityHtml}</div></div>` : ''}
            <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}" target="_blank"
              style="display:block;text-align:center;background:#111;color:white;font-size:12px;font-weight:600;padding:7px;border-radius:8px;text-decoration:none;margin-top:4px">
              🧭 Get Directions
            </a>
            <div style="color:#cbd5e1;font-size:10px;margin-top:5px;text-align:right">Updated: ${new Date(station.lastUpdated).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
          </div>`

        L.marker([station.lat, station.lng], { icon })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 290, className: 'fgp-popup' })
      })

      const valid = stations.filter(s => s.lat && s.lng)
      if (valid.length > 1) {
        map.fitBounds(L.latLngBounds(valid.map(s => [s.lat, s.lng])), { padding: [50, 50], maxZoom: 13 })
      } else if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 13)
      }
    }

    init()
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null }
  }, [stations, center, zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        .fgp-popup .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
        }
        .fgp-popup .leaflet-popup-content {
          margin: 14px !important;
        }
        .fgp-popup .leaflet-popup-tip {
          background: white !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '500px' }} />
    </>
  )
}
