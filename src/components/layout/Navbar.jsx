import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_GROUPS = [
  {
    label: 'Tools',
    links: [
      { to: '/analyze', label: 'Deepfake Detect', icon: '🛡️' },
      { to: '/scam-detector', label: 'Scam Analyzer', icon: '📩' },
      { to: '/link-checker', label: 'Link Checker', icon: '🔗' },
      { to: '/qr-scanner', label: 'QR Analyst', icon: '📱' },
    ],
  },
  {
    label: 'Safety Hub',
    links: [
      { to: '/helpline', label: 'Cyber Helpline', icon: '🚨' },
      { to: '/map', label: 'Police Stations', icon: '🗺️' },
      { to: '/tips', label: 'Safety Tips', icon: '💡' },
      { to: '/footprint', label: 'Digital Footprint', icon: '🔐' },
    ],
  },
  {
    label: 'Community',
    links: [
      { to: '/community', label: 'Community Reports', icon: '👥' },
      { to: '/quiz', label: 'Detection Drill', icon: '🧠' },
    ],
  },
  {
    label: 'Reports',
    links: [
      { to: '/articles', label: 'News & Articles', icon: '📰' },
    ],
  },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const location = useLocation()
  const dropdownTimeout = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setActiveDropdown(null)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const openDropdown = (i) => {
    clearTimeout(dropdownTimeout.current)
    setActiveDropdown(i)
  }
  const closeDropdown = () => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 150)
  }

  const isGroupActive = (group) =>
    group.links.some(l => location.pathname === l.to)

  return (
    <nav className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <div className="nav__inner">
        {/* Left: Brand + Links */}
        <div className="nav__left">
          <Link to="/" className="nav__brand" onClick={() => setMobileOpen(false)}>
            <span className="nav__brand-text">RealityCheck AI</span>
          </Link>

          <div className="nav__menu">
            {NAV_GROUPS.map((group, idx) => (
              <div
                key={group.label}
                className={`nav__item ${activeDropdown === idx ? 'nav__item--open' : ''}`}
                onMouseEnter={() => openDropdown(idx)}
                onMouseLeave={closeDropdown}
              >
                <button
                  className={`nav__item-btn ${isGroupActive(group) ? 'nav__item-btn--active' : ''}`}
                >
                  {group.label}
                </button>

                {/* Dropdown */}
                {group.links.length > 1 && (
                  <div className="nav__dropdown">
                    <div className="nav__dropdown-content">
                      {group.links.map(link => (
                        <Link
                          key={link.to}
                          to={link.to}
                          className={`nav__dropdown-link ${location.pathname === link.to ? 'nav__dropdown-link--active' : ''}`}
                        >
                          <span className="nav__dropdown-link-icon">{link.icon}</span>
                          <span className="nav__dropdown-link-label">{link.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Single-link group: direct click */}
                {group.links.length === 1 && (
                  <Link
                    to={group.links[0].to}
                    className="nav__item-overlay-link"
                    aria-label={group.links[0].label}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="nav__right">
          <button className="nav__icon-btn" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <button className="nav__icon-btn" aria-label="Profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M20 21a8 8 0 1 0-16 0"/>
            </svg>
          </button>
          <Link to="/analyze" className="nav__cta">
            Scan Now
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className={`nav__hamburger ${mobileOpen ? 'nav__hamburger--active' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Glow line */}
      <div className="nav__glow" />

      {/* Mobile overlay */}
      <div
        className={`nav__overlay ${mobileOpen ? 'nav__overlay--visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile drawer */}
      <div className={`nav__drawer ${mobileOpen ? 'nav__drawer--open' : ''}`}>
        <div className="nav__drawer-inner">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={group.label} className="nav__drawer-group">
              <div
                className="nav__drawer-group-title"
                style={{ transitionDelay: mobileOpen ? `${gIdx * 0.06 + 0.1}s` : '0s' }}
              >
                {group.label}
              </div>
              {group.links.map((link, lIdx) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav__drawer-link ${location.pathname === link.to ? 'nav__drawer-link--active' : ''} ${mobileOpen ? 'nav__drawer-link--enter' : ''}`}
                  style={{ transitionDelay: mobileOpen ? `${(gIdx * 4 + lIdx) * 0.035 + 0.15}s` : '0s' }}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="nav__drawer-link-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          ))}

          <div className="nav__drawer-cta">
            <Link to="/analyze" className="nav__cta nav__cta--full" onClick={() => setMobileOpen(false)}>
              Scan Now
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
