import { useState } from 'react'
import { nationalHelplines, complaintSteps, stateHelplines } from '../data/helplines'

export default function HelplinePage() {
  const [openState, setOpenState] = useState(null)

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">🚨 Emergency Help</div>
        <h1>Cyber Helpline Directory</h1>
        <p>Find helpline numbers, file complaints, and get emergency assistance for cyber crimes</p>
      </div>

      {/* National Helplines */}
      <h2 className="section-title" style={{ fontSize: '1.4rem' }}>National Helplines</h2>
      <div className="helpline-grid">
        {nationalHelplines.map((h, i) => (
          <a key={i} href={h.url} className="card helpline-card animate-in" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="helpline-icon" style={{ background: h.color + '20', color: h.color }}>{h.icon}</div>
            <div>
              <div className="helpline-name">{h.name}</div>
              <div className="helpline-number">{h.number}</div>
              <div className="helpline-desc">{h.desc}</div>
            </div>
          </a>
        ))}
      </div>

      <div className="divider"></div>

      {/* Complaint Guide */}
      <h2 className="section-title" style={{ fontSize: '1.4rem' }}>📝 How to File a Cyber Crime Complaint</h2>
      <div className="complaint-steps">
        {complaintSteps.map(s => (
          <div key={s.step} className="card complaint-step animate-in">
            <div className="step-number">{s.step}</div>
            <div>
              <strong>{s.title}</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="divider"></div>

      {/* State Directory */}
      <h2 className="section-title" style={{ fontSize: '1.4rem' }}>🏛️ State-wise Cyber Cells</h2>
      <div className="state-accordion">
        {stateHelplines.map((s, i) => (
          <div key={i} className="state-item">
            <button className="state-header" onClick={() => setOpenState(openState === i ? null : i)}>
              <span>{s.state}</span>
              <span>{openState === i ? '▲' : '▼'}</span>
            </button>
            {openState === i && (
              <div className="state-body">
                <p><strong>📞 Phone:</strong> <a href={`tel:${s.phone}`}>{s.phone}</a></p>
                <p><strong>📧 Email:</strong> <a href={`mailto:${s.email}`}>{s.email}</a></p>
                <p><strong>📍 Address:</strong> {s.address}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
