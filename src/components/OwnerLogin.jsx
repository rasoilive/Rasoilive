import { useState } from 'react'

const API = '/api'

export default function OwnerLogin({ onLogin, onBack }) {
  const [isRegistering, setIsRegistering] = useState(false)
  
  const [userId,   setUserId]   = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [restCode, setRestCode] = useState('')
  
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (isRegistering) {
      if (!userId || !password || !name || !restCode) {
        setError('All fields are required.')
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`${API}/owner/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, password, name, restCode })
        })
        const data = await res.json()
        
        if (res.ok) {
          setSuccess('Owner registered successfully! Please login.')
          setIsRegistering(false)
          setPassword('')
        } else {
          setError(data.error || 'Registration failed')
        }
      } catch (err) {
        setError('Server unreachable. Please ensure the backend server is running and try again.')
      }
    } else {
      // LOGIN
      if (!userId || !password) {
        setError('Please enter User ID and Password.')
        setLoading(false)
        return
      }
      
      try {
        const res = await fetch(`${API}/owner/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, password })
        })
        const data = await res.json()
        
        if (res.ok) {
          if (data.token) {
            localStorage.setItem('rasoi_token', data.token)
            localStorage.setItem('rasoi_owner', JSON.stringify({ name: data.name, restCode: data.restCode }))
          }
          onLogin(data) // Pass owner data to App
        } else {
          setError(data.error || 'Invalid credentials')
        }
      } catch (err) {
        // No offline fallback — server must be running for security
        setError('Server unreachable. Please ensure the backend server is running and try again.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="view-center animate-fade-in" style={{ position: 'relative' }}>
      
      {/* Back button */}
      <button 
        onClick={onBack}
        style={{ position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
      >
        ← Back to App
      </button>

      <div className="card owner-login-card" style={{ width: '100%', maxWidth: 400, padding: '32px 24px' }}>
        <div className="text-center" style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span>🔐</span> BURNOUT CAFE & RESTAURANT
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isRegistering ? 'Register New Owner' : 'Owner & Staff Panel'}
          </p>
        </div>

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>Restaurant Name / Owner Name</label>
                <input type="text" className="owner-input" placeholder="e.g. The Grand Rasoi" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>Unique Restaurant Code (Required by users)</label>
                <input type="text" className="owner-input" placeholder="e.g. GRAND001" value={restCode} onChange={e => setRestCode(e.target.value.toUpperCase())} />
              </div>
            </>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>User ID</label>
            <input type="text" className="owner-input" placeholder="Enter your User ID" value={userId} onChange={e => setUserId(e.target.value)} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>Password</label>
            <input type="password" className="owner-input" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          {error && <p style={{ color: '#f44336', fontSize: '0.85rem', marginBottom: 16, textAlign: 'center', background: 'rgba(244,67,54,0.1)', padding: 10, borderRadius: 8 }}>{error}</p>}
          {success && <p style={{ color: '#4CAF50', fontSize: '0.85rem', marginBottom: 16, textAlign: 'center', background: 'rgba(76,175,80,0.1)', padding: 10, borderRadius: 8 }}>{success}</p>}

          <button type="submit" disabled={loading} className="btn-primary" style={{ letterSpacing: 1.5, fontWeight: 700, padding: '14px', marginBottom: 24, boxShadow: '0 0 20px rgba(255,193,7,0.3)' }}>
            {loading ? 'PLEASE WAIT...' : (isRegistering ? 'CREATE ACCOUNT' : 'OWNER ACCESS')}
          </button>
        </form>

        <hr className="divider" style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0 0 24px 0' }} />

        <div className="text-center">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
            {isRegistering ? 'Already have a panel?' : 'Need a new restaurant panel?'}
          </p>
          <button 
            type="button"
            className="btn-outline" 
            style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1 }}
            onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess('') }}
          >
            {isRegistering ? 'LOGIN INSTEAD' : 'REGISTER NEW OWNER'}
          </button>
        </div>
      </div>
    </div>
  )
}
