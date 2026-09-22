import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import LiveOrders, { printOwnerBill } from './dashboard/LiveOrders'
import MenuManager from './dashboard/MenuManager'
import Analytics from './dashboard/Analytics'
import BusinessSettings from './dashboard/BusinessTools'
import FeedbackView from './dashboard/FeedbackView'
import { socket } from '../socket'
import { useToast } from './ToastContext'

// ─── Owner History — shows all past orders ────────────────────────────────
function OwnerHistory({ orders }) {
  const sorted = [...orders].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: 20 }}>Order History</h3>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>No orders yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(order => {
            const isPaid = order.payment_status === 'COMPLETED'
            return (
              <div key={order._id} className="card" style={{ padding: 16, borderLeft: `4px solid ${isPaid ? '#4CAF50' : '#f44336'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontFamily: 'Inter, sans-serif', fontSize: '1rem' }}>
                      Table {order.table_number} {order.customer_name ? `— ${order.customer_name}` : ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {new Date(order.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-badge ${order.status}`}>{order.status}</span>
                    <div style={{ fontSize: '0.75rem', marginTop: 4, color: isPaid ? '#4CAF50' : '#f44336', fontWeight: 700 }}>
                      {isPaid ? 'PAID ✓' : 'UNPAID'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                    {(order.items || []).map(i => `${i.qty}× ${i.name}`).join(', ')}
                  </span>
                  <span style={{ fontWeight: 900, color: 'var(--primary)', fontFamily: 'Inter, sans-serif' }}>₹{order.total}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const TABS = [
  { id: 'live',      icon: '📡', label: 'Live Orders' },
  { id: 'menu',      icon: '🍔', label: 'Menu' },
  { id: 'analytics', icon: '📈', label: 'Analytics' },
  { id: 'feedback',  icon: '⭐', label: 'Feedback' },
  { id: 'history',   icon: '📜', label: 'History' },
  { id: 'settings',  icon: '⚙️', label: 'Settings' },
]

// ─── Export Dialog Portal — renders directly into document.body to bypass overflow/transform constraints ───
function ExportDialog({ type, onClose, onSubmit }) {
  const [month, setMonth] = useState('all')

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a2e', border: '1px solid rgba(255,193,7,0.3)',
          borderRadius: 20, padding: 32, maxWidth: 380, width: '100%',
          textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
          {type === 'csv' ? '📊' : '🖨️'}
        </div>
        <h3 style={{ fontSize: '1.3rem', color: '#ffc107', marginBottom: 8, fontWeight: 800 }}>
          {type === 'csv' ? 'Export Excel Report' : 'Print PDF Report'}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: 24 }}>
          Select the time duration for your report
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[['all', 'All Time History'], ['current', 'This Month'], ['last', 'Last Month']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setMonth(val)}
              style={{
                padding: '12px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 700,
                fontSize: '0.95rem', transition: 'all 0.2s', border: 'none',
                background: month === val ? '#ffc107' : 'rgba(255,255,255,0.07)',
                color: month === val ? '#000' : '#fff',
                transform: month === val ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.95rem'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(month)}
            style={{
              flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
              background: '#ffc107', color: '#000', cursor: 'pointer',
              fontSize: '0.95rem', fontWeight: 800
            }}
          >
            ✓ Generate
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function OwnerDashboard({ onLogout }) {
  const [activeTab, setActiveTab]   = useState('live')
  const [orders, setOrders]         = useState([])
  const [clearedIds, setClearedIds] = useState(() => JSON.parse(localStorage.getItem('cleared_orders') || '[]'))
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [exportDialog, setExportDialog] = useState({ open: false, type: null })
  const [printMonth, setPrintMonth]     = useState('all')

  const toast = useToast()

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('rasoi_token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const res = await fetch('/api/orders', { headers, cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      } else if (res.status === 401 || res.status === 403) {
        toast('Session expired. Please log in again.', 'error')
        if (onLogout) onLogout()
      } else {
        toast('Failed to fetch orders', 'error')
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      toast('Network error while fetching orders', 'error')
    }
  }, [toast, onLogout])

  useEffect(() => {
    toast('Welcome back to the Rasoi Live Owner Panel! 👋', 'success')
    fetchOrders()

    // 1. Join Socket Room
    try {
      const ownerStr = localStorage.getItem('rasoi_owner')
      if (ownerStr) {
        const ownerData = JSON.parse(ownerStr)
        if (ownerData.restCode) {
          socket.emit('joinRoom', ownerData.restCode)
        }
      }
    } catch(e) {}

    // 2. Setup Auto-polling every 4 seconds
    const intervalId = setInterval(fetchOrders, 4000)

    // 3. Setup window focus listener for immediate background recovery
    window.addEventListener('focus', fetchOrders)
    window.addEventListener('online', fetchOrders)

    const handleNewOrder = (order) => {
      setOrders(prev => [order, ...prev])
      setNewOrderAlert(true)
      toast(`New order from Table ${order.table_number}!`, 'success')
      setTimeout(() => setNewOrderAlert(false), 5000)
    }

    const handleOrderUpdate = (update) => {
      // Merge the FULL update payload — Telegram sends both status + payment_status together
      setOrders(prev => prev.map(o => o._id === update._id ? { ...o, ...update } : o))
    }

    const handlePaymentUpdate = (update) => {
      // Merge full payload — includes status, payment_status, payment_mode
      setOrders(prev => prev.map(o => o._id === update._id ? { ...o, ...update } : o))
    }

    const handleRemotePrint = async (orderIdToPrint) => {
      try {
        const res = await fetch(`/api/orders/${orderIdToPrint}`)
        if (res.ok) {
          const order = await res.json()
          toast(`🖨️ Printing bill for Table ${order.table_number}...`, 'info')
          printOwnerBill(order)
        }
      } catch(e) {
        console.error('Remote print failed:', e)
      }
    }

    socket.on('newOrder', handleNewOrder)
    socket.on('orderUpdated', handleOrderUpdate)
    socket.on('orderPaymentUpdated', handlePaymentUpdate)
    socket.on('remotePrint', handleRemotePrint)

    return () => {
      socket.off('newOrder', handleNewOrder)
      socket.off('orderUpdated', handleOrderUpdate)
      socket.off('orderPaymentUpdated', handlePaymentUpdate)
      socket.off('remotePrint', handleRemotePrint)
      clearInterval(intervalId)
      window.removeEventListener('focus', fetchOrders)
      window.removeEventListener('online', fetchOrders)
    }
  }, [fetchOrders, toast])

  const pendingCount = orders.filter(o =>
    !clearedIds.includes(o._id) && o.status === 'pending'
  ).length

  const getOrdersByMonth = (monthKey) => {
    const now = new Date()
    if (monthKey === 'current') {
      return orders.filter(o => {
        const d = new Date(o.timestamp)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
    } else if (monthKey === 'last') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return orders.filter(o => {
        const d = new Date(o.timestamp)
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
      })
    }
    return orders
  }

  const handleExportSubmit = (selectedMonth) => {
    const filteredOrders = getOrdersByMonth(selectedMonth)
    const exportType = exportDialog.type
    setExportDialog({ open: false, type: null })
    setPrintMonth(selectedMonth)

    if (filteredOrders.length === 0) {
      toast('No orders found for the selected duration.', 'error')
      return
    }

    // Compute financial summary
    const totalRevenue  = filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0)
    const paidRevenue   = filteredOrders.filter(o => o.payment_status === 'COMPLETED').reduce((s, o) => s + Number(o.total || 0), 0)
    const cashRevenue   = filteredOrders.filter(o => o.payment_mode === 'cash'   && o.payment_status === 'COMPLETED').reduce((s, o) => s + Number(o.total || 0), 0)
    const onlineRevenue = filteredOrders.filter(o => o.payment_mode === 'online' && o.payment_status === 'COMPLETED').reduce((s, o) => s + Number(o.total || 0), 0)
    const pendingAmount = filteredOrders.filter(o => o.payment_status !== 'COMPLETED').reduce((s, o) => s + Number(o.total || 0), 0)
    const durationLabel = selectedMonth === 'all' ? 'All Time' : selectedMonth === 'current' ? 'This Month' : 'Last Month'

    if (exportType === 'csv') {
      // ── Summary header rows ──────────────────────────────────────────────────
      const summaryRows = [
        ['RASOI LIVE — SALES REPORT', '', '', '', '', '', '', '', ''],
        ['Duration', durationLabel, '', '', 'Generated On', new Date().toLocaleString('en-IN'), '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['FINANCIAL SUMMARY', '', '', '', '', '', '', '', ''],
        ['Total Orders', filteredOrders.length, '', '', 'Gross Revenue', `Rs.${totalRevenue}`, '', '', ''],
        ['Collected (Paid)', `Rs.${paidRevenue}`, '', '', 'Pending Amount', `Rs.${pendingAmount}`, '', '', ''],
        ['Cash Collected', `Rs.${cashRevenue}`, '', '', 'Online Collected', `Rs.${onlineRevenue}`, '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['ORDER DETAILS', '', '', '', '', '', '', '', ''],
      ]
      const headers = ['Order ID', 'Date', 'Time', 'Table No', 'Customer', 'Items', 'Total (Rs.)', 'Status', 'Payment']
      const rows = filteredOrders.map(o => {
        const d = new Date(o.timestamp)
        return [
          o._id,
          d.toLocaleDateString('en-IN'),
          d.toLocaleTimeString('en-IN'),
          `Table ${o.table_number}`,
          o.customer_name || '-',
          o.items.map(i => `${i.qty}x ${i.name}`).join(' | '),
          `Rs.${o.total}`,
          o.status.toUpperCase(),
          o.payment_status || 'PENDING'
        ]
      })
      const toRow = r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
      const finalCsv = [
        ...summaryRows.map(toRow),
        toRow(headers),
        ...rows.map(toRow),
        '',
        `"Powered by Rasoi Live Platform","www.rasoilive.com","","","","","","",""`
      ].join('\n')

      const fileName = `RasoiLive_Report_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`
      const file = new File([finalCsv], fileName, { type: 'text/csv' })

      const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
      if (isMobile && navigator.share && navigator.canShare) {
        try {
          if (navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'Rasoi Live Report' }).catch(() => {})
            return
          }
        } catch (e) { /* fallthrough */ }
      }
      const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: fileName })
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (exportType === 'report') {
      generateReport(selectedMonth)
      return
    } else {
      // PDF — close dialog first, then print after a small delay
      setTimeout(() => window.print(), 600)
    }
  }

  const generateReport = (selectedMonth) => {
    const filteredOrders = getOrdersByMonth(selectedMonth)
    const durationLabel = selectedMonth === 'all' ? 'All Time' : selectedMonth === 'current' ? 'This Month' : 'Last Month'

    if (filteredOrders.length === 0) {
      toast('No orders found for the selected duration.', 'error')
      return
    }

    const grossRevenue  = filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0)
    const paidRevenue   = filteredOrders.filter(o => o.payment_status === 'COMPLETED').reduce((s, o) => s + Number(o.total || 0), 0)
    const pendingAmt    = grossRevenue - paidRevenue
    const cashRevenue   = filteredOrders.filter(o => (o.payment_mode || '').toLowerCase() === 'cash'   && o.payment_status === 'COMPLETED').reduce((s, o) => s + Number(o.total || 0), 0)
    const onlineRevenue = filteredOrders.filter(o => (o.payment_mode || '').toLowerCase() === 'online' && o.payment_status === 'COMPLETED').reduce((s, o) => s + Number(o.total || 0), 0)
    const paidCount     = filteredOrders.filter(o => o.payment_status === 'COMPLETED').length
    const pendingCount  = filteredOrders.length - paidCount
    const generatedOn   = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })

    const itemFreq = {}
    filteredOrders.forEach(o => (o.items || []).forEach(i => { itemFreq[i.name] = (itemFreq[i.name] || 0) + i.qty }))
    const topItems = Object.entries(itemFreq).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const rowsHtml = filteredOrders.map((o, idx) => {
      const d = new Date(o.timestamp)
      const isPaid = o.payment_status === 'COMPLETED'
      return `<tr style="background:${idx % 2 === 0 ? '#fff' : '#fafafa'}">
        <td>${idx + 1}</td>
        <td>${d.toLocaleDateString('en-IN')}<br/><small style="color:#888">${d.toLocaleTimeString('en-IN')}</small></td>
        <td><strong>Table ${o.table_number}</strong><br/><small style="color:#888">${o.customer_name || 'Guest'}</small></td>
        <td style="font-size:11px">${(o.items || []).map(i => `${i.qty}× ${i.name}`).join('<br/>')}</td>
        <td style="text-align:right;font-weight:700">₹${o.total}</td>
        <td style="text-align:center"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${isPaid ? '#e8f5e9' : '#fff3e0'};color:${isPaid ? '#2e7d32' : '#e65100'}">${isPaid ? 'PAID ✓' : 'PENDING'}</span></td>
        <td style="text-align:center;font-size:11px;text-transform:capitalize">${o.payment_mode || '-'}</td>
      </tr>`
    }).join('')

    const topItemsHtml = topItems.map(([name, qty], i) =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:26px;height:26px;background:#b8860b;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900">${i + 1}</span>
          <span style="font-weight:600">${name}</span>
        </div>
        <span style="font-weight:700;color:#b8860b">${qty} sold</span>
      </div>`
    ).join('')

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Rasoi Live Report</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;color:#222}
.page{max-width:960px;margin:0 auto;padding:40px 32px;background:#fff;min-height:100vh;position:relative}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:100px;font-weight:900;color:rgba(0,0,0,0.04);pointer-events:none;white-space:nowrap;z-index:0;letter-spacing:8px}
.content{position:relative;z-index:1}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #b8860b}
.logo{font-size:26px;font-weight:900;letter-spacing:3px;color:#b8860b;text-transform:uppercase}
.logo small{display:block;font-size:11px;font-weight:400;letter-spacing:4px;color:#999;margin-top:2px}
.meta{text-align:right;font-size:13px;color:#555}
.meta strong{display:block;font-size:16px;color:#222;margin-bottom:4px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
.card{border:1px solid #e8e8e8;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.card.hl{background:linear-gradient(135deg,#b8860b,#d4a420);color:#fff;border:none}
.card .val{font-size:26px;font-weight:900;margin-bottom:4px}
.card .lbl{font-size:11px;opacity:0.8;letter-spacing:0.5px;text-transform:uppercase}
.stitle{font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#b8860b;margin:24px 0 14px;border-left:4px solid #b8860b;padding-left:12px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
.sc{border:1px solid #e8e8e8;border-radius:12px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
table{width:100%;border-collapse:collapse;font-size:13px}
table th{background:#1a1a2e;color:#ffc107;padding:12px 10px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase}
table td{padding:10px;border-bottom:1px solid #eee;vertical-align:top}
.ftr{text-align:center;padding:24px;border-top:2px solid #eee;margin-top:40px;color:#888;font-size:12px}
@media print{body{background:#fff}.page{padding:20px}}
</style></head><body>
<div class="watermark">RASOI LIVE</div>
<div class="page"><div class="content">
  <div class="hdr">
    <div class="logo">Burnout Cafe & Restaurant<small>Powered by Rasoi Live</small></div>
    <div class="meta"><strong>SALES REPORT</strong>Duration: ${durationLabel}<br/>Generated: ${generatedOn}</div>
  </div>
  <div class="grid">
    <div class="card hl"><div class="val">₹${grossRevenue.toLocaleString('en-IN')}</div><div class="lbl">Gross Revenue</div></div>
    <div class="card hl"><div class="val">₹${paidRevenue.toLocaleString('en-IN')}</div><div class="lbl">Collected</div></div>
    <div class="card"><div class="val" style="color:#e65100">₹${pendingAmt.toLocaleString('en-IN')}</div><div class="lbl">Pending</div></div>
    <div class="card"><div class="val">${filteredOrders.length}</div><div class="lbl">Total Orders</div></div>
    <div class="card"><div class="val" style="color:#2e7d32">${paidCount}</div><div class="lbl">Paid</div></div>
    <div class="card"><div class="val" style="color:#e65100">${pendingCount}</div><div class="lbl">Pending Orders</div></div>
  </div>
  <div class="two">
    <div class="sc"><div class="stitle">Payment Split</div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee"><span>💵 Cash Collected</span><strong>₹${cashRevenue.toLocaleString('en-IN')}</strong></div>
      <div style="display:flex;justify-content:space-between;padding:12px 0"><span>📱 Online Collected</span><strong>₹${onlineRevenue.toLocaleString('en-IN')}</strong></div>
    </div>
    <div class="sc"><div class="stitle">Top 5 Items</div>${topItemsHtml || '<p style="color:#999;padding:12px 0">No data</p>'}</div>
  </div>
  <div class="stitle">Order Details</div>
  <table><thead><tr><th>#</th><th>Date &amp; Time</th><th>Table / Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Mode</th></tr></thead>
  <tbody>${rowsHtml}</tbody></table>
  <div class="ftr">Generated automatically by <strong>Rasoi Live Platform</strong>. All data sourced from live order management system.</div>
</div></div></body></html>`

    const win = window.open('', '_blank', 'width=1100,height=900')
    if (win) { win.document.write(html); win.document.close(); win.focus() }
    else toast('Please allow popups for this site to view the report.', 'error')
  }

  return (
    <>
      <div className="view-scroll animate-fade-in no-print" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-accent)', fontSize: '1.3rem', color: 'var(--primary)', fontWeight: 900 }}>
              BURNOUT — Owner Panel
            </div>
            {newOrderAlert && (
              <div style={{ fontSize: '0.8rem', color: '#f44336', animation: 'pulse 1s infinite' }}>
                🔔 New order incoming!
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={fetchOrders} className="btn-outline-gray" style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              🔄 Refresh
            </button>
            <button onClick={() => setExportDialog({ open: true, type: 'csv' })} className="btn-outline-gray" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              📊 Export Excel
            </button>
            <button onClick={() => setExportDialog({ open: true, type: 'pdf' })} className="btn-outline-gray" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              🖨️ Print PDF
            </button>
            <button
              onClick={() => setExportDialog({ open: true, type: 'report' })}
              style={{
                padding: '6px 14px', fontSize: '0.75rem', cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(255,193,7,0.2), rgba(255,193,7,0.1))',
                color: '#ffc107', border: '1px solid rgba(255,193,7,0.5)',
                borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap'
              }}
            >
              📋 Generate Report
            </button>
            <button onClick={onLogout} className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 4, padding: '0 20px', overflowX: 'auto', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none', padding: '14px 18px', cursor: 'pointer', whiteSpace: 'nowrap',
                fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'all 0.2s', position: 'relative'
              }}>
              {tab.icon} {tab.label}
              {/* Badge for pending orders */}
              {tab.id === 'live' && pendingCount > 0 && (
                <span style={{ background: '#f44336', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {activeTab === 'live' && (
            <LiveOrders
              orders={orders}
              setOrders={setOrders}
              clearedIds={clearedIds}
              setClearedIds={setClearedIds}
              onClearToHistory={() => setActiveTab('history')}
            />
          )}
          {activeTab === 'menu' && <MenuManager />}
          {activeTab === 'analytics' && <Analytics orders={orders} />}
          {activeTab === 'feedback' && <FeedbackView orders={orders} />}
          {activeTab === 'history'  && <OwnerHistory orders={orders} />}
          {activeTab === 'settings' && <BusinessSettings />}
        </div>
      </div>

      {/* Print-only Sales Report */}
      <div className="print-owner-report" style={{ padding: 32, background: '#fff', color: '#000', position: 'relative', minHeight: '100vh' }}>
        
        {/* Rasoi Live Watermark */}
        <div style={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', 
          fontSize: '120px', color: 'rgba(0,0,0,0.04)', zIndex: 0, pointerEvents: 'none', whiteSpace: 'nowrap',
          fontWeight: 900, fontFamily: 'var(--font-accent)'
        }}>
          RASOI LIVE
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>BURNOUT CAFE & RESTAURANT — SALES REPORT</h1>
            <p style={{ fontSize: 12, color: '#555' }}>
              Duration: {printMonth === 'all' ? 'All Time' : printMonth === 'current' ? 'This Month' : 'Last Month'} | Generated: {new Date().toLocaleString('en-IN')}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '10px 0' }}>
            {(() => {
              const now = new Date()
              let filtered = orders
              if (printMonth === 'current') {
                filtered = orders.filter(o => { const d = new Date(o.timestamp); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
              } else if (printMonth === 'last') {
                const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                filtered = orders.filter(o => { const d = new Date(o.timestamp); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear() })
              }
              const revenue = filtered.filter(o => o.payment_status === 'COMPLETED').reduce((s, o) => s + Number(o.total || 0), 0)
              return (
                <>
                  <div><strong>Total Orders:</strong> {filtered.length}</div>
                  <div><strong>Collected Revenue:</strong> ₹{revenue}</div>
                </>
              )
            })()}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                {['Time', 'Table', 'Customer', 'Items', 'Total', 'Payment'].map(h => (
                  <th key={h} style={{ padding: 8, border: '1px solid #ccc', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const now = new Date()
                let filtered = orders
                if (printMonth === 'current') {
                  filtered = orders.filter(o => { const d = new Date(o.timestamp); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
                } else if (printMonth === 'last') {
                  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                  filtered = orders.filter(o => { const d = new Date(o.timestamp); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear() })
                }
                return filtered.map(o => (
                  <tr key={o._id}>
                    <td style={{ padding: 6, border: '1px solid #ccc' }}>{new Date(o.timestamp).toLocaleDateString('en-IN')} {new Date(o.timestamp).toLocaleTimeString('en-IN')}</td>
                    <td style={{ padding: 6, border: '1px solid #ccc' }}>{o.table_number}</td>
                    <td style={{ padding: 6, border: '1px solid #ccc' }}>{o.customer_name || '-'}</td>
                    <td style={{ padding: 6, border: '1px solid #ccc' }}>{o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</td>
                    <td style={{ padding: 6, border: '1px solid #ccc' }}>₹{o.total}</td>
                    <td style={{ padding: 6, border: '1px solid #ccc', fontWeight: 700, color: o.payment_status === 'COMPLETED' ? 'green' : '#ff9800' }}>
                      {o.payment_status || 'PENDING'}
                    </td>
                  </tr>
                ))
              })()}
            </tbody>
          </table>
          <div style={{ textAlign: 'center', marginTop: 40, fontSize: 10, color: '#666', fontStyle: 'italic' }}>
            Generated professionally by Rasoi Live Platform.
          </div>
        </div>
      </div>

      {/* Export Dialog Portal — bypasses all parent overflow/transform constraints */}
      {exportDialog.open && (
        <ExportDialog
          type={exportDialog.type}
          onClose={() => setExportDialog({ open: false, type: null })}
          onSubmit={handleExportSubmit}
        />
      )}
    </>
  )
}
