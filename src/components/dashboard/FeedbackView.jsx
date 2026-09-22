import { useState, useEffect } from 'react'

export default function FeedbackView({ orders }) {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const token = localStorage.getItem('rasoi_token')
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
        const res = await fetch('/api/feedback', { headers })
        if (res.ok) setFeedback(await res.json())
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    fetchFeedback()
    const interval = setInterval(fetchFeedback, 10000)
    return () => clearInterval(interval)
  }, [])

  const avgRating = feedback.length
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
    : '–'

  const stars = (n) => Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < n ? '#FFD700' : '#555', fontSize: '1.1rem' }}>★</span>
  ))

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading feedback...</div>

  return (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.2rem', marginBottom: 20, color: 'var(--primary)' }}>Customer Feedback</h3>

      {/* Summary Card */}
      <div className="card" style={{ padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#FFD700' }}>{avgRating}</div>
          <div style={{ fontSize: '1.5rem' }}>{stars(Math.round(Number(avgRating)))}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Average Rating</div>
        </div>
        <div style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map(n => {
            const count = feedback.filter(f => f.rating === n).length
            const pct = feedback.length ? (count / feedback.length) * 100 : 0
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ width: 24, color: '#FFD700', fontWeight: 700 }}>{n}★</span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#FFD700', borderRadius: 4 }} />
                </div>
                <span style={{ width: 30, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{count}</span>
              </div>
            )
          })}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)' }}>{feedback.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Reviews</div>
        </div>
      </div>

      {/* Individual Reviews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {feedback.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '2rem' }}>💬</p>
            <p>No customer feedback yet. Reviews will appear here after customers submit them.</p>
          </div>
        ) : (
          feedback.map(f => (
            <div key={f._id} className="card" style={{ padding: 16, display: 'flex', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', color: '#000', flexShrink: 0 }}>
                {(f.customerName || 'A')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong>{f.customerName || 'Anonymous'}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(f.timestamp).toLocaleString('en-IN')}
                  </span>
                </div>
                <div style={{ marginBottom: 6 }}>{stars(f.rating)}</div>
                {f.comment && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{f.comment}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
