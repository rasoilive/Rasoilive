import { useState, useEffect } from 'react'

const DEFAULT_PRESET_IMAGES = [
  { label: '🍕 Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80' },
  { label: '🍔 Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' },
  { label: '🍲 Paneer / Curry', url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80' },
  { label: '☕ Coffee / Drinks', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&q=80' },
  { label: '🥤 Shake / Mocktail', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80' },
  { label: '🍰 Dessert', url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80' },
]

export default function MenuManager() {
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  
  // Edit State (null = list view, {} = new/editing item)
  const [editingItem, setEditingItem] = useState(null)
  const [imageTab, setImageTab] = useState('upload') // 'upload' | 'url' | 'presets'
  
  const fetchMenu = async () => {
    setLoading(true)
    try {
      const ownerStr = localStorage.getItem('rasoi_owner')
      const restCode = ownerStr ? (JSON.parse(ownerStr)?.restCode || 'BURNOUT01') : 'BURNOUT01'
      const res = await fetch(`/api/menu?restCode=${restCode}&includeInactive=true`)
      if (res.ok) {
        setMenu(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMenu()
  }, [])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 800
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        // Compress image to JPEG 75% quality for lightweight & fast uploads
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75)
        setEditingItem(prev => ({ ...prev, image: compressedDataUrl }))
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editingItem.name || !editingItem.price || !editingItem.category) {
      return alert('Name, price, and category are required')
    }

    const payload = {
      name: editingItem.name,
      price: Number(editingItem.price),
      description: editingItem.description || '',
      category: editingItem.category.trim(),
      dietary: editingItem.isVeg ? 'veg' : 'non-veg',
      isVeg: Boolean(editingItem.isVeg),
      image: editingItem.image || '',
      active: editingItem.active !== undefined ? editingItem.active : true
    }

    try {
      const token = localStorage.getItem('rasoi_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      let res
      if (editingItem._id) {
        // Update
        res = await fetch(`/api/menu/${editingItem._id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload)
        })
      } else {
        // Create
        res = await fetch('/api/menu', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })
      }

      if (res.ok) {
        setEditingItem(null)
        fetchMenu()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || `Failed to save menu item (Server error ${res.status})`)
      }
    } catch (err) {
      alert('Failed to save menu item: ' + (err.message || 'Server error'))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    try {
      const token = localStorage.getItem('rasoi_token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE', headers })
      if (res.ok) {
        fetchMenu()
      } else {
        alert('Failed to delete item.')
      }
    } catch (err) {
      alert('Failed to delete item.')
    }
  }

  const handleToggleActive = async (item) => {
    try {
      const token = localStorage.getItem('rasoi_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      await fetch(`/api/menu/${item._id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ active: !item.active })
      })
      fetchMenu()
    } catch (err) {
      console.error(err)
    }
  }

  const categories = ['ALL', ...new Set(menu.map(i => i.category).filter(Boolean))]

  const filteredMenu = menu.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 700, margin: 0 }}>
            🍔 Menu Management
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Add, edit, change prices, update photos & manage availability
          </p>
        </div>

        {!editingItem && (
          <button 
            className="btn-primary" 
            style={{ padding: '10px 20px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => setEditingItem({ name: '', price: '', description: '', category: 'Mains', isVeg: true, image: '', active: true })}
          >
            ➕ ADD NEW ITEM
          </button>
        )}
      </div>

      {/* Edit / Create Form Modal Card */}
      {editingItem && (
        <div className="card" style={{ padding: 24, marginBottom: 32, border: '2px solid var(--primary)', borderRadius: 16, background: 'rgba(20, 20, 25, 0.95)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
            <h4 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>
              {editingItem._id ? '✏️ Edit Menu Item' : '✨ Add New Menu Item'}
            </h4>
            <button type="button" onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Row 1: Name & Price */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Item Name *</label>
                <input required className="owner-input" placeholder="e.g. Paneer Butter Masala" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Price (₹) *</label>
                <input required type="number" step="0.01" className="owner-input" placeholder="e.g. 280" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} />
              </div>
            </div>
            
            {/* Row 2: Category & Dietary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Category *</label>
                <input required className="owner-input" placeholder="e.g. Starters, Mains, Drinks, Desserts" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={editingItem.isVeg} onChange={e => setEditingItem({...editingItem, isVeg: e.target.checked})} style={{ width: 18, height: 18, accentColor: '#4CAF50' }} />
                  <span style={{ color: editingItem.isVeg ? '#4CAF50' : '#f44336', fontWeight: 700 }}>
                    {editingItem.isVeg ? '🟢 Vegetarian (Veg)' : '🔴 Non-Vegetarian (Non-Veg)'}
                  </span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Item Description</label>
              <textarea className="owner-input" rows="2" placeholder="Brief description of the dish..." value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} style={{ resize: 'vertical' }} />
            </div>

            {/* Image Selection Section */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--primary)', marginBottom: 10, fontWeight: 700 }}>
                🖼️ Item Photo / Image
              </label>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button type="button" onClick={() => setImageTab('upload')} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6, border: 'none', background: imageTab === 'upload' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: imageTab === 'upload' ? '#000' : '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  📁 Upload Photo
                </button>
                <button type="button" onClick={() => setImageTab('url')} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6, border: 'none', background: imageTab === 'url' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: imageTab === 'url' ? '#000' : '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  🔗 Image Web Link
                </button>
                <button type="button" onClick={() => setImageTab('presets')} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 6, border: 'none', background: imageTab === 'presets' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: imageTab === 'presets' ? '#000' : '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  ✨ Pick Sample Photo
                </button>
              </div>

              {imageTab === 'upload' && (
                <div>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="owner-input" style={{ padding: 8 }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, display: 'block' }}>⚡ Automatic image optimization enabled for fast saving</span>
                </div>
              )}

              {imageTab === 'url' && (
                <input className="owner-input" placeholder="https://example.com/item-photo.jpg" value={editingItem.image || ''} onChange={e => setEditingItem({...editingItem, image: e.target.value})} />
              )}

              {imageTab === 'presets' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {DEFAULT_PRESET_IMAGES.map((p, idx) => (
                    <button key={idx} type="button" onClick={() => setEditingItem({ ...editingItem, image: p.url })} style={{ padding: '6px 12px', background: editingItem.image === p.url ? 'var(--primary)' : 'rgba(255,255,255,0.08)', color: editingItem.image === p.url ? '#000' : '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Preview */}
              {editingItem.image && (
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={editingItem.image} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '2px solid var(--primary)' }} />
                  <button type="button" onClick={() => setEditingItem({ ...editingItem, image: '' })} style={{ color: '#f44336', background: 'none', border: '1px solid rgba(244,67,54,0.3)', padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                    Remove Photo
                  </button>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="btn-primary" style={{ padding: '12px 24px', fontWeight: 700, fontSize: '0.95rem' }}>
                💾 SAVE ITEM
              </button>
              <button type="button" className="btn-outline-gray" onClick={() => setEditingItem(null)} style={{ padding: '12px 24px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Category Filter Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="text" 
          className="owner-input" 
          placeholder="🔍 Search menu item by name..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: 300, flex: 1 }}
        />

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.85rem',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
                background: selectedCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: selectedCategory === cat ? '#000' : '#fff',
                fontWeight: selectedCategory === cat ? 700 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items List / Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading menu items...</div>
      ) : filteredMenu.length === 0 ? (
        <div className="card text-center" style={{ padding: 40 }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No menu items found. Click "+ ADD NEW ITEM" to create one!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredMenu.map(item => (
            <div 
              key={item._id} 
              className="card" 
              style={{ 
                padding: 16, 
                display: 'flex', 
                flexDirection: 'column', 
                justify: 'space-between',
                opacity: item.active === false ? 0.6 : 1,
                border: item.active === false ? '1px dashed #666' : '1px solid rgba(255,255,255,0.1)',
                position: 'relative'
              }}
            >
              <div>
                {/* Item Top: Image + Info */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: 75, height: 75, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 75, height: 75, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
                      🍽️
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ border: `1px solid ${item.isVeg !== false ? '#4CAF50' : '#f44336'}`, borderRadius: 4, width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ background: item.isVeg !== false ? '#4CAF50' : '#f44336', borderRadius: '50%', width: 8, height: 8 }} />
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{item.name}</strong>
                    </div>

                    <div style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 700, marginBottom: 4 }}>
                      ₹{item.price}
                    </div>

                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,193,7,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                      {item.category || 'Mains'}
                    </span>
                  </div>
                </div>

                {item.description && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                    {item.description}
                  </p>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 10 }}>
                {/* Active Toggle */}
                <button 
                  onClick={() => handleToggleActive(item)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: item.active !== false ? '#4CAF50' : '#888',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {item.active !== false ? '🟢 Available' : '⚪ Out of Stock'}
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    onClick={() => setEditingItem({
                      ...item,
                      isVeg: item.isVeg !== undefined ? item.isVeg : (item.dietary === 'veg')
                    })} 
                    className="btn-outline" 
                    style={{ padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    ✏️ Edit
                  </button>

                  <button 
                    onClick={() => handleDelete(item._id)} 
                    className="btn-outline-gray" 
                    style={{ padding: '5px 12px', fontSize: '0.8rem', color: '#f44336', borderColor: 'rgba(244,67,54,0.3)', fontWeight: 600 }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

