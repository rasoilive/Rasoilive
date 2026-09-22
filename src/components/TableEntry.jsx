import { useState } from 'react'

export default function TableEntry({ onEnter }) {
  const [tableNo, setTableNo] = useState('')
  const [restCode, setRestCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const t = tableNo.trim()
    const r = restCode.trim()
    
    if (!t) { setError('Please enter table number'); return }
    if (isNaN(t) || Number(t) < 1) { setError('Please enter a valid table number'); return }
    if (!r) { setError('Please enter restaurant code'); return }
    
    // Pass both values back to App
    onEnter(t, r)
  }

  return (
    <div className="view-center animate-fade-in" style={{ padding: 20 }}>
      <div className="card owner-login-card" style={{ width: '100%', maxWidth: 360, padding: '32px 24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>
          Enter Table Number
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>Table</label>
          <input
            id="table-number-input"
            className="owner-input"
            type="number"
            min="1"
            placeholder="e.g. 5"
            value={tableNo}
            onChange={e => { setTableNo(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('rest-code-input').focus()}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>Rest. Code</label>
          <input
            id="rest-code-input"
            className="owner-input"
            type="text"
            placeholder="e.g. RES001"
            value={restCode}
            onChange={e => { setRestCode(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && (
          <p style={{ color: '#f44336', fontSize: '0.85rem', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button id="enter-menu-btn" className="btn-primary" style={{ letterSpacing: 1.5, fontWeight: 700, padding: '14px', width: '100%' }} onClick={handleSubmit}>
          CONTINUE
        </button>
      </div>
    </div>
  )
}
