import { Link } from 'react-router-dom'
import { newsTickerItems } from '../data/articles'
import { safetyTips } from '../data/safetyTips'

const FEATURES = [
  { icon: '🔍', title: 'Image Analyzer', desc: 'Upload any image and get a detailed forensic analysis with 8 detection techniques', to: '/analyze' },
  { icon: '📰', title: 'Articles & News', desc: 'Stay updated with latest deepfake incidents, viral fakes, and fact-checking news', to: '/articles' },
  { icon: '📩', title: 'Scam Detector', desc: 'Paste suspicious SMS, WhatsApp, or email messages to detect phishing patterns', to: '/scam-detector' },
  { icon: '🔗', title: 'Link Checker', desc: 'Verify if a URL is safe before clicking. Detects typo-squatting and scam domains', to: '/link-checker' },
  { icon: '📱', title: 'QR Code Scanner', desc: 'Upload QR code images to reveal and verify the hidden URL before scanning', to: '/qr-scanner' },
  { icon: '🚨', title: 'Cyber Helpline', desc: 'Find cyber crime helpline numbers, file complaints, and get emergency help', to: '/helpline' },
  { icon: '🗺️', title: 'Police Station Map', desc: 'Find nearby cyber police stations on an interactive map with directions', to: '/map' },
  { icon: '💡', title: 'Safety Tips', desc: '30+ daily digital safety tips for social media, banking, passwords, and more', to: '/tips' },
  { icon: '🔎', title: 'Reverse Image Search', desc: 'Search an image across Google, TinEye, and Yandex to find its original source', to: '/reverse-search' },
  { icon: '🧠', title: 'Deepfake Quiz', desc: 'Test your ability to spot AI-generated images in an interactive quiz', to: '/quiz' },
  { icon: '🛡️', title: 'Community Reports', desc: 'Report and vote on suspicious images. See trending misinformation alerts', to: '/community' },
  { icon: '🔐', title: 'Digital Footprint', desc: 'Check how vulnerable your online presence is with our privacy assessment', to: '/footprint' },
]

export default function HomePage() {
  const dailyTip = safetyTips[Math.floor(Date.now() / 86400000) % safetyTips.length]
  
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-grid"></div>
        <div className="hero-content">
          <div className="page-badge">🛡️ AI-Powered Digital Safety Platform</div>
          <h1>
            Detect. Protect.<br />
            <span className="gradient-text">Stay Truthful.</span>
          </h1>
          <p>
            RealityCheck AI combines 8 forensic analysis techniques to detect AI-generated and morphed images — plus daily tools to keep you safe from scams, phishing, and misinformation.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/analyze" className="btn btn-primary btn-lg">🔍 Analyze an Image</Link>
            <Link to="/scam-detector" className="btn btn-secondary btn-lg">📩 Check a Message</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="number">8</div>
              <div className="label">Detection Techniques</div>
            </div>
            <div className="hero-stat">
              <div className="number">12+</div>
              <div className="label">Safety Tools</div>
            </div>
            <div className="hero-stat">
              <div className="number">30+</div>
              <div className="label">Safety Tips</div>
            </div>
          </div>
        </div>
      </section>

      {/* News Ticker */}
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

      {/* Daily Tip */}
      <div className="page-content">
        <div className="daily-tip animate-in">
          <div className="page-badge">💡 Daily Safety Tip</div>
          <h3>{dailyTip.category}</h3>
          <p>{dailyTip.tip}</p>
        </div>

        {/* Features Grid */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="section-title">Everything You Need to Stay Safe Online</h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>12 powerful tools — all free, no sign-up required, no API keys needed</p>
        </div>
        
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <Link to={f.to} key={i} className="card card-glow feature-card animate-in" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <span className="card-arrow">→</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
