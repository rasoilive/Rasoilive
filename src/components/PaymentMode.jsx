import { useState } from 'react'

export default function PaymentMode({ pendingPayload, onOrderSuccess, onBack }) {
  const [selected, setSelected] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState(null)

  const handleProceed = async () => {
    if (!selected || !pendingPayload) return
    setPlacing(true)
    setError('')

    const payload = { ...pendingPayload, payment_mode: selected }
    const isOffline = selected === 'offline'

    try {
      // Step 1: Create order on backend
      const res = await fetch(`/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to create order on server')
      const order = await res.json()
      const orderId = order._id.toString()
      localStorage.setItem('demo_order_' + orderId, JSON.stringify({ ...order, _id: orderId }))
      
      setCreatedOrderId(orderId)

      if (selected === 'online') {
        // Show the manual UPI QR code screen instead of Razorpay
        setShowQR(true)
        setPlacing(false)
        return
      }

      // Default success for offline cash
      onOrderSuccess(orderId, isOffline)
    } catch (err) {
      // Offline LocalStorage fallback
      const mockOrderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase()
      const orderData = {
        _id: mockOrderId,
        ...payload,
        status: 'pending',
        payment_status: 'PENDING',
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('demo_order_' + mockOrderId, JSON.stringify(orderData))
      
      if (selected === 'online') {
        setCreatedOrderId(mockOrderId)
        setShowQR(true)
        setPlacing(false)
        return
      }
      
      onOrderSuccess(mockOrderId, isOffline)
    }
    setPlacing(false)
  }

  const handleConfirmPaid = () => {
    onOrderSuccess(createdOrderId, false) // false = online
  }

  if (showQR) {
    // Determine total amount from pendingPayload
    const amount = pendingPayload ? pendingPayload.total : 0
    // UPI intent string
    const upiLink = `upi://pay?pa=sumanroysumanroy776@oksbi&pn=Burnout%20Cafe&am=${amount}&cu=INR`

    return (
      <div className="view-center animate-fade-in" style={{ position: 'relative' }}>
        <div className="card owner-login-card" style={{ width: '100%', maxWidth: 400, padding: '32px 24px', marginTop: 40, textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 8, color: 'var(--primary)' }}>Scan to Pay</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>Amount to pay: <strong style={{color: '#fff', fontSize: '1.2rem'}}>₹{amount}</strong></p>
          
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, display: 'inline-block', marginBottom: 24 }}>
            {/* The local QR code image */}
            <img src="/qr.png" alt="UPI QR Code" style={{ width: 200, height: 200, display: 'block' }} />
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>Or tap below to open installed apps:</p>
          
          <div style={{ marginBottom: 32 }}>
            <a href={upiLink} className="btn-outline-gray" style={{ width: '100%', padding: '14px 0', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, letterSpacing: 1, border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 8 }}>
              📲 PAY BY APP
            </a>
          </div>

          <button 
            className="btn-primary" 
            style={{ letterSpacing: 1.5, fontWeight: 700, padding: '14px', width: '100%', background: '#4CAF50', color: '#000' }}
            onClick={handleConfirmPaid}
          >
            DONE / VIEW ORDER STATUS
          </button>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 12, fontFamily: 'Inter, sans-serif' }}>
            * Your order is already booked. Payment will be verified by the restaurant.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-center animate-fade-in" style={{ position: 'relative' }}>
      <button 
        onClick={onBack}
        style={{ position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Back to Cart
      </button>

      <div className="card owner-login-card" style={{ width: '100%', maxWidth: 400, padding: '32px 24px', marginTop: 40 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
          Payment Mode
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
          How would you like to pay?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <button
            className="btn-outline-gray"
            style={{ 
              padding: '16px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              background: selected === 'online' ? 'rgba(255,193,7,0.1)' : 'transparent',
              borderColor: selected === 'online' ? 'var(--primary)' : 'rgba(255,255,255,0.2)'
            }}
            onClick={() => setSelected('online')}
          >
            📱 Pay Online (Scan UPI QR)
          </button>
          
          <button
            className="btn-outline-gray"
            style={{ 
              padding: '16px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              background: selected === 'offline' ? 'rgba(255,193,7,0.1)' : 'transparent',
              borderColor: selected === 'offline' ? 'var(--primary)' : 'rgba(255,255,255,0.2)'
            }}
            onClick={() => setSelected('offline')}
          >
            💵 Pay Offline (Cash / At Counter)
          </button>
        </div>

        {error && <div style={{ color: '#f44336', textAlign: 'center', marginBottom: 16 }}>⚠️ {error}</div>}

        <button 
          className="btn-primary" 
          style={{ letterSpacing: 1.5, fontWeight: 700, padding: '14px', width: '100%' }}
          disabled={!selected || placing}
          onClick={handleProceed}
        >
          {placing ? '⏳ PLACING ORDER...' : 'PROCEED'}
        </button>
      </div>
    </div>
  )
}
