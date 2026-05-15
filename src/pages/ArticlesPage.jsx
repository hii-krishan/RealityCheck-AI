import { useState } from 'react'
import { articles, CATEGORIES, newsTickerItems } from '../data/articles'

export default function ArticlesPage() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = articles.filter(a => {
    const matchCat = category === 'All' || a.category === category
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                        a.summary.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">📰 News & Articles</div>
        <h1>Deepfake & Scam News Tracker</h1>
        <p>Stay informed about the latest deepfake incidents, viral fakes, and digital safety news</p>
      </div>

      {/* News Ticker */}
      <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '2rem', border: '1px solid var(--border)' }}>
        <div className="news-ticker-wrapper">
          <div className="news-ticker">
            {[...newsTickerItems, ...newsTickerItems].map((item, i) => (
              <div key={i} className="news-ticker-item">
                <span className="badge">{item.badge}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        {CATEGORIES.map(c => (
          <button key={c} className={`category-btn ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="articles-grid">
        {filtered.map(article => (
          <a key={article.id} href={article.url} target="_blank" rel="noreferrer" className="card article-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="article-thumb">
              <img
                src={article.image}
                alt={article.title}
                loading="lazy"
                onError={e => { e.currentTarget.src = `https://picsum.photos/seed/${article.id}/400/250` }}
              />
            </div>
            <div className="article-meta">
              <span className="article-category">{article.category}</span>
              <span className="article-date">{article.date}</span>
              <span className="article-date">• {article.source}</span>
            </div>
            <h3>{article.title}</h3>
            <p>{article.summary}</p>
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center mt-4" style={{ color: 'var(--text-muted)' }}>
          <p>No articles found. Try a different search term or category.</p>
        </div>
      )}
    </div>
  )
}
