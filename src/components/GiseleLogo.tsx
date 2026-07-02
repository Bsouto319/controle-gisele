interface Props {
  readonly width?: number
  readonly textColor?: string
}

export default function GiseleLogo({ width = 200, textColor = '#2d2d2d' }: Props) {
  const height = Math.round(width * 0.34)
  const rose = '#C9A9A6'
  const gold = '#C4956A'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 102"
      width={width}
      height={height}
      style={{ flexShrink: 0 }}
    >
      {/* Flourish — pétala estilizada */}
      <path
        d="M 40,20 C 55,10 65,25 55,40 C 65,45 55,62 40,54 C 25,62 15,45 25,40 C 15,25 25,10 40,20 Z"
        fill="none"
        stroke={rose}
        strokeWidth="2.5"
        opacity="0.85"
      />
      <circle cx="40" cy="37" r="4" fill={gold} opacity="0.9" />

      {/* Gisele Falcão */}
      <text
        x="70"
        y="52"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="30"
        fontWeight="bold"
        fill={textColor}
      >
        Gisele Falcão
      </text>

      {/* Subtitle */}
      <text
        x="71"
        y="72"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="10.5"
        fill={textColor}
        opacity="0.65"
        letterSpacing="0.6"
      >
        estética &amp; fisioterapia
      </text>
    </svg>
  )
}
