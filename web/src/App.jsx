import React, { useEffect } from 'react';
import { QrCode, Smartphone, BarChart3, Clock, ChefHat, ShieldCheck, ArrowRight } from 'lucide-react';
import logoUrl from '../../rasoi live.png';

export default function App() {
  // Simple intersection observer for fade-in animations on scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      
      {/* Background Glows */}
      <div className="bg-glow" style={{ top: '-20%', left: '-10%' }}></div>
      <div className="bg-glow" style={{ bottom: '10%', right: '-10%', background: 'radial-gradient(circle, rgba(255, 152, 0, 0.15) 0%, transparent 70%)' }}></div>

      {/* Navigation */}
      <nav className="glass" style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, padding: '16px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logoUrl} alt="Rasoi Live" style={{ height: '40px' }} onError={(e) => { e.target.style.display = 'none' }} />
            <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '1px' }}>
              RASOI <span className="text-gradient-gold">LIVE</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', fontSize: '0.9rem', fontWeight: 500 }}>
            <a href="#features" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.3s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>Features</a>
            <a href="#motive" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.3s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>Our Motive</a>
            <button className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section" style={{ paddingTop: '180px', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="animate-in" style={{ opacity: 0 }}>
            <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: '30px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '24px' }}>
              🚀 The Next Generation Restaurant OS
            </div>
            <h1 style={{ fontSize: '4.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px' }}>
              Revolutionize Your <br />
              <span className="text-gradient-gold">Restaurant Experience</span>
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 40px auto', lineHeight: 1.8 }}>
              Zero hardware costs. Zero commissions. Empower your customers to order and pay directly from their phones, while you manage everything in real-time.
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                View Demo <ArrowRight size={20} />
              </button>
              <button style={{ padding: '16px 32px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.3s' }} onMouseOver={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.4)' }} onMouseOut={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.2)' }}>
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* The Motive */}
      <section id="motive" className="section" style={{ background: 'rgba(0,0,0,0.3)', position: 'relative' }}>
        <div className="container">
          <div className="scroll-animate" style={{ opacity: 0, transform: 'translateY(20px)' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 800, textAlign: 'center', marginBottom: '60px' }}>
              Our <span className="text-gradient-gold">Motive</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '24px' }}>Eliminate the Wait. Elevate the Taste.</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '20px', lineHeight: 1.8 }}>
                  Traditional dining is plagued by waiting: waiting for a menu, waiting for a waiter, waiting for the bill. Rasoi Live was built by <strong style={{ color: '#fff' }}>Satyronix Publications</strong> with a singular vision: to put the power back in the hands of the diners and the control back in the hands of the owners.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.8 }}>
                  We believe technology should be invisible yet impactful. By removing friction from the ordering process, restaurants can focus on what they do best — crafting incredible food and memorable experiences.
                </p>
              </div>
              <div className="glass-card" style={{ padding: '40px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(255,193,7,0.1)', padding: '12px', borderRadius: '12px', color: 'var(--primary)' }}><Clock size={28} /></div>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Zero Wait Time</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Customers scan, order, and pay instantly.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(255,193,7,0.1)', padding: '12px', borderRadius: '12px', color: 'var(--primary)' }}><ShieldCheck size={28} /></div>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>100% Transparent</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No hidden fees, no commission per order. You keep what you earn.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section">
        <div className="container">
          <div className="scroll-animate" style={{ opacity: 0, transform: 'translateY(20px)' }}>
            <div style={{ textAlign: 'center', marginBottom: '80px' }}>
              <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '20px' }}>
                Everything You Need, <span className="text-gradient-gold">Nothing You Don't</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                A complete suite of tools designed to streamline your operations and boost your bottom line.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
              <div className="glass-card">
                <QrCode size={40} color="var(--primary)" style={{ marginBottom: '24px' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>Dynamic QR Ordering</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>Table-specific QR codes instantly load a digital, interactive menu. Customers order directly without downloading any apps.</p>
              </div>
              
              <div className="glass-card">
                <ChefHat size={40} color="var(--primary)" style={{ marginBottom: '24px' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>Live Kitchen Sync</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>Orders beam instantly to the owner dashboard. Update statuses from 'Preparing' to 'Served' in real-time to keep diners informed.</p>
              </div>

              <div className="glass-card">
                <BarChart3 size={40} color="var(--primary)" style={{ marginBottom: '24px' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>Powerful Analytics</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>Track revenue, top-selling items, and payment modes (Cash vs Online). Generate professional PDF & Excel reports with one click.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '60px 0 40px', background: 'rgba(0,0,0,0.5)' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logoUrl} alt="Rasoi Live" style={{ height: '30px', filter: 'grayscale(100%) opacity(70%)' }} onError={(e) => { e.target.style.display = 'none' }} />
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#888' }}>
              RASOI LIVE
            </span>
          </div>
          <p style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center' }}>
            A project proudly developed by <br/>
            <strong style={{ color: '#aaa', fontSize: '1.1rem', display: 'inline-block', marginTop: '8px' }}>Satyronix Publications</strong>
          </p>
          <div style={{ marginTop: '20px', color: '#555', fontSize: '0.8rem' }}>
            &copy; {new Date().getFullYear()} Satyronix Publications. All rights reserved.
          </div>
        </div>
      </footer>
      
    </div>
  );
}
