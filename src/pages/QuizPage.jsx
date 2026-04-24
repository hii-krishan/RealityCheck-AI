import { useState } from 'react'

const QUESTIONS = [
  { id: 1, image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=400&fit=crop', answer: 'real', explanation: 'This is a real photograph. Notice the natural skin texture, consistent lighting, and genuine background blur (bokeh) from a real camera lens.' },
  { id: 2, image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop', answer: 'ai', explanation: 'This image was AI-generated. Look for overly smooth skin, perfect symmetry, and unusual background blending that are hallmarks of AI models.' },
  { id: 3, image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=400&fit=crop', answer: 'real', explanation: 'Real photograph with natural imperfections, genuine eye reflections, and consistent noise patterns from a digital camera sensor.' },
  { id: 4, image: 'https://images.unsplash.com/photo-1686191128892-3b37add4c844?w=600&h=400&fit=crop', answer: 'ai', explanation: 'AI-generated image. The textures are unnaturally smooth, and the fine details (hair strands, fabric) show telltale AI artifacts.' },
  { id: 5, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop', answer: 'real', explanation: 'A genuine photograph. The subject has natural skin pores, asymmetric features, and real-world lighting with consistent shadows.' },
  { id: 6, image: 'https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?w=600&h=400&fit=crop', answer: 'ai', explanation: 'This is AI-generated. Notice the impossibly perfect composition and the subtle inconsistencies in reflections and edge details.' },
  { id: 7, image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=400&fit=crop', answer: 'real', explanation: 'Real photograph. Natural asymmetry, genuine catchlights in eyes, and visible skin texture confirm this is from a real camera.' },
  { id: 8, image: 'https://images.unsplash.com/photo-1675271591211-930246f18d3a?w=600&h=400&fit=crop', answer: 'ai', explanation: 'AI-generated. The overall image has an uncanny smoothness, and fine structural details are inconsistent upon close inspection.' },
]

export default function QuizPage() {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)

  const q = QUESTIONS[current]

  const handleAnswer = (answer) => {
    if (selected) return
    setSelected(answer)
    if (answer === q.answer) setScore(s => s + 1)
    setShowResult(true)
  }

  const next = () => {
    if (current + 1 >= QUESTIONS.length) { setFinished(true); return }
    setCurrent(c => c + 1); setSelected(null); setShowResult(false)
  }

  const restart = () => { setCurrent(0); setScore(0); setSelected(null); setShowResult(false); setFinished(false) }

  if (finished) {
    const pct = Math.round((score / QUESTIONS.length) * 100)
    const grade = pct >= 80 ? '🏆 Expert' : pct >= 60 ? '👍 Good' : pct >= 40 ? '📚 Learning' : '🔰 Beginner'
    return (
      <div className="page-content">
        <div className="quiz-container">
          <div className="card quiz-score-card">
            <div className="page-badge">🧠 Quiz Complete!</div>
            <div className="score-number" style={{ color: pct >= 60 ? 'var(--success)' : 'var(--warning)' }}>{score}/{QUESTIONS.length}</div>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{grade}</p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              You correctly identified {score} out of {QUESTIONS.length} images ({pct}%)
            </p>
            <div className="card" style={{ borderLeft: '3px solid var(--accent)', textAlign: 'left' }}>
              <h4>💡 Tips to Improve:</h4>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '1.2rem', marginTop: '8px' }}>
                <li>Look for unnatural skin smoothness and perfect symmetry</li>
                <li>Check hands and fingers — AI often gets these wrong</li>
                <li>Examine background details for impossible physics</li>
                <li>Look at eye reflections — they should be consistent</li>
                <li>Zoom in on hair and fabric edges for AI artifacts</li>
              </ul>
            </div>
            <button className="btn btn-primary btn-lg mt-3" onClick={restart}>🔄 Try Again</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-badge">🧠 Test Your Skills</div>
        <h1>Real or AI-Generated?</h1>
        <p>Can you tell the difference? Test your detection skills!</p>
      </div>

      <div className="quiz-container">
        <div className="quiz-progress">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={`quiz-dot ${i < current ? 'answered' : i === current ? 'current' : ''}`} />
          ))}
        </div>
        
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Question {current + 1} of {QUESTIONS.length} • Score: {score}
        </p>

        <div className="quiz-image"><img src={q.image} alt="Quiz" loading="lazy" /></div>

        <div className="quiz-choices">
          <button className={`quiz-choice ${selected === 'real' ? (q.answer === 'real' ? 'correct' : 'wrong') : ''}`}
            onClick={() => handleAnswer('real')}>📸 Real Photo</button>
          <button className={`quiz-choice ${selected === 'ai' ? (q.answer === 'ai' ? 'correct' : 'wrong') : ''}`}
            onClick={() => handleAnswer('ai')}>🤖 AI-Generated</button>
        </div>

        {showResult && (
          <>
            <div className="quiz-explanation">
              <strong>{selected === q.answer ? '✅ Correct!' : '❌ Wrong!'}</strong>
              <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>{q.explanation}</p>
            </div>
            <button className="btn btn-primary mt-2" style={{ width: '100%' }} onClick={next}>
              {current + 1 >= QUESTIONS.length ? '📊 See Results' : 'Next Question →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
