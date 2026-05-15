import { useState } from 'react'

const SEED_REPORTS = [
  { id: 1, title: 'Fake earthquake image circulating on WhatsApp', desc: 'AI-generated image of destroyed buildings shared as "Chennai earthquake". No earthquake occurred.', votes: 47, source: 'WhatsApp', date: '2026-03-20' },
  { id: 2, title: 'Morphed image of politician in fake meeting', desc: 'Photoshopped image showing two rival politicians shaking hands. Original images were from separate events.', votes: 35, source: 'Twitter/X', date: '2026-03-18' },
  { id: 3, title: 'AI-generated celebrity endorsement for crypto scam', desc: 'Deepfake video of a Bollywood actor promoting a fake cryptocurrency investment scheme.', votes: 62, source: 'Instagram', date: '2026-03-15' },
  { id: 4, title: 'Fake police circular about new traffic rules', desc: 'A fabricated circular with police letterhead claiming new hefty fines for traffic violations.', votes: 28, source: 'WhatsApp', date: '2026-03-12' },
]

export default function CommunityPage() {
  const [reports, setReports] = useState(loadReports)
  const [showForm, setShowForm] = useState(false)
  const [newReport, setNewReport] = useState({ title: '', desc: '', source: '' })

  const saveReports = (r) => { setReports(r); localStorage.setItem('realitycheck_ai_reports', JSON.stringify(r)) }

  const addReport = () => {
    if (!newReport.title.trim()) return
    const report = { ...newReport, id: Date.now(), votes: 0, date: new Date().toISOString().split('T')[0] }
    const updated = [report, ...reports]
    saveReports(updated)
    setNewReport({ title: '', desc: '', source: '' }); setShowForm(false)
  }

  const vote = (id, delta) => {
    saveReports(reports.map(r => r.id === id ? { ...r, votes: r.votes + delta } : r))
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">🛡️ Community Alert</div>
        <h1>Community Reports</h1>
        <p>Report suspicious content and help others stay informed</p>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <button className="btn btn-primary mb-3" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '📝 Submit a Report'}
        </button>

        {showForm && (
          <div className="card mb-3">
            <input type="text" className="text-input-area" style={{ minHeight: 'auto', marginBottom: '8px' }}
              placeholder="Title (e.g., Fake news about...)" value={newReport.title}
              onChange={e => setNewReport({ ...newReport, title: e.target.value })} />
            <textarea className="text-input-area" rows={3} style={{ marginBottom: '8px' }}
              placeholder="Description — what makes this suspicious?" value={newReport.desc}
              onChange={e => setNewReport({ ...newReport, desc: e.target.value })} />
            <input type="text" className="text-input-area" style={{ minHeight: 'auto', marginBottom: '12px' }}
              placeholder="Source (WhatsApp, Twitter, etc.)" value={newReport.source}
              onChange={e => setNewReport({ ...newReport, source: e.target.value })} />
            <button className="btn btn-primary" onClick={addReport}>Submit Report</button>
          </div>
        )}

        <div className="report-feed">
          {[...reports].sort((a, b) => b.votes - a.votes).map(r => (
            <div key={r.id} className="card report-card">
              <div className="report-body" style={{ flex: 1 }}>
                <div className="report-title">{r.title}</div>
                <div className="report-desc">{r.desc}</div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="report-votes">
                    <button className="vote-btn" onClick={() => vote(r.id, 1)}>👍 {r.votes}</button>
                    <button className="vote-btn" onClick={() => vote(r.id, -1)}>👎</button>
                  </div>
                  {r.source && <span className="tag">{r.source}</span>}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function loadReports() {
  try {
    const saved = localStorage.getItem('realitycheck_ai_reports')
    const parsed = saved ? JSON.parse(saved) : null
    return Array.isArray(parsed) ? parsed : SEED_REPORTS
  } catch {
    return SEED_REPORTS
  }
}
