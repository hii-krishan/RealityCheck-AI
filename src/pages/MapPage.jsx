import { useState, useEffect, useRef } from 'react'

export default function MapPage() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [status, setStatus] = useState('Click "Use My Location" to find nearby police stations')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Dynamically load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    
    const initMap = async () => {
      const L = await import('leaflet')
      if (mapInstance.current) return
      const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)
      mapInstance.current = map
    }
    initMap()
    
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [])

  const locateUser = () => {
    if (!navigator.geolocation) { setStatus('Geolocation not supported'); return }
    setStatus('Getting your location...')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const L = await import('leaflet')
        const map = mapInstance.current
        map.setView([lat, lng], 13)
        
        // User marker
        const userIcon = L.divIcon({ html: '📍', className: '', iconSize: [30, 30] })
        L.marker([lat, lng], { icon: userIcon }).addTo(map).bindPopup('<b>You are here</b>').openPopup()
        
        // Fetch police stations from Overpass API
        setStatus('Searching for nearby police stations...')
        try {
          const query = `[out:json][timeout:10];node["amenity"="police"](around:10000,${lat},${lng});out body;`
          const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
          const data = await res.json()
          
          const policeIcon = L.divIcon({ html: '🚔', className: '', iconSize: [28, 28] })
          data.elements.forEach(el => {
            const dist = getDistance(lat, lng, el.lat, el.lon)
            const name = el.tags?.name || 'Police Station'
            const addr = el.tags?.['addr:full'] || el.tags?.['addr:street'] || ''
            L.marker([el.lat, el.lon], { icon: policeIcon }).addTo(map)
              .bindPopup(`<b>${name}</b><br>${addr}<br>📏 ${dist.toFixed(1)} km<br><a href="https://www.google.com/maps/dir/${lat},${lng}/${el.lat},${el.lon}" target="_blank">Get Directions →</a>`)
          })
          setStatus(`Found ${data.elements.length} police stations nearby`)
        } catch (err) {
          setStatus('Could not fetch station data. Try searching by city.')
        }
      },
      () => setStatus('Location access denied. Please allow location or search by city.')
    )
  }

  const searchCity = async () => {
    if (!search.trim()) return
    setStatus(`Searching "${search}"...`)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search + ' India')}&format=json&limit=1`)
      const data = await res.json()
      if (data.length > 0) {
        const { lat, lon } = data[0]
        mapInstance.current.setView([parseFloat(lat), parseFloat(lon)], 13)
        // Then search for police stations
        const L = await import('leaflet')
        const query = `[out:json][timeout:10];node["amenity"="police"](around:10000,${lat},${lon});out body;`
        const psRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
        const psData = await psRes.json()
        const policeIcon = L.divIcon({ html: '🚔', className: '', iconSize: [28, 28] })
        psData.elements.forEach(el => {
          const name = el.tags?.name || 'Police Station'
          L.marker([el.lat, el.lon], { icon: policeIcon }).addTo(mapInstance.current)
            .bindPopup(`<b>${name}</b><br><a href="https://www.google.com/maps/dir/?api=1&destination=${el.lat},${el.lon}" target="_blank">Get Directions →</a>`)
        })
        setStatus(`Found ${psData.elements.length} stations near ${search}`)
      } else setStatus('City not found. Try a different name.')
    } catch { setStatus('Search failed. Please try again.') }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">🗺️ Police Station Locator</div>
        <h1>Nearby Cyber Police Stations</h1>
        <p>Find police stations near you on an interactive map with directions</p>
      </div>

      <div className="map-controls">
        <div className="map-search" style={{ display: 'flex', gap: '8px' }}>
          <input type="text" placeholder="Search by city..." value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchCity()} style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" onClick={searchCity}>Search</button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={locateUser}>📍 Use My Location</button>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>{status}</p>
      <div className="map-container" ref={mapRef}></div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Data from OpenStreetMap. For emergencies, always call 112.</p>
    </div>
  )
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
