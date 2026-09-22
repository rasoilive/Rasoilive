import { useState, useEffect, useCallback } from 'react'

import { BURNOUT_MENU } from '../data/BurnoutMenu'

const DEMO_MENU = BURNOUT_MENU;

// ─── Quantity Control ─────────────────────
function QtyControl({ item, onAdd, onRemove }) {
  const qty = item.cartQty || 0
  if (qty === 0) {
    return (
      <button className="btn-outline" style={{ padding: '8px 20px', fontSize: '0.85rem' }} onClick={() => onAdd(item)}>
        ADD
      </button>
    )
  }
  return (
    <div className="qty-control">
      <button className="qty-btn" onClick={() => onRemove(item._id)}>−</button>
      <span className="qty-value">{qty}</span>
      <button className="qty-btn" onClick={() => onAdd(item)}>+</button>
    </div>
  )
}

// ─── Menu Item Card ───────────────────────
function MenuItemCard({ item, onAdd, onRemove }) {
  const imgSrc = item.image || item.image_url
  const isVeg = item.isVeg !== undefined ? item.isVeg : (item.is_veg !== undefined ? item.is_veg : item.dietary === 'veg')

  return (
    <div className="menu-item-card">
      {imgSrc ? (
        <img 
          src={imgSrc} 
          alt={item.name} 
          className="menu-item-img" 
          onError={(e) => { 
            e.target.style.display = 'none'; 
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div className="menu-item-img fallback-icon" style={{ display: imgSrc ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
        🍽️
      </div>
      <div className="menu-item-info">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <span className={isVeg ? 'veg-badge' : 'non-veg-badge'} />
          <span className="menu-item-name">{item.name}</span>
        </div>
        {item.description && (
          <p className="menu-item-desc">{item.description}</p>
        )}
        <span className="menu-item-price">₹{item.price}</span>
      </div>
      <QtyControl item={item} onAdd={onAdd} onRemove={onRemove} />
    </div>
  )
}

// ─── Main MenuView ────────────────────────
export default function MenuView({ tableNo, cart, cartTotal, cartQuantity, onAdd, onRemove, onViewCart, onOwnerAccess }) {
  const [menuItems, setMenuItems] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [openCats,  setOpenCats]  = useState({ '🔥 Sizzlers': true }) // Open first by default

  const fetchMenu = useCallback(() => {
    setLoading(true)
    setMenuItems(DEMO_MENU)
    setLoading(false)
  }, [])

  useEffect(() => { fetchMenu() }, [fetchMenu])

  const toggleCat = (cat) => setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }))

  // Enrich items with cart qty
  const enriched = menuItems.map(item => ({
    ...item,
    cartQty: cart.find(c => c._id === item._id)?.qty || 0,
  }))

  const filtered = enriched.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const groups = filtered.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const sortedGroups = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))

  return (
    <>
      {/* Header */}
      <div className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: '4px', borderRadius: '50%', background: 'linear-gradient(145deg, #1a1a1a, #000)', boxShadow: '0 0 15px rgba(255, 87, 34, 0.4)' }}>
            <img src="/burnout_logo.png" alt="Burnout" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-accent)', fontSize: '1.4rem', color: '#fff', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 900, lineHeight: 1.1, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>BURNOUT</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700 }}>Table {tableNo}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="owner-access-btn" onClick={onOwnerAccess}>
            🔐 Owner Access
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          id="menu-search"
          className="input-field"
          style={{ marginBottom: 0, fontSize: '1rem', textAlign: 'left', padding: '12px 16px' }}
          placeholder="🔍  Search menu..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="view-scroll" style={{ paddingBottom: cartQuantity > 0 ? 100 : 20 }}>
        {loading && (
          <div className="text-center" style={{ padding: '60px 0', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <p>Loading menu...</p>
          </div>
        )}

        {!loading && sortedGroups.map(([category, items]) => (
          <div key={category} style={{ marginBottom: 12 }}>
            <div className="accordion-header" onClick={() => toggleCat(category)}>
              <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{category}</span>
              <span style={{ fontSize: '0.8rem', transition: 'transform 0.3s', transform: openCats[category] ? 'rotate(180deg)' : 'none' }}>
                ▼
              </span>
            </div>
            
            <div className={`accordion-content ${openCats[category] ? 'open' : ''}`}>
              <div style={{ paddingTop: 8 }}>
                {items.map(item => (
                  <MenuItemCard key={item._id} item={item} onAdd={onAdd} onRemove={onRemove} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      {cartQuantity > 0 && (
        <button id="view-cart-btn" className="cart-badge" onClick={onViewCart}>
          <span>🛒 {cartQuantity} item{cartQuantity !== 1 ? 's' : ''}</span>
          <span style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.3)' }} />
          <span>₹{cartTotal.toFixed(0)}</span>
          <span>→</span>
        </button>
      )}
    </>
  )
}
