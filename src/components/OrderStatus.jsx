import { useState, useEffect, useCallback } from 'react'
import { getSettings } from '../hooks/useSettings'
import { socket } from '../socket'
import { useToast } from './ToastContext'

// ─── Inline Quick Feedback (shows even before served) ───────────────────
const SUGGESTIONS = [
  '⚡ Food takes too long',
  '🌡️ Temperature not right',
  '🍽️ Presentation could be better',
  '🔊 Too noisy inside',
  '😊 Service was excellent!',
]

function QuickFeedback({ orderId, customerName, isServed }) {
  const [rating, setRating]         = useState(0)
  const [hover, setHover]           = useState(0)
  const [selected, setSelected]     = useState([])
  const [comment, setComment]       = useState('')
  const [submitted, setSubmitted]   = useState(!!localStorage.getItem(`feedback_${orderId}`))
  const [loading, setLoading]       = useState(false)

  const toggleChip = (chip) =>
    setSelected(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) return alert('Please tap a star to rate your experience!')
    setLoading(true)
    const fullComment = [comment, ...selected].filter(Boolean).join(' | ')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating, comment: fullComment, customerName })
      })
      if (res.ok || res.status === 409) {
        localStorage.setItem(`feedback_${orderId}`, '1')
        setSubmitted(true)
      }
    } catch {
      localStorage.setItem(`feedback_${orderId}`, '1')
      setSubmitted(true)
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="card animate-fade-in" style={{ padding: '28px 24px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(76,175,80,0.12), rgba(0,0,0,0))', border: '1px solid rgba(76,175,80,0.3)', margin: '16px 0' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
        <h3 style={{ color: '#4CAF50', marginBottom: 8 }}>Thank You!</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Your feedback has been recorded. We appreciate it!</p>
      </div>
    )
  }

  return (
    <div className="card animate-fade-in" style={{ padding: '20px 24px', margin: '16px 0', border: '1px solid rgba(255,193,7,0.15)', background: 'rgba(255,193,7,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.5rem' }}>💬</span>
        <div>
          <div style={{ fontWeight: 700, fontFamily: 'Inter, sans-serif', fontSize: '1rem' }}>Share Your Experience</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
            {isServed ? 'How was your meal today?' : 'Your feedback helps us improve!'}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 5 Star Rating */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
          {[1,2,3,4,5].map(star => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '2.4rem', lineHeight: 1,
                color: (hover || rating) >= star ? '#FFD700' : 'rgba(255,255,255,0.2)',
                transform: (hover || rating) >= star ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.15s'
              }}
            >★</button>
          ))}
        </div>
        {rating > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 14, fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 700 }}>
            {['', 'Very Poor 😟', 'Poor 😕', 'Okay 😐', 'Good 😊', 'Excellent! 😍'][rating]}
          </div>
        )}

        {/* Clickable suggestion chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {SUGGESTIONS.map(chip => (
            <button
              type="button"
              key={chip}
              onClick={() => toggleChip(chip)}
              style={{
                padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                fontSize: '0.88rem', fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                border: selected.includes(chip) ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                background: selected.includes(chip) ? 'rgba(255,193,7,0.15)' : 'rgba(255,255,255,0.04)',
                color: selected.includes(chip) ? 'var(--primary)' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              {selected.includes(chip) && <span style={{ fontSize: '0.7rem' }}>✓</span>}
              {chip}
            </button>
          ))}
        </div>

        {/* Comment box */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Add more details... (optional)"
          rows={2}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: 12, color: '#fff', fontSize: '0.9rem', resize: 'none',
            marginBottom: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif'
          }}
        />

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '13px', fontWeight: 700, letterSpacing: 1, fontSize: '0.95rem' }}
        >
          {loading ? 'Submitting...' : '⭐ Submit Feedback'}
        </button>
      </form>
    </div>
  )
}

export default function OrderStatus({ orderId, tableNo, userName, isOffline, onAddMore, onHistory }) {
  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const toast = useToast()

  const fetchOrder = useCallback(async () => {
    if (!orderId) return
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        setOrder(await res.json())
      } else {
        const stored = localStorage.getItem('demo_order_' + orderId)
        if (stored) setOrder(JSON.parse(stored))
        else setError('Order not found')
      }
    } catch {
      const stored = localStorage.getItem('demo_order_' + orderId)
      if (stored) setOrder(JSON.parse(stored))
      else setError('Unable to load order. Check your connection.')
    }
    setLoading(false)
  }, [orderId])

  useEffect(() => {
    fetchOrder()

    const handleOrderUpdate = (update) => {
      if (update._id === orderId) {
        setOrder(prev => prev ? { ...prev, status: update.status } : prev)
        toast(`Your order is now ${update.status}!`, 'info')
      }
    }

    const handlePaymentUpdate = (update) => {
      if (update._id === orderId) {
        setOrder(prev => prev ? { ...prev, payment_status: update.payment_status, payment_mode: update.payment_mode } : prev)
        if (update.payment_status === 'COMPLETED') {
          toast('Payment confirmed by restaurant!', 'success')
        }
      }
    }

    socket.on('orderUpdated', handleOrderUpdate)
    socket.on('orderPaymentUpdated', handlePaymentUpdate)

    return () => {
      socket.off('orderUpdated', handleOrderUpdate)
      socket.off('orderPaymentUpdated', handlePaymentUpdate)
    }
  }, [fetchOrder, orderId, toast])

  if (loading && !order) {
    return (
      <div className="view-center animate-fade-in">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Loading your order...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="view-center animate-fade-in">
        <div className="card text-center" style={{ padding: 24 }}>
          <p style={{ color: '#f44336', marginBottom: 16 }}>⚠️ {error}</p>
          <button className="btn-primary" onClick={fetchOrder}>Retry</button>
        </div>
      </div>
    )
  }

  const status    = order?.status?.toLowerCase() || 'pending'
  const isPaid    = order?.payment_status === 'COMPLETED'
  const isServed  = status === 'served'
  const isOnline  = !isOffline

  const items    = order?.items || []
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const sttgs    = getSettings()
  const discAmt  = order?.discount || Math.round(subtotal * (sttgs.discountPercent / 100))
  const afterDisc = subtotal - discAmt
  const gst      = order?.gst || Math.round(afterDisc * (sttgs.gstPercent / 100))
  const svc      = order?.service_charge || sttgs.serviceCharge || 0
  const total    = order?.total || (afterDisc + gst + svc)

  const upiId = (sttgs.upiId && sttgs.upiId !== 'rasoi@okaxis') ? sttgs.upiId : 'sumanroysumanroy776@oksbi'
  const restName = encodeURIComponent(sttgs.restaurantName || 'Burnout Cafe')
  const qrData = encodeURIComponent(`upi://pay?pa=${upiId}&pn=${restName}&am=${total}&cu=INR`)
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`

  const statusEmoji = { pending: '⏳', accepted: '✅', preparing: '🔥', ready: '🛎️', served: '🎉' }[status] || '⏳'
  const statusMessage = {
    pending:   'Waiting for kitchen to confirm your order…',
    accepted:  'Order confirmed! Kitchen is getting started.',
    preparing: 'Chef is cooking your food right now! 🍳',
    ready:     'Food is ready! Your server is bringing it now.',
    served:    'Enjoy your meal! Hope you love every bite. 😍'
  }[status] || 'Processing…'

  return (
    <>
      <div className="view-scroll animate-fade-in no-print" style={{ paddingBottom: 100 }}>

        {/* ── Hero Banner ─────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '32px 20px 20px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>{statusEmoji}</div>
          <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.5rem', marginBottom: 6 }}>
            {isServed ? 'Food Served!' : 'Order Placed!'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 320, margin: '0 auto', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
            {statusMessage}
          </p>
          
          <div style={{ 
            display: 'inline-block', marginTop: 14, padding: '6px 16px', borderRadius: 20, 
            background: isPaid ? 'rgba(76,175,80,0.1)' : 'rgba(255,193,7,0.1)',
            border: isPaid ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(255,193,7,0.3)',
            color: isPaid ? '#4CAF50' : 'var(--primary)',
            fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: 1
          }}>
            Payment: {isPaid ? 'VERIFIED ✓' : 'PENDING'}
          </div>
        </div>

        {/* ── Order + Payment Summary Card ─────────── */}
        <div className="card" style={{ maxWidth: 520, margin: '0 auto 16px auto', padding: '20px' }}>

          {/* Table & Payment row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Table</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'Inter, sans-serif' }}>{tableNo}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', color: '#fff' }}>
                {status === 'pending' ? 'Order Placed' : status}
              </div>
            </div>
          </div>

          {/* Order items */}
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'Inter, sans-serif', marginBottom: 12 }}>
            Your Order
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem' }}>
                <span style={{ flex: 1 }}>{item.name}</span>
                <span style={{ color: 'var(--text-secondary)', margin: '0 12px' }}>×{item.qty}</span>
                <span style={{ fontWeight: 600 }}>₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>
              <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
            </div>
            {discAmt > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4CAF50', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>
                <span>Discount</span><span>−₹{discAmt}</span>
              </div>
            )}
            {sttgs.gstPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>
                <span>GST ({sttgs.gstPercent}%)</span><span>₹{gst}</span>
              </div>
            )}
            {svc > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>
                <span>Service Charge</span><span>₹{svc}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)', marginTop: 8 }}>
              <span>Grand Total</span><span>₹{Math.round(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Online Payment: QR Code + Disclaimer ──── */}
        {isOnline && !isPaid && (
          <div className="card animate-fade-in" style={{ maxWidth: 520, margin: '0 auto 16px auto', padding: '20px', border: '1px solid rgba(255,193,7,0.25)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'Inter, sans-serif', marginBottom: 14 }}>
              Online Payment — Scan & Pay
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* QR Code */}
              <div style={{ background: '#fff', padding: 10, borderRadius: 12, flexShrink: 0 }}>
                <img src="/qr.png" alt="UPI QR Code" width={140} height={140} style={{ display: 'block' }} />
              </div>

              {/* Right side info */}
              <div style={{ flex: 1, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Scan the QR code to pay:
                </div>
                <div style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)', marginBottom: 6 }}>₹{total}</div>
                
                <a href={`upi://pay?pa=${upiId}&pn=${restName}&am=${total}&cu=INR`} className="btn-primary" style={{ display: 'inline-block', padding: '10px 16px', marginTop: 8, textDecoration: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', width: '100%', textAlign: 'center' }}>
                  📲 Pay by App
                </a>
              </div>
            </div>

            {/* ⚠️ Strong Disclaimer */}
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.4)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⚠️</span>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', lineHeight: 1.6 }}>
                <strong style={{ color: '#f44336', display: 'block', marginBottom: 2 }}>Do NOT close or exit this screen!</strong>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Please complete the payment and wait here. The restaurant will verify and confirm your payment. 
                  <strong style={{ color: 'var(--primary)' }}> Save or print your bill only after payment is verified below.</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Offline disclaimer ─────────────────────── */}
        {isOffline && (
          <div style={{ maxWidth: 520, margin: '0 auto 16px auto', padding: '12px 16px', background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 12, fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', display: 'flex', gap: 10 }}>
            <span>💵</span>
            <div>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: 2 }}>Cash Payment — Pay at counter</strong>
              <span style={{ color: 'var(--text-secondary)' }}>Please do not exit this screen. Show it to staff while paying.</span>
            </div>
          </div>
        )}

        {/* ── Payment Verified Banner ─────────────────── */}
        {isPaid && (
          <div className="animate-fade-in" style={{ maxWidth: 520, margin: '0 auto 16px auto', padding: '18px', background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.4)', borderRadius: 12, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ fontSize: '2rem', marginBottom: 6 }}>✅</div>
            <div style={{ fontWeight: 800, color: '#4CAF50', fontSize: '1rem', marginBottom: 4 }}>Payment Verified by Restaurant!</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Your bill is complete. You can now safely print or save your receipt.</div>
          </div>
        )}

        {/* ── Quick Feedback — always visible, fully interactive ── */}
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <QuickFeedback orderId={orderId} customerName={userName} isServed={isServed} />
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#444', marginTop: 20, paddingBottom: 8, fontFamily: 'Inter, sans-serif' }}>
          Real-time updates active
        </p>
      </div>

      {/* ── Floating Bill Actions ───────────────────── */}
      <div className="no-print" style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 600, padding: '12px 16px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.97))', zIndex: 200, display: 'flex', gap: 10
      }}>
        <button onClick={() => window.print()} className="btn-primary" style={{ flex: 1, padding: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '1rem', letterSpacing: 1 }}>
          🖨️ PRINT BILL
        </button>
      </div>

      {/* ── Print-Only Tax Invoice ──────────────────── */}
      <div className="print-only">
        <div className="tax-invoice-wrap">
          <div className="ti-header">
            <h1 className="ti-restaurant-name">{sttgs.restaurantName?.toUpperCase()}</h1>
            <p className="ti-tagline">{sttgs.tagline?.toUpperCase()}</p>
            <div className="ti-title-box">TAX INVOICE</div>
          </div>
          <hr className="ti-hr" />
          <table className="ti-meta-table"><tbody>
            <tr><td>Table No:</td><td className="ti-right">#{tableNo}</td></tr>
            <tr><td>Guest:</td><td className="ti-right">{userName || '-'}</td></tr>
            <tr><td>Date & Time:</td><td className="ti-right">{new Date().toLocaleString('en-IN')}</td></tr>
            <tr><td>Order ID:</td><td className="ti-right">{orderId}</td></tr>
          </tbody></table>
          <hr className="ti-hr" />
          <table className="ti-items-table">
            <thead>
              <tr>
                <th className="ti-th-desc">Description</th>
                <th className="ti-th-qty">Qty</th>
                <th className="ti-th-price">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right' }}>₹{item.price * item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="ti-hr" />
          <table className="ti-totals-table"><tbody>
            <tr><td>Subtotal</td><td style={{ textAlign: 'right' }}>₹{subtotal}</td></tr>
            {discAmt > 0 && <tr><td>Discount</td><td style={{ textAlign: 'right' }}>−₹{discAmt}</td></tr>}
            {sttgs.gstPercent > 0 && <tr><td>GST ({sttgs.gstPercent}%)</td><td style={{ textAlign: 'right' }}>₹{gst}</td></tr>}
            {svc > 0 && <tr><td>Service Charge</td><td style={{ textAlign: 'right' }}>₹{svc}</td></tr>}
            <tr className="ti-grand-total"><td>Grand Total</td><td style={{ textAlign: 'right' }}>₹{Math.round(total)}</td></tr>
          </tbody></table>
          <hr className="ti-hr" />
          <p style={{ margin: '6px 0' }}>
            Payment Mode: <strong>{isOffline ? 'Cash/Offline' : 'Online/UPI'}</strong>
          </p>
          <p style={{ margin: '6px 0' }}>
            Payment Status: <span style={{ color: isPaid ? 'green' : '#e67e00', fontWeight: 700 }}>{isPaid ? 'COMPLETED ✓' : 'PENDING'}</span>
          </p>
          <hr className="ti-hr" />
          <div className="ti-footer">
            <strong>Thank you for choosing Burnout Cafe & Restaurant!</strong>
            <p>We hope to see you again soon.</p>
            <p className="ti-digital">Powered by Rasoi Live Platform</p>
          </div>
        </div>
      </div>
    </>
  )
}
