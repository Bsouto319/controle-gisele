export default function ProNutroLogo({ size = 36 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="pn-leafL" x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#15803d"/>
          <stop offset="100%" stopColor="#86efac"/>
        </linearGradient>
        <linearGradient id="pn-leafR" x1="1" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#166534"/>
          <stop offset="100%" stopColor="#4ade80"/>
        </linearGradient>
        <radialGradient id="pn-glow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="#040d05"/>
      <ellipse cx="50" cy="45" rx="44" ry="50" fill="url(#pn-glow)"/>
      <rect x="24" y="82" width="52" height="5" rx="2.5" fill="#14532d" opacity="0.75"/>
      <line x1="50" y1="84" x2="50" y2="26" stroke="#22c55e" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="M 50 65 Q 18 54 14 22 Q 44 16 52 58 Z" fill="url(#pn-leafL)"/>
      <path d="M 50 46 Q 82 36 84 10 Q 58 8 50 42 Z" fill="url(#pn-leafR)"/>
      <line x1="50" y1="65" x2="22" y2="34" stroke="#dcfce7" strokeWidth="1" opacity="0.3" strokeLinecap="round"/>
      <line x1="50" y1="46" x2="76" y2="18" stroke="#dcfce7" strokeWidth="1" opacity="0.3" strokeLinecap="round"/>
      <circle cx="50" cy="24" r="6.5" fill="#4ade80"/>
      <circle cx="50" cy="24" r="3.5" fill="#bbf7d0"/>
      <circle cx="50" cy="24" r="1.5" fill="#fff" opacity="0.85"/>
    </svg>
  )
}
