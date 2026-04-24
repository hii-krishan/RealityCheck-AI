import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import HomePage from './pages/HomePage'
import AnalyzePage from './pages/AnalyzePage'
import ArticlesPage from './pages/ArticlesPage'
import HelplinePage from './pages/HelplinePage'
import MapPage from './pages/MapPage'
import ScamDetectorPage from './pages/ScamDetectorPage'
import LinkCheckerPage from './pages/LinkCheckerPage'
import QRScannerPage from './pages/QRScannerPage'
import TipsPage from './pages/TipsPage'
import ReverseSearchPage from './pages/ReverseSearchPage'
import QuizPage from './pages/QuizPage'
import CommunityPage from './pages/CommunityPage'
import FootprintPage from './pages/FootprintPage'

export default function App() {
  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/helpline" element={<HelplinePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/scam-detector" element={<ScamDetectorPage />} />
          <Route path="/link-checker" element={<LinkCheckerPage />} />
          <Route path="/qr-scanner" element={<QRScannerPage />} />
          <Route path="/tips" element={<TipsPage />} />
          <Route path="/reverse-search" element={<ReverseSearchPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/footprint" element={<FootprintPage />} />
        </Routes>
      </div>
      <Footer />
    </>
  )
}
