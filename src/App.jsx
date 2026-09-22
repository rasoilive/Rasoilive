import { useState, useEffect, lazy, Suspense } from 'react'
import SplashScreen from './components/SplashScreen'
import LandingPage from './components/LandingPage'
import LanguageSelection from './components/LanguageSelection'
import NameEntry from './components/NameEntry'
import TableEntry from './components/TableEntry'
import MenuView from './components/MenuView'
import CartView from './components/CartView'
import PaymentMode from './components/PaymentMode'
import OrderStatus from './components/OrderStatus'
import OrderHistory from './components/OrderHistory'
import CookieBanner from './components/CookieBanner'

const OwnerLogin = lazy(() => import('./components/OwnerLogin'))
const OwnerDashboard = lazy(() => import('./components/OwnerDashboard'))
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy'))
const TermsConditions = lazy(() => import('./components/legal/TermsConditions'))
const RefundPolicy = lazy(() => import('./components/legal/RefundPolicy'))
const BusinessDisclosure = lazy(() => import('./components/legal/BusinessDisclosure'))
export const VIEWS = {
  SPLASH:   'SPLASH',
  LANDING:  'LANDING',
  LANGUAGE: 'LANGUAGE',
  NAME:     'NAME',
  TABLE:    'TABLE',
  MENU:     'MENU',
  CART:     'CART',
  PAYMENT:  'PAYMENT',
  STATUS:   'STATUS',
  HISTORY:  'HISTORY',
  OWNER_LOGIN: 'OWNER_LOGIN',
  OWNER_DASH:  'OWNER_DASH',
  LEGAL_PRIVACY: 'LEGAL_PRIVACY',
  LEGAL_TERMS:   'LEGAL_TERMS',
  LEGAL_REFUND:  'LEGAL_REFUND',
  LEGAL_DISC:    'LEGAL_DISC',
}

// Global Footer Component
function GlobalFooter({ onNavigate, onCookieSettings }) {
  return (
    <div className="global-footer no-print">
      <div className="footer-links">
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(VIEWS.LEGAL_PRIVACY) }}>Privacy Policy</a>
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(VIEWS.LEGAL_TERMS) }}>Terms & Conditions</a>
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(VIEWS.LEGAL_REFUND) }}>Return & Refund Policy</a>
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(VIEWS.LEGAL_DISC) }}>Business Disclosure</a>
        <a href="#" onClick={(e) => { e.preventDefault(); if(onCookieSettings) onCookieSettings() }}>Cookie Settings</a>
      </div>
      <div style={{ marginTop: 8, opacity: 0.8 }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-main)', marginBottom: 2 }}>
          Powered by
        </p>
        <p style={{ fontSize: '0.9rem', fontFamily: 'var(--font-accent)', color: 'var(--primary)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
          Rasoi Live
        </p>
      </div>
      <div className="footer-copyright">
        © 2025 Rasoi Live. All rights reserved.
      </div>
    </div>
  )
}

export default function App() {
  const [view,      setView]      = useState(VIEWS.SPLASH)
  const [history,   setHistory]   = useState([])
  const [language,  setLanguage]  = useState('en')
  const [userName,  setUserName]  = useState('')
  const [tableNo,   setTableNo]   = useState('')
  const [restCode,  setRestCode]  = useState('')
  const [cart,      setCart]      = useState([])
  const [orderId,   setOrderId]   = useState(null)
  const [pendingOrderPayload, setPendingOrderPayload] = useState(null)
  const [paymentOffline, setPaymentOffline] = useState(false)
  const [splashOut, setSplashOut] = useState(false)
  const [showCookie, setShowCookie] = useState(false)

  // Auto-detect table and restCode from URL query params (e.g. ?table=5&rest=BURNOUT01)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlTable = params.get('table')
    const urlRest = params.get('rest') || params.get('restCode')
    if (urlTable) {
      setTableNo(urlTable)
      setRestCode(urlRest || 'BURNOUT01')
      localStorage.setItem('rasoi_rest_code', urlRest || 'BURNOUT01')
    }
  }, [])

  // Auto-advance splash → landing
  useEffect(() => {
    if (view !== VIEWS.SPLASH) return
    const params = new URLSearchParams(window.location.search)
    const urlTable = params.get('table')
    
    const fadeTimer = setTimeout(() => setSplashOut(true), 1800)
    const nextTimer = setTimeout(() => {
      if (urlTable) {
        setView(VIEWS.LANGUAGE) // Skip directly to language selection if table is in URL
      } else {
        setView(VIEWS.LANDING)
      }
    }, 2400)
    return () => { clearTimeout(fadeTimer); clearTimeout(nextTimer) }
  }, [view])

  // Sync Offline Pending Orders
  useEffect(() => {
    const syncPendingLocalOrders = async () => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('demo_order_')) {
          try {
            const orderData = JSON.parse(localStorage.getItem(key))
            // If it's still pending and hasn't been synced (no true MongoDB _id yet)
            if (typeof orderData._id === 'string' && orderData._id.startsWith('ORD-')) {
              console.log('Syncing offline order:', orderData._id)
              const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
              })
              if (res.ok) {
                const newOrder = await res.json()
                // Clean up the local mock order and optionally save real one
                localStorage.removeItem(key)
                console.log('Successfully synced offline order to backend!')
              }
            }
          } catch (e) {
            console.error('Error syncing local order', e)
          }
        }
      }
    }
    
    // Attempt sync on load and on network reconnect
    syncPendingLocalOrders()
    window.addEventListener('online', syncPendingLocalOrders)
    return () => window.removeEventListener('online', syncPendingLocalOrders)
  }, [])

  // Routing helper
  const navigate = (newView) => {
    setHistory(prev => [...prev, view])
    setView(newView)
  }
  
  const goBack = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(history.slice(0, -1))
    setView(prev)
  }

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c._id === item._id)
      if (existing) return prev.map(c => c._id === item._id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(c => c._id === itemId)
      if (!existing) return prev
      if (existing.qty === 1) return prev.filter(c => c._id !== itemId)
      return prev.map(c => c._id === itemId ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const cartQuantity = cart.reduce((sum, i) => sum + i.qty, 0)

  if (view === VIEWS.SPLASH) return <SplashScreen fadeOut={splashOut} />

  const showHeader = [VIEWS.LANGUAGE, VIEWS.NAME, VIEWS.TABLE, VIEWS.MENU, VIEWS.CART, VIEWS.PAYMENT, VIEWS.HISTORY].includes(view)
  const showOwnerBtn = [VIEWS.LANDING, VIEWS.LANGUAGE, VIEWS.NAME, VIEWS.TABLE, VIEWS.MENU, VIEWS.HISTORY].includes(view)
  const showFooter = [VIEWS.LANDING, VIEWS.LANGUAGE, VIEWS.NAME, VIEWS.TABLE, VIEWS.MENU, VIEWS.HISTORY, VIEWS.LEGAL_PRIVACY, VIEWS.LEGAL_TERMS, VIEWS.LEGAL_REFUND, VIEWS.LEGAL_DISC].includes(view)
  
  // Offline payment logic disables back button on STATUS screen
  const isLocked = paymentOffline && view === VIEWS.STATUS

  return (
    <>
      {/* Global Top Bar */}
      {(showHeader || showOwnerBtn) && (
        <div style={{ position: 'absolute', top: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
          <div>
            {showHeader && !isLocked && (
              <button className="btn-outline-gray" style={{ padding: '6px 14px', fontSize: '1rem', border: 'none', background: 'rgba(255,255,255,0.1)' }} onClick={goBack}>
                ←
              </button>
            )}
          </div>
          <div>
            {showOwnerBtn && (
              <button className="owner-access-btn" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => navigate(VIEWS.OWNER_LOGIN)}>
                🔐 Owner Access
              </button>
            )}
          </div>
        </div>
      )}

      <div className="app-container animate-fade-in" style={{ paddingTop: showHeader ? 60 : 0 }}>
        
        {view === VIEWS.LANDING && (
          <LandingPage onEnter={() => navigate(VIEWS.LANGUAGE)} />
        )}

        {view === VIEWS.LANGUAGE && (
          <LanguageSelection onSelect={(lang) => { setLanguage(lang); navigate(VIEWS.NAME) }} />
        )}

        {view === VIEWS.NAME && (
          <NameEntry onEnter={(n) => {
            setUserName(n);
            if (tableNo) {
              navigate(VIEWS.MENU) // Skip table entry if table was set via QR URL
            } else {
              navigate(VIEWS.TABLE)
            }
          }} />
        )}

        {view === VIEWS.TABLE && (
          <TableEntry onEnter={(t, rc) => { setTableNo(t); setRestCode(rc || ''); navigate(VIEWS.MENU) }} />
        )}

        {view === VIEWS.MENU && (
          <MenuView
            tableNo={tableNo}
            cart={cart}
            cartTotal={cartTotal}
            cartQuantity={cartQuantity}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onViewCart={() => navigate(VIEWS.CART)}
            onOwnerAccess={() => navigate(VIEWS.OWNER_LOGIN)}
          />
        )}

        {view === VIEWS.CART && (
          <CartView
            tableNo={tableNo}
            userName={userName}
            restCode={restCode}
            cart={cart}
            cartTotal={cartTotal}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onBack={goBack}
            onProceedToPayment={(payload) => { setPendingOrderPayload(payload); navigate(VIEWS.PAYMENT) }}
          />
        )}

        {view === VIEWS.PAYMENT && (
          <PaymentMode 
            pendingPayload={pendingOrderPayload}
            onOrderSuccess={(id, isOffline) => {
              setOrderId(id)
              setPaymentOffline(isOffline)
              navigate(VIEWS.STATUS)
            }}
            onBack={goBack}
          />
        )}

        {view === VIEWS.STATUS && (
          <OrderStatus
            orderId={orderId}
            tableNo={tableNo}
            userName={userName}
            isOffline={paymentOffline}
            onAddMore={() => navigate(VIEWS.MENU)}
            onHistory={() => {
              // Clear cart so they can start fresh if they want
              setCart([])
              navigate(VIEWS.HISTORY)
            }}
          />
        )}

        {view === VIEWS.HISTORY && (
          <OrderHistory onBack={() => navigate(VIEWS.MENU)} />
        )}

        <Suspense fallback={<div className="view-center" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading screen...</div>}>
          {view === VIEWS.OWNER_LOGIN && (
            <OwnerLogin
              onLogin={() => setView(VIEWS.OWNER_DASH)}
              onBack={goBack}
            />
          )}

          {view === VIEWS.OWNER_DASH && (
            <OwnerDashboard
              onLogout={() => { setView(VIEWS.LANDING); setHistory([]) }}
            />
          )}

          {/* Legal Pages */}
          {view === VIEWS.LEGAL_PRIVACY && <PrivacyPolicy onBack={goBack} />}
          {view === VIEWS.LEGAL_TERMS && <TermsConditions onBack={goBack} />}
          {view === VIEWS.LEGAL_REFUND && <RefundPolicy onBack={goBack} />}
          {view === VIEWS.LEGAL_DISC && <BusinessDisclosure onBack={goBack} />}
        </Suspense>
      </div>

      {showFooter && <GlobalFooter onNavigate={navigate} onCookieSettings={() => setShowCookie(true)} />}
      
      {/* Global Cookie Banner Overlay */}
      {(view !== VIEWS.SPLASH && view !== VIEWS.LANDING || showCookie) && (
        <CookieBanner forceShow={showCookie} onClose={() => setShowCookie(false)} />
      )}
    </>
  )
}
