import { useState, useRef } from 'react'
import { analyzeImage, TECHNIQUES } from '../engine/analyzer'

export default function AnalyzePage() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' })
  const [results, setResults] = useState(null)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const fileRef = useRef()
  const heatmapRef = useRef()
  const noiseRef = useRef()
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResults(null)
  }

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }

  const runAnalysis = async () => {
    if (!file) return
    setAnalyzing(true); setResults(null)
    try {
      const res = await analyzeImage(file, (current, total, name) => setProgress({ current, total, name }))
      setResults(res)
      // Render heatmaps
      setTimeout(() => {
        if (res.results.ela?.heatmapData && heatmapRef.current) {
          const c = heatmapRef.current; c.width = res.imageWidth; c.height = res.imageHeight
          c.getContext('2d').putImageData(res.results.ela.heatmapData, 0, 0)
        }
        if (res.results.noise?.noiseMapData && noiseRef.current) {
          const c = noiseRef.current; c.width = res.imageWidth; c.height = res.imageHeight
          c.getContext('2d').putImageData(res.results.noise.noiseMapData, 0, 0)
        }
      }, 100)
    } catch (err) { console.error(err) }
    setAnalyzing(false)
  }

  const getBarColor = (score) => score >= 60 ? 'var(--danger)' : score >= 30 ? 'var(--warning)' : 'var(--success)'
  const gaugeRadius = 70; const gaugeCirc = 2 * Math.PI * gaugeRadius
  const gaugeOffset = results ? gaugeCirc * (1 - results.finalScore / 100) : gaugeCirc

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">🔍 Forensic Image Analysis</div>
        <h1>AI/Deepfake Image Analyzer</h1>
        <p>Upload any image to detect manipulation using 8 forensic techniques built from scratch</p>
      </div>

      {/* Upload Zone */}
      {!preview && (
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="upload-icon">📤</div>
          <h3>Drop an image here or click to upload</h3>
          <p>Supports JPEG, PNG, WebP — Max 10MB</p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Preview & Controls */}
      {preview && !results && (
        <div style={{ textAlign: 'center' }}>
          <div className="upload-preview">
            <img src={preview} alt="Preview" />
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? '⏳ Analyzing...' : '🔍 Run Forensic Analysis'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setFile(null); setPreview(null); setResults(null) }}>
              ✕ Clear
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {analyzing && (
        <div className="analysis-progress" style={{ maxWidth: 500, margin: '2rem auto' }}>
          <div className="progress-steps">
            {TECHNIQUES.map((tech, i) => (
              <div key={tech.key} className={`progress-step ${i < progress.current ? 'done' : i === progress.current ? 'active' : 'pending'}`}>
                <div className="step-icon">{i < progress.current ? '✓' : i === progress.current ? tech.icon : (i + 1)}</div>
                <span>{tech.name}</span>
              </div>
            ))}
          </div>
          <div className="scan-line"></div>
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          <div className="analysis-container">
            {/* Verdict Side */}
            <div>
              <div className="card verdict-card">
                <div className="verdict-label">Analysis Verdict</div>
                <div className={`verdict-text ${results.verdictClass}`}>{results.verdict}</div>
                <div className="gauge-container">
                  <svg className="gauge-svg" viewBox="0 0 160 160">
                    <circle className="gauge-bg" cx="80" cy="80" r={gaugeRadius} />
                    <circle className="gauge-fill" cx="80" cy="80" r={gaugeRadius}
                      stroke={getBarColor(results.finalScore)}
                      strokeDasharray={gaugeCirc}
                      strokeDashoffset={gaugeOffset} />
                  </svg>
                  <div className="gauge-text">
                    <div className="gauge-percent" style={{ color: getBarColor(results.finalScore) }}>{results.finalScore}</div>
                    <div className="gauge-label">Manipulation Score</div>
                  </div>
                </div>
              </div>

              {/* Heatmap */}
              <div className="card mt-2">
                <h3 style={{ marginBottom: '1rem' }}>🔥 Error Level Analysis</h3>
                <div className="heatmap-container">
                  {!showHeatmap && <img src={preview} alt="Original" style={{ width: '100%', borderRadius: '8px' }} />}
                  <canvas ref={heatmapRef} style={{ width: '100%', borderRadius: '8px', display: showHeatmap ? 'block' : 'none' }} />
                </div>
                <button className="btn btn-sm btn-secondary mt-1" onClick={() => setShowHeatmap(!showHeatmap)}>
                  {showHeatmap ? 'Show Original' : 'Show ELA Heatmap'}
                </button>
              </div>

              {/* Noise Map */}
              <div className="card mt-2">
                <h3 style={{ marginBottom: '1rem' }}>📡 Noise Pattern Map</h3>
                <canvas ref={noiseRef} style={{ width: '100%', borderRadius: '8px' }} />
              </div>
            </div>

            {/* Technique Breakdown */}
            <div>
              <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>📊 Technique Breakdown</h3>
                <div className="technique-list">
                  {TECHNIQUES.map(tech => {
                    const r = results.results[tech.key]
                    if (!r) return null
                    return (
                      <div key={tech.key} className="technique-item">
                        <div className="technique-header">
                          <span className="technique-name">{tech.icon} {tech.name}</span>
                          <span className="technique-score" style={{ color: getBarColor(r.score) }}>{r.score}/100</span>
                        </div>
                        <div className="technique-bar">
                          <div className="technique-bar-fill" style={{ width: `${r.score}%`, background: getBarColor(r.score) }} />
                        </div>
                        <div className="technique-detail">{r.details}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* New image button */}
              <button className="btn btn-secondary mt-2" style={{ width: '100%' }}
                onClick={() => { setFile(null); setPreview(null); setResults(null) }}>
                🔄 Analyze Another Image
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
