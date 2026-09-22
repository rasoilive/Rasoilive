import { useState } from 'react'

export default function NameEntry({ onEnter }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const n = name.trim()
    if (!n) { setError('Please enter your name'); return }
    onEnter(n)
  }

  return (
    <div className="view-center animate-fade-in" style={{ padding: 20 }}>
      <div className="card owner-login-card" style={{ width: '100%', maxWidth: 360, padding: '32px 24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>
          Enter Your Name
        </h2>

        <div style={{ marginBottom: 24 }}>
          <input
            className="owner-input"
            type="text"
            placeholder="e.g. Satyam"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ textAlign: 'center' }}
          />
        </div>

        {error && (
          <p style={{ color: '#f44336', fontSize: '0.85rem', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button className="btn-primary" style={{ letterSpacing: 1.5, fontWeight: 700, padding: '14px', width: '100%' }} onClick={handleSubmit}>
          CONTINUE
        </button>
      </div>
    </div>
  )
}
