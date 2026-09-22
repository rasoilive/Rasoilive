import { useState, useEffect, useCallback } from 'react'
import { getSettings } from '../hooks/useSettings'

export default function BillView({ orderId, tableNo, userName, restCode, isOffline, onDone, onAddMore }) {
  const [order,      setOrder]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [payMode,    setPayMode]    = useState(isOffline ? 'Cash' : 'UPI')

  const fetchOrder = useCallback(() => {
    if (!orderId) return
    setLoading(true)
    const stored = localStorage.getItem('demo_order_' + orderId)
    if (stored) setOrder(JSON.parse(stored))
    setLoading(false)
  }, [orderId])

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 3000)
    return () => clearInterval(interval)
  }, [fetchOrder])

  const handlePrint = () => window.print()

  if (loading && !order) {
    return <div className="view-center"><p style={{ color: 'var(--text-secondary)' }}>Loading bill...</p></div>
  }

  const items     = order?.items || []
  const subtotal  = items.reduce((s, i) => s + i.price * i.qty, 0)
  const sttgs     = getSettings()
  const discAmt   = order?.discount || Math.round(subtotal * (sttgs.discountPercent / 100))
  const afterDisc = subtotal - discAmt
  const gst       = order?.gst  || Math.round(afterDisc * (sttgs.gstPercent / 100))
  const svc       = order?.service_charge || sttgs.serviceCharge || 0
  const total     = order?.total || (afterDisc + gst + svc)
  const billNo    = orderId || ('ORD-' + Date.now())
  const today     = new Date()
  const dateStr   = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr   = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const payStatus = order?.payment_status || 'PENDING'
  const isPaid    = payStatus === 'COMPLETED'
  const qrData    = encodeURIComponent(`upi://pay?pa=rasoi@okaxis&pn=RasoiLive&am=${total}&cu=INR`)
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}`

  return (
    <>
      {/* ======= SCREEN UI (hidden during print) ======= */}
      <div className="no-print view-scroll animate-fade-in" style={{ paddingBottom: 100 }}>

        {/* Show this bill warning (offline only) */}
        {isOffline && (
          <div style={{ background: 'rgba(255,193,7,0.12)', border: '1px solid var(--primary)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
            <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>⚠️ Show this bill at the counter to pay</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Press 'Print Bill' or show this screen to the staff.</p>
          </div>
        )}

        {/* Header Block */}
        <div className="card" style={{ textAlign: 'center', padding: '20px', marginBottom: 12 }}>
          <img src="/burnout_logo.png" alt="Burnout BBQ" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '50%', marginBottom: 8 }} onError={e => e.target.style.display='none'} />
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', color: 'var(--primary)', marginBottom: 4 }}>Burnout Cafe & Restaurant</h2>
          <p style={{ fontSize: '0.65rem', letterSpacing: 3, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Premium Dining</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Table: <strong style={{ color: '#fff' }}>{tableNo}</strong></span>
            <span>{dateStr}</span>
          </div>
        </div>

        {/* Order Details Block */}
        <div className="card" style={{ padding: '20px', marginBottom: 12 }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: 2, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 14, fontWeight: 700 }}>Order Details</p>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ flex: 1 }}>{item.name}</span>
              <span style={{ color: 'var(--text-secondary)', margin: '0 16px', fontSize: '0.85rem' }}>×{item.qty}</span>
              <span style={{ fontWeight: 600 }}>₹{item.price}</span>
            </div>
          ))}
        </div>

        {/* Totals Block */}
        <div className="card" style={{ padding: '20px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>Subtotal</span><span>₹{subtotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>GST (5%)</span><span>₹{gst}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)', letterSpacing: 1 }}>GRAND TOTAL</span>
            <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)' }}>₹{total}</span>
          </div>
        </div>

        {/* Payment Method Block */}
        <div className="card" style={{ padding: '20px', marginBottom: 12 }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: 2, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 14, fontWeight: 700 }}>Payment Method</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {['UPI', 'Cash', 'Card'].map(m => (
              <button key={m} onClick={() => setPayMode(m)} style={{
                flex: 1, padding: '10px 8px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                background: payMode === m ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: payMode === m ? '#000' : '#fff',
                border: `1px solid ${payMode === m ? 'var(--primary)' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
              }}>
                {m === 'UPI' ? '📱' : m === 'Cash' ? '💵' : '💳'} {m}
              </button>
            ))}
          </div>
          {payMode === 'UPI' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: '#fff', display: 'inline-block', padding: 10, borderRadius: 12, marginBottom: 8 }}>
                <img src={qrUrl} alt="UPI QR" style={{ width: 140, height: 140, display: 'block' }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scan QR to pay ₹{total}</p>
            </div>
          )}
          {payMode === 'Cash' && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              💵 Please pay ₹{total} at the counter.
            </div>
          )}
          {payMode === 'Card' && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              💳 Please swipe your card at the counter for ₹{total}.
            </div>
          )}

          {/* Payment Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <span style={{ fontSize: '1rem' }}>{isPaid ? '✅' : '🕒'}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: 1, color: isPaid ? '#4CAF50' : 'var(--primary)' }}>
              PAYMENT STATUS: {payStatus}
            </span>
          </div>
        </div>

        {/* Thank You Footer */}
        <div className="card" style={{ padding: '20px', marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>🙏</div>
          <p style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', letterSpacing: 1 }}>Thank you for dining with us!</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>We hope to see you again.</p>
        </div>

      </div>

      {/* Floating action buttons */}
      <div className="no-print" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 600, padding: '12px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.95))', display: 'flex', gap: 10, zIndex: 200 }}>
        <button onClick={handlePrint} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          🖨️ Print Bill
        </button>
        <button onClick={onDone} className="btn-primary" style={{ flex: 2, padding: '14px', fontWeight: 700, fontSize: '0.9rem', letterSpacing: 1 }}>
          ✓ COMPLETE ORDER
        </button>
      </div>

      {/* ======= PRINT-ONLY: Professional Tax Invoice ======= */}
      <div className="print-only">
        <div className="tax-invoice-wrap">
          <div className="ti-header">
            <h1 className="ti-restaurant-name">RASOI LIVE</h1>
            <p className="ti-tagline">PREMIUM GOURMET EXPERIENCE</p>
            <div className="ti-title-box">TAX INVOICE</div>
          </div>

          <hr className="ti-hr" />

          <table className="ti-meta-table">
            <tbody>
              <tr><td>Bill #:</td><td className="ti-right">{billNo}</td></tr>
              <tr><td>Today:</td><td className="ti-right">{dateStr}, {timeStr}</td></tr>
              <tr><td>Table No:</td><td className="ti-right">#{tableNo}</td></tr>
              <tr><td>Guest:</td><td className="ti-right">{userName || '-'}</td></tr>
              {restCode && <tr><td>Rest. Code:</td><td className="ti-right">{restCode}</td></tr>}
            </tbody>
          </table>

          <hr className="ti-hr" />

          <table className="ti-items-table">
            <thead>
              <tr>
                <th className="ti-th-desc">Description</th>
                <th className="ti-th-qty">Qty</th>
                <th className="ti-th-price">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right' }}>₹{item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="ti-hr" />

          <table className="ti-totals-table">
            <tbody>
              <tr><td>Subtotal</td><td style={{ textAlign: 'right' }}>₹{subtotal}</td></tr>
              <tr><td>GST (5%)</td><td style={{ textAlign: 'right' }}>₹{gst.toFixed(2)}</td></tr>
              <tr className="ti-grand-total">
                <td>Grand Total</td>
                <td style={{ textAlign: 'right' }}>₹{total}</td>
              </tr>
            </tbody>
          </table>

          <hr className="ti-hr" />

          <p style={{ margin: '6px 0' }}>
            Payment Status: <span style={{ color: isPaid ? 'green' : '#e67e00', fontWeight: 700 }}>{payStatus}</span>
          </p>

          <hr className="ti-hr" />

          <div className="ti-footer">
            <strong>Thank you for choosing Rasoi Live!</strong>
            <p>Please visit us again soon for more culinary delights.</p>
            <p className="ti-digital">Digitally Generated via Rasoi Customer App</p>
          </div>
        </div>
      </div>
    </>
  )
}
