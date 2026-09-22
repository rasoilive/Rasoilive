import { useState } from 'react'
import { useSettings } from '../../hooks/useSettings'

function SettingRow({ label, sub, children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.07)'
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function NumberInput({ value, onChange, min = 0, max = 100, step = 0.5, suffix = '%' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}
        style={{
          width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >−</button>
      <div style={{
        minWidth: 64, textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)'
      }}>
        {value}{suffix}
      </div>
      <button
        onClick={() => onChange(Math.min(max, Number((value + step).toFixed(2))))}
        style={{
          width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1.1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >+</button>
    </div>
  )
}

export default function BusinessSettings() {
  const { settings, saveSettings, saving, saved } = useSettings()
  const [local, setLocal] = useState({ ...settings })

  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val }))
  const hasChanges = JSON.stringify(local) !== JSON.stringify(settings)

  const handleSave = () => saveSettings(local)
  const handleReset = () => setLocal({ ...settings })

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 800 }}>
          ⚙️ Business Settings
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
          Changes apply instantly across customer ordering, cart, and bills.
        </p>
      </div>

      {/* Pricing Settings */}
      <div className="card" style={{ padding: '4px 24px', marginBottom: 20 }}>
        <div style={{ padding: '14px 0 8px', fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
          Pricing & Tax
        </div>

        <SettingRow
          label="GST Rate"
          sub="Applied to all customer orders. Updates instantly on customer screens."
        >
          <NumberInput
            value={local.gstPercent}
            onChange={v => set('gstPercent', v)}
            min={0} max={28} step={0.5}
          />
        </SettingRow>

        <SettingRow
          label="Discount"
          sub="Flat discount applied after subtotal, before GST."
        >
          <NumberInput
            value={local.discountPercent}
            onChange={v => set('discountPercent', v)}
            min={0} max={100} step={1}
          />
        </SettingRow>

        <SettingRow
          label="Service Charge"
          sub="Fixed amount added to every order (₹)."
        >
          <NumberInput
            value={local.serviceCharge}
            onChange={v => set('serviceCharge', v)}
            min={0} max={500} step={5}
            suffix="₹"
          />
        </SettingRow>
      </div>

      {/* Restaurant Identity */}
      <div className="card" style={{ padding: '4px 24px', marginBottom: 20 }}>
        <div style={{ padding: '14px 0 8px', fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
          Restaurant Identity
        </div>

        <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Restaurant Name</div>
          <input
            value={local.restaurantName}
            onChange={e => set('restaurantName', e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: '0.95rem', outline: 'none'
            }}
          />
        </div>

        <div style={{ padding: '16px 0' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Tagline</div>
          <input
            value={local.tagline}
            onChange={e => set('tagline', e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: '0.95rem', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Live Preview */}
      <div className="card" style={{ padding: 20, marginBottom: 20, background: 'rgba(255,193,7,0.05)', borderColor: 'rgba(255,193,7,0.2)' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
          Live Bill Preview
        </div>
        {(() => {
          const sub = 500
          const disc = Math.round(sub * (local.discountPercent / 100))
          const afterDisc = sub - disc
          const gst = Math.round(afterDisc * (local.gstPercent / 100))
          const svc = local.serviceCharge
          const total = afterDisc + gst + svc
          return (
            <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal (example)</span><span>₹500</span>
              </div>
              {disc > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4CAF50' }}>
                  <span>Discount ({local.discountPercent}%)</span><span>−₹{disc}</span>
                </div>
              )}
              {gst > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>GST ({local.gstPercent}%)</span><span>₹{gst}</span>
                </div>
              )}
              {svc > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Service Charge</span><span>₹{svc}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: 'var(--primary)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
                <span>TOTAL</span><span>₹{total}</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Save Bar */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        {hasChanges && (
          <button
            onClick={handleReset}
            style={{
              padding: '12px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.9rem'
            }}
          >
            Discard Changes
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          style={{
            padding: '12px 32px', borderRadius: 12, border: 'none',
            background: saved ? '#4CAF50' : hasChanges ? '#ffc107' : 'rgba(255,255,255,0.1)',
            color: saved ? '#fff' : hasChanges ? '#000' : 'rgba(255,255,255,0.3)',
            cursor: hasChanges ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: '0.95rem',
            transition: 'all 0.3s'
          }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
