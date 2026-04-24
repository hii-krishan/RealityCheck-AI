import { useState } from 'react'

const CHECKLIST = [
  { id: 1, category: 'Social Media', text: 'All my social media profiles are set to private', weight: 3 },
  { id: 2, category: 'Social Media', text: 'I review tagged photos and remove unwanted ones', weight: 2 },
  { id: 3, category: 'Social Media', text: 'Location sharing is disabled on my posts', weight: 3 },
  { id: 4, category: 'Social Media', text: "I don't share personal details (birthday, address) publicly", weight: 3 },
  { id: 5, category: 'Photos', text: 'I avoid posting high-resolution face photos publicly', weight: 2 },
  { id: 6, category: 'Photos', text: 'I reverse-search my photos periodically to check misuse', weight: 1 },
  { id: 7, category: 'Photos', text: "I don't share photos of ID cards or documents online", weight: 3 },
  { id: 8, category: 'Photos', text: 'I watermark important personal images', weight: 1 },
  { id: 9, category: 'Passwords', text: 'I use unique passwords for every account', weight: 3 },
  { id: 10, category: 'Passwords', text: 'Two-Factor Authentication (2FA) is enabled on all major accounts', weight: 3 },
  { id: 11, category: 'Passwords', text: "I don't use simple passwords like 'password123' or my birthday", weight: 3 },
  { id: 12, category: 'Passwords', text: 'I change passwords when a service reports a data breach', weight: 2 },
  { id: 13, category: 'Privacy', text: 'I regularly check Google for my name to see what is public', weight: 2 },
  { id: 14, category: 'Privacy', text: 'I use separate email for important services vs. newsletters', weight: 2 },
  { id: 15, category: 'Privacy', text: 'I read app permissions before installing and deny unnecessary access', weight: 2 },
]

const MAX_SCORE = CHECKLIST.reduce((sum, item) => sum + item.weight, 0)

export default function FootprintPage() {
  const [checked, setChecked] = useState(new Set())

  const toggle = (id) => {
    const next = new Set(checked)
    next.has(id) ? next.delete(id) : next.add(id)
    setChecked(next)
  }

  const score = CHECKLIST.filter(i => checked.has(i.id)).reduce((sum, i) => sum + i.weight, 0)
  const pct = Math.round((score / MAX_SCORE) * 100)
  
  let riskLevel, riskColor, riskText
  if (pct >= 80) { riskLevel = 'LOW RISK'; riskColor = 'var(--success)'; riskText = "Great job! Your digital footprint is well-protected. Keep it up!" }
  else if (pct >= 50) { riskLevel = 'MEDIUM RISK'; riskColor = 'var(--warning)'; riskText = "You're doing okay, but there are gaps in your digital safety. Address the unchecked items." }
  else if (pct >= 25) { riskLevel = 'HIGH RISK'; riskColor = 'var(--danger)'; riskText = "Your online presence is quite vulnerable. Please prioritize addressing the unchecked items immediately." }
  else { riskLevel = 'CRITICAL RISK'; riskColor = 'var(--danger)'; riskText = "Your digital footprint is very exposed. You need to take immediate steps to protect yourself." }

  const categories = [...new Set(CHECKLIST.map(i => i.category))]

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">🔐 Privacy Assessment</div>
        <h1>Digital Footprint Checker</h1>
        <p>How secure is your online presence? Check the items that apply to you.</p>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Score Card */}
        <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>YOUR SECURITY SCORE</p>
          <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: riskColor }}>{pct}%</div>
          <div className="risk-meter">
            <div className="risk-meter-fill" style={{ width: `${pct}%`, background: riskColor }} />
          </div>
          <div className={`risk-badge`} style={{ background: riskColor + '20', color: riskColor }}>{riskLevel}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '12px', maxWidth: 400, margin: '12px auto 0' }}>{riskText}</p>
        </div>

        {/* Checklist by category */}
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>
              {cat === 'Social Media' ? '📱' : cat === 'Photos' ? '📸' : cat === 'Passwords' ? '🔒' : '🔐'} {cat}
            </h3>
            <div className="checklist">
              {CHECKLIST.filter(i => i.category === cat).map(item => (
                <button key={item.id} className={`checklist-item ${checked.has(item.id) ? 'checked' : ''}`}
                  onClick={() => toggle(item.id)}>
                  <div className="check-box">{checked.has(item.id) ? '✓' : ''}</div>
                  <span>{item.text}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Tips for unchecked */}
        {checked.size < CHECKLIST.length && (
          <div className="card mt-3" style={{ borderLeft: '3px solid var(--warning)' }}>
            <h4>⚡ Priority Actions:</h4>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', marginTop: '8px' }}>
              {CHECKLIST.filter(i => !checked.has(i.id) && i.weight >= 3).slice(0, 3).map(i => (
                <li key={i.id} style={{ marginBottom: '4px' }}>{i.text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
