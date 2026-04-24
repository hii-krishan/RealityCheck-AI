import { useState } from 'react'
import { safetyTips, TIP_CATEGORIES } from '../data/safetyTips'

export default function TipsPage() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  
  const filtered = safetyTips.filter(t => {
    const matchCat = category === 'All' || t.category === category
    const matchSearch = t.tip.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const dailyTip = safetyTips[Math.floor(Date.now() / 86400000) % safetyTips.length]

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">💡 Digital Safety</div>
        <h1>Safety Tips Library</h1>
        <p>Practical tips for everyday digital safety — social media, banking, passwords, and more</p>
      </div>

      {/* Daily Tip */}
      <div className="daily-tip animate-in">
        <div className="page-badge">⭐ Tip of the Day</div>
        <h3>{dailyTip.icon} {dailyTip.category}</h3>
        <p>{dailyTip.tip}</p>
      </div>

      {/* Search */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Search tips..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        {TIP_CATEGORIES.map(c => (
          <button key={c} className={`category-btn ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      {/* Tips Grid */}
      <div className="tips-grid">
        {filtered.map(tip => (
          <div key={tip.id} className="card tip-card animate-in">
            <div className="tip-category">{tip.icon} {tip.category}</div>
            <p>{tip.tip}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center mt-4" style={{ color: 'var(--text-muted)' }}>No tips found for this filter.</p>
      )}
    </div>
  )
}
