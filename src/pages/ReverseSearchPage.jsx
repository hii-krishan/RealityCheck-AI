import { useState, useRef } from 'react'

export default function ReverseSearchPage() {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const fileRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  const searchGoogle = () => {
    if (!file) return
    // Opens Google Lens with the image
    const formData = new FormData()
    formData.append('encoded_image', file)
    // Fallback: open Google Images
    window.open('https://images.google.com/', '_blank')
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">🔎 Source Verification</div>
        <h1>Reverse Image Search</h1>
        <p>Find the original source of any image to verify its authenticity</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {!preview ? (
          <div className="upload-zone" onClick={() => fileRef.current?.click()}>
            <div className="upload-icon">🖼️</div>
            <h3>Upload an image to search</h3>
            <p>We'll help you search it across Google, TinEye, and Yandex</p>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <>
            <div className="upload-preview" style={{ marginBottom: '1.5rem' }}>
              <img src={preview} alt="Search" />
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Search this image on:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="https://images.google.com/" target="_blank" rel="noreferrer" className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                <span style={{ fontSize: '1.5rem' }}>🔍</span>
                <div>
                  <strong>Google Images</strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Upload your image to Google's reverse search. Click the camera icon and upload.</p>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>→</span>
              </a>
              <a href="https://tineye.com/" target="_blank" rel="noreferrer" className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                <span style={{ fontSize: '1.5rem' }}>👁️</span>
                <div>
                  <strong>TinEye</strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Specialized reverse image search engine. Great for finding original sources.</p>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>→</span>
              </a>
              <a href="https://yandex.com/images/" target="_blank" rel="noreferrer" className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                <span style={{ fontSize: '1.5rem' }}>🔎</span>
                <div>
                  <strong>Yandex Images</strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Often finds results that Google misses. Click camera icon and upload.</p>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>→</span>
              </a>
            </div>

            <div className="card mt-3" style={{ borderLeft: '3px solid var(--accent)' }}>
              <h4>📋 How to use:</h4>
              <ol style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', marginTop: '8px' }}>
                <li>Click any search engine above</li>
                <li>Look for the 📷 camera icon on the search page</li>
                <li>Upload the same image you uploaded here</li>
                <li>Compare results to find the original source</li>
              </ol>
            </div>

            <button className="btn btn-secondary mt-2" style={{ width: '100%' }} onClick={() => { setFile(null); setPreview(null) }}>
              🔄 Try Another Image
            </button>
          </>
        )}
      </div>
    </div>
  )
}
