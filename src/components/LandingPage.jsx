export default function LandingPage({ onEnter }) {
  return (
    <div className="view-center animate-fade-in" style={{ padding: 20, position: 'relative' }}>

      {/* Subtle top radial glow */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '50vw', height: '30vh',
        background: 'radial-gradient(ellipse, rgba(255,87,34,0.10) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>

        {/* Logo Ring */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 10, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(40,18,5,0.9) 0%, rgba(0,0,0,0.95) 100%)',
          boxShadow: '0 0 50px rgba(255,87,34,0.45), 0 0 100px rgba(255,87,34,0.15), inset 0 0 20px rgba(255,87,34,0.08)',
          marginBottom: 32,
          animation: 'logoCinematic 1.4s ease-out both'
        }}>
          <img
            src="/burnout_logo.png"
            alt="Burnout"
            style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Brand Name — Bebas Neue */}
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(4rem, 10vw, 6rem)',
          lineHeight: 0.95,
          letterSpacing: '10px',
          color: '#FFFFFF',
          textShadow: '0 0 60px rgba(255,87,34,0.35), 0 4px 30px rgba(0,0,0,0.9)',
          marginBottom: 8
        }}>
          BURNOUT
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.8rem',
          fontWeight: 300,
          letterSpacing: '8px',
          color: 'var(--primary)',
          textTransform: 'uppercase',
          marginBottom: 6
        }}>
          Cafe &amp; Restaurant
        </p>

        {/* Thin divider */}
        <div style={{
          width: 60, height: 1, margin: '14px auto',
          background: 'linear-gradient(to right, transparent, rgba(255,87,34,0.7), transparent)'
        }} />

        {/* Tagline */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.65rem',
          fontWeight: 300,
          letterSpacing: '5px',
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
          marginBottom: 44
        }}>
          Where Your Food Comes Alive
        </p>

        {/* CTA */}
        <button
          className="btn-gold-glow"
          onClick={onEnter}
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.3rem',
            letterSpacing: '5px',
            padding: '14px 60px'
          }}
        >
          ENTER
        </button>

      </div>
    </div>
  )
}
