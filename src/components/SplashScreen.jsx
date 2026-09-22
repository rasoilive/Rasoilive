export default function SplashScreen({ fadeOut }) {
  return (
    <div className={`splash-container${fadeOut ? ' fade-out' : ''}`}>
      <div className="splash-bg-glow" />
      <div style={{ padding: '12px', borderRadius: '50%', background: 'linear-gradient(145deg, #1a1a1a, #000)', boxShadow: '0 0 40px rgba(255, 87, 34, 0.5), inset 0 0 20px rgba(255, 87, 34, 0.1)', animation: 'pulse 2s infinite' }}>
        <img
          src="/burnout_logo.png"
          alt="Burnout BBQ"
          style={{ width: '220px', height: '220px', objectFit: 'cover', borderRadius: '50%', display: 'block' }}
        />
      </div>
    </div>
  )
}
