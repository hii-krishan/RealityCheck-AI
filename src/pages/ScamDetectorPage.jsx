import { useState } from 'react'
import { analyzeMessage } from '../tools/scamDetector'

const EXAMPLES = [
  "Dear Customer, your SBI account will be blocked in 24 hours. Click here to verify: http://sbi-verify.xyz/login",
  "Congratulations! You've won ₹10,00,000 in the Jio Lucky Draw! Claim now: bit.ly/jio-prize",
  "Hi! Your Amazon order #1234 has been shipped. Track here: amazon.in/track/1234",
  "URGENT: Your KYC is expired. Update immediately or your Paytm wallet will be suspended. Link: paytim.click/kyc",
]

export default function ScamDetectorPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)

  const analyze = () => { const r = analyzeMessage(text); setResult(r) }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">📩 Scam Detection</div>
        <h1>Scam Message Detector</h1>
        <p>Paste any suspicious SMS, WhatsApp, or email message to check for phishing patterns</p>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <textarea className="text-input-area" rows={6} placeholder="Paste the suspicious message here..."
          value={text} onChange={e => { setText(e.target.value); setResult(null) }} />
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={analyze} disabled={!text.trim()}>🔍 Analyze Message</button>
          <button className="btn btn-secondary" onClick={() => { setText(''); setResult(null) }}>Clear</button>
        </div>

        {/* Quick Examples */}
        <div style={{ marginTop: '2rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>Try an example:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="btn btn-secondary btn-sm" style={{ textAlign: 'left', fontSize: '0.75rem', whiteSpace: 'normal' }}
                onClick={() => { setText(ex); setResult(null) }}>
                {ex.substring(0, 80)}...
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="card mt-4" style={{ animnation: 'fadeInUp 0.4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className={`risk-badge ${result.riskClass}`} style={{ fontSize: '1.1rem', padding: '12px 24px' }}>
                {result.riskClass === 'dangerous' ? '🚨' : result.riskClass === 'suspicious' ? '⚠️' : '✅'} {result.risk}
              </div>
            </div>

            {result.flags.length > 0 && (
              <div className="red-flags">
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--danger)' }}>🚩 Red Flags Detected:</h4>
                {result.flags.map((f, i) => (
                  <div key={i} className="red-flag-item">
                    <span className="flag-icon">⚠️</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{f.flag}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Matched: <span className="highlight-text">{f.matchedText}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.urls.length > 0 && (
              <div className="mt-2">
                <h4 style={{ marginBottom: '0.5rem' }}>🔗 URLs found in message:</h4>
                {result.urls.map((url, i) => (
                  <div key={i} className="red-flag-item">
                    <span className="flag-icon">🔗</span>
                    <code style={{ fontSize: '0.8rem', color: 'var(--warning)', wordBreak: 'break-all' }}>{url}</code>
                  </div>
                ))}
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  ⚡ Use our <a href="/link-checker">Link Checker</a> to verify these URLs
                </p>
              </div>
            )}

            <div className="card mt-2" style={{ background: 'rgba(0, 212, 170, 0.05)', borderLeft: '3px solid var(--accent)' }}>
              <strong>💡 Advice:</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{result.advice}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
