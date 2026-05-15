import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Fix broken Leaflet marker icons in Vite ──────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const userIcon = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const policeIcon = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

// ── OpenStreetMap / Nominatim geocoding (100% free, no key) ─────────────────
async function geocodeCity(city) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', India')}&format=json&limit=1`
  const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  const data = await res.json()
  if (!data?.length) throw new Error('City not found')
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
}

// ── Overpass API — real police station data from OpenStreetMap ───────────────
async function fetchPoliceStations(lat, lon, radius = 6000) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="police"](around:${radius},${lat},${lon});
      way["amenity"="police"](around:${radius},${lat},${lon});
    );
    out center;
  `
  const res  = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
  })
  const data = await res.json()
  return (data.elements || [])
    .map(el => ({
      id:      el.id,
      lat:     el.lat ?? el.center?.lat,
      lon:     el.lon ?? el.center?.lon,
      name:    el.tags?.name || 'Police Station',
      phone:   el.tags?.phone || el.tags?.['contact:phone'] || null,
      opening: el.tags?.opening_hours || null,
      addr:    el.tags?.['addr:full'] || el.tags?.['addr:street'] || null,
    }))
    .filter(s => s.lat && s.lon)
}

// ── Helper: fly map to new center ────────────────────────────────────────────
function FlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2 })
  }, [center, zoom, map])
  return null
}

// ── OSM link for a lat/lon ────────────────────────────────────────────────────
const osmLink = (lat, lon) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`

// ── Main component ────────────────────────────────────────────────────────────
export default function MapPage() {
  const [search,   setSearch]   = useState('')
  const [center,   setCenter]   = useState([20.5937, 78.9629]) // centre of India
  const [zoom,     setZoom]     = useState(5)
  const [stations, setStations] = useState([])
  const [userPos,  setUserPos]  = useState(null)
  const [status,   setStatus]   = useState('')
  const [loading,  setLoading]  = useState(false)

  const doSearch = async (lat, lon, label) => {
    setLoading(true)
    setStatus(`Searching police stations near ${label}…`)
    setCenter([lat, lon])
    setZoom(14)
    try {
      const results = await fetchPoliceStations(lat, lon)
      setStations(results)
      setStatus(
        results.length
          ? `Found ${results.length} police station${results.length !== 1 ? 's' : ''} near ${label}`
          : `No stations found within 6 km of ${label}. Try a broader search.`
      )
    } catch {
      setStatus('Could not load station data. Check your connection and try again.')
    }
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    setStatus('Locating city…')
    try {
      const { lat, lon } = await geocodeCity(search.trim())
      setUserPos(null)
      await doSearch(lat, lon, `"${search.trim()}"`)
    } catch {
      setStatus('City not found. Try another name (e.g. "Delhi", "Gurugram", "Chandigarh").')
      setLoading(false)
    }
  }

  const handleLocation = () => {
    if (!navigator.geolocation) { setStatus('Geolocation not supported.'); return }
    setLoading(true)
    setStatus('Getting your location…')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setUserPos([lat, lng])
        await doSearch(lat, lng, 'your location')
      },
      () => {
        setStatus('Location access denied. Please search by city name.')
        setLoading(false)
      }
    )
  }

  const handleShowIndia = () => {
    setCenter([20.5937, 78.9629])
    setZoom(5)
    setStations([])
    setUserPos(null)
    setStatus('Zoomed out to India overview. Search a city to find stations.')
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">🗺️ Police Station Locator</div>
        <h1>Nearby Cyber Police Stations</h1>
        <p>Powered by OpenStreetMap &amp; Overpass API — 100% free &amp; open source</p>
      </div>

      {/* ── Search controls ───────────────────────────────────── */}
      <div className="map-controls">
        <div className="map-search" style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Enter city or area (e.g. Delhi, Gurugram, Chandigarh)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
            disabled={loading}
          />
          <button className="btn btn-secondary btn-sm" onClick={handleSearch} disabled={loading}>
            {loading ? '⏳' : '🔍 Search'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary btn-sm" onClick={handleLocation} disabled={loading}>
            {loading ? '⏳ Locating…' : '📍 Use My Location'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleShowIndia} disabled={loading}>
            🇮🇳 India Overview
          </button>
        </div>
      </div>

      {/* ── Status bar ────────────────────────────────────────── */}
      {status && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
          {loading ? '⏳' : 'ℹ️'} {status}
        </p>
      )}

      {/* ── Legend + quick actions ────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🔴 Police Station</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🔵 Your Location</span>
        {stations.length > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
            {stations.length} found
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href="https://cybercrime.gov.in"
            target="_blank" rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            🚨 File Cyber Complaint
          </a>
          <a
            href="tel:112"
            className="btn btn-sm"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
          >
            📞 112
          </a>
          <a
            href="tel:1930"
            className="btn btn-sm"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
          >
            📞 1930 Cyber
          </a>
        </div>
      </div>

      {/* ── Leaflet Map ───────────────────────────────────────── */}
      <div style={{
        width: '100%', height: 520,
        borderRadius: '16px', overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        position: 'relative', zIndex: 0,
      }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom
          zoomControl
        >
          {/* OpenStreetMap tiles — no API key */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          <FlyTo center={center} zoom={zoom} />

          {/* User location */}
          {userPos && (
            <Marker position={userPos} icon={userIcon}>
              <Popup><strong>📍 Your Location</strong></Popup>
            </Marker>
          )}

          {/* Police station pins */}
          {stations.map(s => (
            <Marker key={s.id} position={[s.lat, s.lon]} icon={policeIcon}>
              <Popup>
                <strong>🚔 {s.name}</strong>
                {s.addr    && <><br />📍 {s.addr}</>}
                {s.phone   && <><br />📞 <a href={`tel:${s.phone}`}>{s.phone}</a></>}
                {s.opening && <><br />🕐 {s.opening}</>}
                <br />
                <a
                  href={osmLink(s.lat, s.lon)}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#3b82f6', fontSize: '0.78rem', marginTop: '4px', display: 'inline-block' }}
                >
                  View on OpenStreetMap →
                </a>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
        Map: <strong>OpenStreetMap</strong> • Station data: <strong>Overpass API</strong> •
        No API key • No tracking.
        Emergencies: <strong>112</strong> · Cyber helpline: <strong>1930</strong>.
      </p>
    </div>
  )
}
