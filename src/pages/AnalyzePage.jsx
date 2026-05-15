import { useEffect, useState, useRef } from 'react'
import { analyzeImage, TECHNIQUES } from '../engine/analyzer'
import { captionImage, buildDescription } from '../engine/imageClassifier'

// Static fallback articles shown when RSS fails
const FALLBACK_ARTICLES = [
  { title: 'AI Deepfakes Crisis: How to Spot and Report Synthetic Media in 2026', source: 'Forbes', url: 'https://www.forbes.com/sites/bernardmarr/2026/ai-deepfakes-detection-tools/', date: '2026' },
  { title: 'Billions Lost to AI Voice and Face Cloning Fraud - What You Need to Know', source: 'CNN', url: 'https://www.cnn.com/tech/ai-fraud-2026-report', date: '2026' },
  { title: 'Election Interference Alert: New AI Techniques Used in 2026 Campaigns', source: 'Reuters', url: 'https://www.reuters.com/technology/ai-election-2026-analysis/', date: '2026' },
  { title: 'Advanced Deepfake Detection Technology Now Available for Public Use', source: 'BBC News', url: 'https://www.bbc.com/technology/deepfake-detection-2026', date: '2026' },
  { title: 'The Synthetic Media Arms Race: AI Generators vs Detectors in 2026', source: 'The Verge', url: 'https://www.theverge.com/2026/synthetic-media-arms-race', date: '2026' },
]

async function fetchAINewsArticles() {
  const query = encodeURIComponent('AI deepfake fake image scam misinformation 2024')
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=6`
  const res = await fetch(proxyUrl)
  if (!res.ok) throw new Error('RSS fetch failed')
  const data = await res.json()
  if (data.status !== 'ok' || !data.items?.length) throw new Error('No articles')
  return data.items.slice(0, 5).map(item => ({
    title: item.title,
    source: item.author || new URL(item.link).hostname.replace('www.', ''),
    url: item.link,
    date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
  }))
}

export default function AnalyzePage() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' })
  const [results, setResults] = useState(null)
  const [mlDescription, setMlDescription] = useState(null)
  const [articles, setArticles] = useState(null)
  const [articlesLoading, setArticlesLoading] = useState(false)
  const fileRef = useRef()
  const imgRef = useRef()
  const noiseRef = useRef()
  const heatmapRef = useRef()
  const [dragOver, setDragOver] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResults(null)
    setArticles(null)
    setMlDescription(null)
    setShowHeatmap(false)
  }

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }

  const runAnalysis = async () => {
    if (!file) return
    setAnalyzing(true); setResults(null); setArticles(null); setMlDescription(null)

    // Run forensic analysis
    let res
    try {
      res = await analyzeImage(file, (current, total, name) => setProgress({ current, total, name }))
      setResults(res)
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

    // Run BLIP image captioning (after forensics)
    if (imgRef.current) {
      setClassifying(true)
      try {
        const caption = await captionImage(imgRef.current)
        const desc = buildDescription(caption, res?.imageDescription)
        setMlDescription(desc)
      } catch (err) {
        console.error('Captioning error:', err)
        if (res?.imageDescription) {
          setMlDescription({
            headline: res.imageDescription.subject,
            details: `${res.imageDescription.style}. ${res.imageDescription.mood}.`,
          })
        }
      }
      setClassifying(false)
    }

    // Fetch news if AI/suspicious
    if (res?.verdictClass === 'fake' || res?.verdictClass === 'suspicious') {
      setArticlesLoading(true)
      fetchAINewsArticles()
        .then(items => setArticles(items))
        .catch(() => setArticles(FALLBACK_ARTICLES))
        .finally(() => setArticlesLoading(false))
    }
  }

  const reset = () => { setFile(null); setPreview(null); setResults(null); setArticles(null); setMlDescription(null); setShowHeatmap(false) }

  const getBarColor = (score) => score >= 60 ? 'var(--danger)' : score >= 30 ? 'var(--warning)' : 'var(--success)'
  const gaugeRadius = 70; const gaugeCirc = 2 * Math.PI * gaugeRadius
  const gaugeOffset = results ? gaugeCirc * (1 - results.finalScore / 100) : gaugeCirc
  const isAI = results?.verdictClass === 'fake'
  const isSuspicious = results?.verdictClass === 'suspicious'
  const desc = results?.imageDescription

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
            <img ref={imgRef} src={preview} alt="Preview" crossOrigin="anonymous" />
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? '⏳ Analyzing...' : '🔍 Run Forensic Analysis'}
            </button>
            <button className="btn btn-secondary" onClick={reset}>✕ Clear</button>
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
          {/* Hidden img for MobileNet (needs to be in DOM) */}
          <img ref={imgRef} src={preview} alt="Analysis source" crossOrigin="anonymous"
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />

          <div className="analysis-container">
            {/* Left col: Verdict + Heatmaps */}
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

            {/* Right col: Techniques + Description */}
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

              {/* ── Image Description Card ── */}
              <div className="card mt-2" style={{
                background: 'linear-gradient(135deg, rgba(15,25,55,0.97) 0%, rgba(8,16,40,0.99) 100%)',
                border: '1px solid rgba(80,140,255,0.2)',
              }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🖼️ Image Description
                  {classifying && (
                    <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20,
                      background: 'rgba(100,160,255,0.1)', border: '1px solid rgba(100,160,255,0.2)',
                      color: '#88aaff', animation: 'pulse 1.2s ease-in-out infinite' }}>
                      🧠 Identifying...
                    </span>
                  )}
                </h3>

                {/* BLIP caption — natural language description */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
                  padding: '16px 18px', marginBottom: '1rem',
                  borderLeft: '3px solid rgba(100,160,255,0.5)',
                  minHeight: 60,
                }}>
                  {classifying && !mlDescription ? (
                    <>
                      <div style={{ height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 8, width: '85%' }} />
                      <div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', width: '60%' }} />
                    </>
                  ) : mlDescription ? (
                    <>
                      <div style={{ fontSize: '1.08rem', fontWeight: 700, color: '#ddeeff', lineHeight: 1.55, marginBottom: '8px' }}>
                        {mlDescription.headline}
                      </div>
                      {mlDescription.details && (
                        <div style={{ fontSize: '0.8rem', color: 'rgba(180,210,255,0.6)', lineHeight: 1.6 }}>
                          {mlDescription.details}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(180,200,255,0.35)' }}>Run analysis to identify image content.</div>
                  )}
                </div>

                {/* Style badges */}
                {desc && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '1rem' }}>
                      <span style={{
                        padding: '4px 11px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                        background: desc.isAnimeOrAIArt ? 'rgba(255,100,100,0.15)' : 'rgba(60,120,255,0.12)',
                        border: `1px solid ${desc.isAnimeOrAIArt ? 'rgba(255,100,100,0.35)' : 'rgba(60,120,255,0.25)'}`,
                        color: desc.isAnimeOrAIArt ? '#ff9999' : '#88aaff',
                      }}>{desc.style}</span>
                      <span style={{
                        padding: '4px 11px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                        background: 'rgba(100,200,150,0.1)', border: '1px solid rgba(100,200,150,0.22)', color: '#88ddaa'
                      }}>{desc.mood}</span>
                    </div>

                    {/* Color palette */}
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(160,190,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '7px' }}>
                        Dominant Hue: <span style={{ color: '#b0ccff', textTransform: 'none' }}>{desc.dominantColor}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {desc.palette.map((color, i) => (
                          <div key={i} title={color.hex} style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: color.hex,
                            border: '2px solid rgba(255,255,255,0.12)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                          }} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button className="btn btn-secondary mt-2" style={{ width: '100%' }} onClick={reset}>
                🔄 Analyze Another Image
              </button>
            </div>
          </div>

          {/* ── Related Articles (AI/Suspicious only) ── */}
          {(isAI || isSuspicious) && (
            <div className="card mt-2" style={{
              background: 'linear-gradient(135deg, rgba(10,50,70,0.97) 0%, rgba(5,30,50,0.98) 100%)',
              border: '1px solid rgba(0,212,170,0.25)',
              marginTop: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#00d4aa', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  ⚠️ Related Scam & Misinformation Reports
                </h3>
                <button 
                  className="btn btn-sm"
                  onClick={() => {
                    const searchQuery = encodeURIComponent('AI deepfake detection fake images scams');
                    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(0,212,170,0.15)',
                    border: '1px solid rgba(0,212,170,0.3)',
                    color: '#00d4aa',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(0,212,170,0.25)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(0,212,170,0.15)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  🔍 Google Search
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(0,212,170,0.65)', marginBottom: '1.2rem' }}>
                This image appears to be AI-generated or manipulated. Below are recent news articles about AI-image based misinformation and scams.
              </p>

              {articlesLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      height: 60, borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                  ))}
                </div>
              )}

              {!articlesLoading && articles && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {articles.map((article, i) => (
                    <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'block', padding: '14px 16px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(0,212,170,0.12)',
                        textDecoration: 'none',
                        transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,170,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#88ddcc', marginBottom: '6px', lineHeight: 1.4 }}>
                        {article.title}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'rgba(0,212,170,0.5)' }}>
                        <span>📰 {article.source}</span>
                        {article.date && <span>📅 {article.date}</span>}
                        <span style={{ marginLeft: 'auto', color: 'rgba(0,212,170,0.6)' }}>Read →</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
