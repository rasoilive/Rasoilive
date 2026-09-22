import { useState } from 'react'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true)
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PaymentMode({ pendingPayload, onOrderSuccess, onBack }) {
  const [selected, setSelected] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

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

      if (selected === 'online') {
        // Attempt Razorpay Gateway checkout
        const isLoaded = await loadRazorpayScript()
        if (isLoaded) {
          try {
            const payOrderRes = await fetch('/api/payment/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: order.total, orderId })
            })
            const payData = await payOrderRes.json()

            if (payOrderRes.ok && !payData.fallback && payData.orderId) {
              // Launch Razorpay Modal
              const options = {
                key: payData.keyId,
                amount: payData.amount,
                currency: payData.currency,
                name: 'Rasoi Live',
                description: `Order #${orderId.slice(-6)}`,
                order_id: payData.orderId,
                handler: async function (response) {
                  // Verify payment signature
                  await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                      orderId
                    })
                  })
                  onOrderSuccess(orderId, false)
                },
                prefill: {
                  name: pendingPayload.customer_name || 'Guest',
                },
                theme: { color: '#ffc107' }
              }
              const rzp = new window.Razorpay(options)
              rzp.open()
              setPlacing(false)
              return
            }
          } catch (e) {
            console.warn('Razorpay checkout failed, proceeding with standard UPI QR fallback:', e)
          }
        }
      }

      // Default success for cash or offline/fallback online
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
      onOrderSuccess(mockOrderId, isOffline)
    }
    setPlacing(false)
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
            💳 Pay Online (Razorpay / UPI / Card)
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
            💵 Pay Offline (Cash / Pay at Counter)
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
