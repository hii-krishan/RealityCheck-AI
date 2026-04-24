import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h3>RealityCheck <span>AI</span></h3>
          <p>AI-powered image forensics & digital safety platform. Built to protect you from deepfakes, scams, and online misinformation.</p>
        </div>
        <div className="footer-col">
          <h4>Tools</h4>
          <ul>
            <li><Link to="/analyze">Image Analyzer</Link></li>
            <li><Link to="/scam-detector">Scam Detector</Link></li>
            <li><Link to="/link-checker">Link Checker</Link></li>
            <li><Link to="/qr-scanner">QR Scanner</Link></li>
            <li><Link to="/reverse-search">Reverse Search</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Learn</h4>
          <ul>
            <li><Link to="/articles">Articles</Link></li>
            <li><Link to="/tips">Safety Tips</Link></li>
            <li><Link to="/quiz">Deepfake Quiz</Link></li>
            <li><Link to="/footprint">Footprint Check</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Help</h4>
          <ul>
            <li><Link to="/helpline">Cyber Helpline</Link></li>
            <li><Link to="/map">Police Stations</Link></li>
            <li><Link to="/community">Community</Link></li>
            <li><a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">Report Crime</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} RealityCheck AI — Made by Khushi Garg and Krishan Jain</p>
      </div>
    </footer>
  )
}
