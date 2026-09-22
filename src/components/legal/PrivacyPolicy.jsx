export default function PrivacyPolicy({ onBack }) {
  return (
    <div className="view-scroll animate-fade-in" style={{ padding: '40px 20px', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginBottom: 20, fontSize: '1rem' }}>
        ← Back
      </button>
      <div className="card" style={{ padding: 30 }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: 20 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          At Rasoi Live, a startup founded in 2025, your privacy is critically important to us. This Privacy Policy governs the manner in which we collect, use, maintain, and disclose information collected from our customers.
        </p>
        <h3 style={{ color: '#fff', marginTop: 24, marginBottom: 12 }}>1. Information We Collect</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          We may collect personal identification information from Users in a variety of ways, including, but not limited to, when Users visit our site, register on the site, place an order, and in connection with other activities, services, features or resources we make available on our Site.
        </p>
        <h3 style={{ color: '#fff', marginTop: 24, marginBottom: 12 }}>2. How We Use Collected Information</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          Rasoi Live may collect and use Users personal information for the following purposes:
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>To improve customer service</li>
            <li>To personalize user experience</li>
            <li>To process payments</li>
          </ul>
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 40 }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
