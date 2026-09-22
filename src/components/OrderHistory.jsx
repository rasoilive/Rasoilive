import { useState, useEffect } from 'react'

export default function OrderHistory({ onBack }) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    // Read all orders from localStorage that start with 'demo_order_'
    const orders = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('demo_order_')) {
        try {
          const order = JSON.parse(localStorage.getItem(key))
          orders.push(order)
        } catch (e) {}
      }
    }
    // Sort by timestamp descending
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    setHistory(orders)
  }, [])

  return (
    <>
      {/* Header */}
      <div className="app-header">
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back
        </button>
        <div>
          <div className="logo" style={{ fontSize: '1.5rem' }}>History</div>
          <div className="header-subtitle">Your Past Orders</div>
        </div>
      </div>

      <div className="view-scroll" style={{ paddingBottom: 60 }}>
        {history.length === 0 ? (
          <div className="view-center">
            <div style={{ fontSize: '4rem' }}>📜</div>
            <p style={{ color: 'var(--text-secondary)' }}>No order history found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {history.map(order => {
              const isPaid = order.payment_status === 'COMPLETED'
              return (
                <div key={order._id} className="card" style={{ padding: 16, borderLeft: isPaid ? '4px solid #4CAF50' : '4px solid #f44336' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-main)' }}>Order {order._id.substring(0, 8)}...</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(order.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`status-badge ${order.status}`}>{order.status}</span>
                      <div style={{ fontSize: '0.75rem', marginTop: 4, color: isPaid ? '#4CAF50' : '#f44336', fontWeight: 700 }}>
                        {isPaid ? 'PAID ✓' : 'UNPAID'}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                    {(order.items || []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.qty}x {item.name}</span>
                        <span>₹{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--primary)' }}>₹{order.total}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
