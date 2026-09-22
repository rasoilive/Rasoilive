import { useState } from 'react'
import { getSettings } from '../../hooks/useSettings'

const STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'served']

// ─── Owner Bill Print Window ──────────────────────────────────────────────────
export function printOwnerBill(order) {
  const items    = order.items || []
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const sttgs    = getSettings()
  const discAmt  = order.discount || Math.round(subtotal * (sttgs.discountPercent / 100))
  const afterDisc = subtotal - discAmt
  const gst      = order.gst || Math.round(afterDisc * (sttgs.gstPercent / 100))
  const svc      = order.service_charge || sttgs.serviceCharge || 0
  const total    = order.total || (afterDisc + gst + svc)
  const dateStr  = new Date(order.timestamp).toLocaleString('en-IN')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tax Invoice - Table ${order.table_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; max-width: 580px; margin: auto; }
        h1 { font-size: 26px; letter-spacing: 3px; text-align: center; text-transform: uppercase; margin-bottom: 4px; }
        .tagline { text-align: center; font-size: 11px; letter-spacing: 2px; color: #555; margin-bottom: 16px; }
        .invoice-title { text-align: center; border: 1px solid #333; display: inline-block; padding: 4px 20px; font-size: 12px; letter-spacing: 2px; font-weight: bold; margin: 0 auto 16px; display: block; width: fit-content; margin: auto; }
        hr { border: none; border-top: 1px solid #bbb; margin: 14px 0; }
        .meta-table { width: 100%; font-size: 12px; margin-bottom: 4px; }
        .meta-table td { padding: 3px 0; }
        .meta-table .right { text-align: right; font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        .items-table th { border-bottom: 1px solid #333; padding: 6px 4px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        .items-table th:last-child, .items-table td:last-child { text-align: right; }
        .items-table th:nth-child(2), .items-table td:nth-child(2) { text-align: center; }
        .items-table td { padding: 6px 4px; border-bottom: 1px solid #eee; }
        .totals-table { width: 100%; font-size: 12px; }
        .totals-table td { padding: 4px 0; }
        .totals-table td:last-child { text-align: right; }
        .grand-total { font-size: 15px; font-weight: 900; border-top: 2px solid #111; padding-top: 6px !important; }
        .footer { text-align: center; font-size: 11px; color: #555; line-height: 1.8; margin-top: 12px; }
        .pay-status { font-weight: bold; color: ${order.payment_status === 'COMPLETED' ? 'green' : 'darkorange'}; }
      </style>
    </head>
    <body>
      <h1>BURNOUT CAFE & RESTAURANT</h1>
      <p class="tagline">PREMIUM GOURMET EXPERIENCE</p>
      <div class="invoice-title">TAX INVOICE</div>
      <hr />
      <table class="meta-table">
        <tr><td>Bill No:</td><td class="right">${order._id}</td></tr>
        <tr><td>Date & Time:</td><td class="right">${dateStr}</td></tr>
        <tr><td>Table No:</td><td class="right">#${order.table_number}</td></tr>
        <tr><td>Customer:</td><td class="right">${order.customer_name || 'Guest'}</td></tr>
        ${order.rest_code ? `<tr><td>Rest. Code:</td><td class="right">${order.rest_code}</td></tr>` : ''}
      </table>
      <hr />
      <table class="items-table">
        <thead>
          <tr><th>Description</th><th>Qty</th><th>Amount</th></tr>
        </thead>
        <tbody>
          ${items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>₹${i.price * i.qty}</td></tr>`).join('')}
        </tbody>
      </table>
      <hr />
      <table class="totals-table">
        <tr><td>Subtotal</td><td>₹${subtotal}</td></tr>
        <tr><td>GST (5%)</td><td>₹${gst}</td></tr>
        <tr class="grand-total"><td>Grand Total</td><td>₹${total}</td></tr>
      </table>
      <hr />
      <p>Payment Mode: <strong>${order.payment_mode || 'N/A'}</strong></p>
      <p>Payment Status: <span class="pay-status">${order.payment_status === 'COMPLETED' ? 'PAID ✓' : 'PENDING'}</span></p>
      <hr />
      <div class="footer">
        <strong>Thank you for dining at Burnout Cafe & Restaurant!</strong><br/>
        Please visit us again soon.<br/>
        <em>Powered by Rasoi Live</em>
      </div>
    </body>
    </html>
  `
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  iframe.contentWindow.focus()
  // Wait a moment for styles to apply before triggering print dialog
  setTimeout(() => {
    iframe.contentWindow.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 100)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LiveOrders({ orders, setOrders, clearedIds, setClearedIds, onClearToHistory }) {

  const updateStatus = async (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o))
    try {
      const token = localStorage.getItem('rasoi_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      })
    } catch (err) { console.error(err) }
  }

  const advanceStatus = (orderId, currentStatus) => {
    const idx = STATUSES.indexOf(currentStatus)
    if (idx < STATUSES.length - 1) updateStatus(orderId, STATUSES[idx + 1])
  }

  const togglePayment = async (orderId) => {
    const order = orders.find(o => o._id === orderId)
    if (!order) return
    const newPayStatus = order.payment_status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
    
    // When payment is verified, auto-complete the order (jump to 'served')
    const newOrderStatus = newPayStatus === 'COMPLETED' ? 'served' : order.status

    setOrders(prev => prev.map(o => o._id === orderId 
      ? { ...o, payment_status: newPayStatus, status: newOrderStatus } 
      : o
    ))
    try {
      const token = localStorage.getItem('rasoi_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      await fetch(`/api/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ payment_status: newPayStatus })
      })
      if (newOrderStatus !== order.status) {
        await fetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: newOrderStatus })
        })
      }
    } catch (err) { console.error(err) }
  }

  const clearServedOrders = () => {
    const servedOrPaidIds = orders
      .filter(o => o.status === 'served' || o.payment_status === 'COMPLETED')
      .map(o => o._id)

    if (servedOrPaidIds.length === 0) return

    const newCleared = [...new Set([...clearedIds, ...servedOrPaidIds])]
    setClearedIds(newCleared)
    localStorage.setItem('cleared_orders', JSON.stringify(newCleared))

    // Switch to History tab so owner can see the cleared orders there
    if (onClearToHistory) onClearToHistory()
  }

  const activeOrders = orders.filter(o => !clearedIds.includes(o._id))

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', fontFamily: 'Inter, sans-serif' }}>
          Live Orders <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>— auto-updates every 3s</span>
        </h3>
        {(() => {
          const clearableCount = orders.filter(o =>
            !clearedIds.includes(o._id) &&
            (o.status === 'served' || o.payment_status === 'COMPLETED')
          ).length
          return clearableCount > 0 ? (
            <button
              onClick={clearServedOrders}
              style={{
                padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer',
                background: 'rgba(76,175,80,0.15)', color: '#4CAF50',
                border: '1px solid rgba(76,175,80,0.4)', borderRadius: 10,
                fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(76,175,80,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(76,175,80,0.15)' }}
            >
              ✓ Clear to History
              <span style={{
                background: '#4CAF50', color: '#000', borderRadius: 99,
                fontSize: '0.72rem', fontWeight: 900, padding: '1px 7px'
              }}>{clearableCount}</span>
            </button>
          ) : null
        })()}
      </div>

      {activeOrders.length === 0 ? (
        <div style={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
          <p style={{ fontSize: '3rem' }}>📭</p>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>No active orders right now.</p>
          <p style={{ fontSize: '0.8rem', color: '#555', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>Orders will appear here automatically.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {activeOrders.map(order => {
            const isPaid   = order.payment_status === 'COMPLETED'
            const isServed = order.status === 'served'

            let nextBtnText = '✅ Accept Order'
            if (order.status === 'accepted')  nextBtnText = '🔥 Start Preparing'
            if (order.status === 'preparing') nextBtnText = '🛎️ Mark Ready'
            if (order.status === 'ready')     nextBtnText = '🎉 Mark Served'

            const items    = order.items || []
            const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
            const sttgs    = getSettings()
            const discAmt  = order.discount  || Math.round(subtotal * (sttgs.discountPercent / 100))
            const afterDisc = subtotal - discAmt
            const gst      = order.gst || Math.round(afterDisc * (sttgs.gstPercent / 100))
            const svc      = order.service_charge || sttgs.serviceCharge || 0
            const total    = order.total || (afterDisc + gst + svc)

            return (
              <div key={order._id} className="card" style={{
                padding: 0, overflow: 'hidden',
                borderTop: isPaid ? '1px solid rgba(76,175,80,0.4)' : '1px solid rgba(255,193,7,0.2)',
                borderRight: isPaid ? '1px solid rgba(76,175,80,0.4)' : '1px solid rgba(255,193,7,0.2)',
                borderBottom: isPaid ? '1px solid rgba(76,175,80,0.4)' : '1px solid rgba(255,193,7,0.2)',
                borderLeft: isServed ? '4px solid #4CAF50' : '4px solid var(--primary)'
              }}>
                {/* ── Card Header ── */}
                <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'Inter, sans-serif' }}>
                      Table {order.table_number}
                    </span>
                    {order.customer_name && (
                      <span style={{ marginLeft: 8, fontSize: '0.85rem', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                        — {order.customer_name}
                      </span>
                    )}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                      {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {order.rest_code && ` · ${order.rest_code}`}
                    </div>
                  </div>
                  <span className={`status-badge ${order.status}`}>{order.status}</span>
                </div>

                {/* ── Items List ── */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>
                      <span>
                        <strong style={{ color: 'var(--primary)', marginRight: 6 }}>{item.qty}×</strong>
                        {item.name}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>₹{item.price * item.qty}</span>
                    </div>
                  ))}
                  {order.note && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,193,7,0.08)', borderLeft: '3px solid var(--primary)', fontSize: '0.82rem', fontFamily: 'Inter, sans-serif' }}>
                      <strong>Note:</strong> {order.note}
                    </div>
                  )}
                </div>

                {/* ── Total + Payment Row ── */}
                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => togglePayment(order._id)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                      border: isPaid ? '1.5px solid #4CAF50' : '1px solid rgba(255,193,7,0.5)',
                      background: isPaid ? 'rgba(76,175,80,0.2)' : 'rgba(255,193,7,0.12)',
                      color: isPaid ? '#4CAF50' : 'var(--primary)'
                    }}>
                    {isPaid ? '✅ PAYMENT VERIFIED' : '⏳ VERIFY PAYMENT'}
                  </button>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 2, fontWeight: 700 }}>
                      Mode: {order.payment_mode || 'PENDING'}
                    </div>
                    <div style={{ fontWeight: 900, color: '#fff', fontSize: '1.1rem', fontFamily: 'Inter, sans-serif' }}>
                      ₹{total}
                    </div>
                  </div>
                </div>

                {/* ── Print Bill — ALWAYS clickable, glows green once paid ── */}
                <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => printOwnerBill({ ...order, total })}
                    style={{
                      width: '100%', padding: '10px', borderRadius: 8, transition: 'all 0.2s',
                      background: isPaid
                        ? 'linear-gradient(135deg, rgba(76,175,80,0.3), rgba(76,175,80,0.15))'
                        : 'rgba(255,193,7,0.1)',
                      border: isPaid
                        ? '1.5px solid rgba(76,175,80,0.7)'
                        : '1px solid rgba(255,193,7,0.3)',
                      color: isPaid ? '#4CAF50' : 'var(--primary)',
                      fontWeight: 800, fontSize: '0.9rem',
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: isPaid ? '0 0 12px rgba(76,175,80,0.3)' : 'none',
                      letterSpacing: 0.3
                    }}>
                    🖨️ Print Bill — Table {order.table_number}
                    {isPaid && <span style={{ fontSize: '0.72rem', background: '#4CAF50', color: '#000', borderRadius: 99, padding: '2px 8px', fontWeight: 900 }}>PAID ✓</span>}
                  </button>
                </div>

                {/* ── Advance Status Button — stays visible; "Complete" only when BOTH served AND paid ── */}
                <div style={{ padding: '10px 14px' }}>
                  {(isPaid && isServed) ? (
                    <div style={{ textAlign: 'center', padding: '9px', color: '#4CAF50', fontWeight: 700, fontSize: '0.9rem', background: 'rgba(76,175,80,0.08)', borderRadius: 8, fontFamily: 'Inter, sans-serif', border: '1px solid rgba(76,175,80,0.2)' }}>
                      ✅ Order Complete — Ready to Clear
                    </div>
                  ) : (
                    <button
                      onClick={() => !isServed && advanceStatus(order._id, order.status)}
                      className="btn-primary"
                      style={{
                        width: '100%', padding: '10px', fontWeight: 700, letterSpacing: 0.5,
                        fontFamily: 'Inter, sans-serif', textTransform: 'none', fontSize: '0.95rem',
                        opacity: isServed ? 0.55 : 1,
                        cursor: isServed ? 'default' : 'pointer',
                      }}>
                      {isServed ? '🎉 Served — Waiting for Payment Verification' : `${nextBtnText} →`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
