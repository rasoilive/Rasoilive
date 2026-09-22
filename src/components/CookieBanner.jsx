import { useState, useEffect } from 'react'

export default function CookieBanner({ forceShow, onClose }) {
  const [show, setShow] = useState(false)
  const [analytics, setAnalytics] = useState(true)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      setShow(true)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({ necessary: true, analytics: true }))
    setShow(false)
    if (onClose) onClose()
  }

  const handleRejectAll = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({ necessary: true, analytics: false }))
    setShow(false)
    if (onClose) onClose()
  }

  if (!show && !forceShow) return null

  return (
    <div className="cookie-banner-container animate-fade-in">
      <div className="cookie-banner-content">
        <h3 style={{ fontFamily: 'var(--font-accent)', color: 'var(--primary)', letterSpacing: 1, marginBottom: 12 }}>
          🍪 PREMIUM DINING PRIVACY
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
          We use cookies to enhance your gourmet experience, analyze traffic, and improve our services to provide you with the best dining at Rasoi.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'not-allowed' }}>
            <input type="checkbox" checked disabled className="custom-checkbox" />
            <span style={{ color: 'var(--text-secondary)' }}>Necessary Cookies (Always Active)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} className="custom-checkbox analytics" />
            <span>Analytics Cookies</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }} onClick={handleAcceptAll}>
            Accept All
          </button>
          <button className="btn-outline-gray" style={{ flex: 1, padding: '12px', fontSize: '0.9rem' }} onClick={handleRejectAll}>
            Reject All
          </button>
        </div>
      </div>
    </div>
  )
}
