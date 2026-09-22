export default function TermsConditions({ onBack }) {
  return (
    <div className="view-scroll animate-fade-in" style={{ padding: '40px 20px', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginBottom: 20, fontSize: '1rem' }}>
        ← Back
      </button>
      <div className="card" style={{ padding: 30 }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: 20 }}>Terms & Conditions</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          Welcome to Rasoi Live! As a startup founded in 2025, we bring you this digital ordering platform. These terms and conditions outline the rules and regulations for the use of our services.
        </p>
        <h3 style={{ color: '#fff', marginTop: 24, marginBottom: 12 }}>1. Acceptance of Terms</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          By accessing this application, we assume you accept these terms and conditions. Do not continue to use Rasoi Live if you do not agree to take all of the terms and conditions stated on this page.
        </p>
        <h3 style={{ color: '#fff', marginTop: 24, marginBottom: 12 }}>2. Ordering & Payments</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          All orders placed through this application are subject to acceptance by the restaurant. Prices are subject to change without notice. All online payments are securely processed and verified at the counter.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 40 }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
