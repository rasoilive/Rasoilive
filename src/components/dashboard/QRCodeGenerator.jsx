import { useState } from 'react'

export default function QRCodeGenerator() {
  const [tableNumber, setTableNumber] = useState('1')
  const [qrSize, setQrSize] = useState('300')
  
  // Base URL is the current origin (e.g. https://rasoilive.com or local IP)
  const appUrl = window.location.origin
  
  // The QR data simply points to the app. 
  // In a real production environment, you might append ?table=1 to the URL to auto-fill the table number.
  const qrData = encodeURIComponent(`${appUrl}?table=${tableNumber}`)
  
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${qrData}&margin=20&bgcolor=ffffff&color=000000`

  return (
    <div className="animate-fade-in" style={{ padding: '0 10px' }}>
      <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: 8 }}>Table QR Codes</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
        Generate and print QR codes for your tables. Customers scan these to instantly open the menu without downloading an app.
      </p>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        
        <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 400 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 6 }}>Table Number</label>
            <input 
              type="number" 
              className="owner-input" 
              value={tableNumber} 
              onChange={e => setTableNumber(Math.max(1, parseInt(e.target.value) || 1).toString())} 
              min="1"
              style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 6 }}>QR Size (px)</label>
            <select 
              className="owner-input"
              value={qrSize}
              onChange={e => setQrSize(e.target.value)}
            >
              <option value="200">Small (200x200)</option>
              <option value="300">Medium (300x300)</option>
              <option value="500">Large (500x500)</option>
            </select>
          </div>
        </div>

        <div style={{ 
          background: '#fff', 
          padding: '24px 24px 40px', 
          borderRadius: 16, 
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 20
        }}>
          <h2 style={{ color: '#000', fontSize: '1.5rem', marginBottom: 4, fontFamily: 'var(--font-accent)', letterSpacing: 2 }}>BURNOUT CAFE & RESTAURANT</h2>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 20, fontWeight: 700 }}>TABLE {tableNumber}</p>
          <img 
            src={qrImageUrl} 
            alt={`QR Code for Table ${tableNumber}`} 
            style={{ width: parseInt(qrSize), height: parseInt(qrSize), borderRadius: 8, border: '1px solid #eee' }} 
            crossOrigin="anonymous"
          />
          <p style={{ color: '#000', fontSize: '0.9rem', marginTop: 20, fontWeight: 600 }}>Scan to order food</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 10, width: '100%', maxWidth: 400 }}>
          <button 
            className="btn-outline-gray" 
            style={{ flex: 1, padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => {
              // Create an invisible link to download the image
              fetch(qrImageUrl)
                .then(res => res.blob())
                .then(blob => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Burnout_Table_${tableNumber}_QR.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                })
                .catch(() => alert('Failed to download QR code. You can right click / long press the image to save it.'));
            }}
          >
            📥 Download
          </button>
          
          <button 
            className="btn-primary" 
            style={{ flex: 1, padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => window.print()}
          >
            🖨️ Print
          </button>
        </div>

      </div>
    </div>
  )
}
