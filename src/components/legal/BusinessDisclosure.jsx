export default function BusinessDisclosure({ onBack }) {
  return (
    <div className="view-scroll animate-fade-in" style={{ padding: '40px 20px', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginBottom: 20, fontSize: '1rem' }}>
        ← Back
      </button>
      <div className="card" style={{ padding: 30 }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: 20 }}>Business Disclosure</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          <strong>Registered Business Name:</strong> Rasoi Live Culinary Services Pvt. Ltd.<br />
          <strong>Head Office:</strong> 123 Gourmet Avenue, Food City, 400001<br />
          <strong>Contact Email:</strong> support@rasoilive.com<br />
          <strong>Phone:</strong> +91 98765 43210
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          Rasoi Live is a registered trademark of a dynamic startup founded in 2025. All rights to the digital platform, menu designs, and brand identity are exclusively owned by Rasoi Live Culinary Services.
        </p>
      </div>
    </div>
  )
}
