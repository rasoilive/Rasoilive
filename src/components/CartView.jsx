import { useState, useEffect } from 'react'
import { getSettings } from '../hooks/useSettings'

const API = '/api'

export default function CartView({ tableNo, userName, restCode, cart, cartTotal, onAdd, onRemove, onBack, onProceedToPayment }) {
  const [placing,  setPlacing]  = useState(false)
  const [error,    setError]    = useState('')
  const [note,     setNote]     = useState('')

  const [settings, setSettings] = useState(getSettings)

  // Re-read settings whenever owner changes them
  useEffect(() => {
    const onStorage = () => setSettings(getSettings())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const discountAmt = Math.round(cartTotal * (settings.discountPercent / 100))
  const afterDiscount = cartTotal - discountAmt
  const gst          = Math.round(afterDiscount * (settings.gstPercent / 100))
  const svc          = settings.serviceCharge || 0
  const grandTotal   = afterDiscount + gst + svc

  const handleProceed = () => {
    if (cart.length === 0) return
    const orderPayload = {
      table_number:  tableNo,
      rest_code:     restCode || '',
      customer_name: userName || '',
      items: cart.map(i => ({ item_id: i._id, name: i.name, qty: i.qty, price: i.price })),
      note,
      subtotal:      cartTotal,
      discount:      discountAmt,
      gst:           gst,
      service_charge: svc,
      total:         Math.round(grandTotal),
    }
    onProceedToPayment(orderPayload)
  }

  return (
    <>
      {/* Header */}
      <div className="app-header">
        <button
          id="cart-back-btn"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back
        </button>
        <div>
          <div className="logo" style={{ fontSize: '1.5rem' }}>Your Cart</div>
          <div className="header-subtitle">Table {tableNo}</div>
        </div>
      </div>

      <div className="view-scroll" style={{ paddingBottom: 120 }}>
        {cart.length === 0 ? (
          <div className="view-center">
            <div style={{ fontSize: '4rem' }}>🛒</div>
            <p style={{ color: 'var(--text-secondary)' }}>Your cart is empty</p>
            <button className="btn-primary" onClick={onBack}>Browse Menu</button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="card" style={{ marginBottom: 16 }}>
              {cart.map(item => (
                <div key={item._id} className="order-item-row">
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600 }}>{item.name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ₹{item.price} × {item.qty}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => onRemove(item._id)}>−</button>
                      <span className="qty-value">{item.qty}</span>
                      <button className="qty-btn" onClick={() => onAdd(item)}>+</button>
                    </div>
                    <span style={{ fontFamily: 'var(--font-accent)', color: 'var(--primary)', minWidth: 64, textAlign: 'right' }}>
                      ₹{(item.price * item.qty).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Note */}
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Special Instructions (optional)</p>
              <textarea
                id="order-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. less spicy, no onions..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  borderRadius: 12, color: '#fff', padding: '12px', fontSize: '0.9rem',
                  resize: 'none', outline: 'none', fontFamily: 'var(--font-main)', minHeight: 70,
                }}
              />
            </div>

            {/* Bill Summary */}
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-accent)', letterSpacing: 2, fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                BILL SUMMARY
              </p>
              <div className="order-item-row" style={{ border: 'none', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>₹{cartTotal.toFixed(0)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="order-item-row" style={{ border: 'none', padding: '6px 0' }}>
                  <span style={{ color: '#4CAF50' }}>Discount ({settings.discountPercent}%)</span>
                  <span style={{ color: '#4CAF50' }}>−₹{discountAmt}</span>
                </div>
              )}
              {settings.gstPercent > 0 && (
                <div className="order-item-row" style={{ border: 'none', padding: '6px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>GST ({settings.gstPercent}%)</span>
                  <span>₹{gst}</span>
                </div>
              )}
              {svc > 0 && (
                <div className="order-item-row" style={{ border: 'none', padding: '6px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Service Charge</span>
                  <span>₹{svc}</span>
                </div>
              )}
              <hr className="divider" style={{ margin: '8px 0' }} />
              <div className="order-total-row" style={{ padding: '8px 0 0' }}>
                <span>TOTAL</span>
                <span>₹{Math.round(grandTotal)}</span>
              </div>
            </div>

            {error && (
              <div style={{ color: '#f44336', textAlign: 'center', fontSize: '0.9rem', marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Place Order Button */}
      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 600, padding: '16px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', zIndex: 100 }}>
          <button id="place-order-btn" className="btn-primary" onClick={handleProceed}>
            Proceed to Payment · ₹{grandTotal.toFixed(0)}
          </button>
        </div>
      )}
    </>
  )
}
