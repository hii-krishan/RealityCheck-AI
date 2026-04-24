import { useState, useRef } from 'react'
import { checkLink } from '../tools/linkChecker'

export default function QRScannerPage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true); setError(''); setResult(null)
    
    try {
      const jsQR = (await import('jsqr')).default
      const img = await loadImage(file)
      const canvas = document.createElement('canvas')
      canvas.width = img.width; canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, canvas.width, canvas.height)
      
      if (code) {
        const decodedData = code.data
        const isUrl = /^https?:\/\//i.test(decodedData)
        const linkResult = isUrl ? checkLink(decodedData) : null
        setResult({ data: decodedData, isUrl, linkResult })
      } else {
        setError('No QR code found in this image. Try a clearer photo.')
      }
    } catch (err) {
      setError('Failed to process image: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">📱 QR Code Safety</div>
        <h1>QR Code Safety Scanner</h1>
        <p>Upload a photo of a QR code to decode it and check if the URL is safe</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="upload-zone" onClick={() => fileRef.current?.click()}>
          <div className="upload-icon">📷</div>
          <h3>Upload a QR Code Image</h3>
          <p>Take a photo of any QR code and upload it here</p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files[0])} />
        </div>

        {loading && <div className="spinner"></div>}
        {error && <div className="card mt-2" style={{ borderLeft: '3px solid var(--danger)' }}><p style={{ color: 'var(--danger)' }}>{error}</p></div>}

        {result && (
          <div className="card mt-3">
            <h3 style={{ marginBottom: '1rem' }}>📋 QR Code Contents</h3>
            <div className="card" style={{ background: 'rgba(0,0,0,0.2)', wordBreak: 'break-all' }}>
              <code style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>{result.data}</code>
            </div>

            {result.isUrl && result.linkResult && (
              <div className="mt-2">
                <h4 style={{ marginBottom: '0.5rem' }}>🔗 URL Safety Check:</h4>
                <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                  <div className={`risk-badge ${result.linkResult.riskClass}`} style={{ fontSize: '1rem', padding: '10px 20px' }}>
                    {result.linkResult.riskClass === 'dangerous' ? '🚨' : result.linkResult.riskClass === 'suspicious' ? '⚠️' : '✅'} {result.linkResult.risk}
                  </div>
                </div>
                {result.linkResult.flags.length > 0 && (
                  <div className="red-flags">
                    {result.linkResult.flags.map((f, i) => (
                      <div key={i} className="red-flag-item">
                        <span className="flag-icon">{f.type === 'safe' ? '✅' : '⚠️'}</span>
                        <span>{f.flag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!result.isUrl && (
              <p className="mt-2" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                This QR code contains text data, not a URL. It appears to be plain text content.
              </p>
            )}

            <button className="btn btn-secondary mt-2" onClick={() => { setResult(null); setError('') }} style={{ width: '100%' }}>
              📷 Scan Another QR Code
            </button>
          </div>
        )}

        <div className="card mt-4" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>💡 Why Scan QR Codes Here First?</h4>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem' }}>
            <li>QR codes on posters, menus, and flyers can be tampered with</li>
            <li>Scammers paste fake QR codes over real ones</li>
            <li>A QR code might redirect you to a phishing site or trigger a payment</li>
            <li>Always verify before scanning with your phone camera</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}
