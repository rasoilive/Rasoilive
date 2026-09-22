export default function LanguageSelection({ onSelect }) {
  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'ur', name: 'Urdu', native: 'اردو' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'ne', name: 'Nepali', native: 'नेपाली' }
  ]

  return (
    <div className="view-scroll animate-fade-in" style={{ padding: '20px 20px 100px 20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32, fontSize: '1.4rem', fontWeight: 700 }}>
        Select Language
      </h2>
      
      <div className="language-grid">
        {languages.map(lang => (
          <button
            key={lang.code}
            className="lang-btn"
            onClick={() => onSelect(lang.code)}
          >
            <span style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{lang.native}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
