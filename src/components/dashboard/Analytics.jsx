import { useState, useMemo } from 'react'

export default function Analytics({ orders = [] }) {
  const [timeRange, setTimeRange] = useState('7d') // 'today' | '7d' | '30d' | 'all'
  const [chartMetric, setChartMetric] = useState('revenue') // 'revenue' | 'orders'
  const [hoveredPoint, setHoveredPoint] = useState(null)

  // Filter orders by time range
  const filteredOrders = useMemo(() => {
    const now = new Date()
    return orders.filter(o => {
      const d = new Date(o.timestamp)
      if (isNaN(d.getTime())) return false
      
      if (timeRange === 'today') {
        return d.toDateString() === now.toDateString()
      }
      if (timeRange === '7d') {
        const past7 = new Date(now)
        past7.setDate(now.getDate() - 7)
        return d >= past7
      }
      if (timeRange === '30d') {
        const past30 = new Date(now)
        past30.setDate(now.getDate() - 30)
        return d >= past30
      }
      return true // 'all'
    })
  }, [orders, timeRange])

  // Key Performance Indicators (KPIs)
  const kpis = useMemo(() => {
    const totalOrders = filteredOrders.length
    const paidOrders = filteredOrders.filter(o => o.payment_status === 'COMPLETED')
    
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
    const grossVolume = filteredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
    const pendingRevenue = grossVolume - totalRevenue
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

    // Food subtotal vs taxes breakdown
    let foodSubtotal = 0
    let taxesAndCharges = 0
    paidOrders.forEach(o => {
      const orderFood = (o.items || []).reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0)
      foodSubtotal += orderFood
      taxesAndCharges += Math.max(0, Number(o.total || 0) - orderFood)
    })

    return {
      totalOrders,
      paidCount: paidOrders.length,
      totalRevenue,
      foodSubtotal,
      taxesAndCharges,
      pendingRevenue,
      aov
    }
  }, [filteredOrders])

  // Itemized Sales Breakdown (Net Sales per Item)
  const itemSalesData = useMemo(() => {
    const map = {}
    filteredOrders.forEach(order => {
      const isPaid = order.payment_status === 'COMPLETED'
      ;(order.items || []).forEach(item => {
        const name = item.name || 'Unknown Item'
        const price = Number(item.price) || 0
        const qty = Number(item.qty || 1)
        const itemRevenue = price * qty

        if (!map[name]) {
          map[name] = { name, qty: 0, revenue: 0, paidRevenue: 0, price }
        }
        map[name].qty += qty
        map[name].revenue += itemRevenue
        if (isPaid) {
          map[name].paidRevenue += itemRevenue
        }
      })
    })

    const list = Object.values(map).sort((a, b) => b.revenue - a.revenue)
    const totalItemRevenue = list.reduce((sum, i) => sum + i.revenue, 0) || 1

    return list.map(i => ({
      ...i,
      sharePercent: Math.round((i.revenue / totalItemRevenue) * 100)
    }))
  }, [filteredOrders])

  // Chart Time Series Data Aggregation (Daily or Hourly)
  const chartData = useMemo(() => {
    if (timeRange === 'today') {
      // 24 hours breakdown
      const hours = Array.from({ length: 24 }, (_, i) => ({
        label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
        hour: i,
        revenue: 0,
        orders: 0
      }))

      filteredOrders.forEach(o => {
        const h = new Date(o.timestamp).getHours()
        if (hours[h]) {
          hours[h].orders += 1
          if (o.payment_status === 'COMPLETED') {
            hours[h].revenue += Number(o.total || 0)
          }
        }
      })
      return hours
    }

    if (timeRange === 'all') {
      // Dynamic grouping by all actual unique order dates
      const dayMap = {}
      if (filteredOrders.length === 0) {
        const todayKey = new Date().toISOString().split('T')[0]
        const todayLabel = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        return [{ label: todayLabel, key: todayKey, revenue: 0, orders: 0 }]
      }

      // Sort chronologically
      const sorted = [...filteredOrders].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      sorted.forEach(o => {
        const d = new Date(o.timestamp)
        if (!isNaN(d.getTime())) {
          const key = d.toISOString().split('T')[0]
          const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          if (!dayMap[key]) {
            dayMap[key] = { label, key, revenue: 0, orders: 0 }
          }
          dayMap[key].orders += 1
          if (o.payment_status === 'COMPLETED') {
            dayMap[key].revenue += Number(o.total || 0)
          }
        }
      })

      const result = Object.values(dayMap)
      if (result.length === 1) {
        const singleDate = new Date(result[0].key)
        const padded = []
        for (let i = 6; i >= 1; i--) {
          const pd = new Date(singleDate)
          pd.setDate(singleDate.getDate() - i)
          const pKey = pd.toISOString().split('T')[0]
          const pLabel = pd.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          padded.push({ label: pLabel, key: pKey, revenue: 0, orders: 0 })
        }
        return [...padded, result[0]]
      }
      return result
    }

    // Daily breakdown for 7d or 30d
    const daysCount = timeRange === '7d' ? 7 : 30
    const dayMap = {}
    const now = new Date()

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      dayMap[key] = { label, key, revenue: 0, orders: 0 }
    }

    filteredOrders.forEach(o => {
      const d = new Date(o.timestamp)
      if (!isNaN(d.getTime())) {
        const key = d.toISOString().split('T')[0]
        if (dayMap[key]) {
          dayMap[key].orders += 1
          if (o.payment_status === 'COMPLETED') {
            dayMap[key].revenue += Number(o.total || 0)
          }
        }
      }
    })

    return Object.values(dayMap)
  }, [filteredOrders, timeRange])

  // Top performing item
  const topItem = itemSalesData[0]

  // Calculate SVG curve path points
  const svgChart = useMemo(() => {
    if (!chartData || chartData.length === 0) return null
    const width = 800
    const height = 250
    const paddingLeft = 40
    const paddingRight = 40
    const paddingTop = 25
    const paddingBottom = 45

    const values = chartData.map(d => chartMetric === 'revenue' ? d.revenue : d.orders)
    const maxVal = Math.max(...values, 10)

    const points = chartData.map((d, idx) => {
      const x = paddingLeft + (idx / Math.max(chartData.length - 1, 1)) * (width - paddingLeft - paddingRight)
      const val = chartMetric === 'revenue' ? d.revenue : d.orders
      const y = height - paddingBottom - (val / maxVal) * (height - paddingTop - paddingBottom)
      return { x, y, data: d, val }
    })

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
    }, '')

    const areaD = points.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : ''

    return { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom, points, pathD, areaD, maxVal }
  }, [chartData, chartMetric])

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Title & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 Business Intelligence & Growth Graph
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Real-time revenue, order trends & net item sales performance
          </p>
        </div>

        {/* Time Filter Buttons */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            ['today', 'Today'],
            ['7d', 'Last 7 Days'],
            ['30d', 'Last 30 Days'],
            ['all', 'All Time']
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: timeRange === key ? 'var(--primary)' : 'transparent',
                color: timeRange === key ? '#000' : 'var(--text-secondary)',
                fontWeight: timeRange === key ? 800 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        
        {/* Realized Sales */}
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #4CAF50', background: 'rgba(20, 20, 25, 0.8)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Realized Net Revenue
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4CAF50', letterSpacing: -0.5 }}>
            ₹{kpis.totalRevenue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>
            From {kpis.paidCount} paid orders
          </div>
        </div>

        {/* Total Orders */}
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--primary)', background: 'rgba(20, 20, 25, 0.8)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Total Orders Placed
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: -0.5 }}>
            {kpis.totalOrders}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>
            Order volume in selected period
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #2196F3', background: 'rgba(20, 20, 25, 0.8)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Average Order Value (AOV)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#2196F3', letterSpacing: -0.5 }}>
            ₹{kpis.aov.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>
            Avg ticket size per customer
          </div>
        </div>

        {/* Top Grossing Dish */}
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #E91E63', background: 'rgba(20, 20, 25, 0.8)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Top Grossing Item
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {topItem ? topItem.name : '—'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#E91E63', fontWeight: 700, marginTop: 4 }}>
            {topItem ? `₹${topItem.revenue.toLocaleString('en-IN')} (${topItem.qty} sold)` : 'No sales data'}
          </div>
        </div>

      </div>

      {/* Main Growth Graph Card */}
      <div className="card" style={{ padding: 24, marginBottom: 28, border: '1px solid rgba(255,193,7,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ fontSize: '1.15rem', color: '#fff', margin: 0, fontWeight: 700 }}>
              📈 Business Sales & Growth Curve
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Hover over points to inspect date & sales breakdown
            </span>
          </div>

          {/* Metric Selector */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setChartMetric('revenue')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: '0.8rem',
                border: '1px solid',
                borderColor: chartMetric === 'revenue' ? '#4CAF50' : 'rgba(255,255,255,0.15)',
                background: chartMetric === 'revenue' ? '#4CAF50' : 'transparent',
                color: chartMetric === 'revenue' ? '#000' : '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              💰 Net Revenue (₹)
            </button>
            <button
              onClick={() => setChartMetric('orders')}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: '0.8rem',
                border: '1px solid',
                borderColor: chartMetric === 'orders' ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
                background: chartMetric === 'orders' ? 'var(--primary)' : 'transparent',
                color: chartMetric === 'orders' ? '#000' : '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📦 Order Count
            </button>
          </div>
        </div>

        {/* SVG Curve Chart */}
        {svgChart && svgChart.points.length > 0 ? (
          <div style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${svgChart.width} ${svgChart.height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartMetric === 'revenue' ? '#4CAF50' : '#ffc107'} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={chartMetric === 'revenue' ? '#4CAF50' : '#ffc107'} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid Horizontal Lines */}
              {[0.25, 0.55, 0.85].map((ratio, idx) => {
                const y = svgChart.height - svgChart.paddingBottom - ratio * (svgChart.height - svgChart.paddingTop - svgChart.paddingBottom)
                return (
                  <line 
                    key={idx} 
                    x1={svgChart.paddingLeft} 
                    y1={y} 
                    x2={svgChart.width - svgChart.paddingRight} 
                    y2={y} 
                    stroke="rgba(255,255,255,0.08)" 
                    strokeDasharray="4 4" 
                  />
                )
              })}

              {/* Gradient Area Fill */}
              <path d={svgChart.areaD} fill="url(#salesGradient)" />

              {/* Main Curve Line */}
              <path 
                d={svgChart.pathD} 
                fill="none" 
                stroke={chartMetric === 'revenue' ? '#4CAF50' : '#ffc107'} 
                strokeWidth="3.5" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points */}
              {svgChart.points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint === idx ? 8 : 4.5}
                    fill={chartMetric === 'revenue' ? '#4CAF50' : '#ffc107'}
                    stroke="#141419"
                    strokeWidth="2.5"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />

                  {/* X Axis Labels */}
                  <text
                    x={p.x}
                    y={svgChart.height - 14}
                    textAnchor="middle"
                    fill="#cccccc"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="Inter, sans-serif"
                  >
                    {p.data.label}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint !== null && svgChart.points[hoveredPoint] && (
              <div
                style={{
                  position: 'absolute',
                  top: Math.max(10, svgChart.points[hoveredPoint].y - 50),
                  left: `${(svgChart.points[hoveredPoint].x / svgChart.width) * 100}%`,
                  transform: 'translateX(-50%)',
                  background: '#000',
                  border: '1px solid var(--primary)',
                  padding: '6px 12px',
                  borderRadius: 8,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
                  zIndex: 20
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 600 }}>{svgChart.points[hoveredPoint].data.label}</div>
                <div style={{ fontSize: '0.9rem', color: '#4CAF50', fontWeight: 800 }}>
                  ₹{svgChart.points[hoveredPoint].data.revenue.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                  {svgChart.points[hoveredPoint].data.orders} Order(s)
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No sales graph data available for this duration.
          </div>
        )}
      </div>

      {/* Net Sales per Item (Itemized Intelligence Table) */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h4 style={{ fontSize: '1.15rem', color: '#fff', margin: 0, fontWeight: 700 }}>
              🍽️ Net Sales & Item Profitability
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Complete breakdown of quantity sold, revenue earned & sales contribution % per item
            </span>
          </div>
        </div>

        {itemSalesData.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No item sales records found for this period.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                  <th style={{ padding: '12px 10px', textAlign: 'left' }}>Rank</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left' }}>Menu Item</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Units Sold</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Price (₹)</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Net Sales (₹)</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', width: 140 }}>Sales Share</th>
                </tr>
              </thead>
              <tbody>
                {itemSalesData.map((item, idx) => (
                  <tr key={item.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 800, color: idx < 3 ? 'var(--primary)' : '#888' }}>
                      #{idx + 1}
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: 700, color: '#fff' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                      {item.qty} Qty
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#aaa' }}>
                      ₹{item.price}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 900, color: '#4CAF50' }}>
                      ₹{item.revenue.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${item.sharePercent}%`, height: '100%', background: '#4CAF50', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 700, minWidth: 30 }}>
                          {item.sharePercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
