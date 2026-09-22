export default function RefundPolicy({ onBack }) {
  return (
    <div className="view-scroll animate-fade-in" style={{ padding: '40px 20px', maxWidth: 800, margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginBottom: 20, fontSize: '1rem' }}>
        ← Back
      </button>
      <div className="card" style={{ padding: 30 }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: 20 }}>Return & Refund Policy</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          Thank you for dining at Rasoi Live, a food-tech startup founded in 2025. We strive to provide the best culinary experience possible.
        </p>
        <h3 style={{ color: '#fff', marginTop: 24, marginBottom: 12 }}>1. Food Orders & Cancellations</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          Since we deal in freshly prepared food, <strong>no cancellation will be accepted once the order is placed</strong>. Please review your cart carefully before confirming your order.
        </p>
        <h3 style={{ color: '#fff', marginTop: 24, marginBottom: 12 }}>2. Refunds</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          <strong>No refund of the order food will be given</strong> under any circumstances. All sales are final. If an online payment fails but money is deducted from your account, it will be automatically refunded by your bank within 5-7 business days.
        </p>
      </div>
    </div>
  )
}
