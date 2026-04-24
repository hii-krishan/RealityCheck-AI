import { useState } from 'react'
import { checkLink } from '../tools/linkChecker'

export default function LinkCheckerPage() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)

  const check = () => { const r = checkLink(url); setResult(r) }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">🔗 Link Safety</div>
        <h1>Suspicious Link Checker</h1>
        <p>Paste any URL to check if it's safe before clicking</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input type="text" className="text-input-area" style={{ minHeight: 'auto', padding: '14px 16px' }}
            placeholder="Paste URL here (e.g., https://example.com)" value={url}
            onChange={e => { setUrl(e.target.value); setResult(null) }}
            onKeyDown={e => e.key === 'Enter' && check()} />
          <button className="btn btn-primary" onClick={check} disabled={!url.trim()}>Check</button>
        </div>

        {/* Quick test URLs */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['https://amaz0n.xyz/login', 'https://google.com', 'http://192.168.1.1/phish', 'https://bit.ly/free-prize'].map(u => (
            <button key={u} className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem' }}
              onClick={() => { setUrl(u); setResult(null) }}>{u.substring(0, 30)}</button>
          ))}
        </div>

        {result && (
          <div className="card mt-3">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className={`risk-badge ${result.riskClass}`} style={{ fontSize: '1.1rem', padding: '12px 24px' }}>
                {result.riskClass === 'dangerous' ? '🚨' : result.riskClass === 'suspicious' ? '⚠️' : '✅'} {result.risk}
              </div>
            </div>

            {result.parsedUrl && (
              <div className="card" style={{ background: 'rgba(0,0,0,0.2)', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>Protocol:</strong> {result.parsedUrl.protocol}<br />
                  <strong>Hostname:</strong> <code style={{ color: 'var(--accent)' }}>{result.parsedUrl.hostname}</code><br />
                  <strong>Path:</strong> {result.parsedUrl.pathname}
                </p>
              </div>
            )}

            {result.flags.length > 0 && (
              <div className="red-flags">
                {result.flags.map((f, i) => (
                  <div key={i} className="red-flag-item">
                    <span className="flag-icon">{f.type === 'safe' ? '✅' : f.type === 'danger' ? '🚨' : '⚠️'}</span>
                    <span>{f.flag}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
