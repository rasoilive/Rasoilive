import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'rasoi_settings'

export const DEFAULT_SETTINGS = {
  gstPercent: 5,
  discountPercent: 0,
  serviceChargePercent: 0,
  restaurantName: 'Burnout Cafe & Restaurant',
  upiId: 'rasoi@okaxis',
  address: 'Main Street, City',
  phone: '+91 9876543210',
  currency: '₹'
}

export function getSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

export function useSettings() {
  const [settings, setSettingsState] = useState(getSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Fetch settings from DB on mount
  useEffect(() => {
    let isMounted = true
    async function fetchBackendSettings() {
      try {
        const ownerStr = localStorage.getItem('rasoi_owner')
        const restCode = ownerStr ? JSON.parse(ownerStr).restCode : localStorage.getItem('rasoi_rest_code') || 'BURNOUT01'
        const res = await fetch(`/api/settings?restCode=${restCode}`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data && !data.error) {
            const merged = { ...DEFAULT_SETTINGS, ...data }
            setSettingsState(merged)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
          }
        }
      } catch (e) {
        /* fallback to local settings if backend unreachable */
      }
    }
    fetchBackendSettings()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setSettingsState(getSettings())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const saveSettings = useCallback(async (newSettings) => {
    const merged = { ...settings, ...newSettings }
    setSaving(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    setSettingsState(merged)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))

    try {
      const token = localStorage.getItem('rasoi_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(merged),
      })
    } catch (e) {
      /* backend sync optional */
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }, [settings])

  return { settings, saveSettings, saving, saved }
}
