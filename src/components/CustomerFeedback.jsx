import { useState, useEffect } from 'react'

export default function CustomerFeedback({ orderId, customerName, onDone }) {
  const [rating,    setRating]    = useState(0)
  const [hover,     setHover]     = useState(0)
  const [comment,   setComment]   = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)

  // Check localStorage if feedback was already submitted for this order
  const alreadyDone = !!localStorage.getItem(`feedback_${orderId}`)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) return alert('Please select a star rating.')
    setLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating, comment, customerName })
      })
      if (res.ok || res.status === 409) {
        localStorage.setItem(`feedback_${orderId}`, '1')
        setSubmitted(true)
      }
    } catch (err) {
      // Offline fallback — still mark as submitted locally
      localStorage.setItem(`feedback_${orderId}`, '1')
      setSubmitted(true)
    }
    setLoading(false)
  }

  if (alreadyDone || submitted) {
    return (
      <div className="card animate-fade-in" style={{ textAlign: 'center', padding: 32, margin: '16px 0', background: 'linear-gradient(135deg, rgba(76,175,80,0.1), rgba(0,0,0,0))', border: '1px solid rgba(76,175,80,0.3)' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</p>
        <h3 style={{ color: '#4CAF50', marginBottom: 8 }}>Thank You!</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Your feedback has been recorded.</p>
        {onDone && <button onClick={onDone} className="btn-outline" style={{ marginTop: 16, padding: '8px 24px' }}>Done</button>}
      </div>
    )
  }

  return (
    <div className="card animate-fade-in" style={{ padding: 24, margin: '16px 0' }}>
      <h3 style={{ marginBottom: 4, color: 'var(--primary)' }}>How was your experience?</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
        Your feedback helps us improve. This is a one-time submission.
      </p>
      
      <form onSubmit={handleSubmit}>
        {/* Star Rating */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '2.5rem', lineHeight: 1,
                color: (hover || rating) >= star ? '#FFD700' : 'rgba(255,255,255,0.2)',
                transform: (hover || rating) >= star ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.15s'
              }}
            >
              ★
            </button>
          ))}
        </div>

        {rating > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>
            {['', 'Very Poor 😟', 'Poor 😕', 'Okay 😐', 'Good 😊', 'Excellent! 😍'][rating]}
          </div>
        )}

        {/* Comment */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="What can we improve? Tell us more... (optional)"
          rows={3}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: 12, color: '#fff', fontSize: '0.9rem', resize: 'none',
            marginBottom: 16, boxSizing: 'border-box', outline: 'none'
          }}
        />

        <button
          type="submit"
          disabled={loading || rating === 0}
          className="btn-primary"
          style={{ width: '100%', padding: '12px', fontWeight: 700, letterSpacing: 1 }}>
          {loading ? 'Submitting...' : '⭐ Submit Feedback'}
        </button>
      </form>
    </div>
  )
}
