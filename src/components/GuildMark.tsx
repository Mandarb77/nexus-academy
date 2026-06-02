/*
 * Guild cartouche marks — same SVG vocabulary as PatentLedger header marks.
 * Used on Workshop / Guilds list / guild quest home (not inside patent ledger chrome).
 */

export type GuildMarkSlug = 'forge' | 'prism' | 'folded' | 'silicon' | 'void' | 'default'

type GuildMarkProps = {
  guild: GuildMarkSlug
  /** Short label under the mark (e.g. "Forge", "Void") */
  label?: string
  /** cartouche ≈120px oval; compact = accordion row */
  size?: 'cartouche' | 'compact'
  className?: string
}

const STROKE = 'var(--guild-mark-stroke, #8B6914)'
const FILL = 'var(--guild-mark-fill, #5C3210)'

function MarkSvg({ guild, compact }: { guild: GuildMarkSlug; compact: boolean }) {
  const w = compact ? 40 : 50
  const h = compact ? 54 : 68

  if (guild === 'void') {
    return (
      <svg
        className="bench-guild-mark__svg"
        width={w}
        height={h}
        viewBox="0 0 120 172"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g stroke={STROKE} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
          <ellipse cx="60" cy="88" rx="54" ry="80" />
          <rect x="26" y="60" width="68" height="68" />
          <circle cx="60" cy="94" r="34" />
          <line x1="60" y1="51" x2="33" y2="128" />
          <line x1="60" y1="51" x2="87" y2="128" />
          <circle cx="60" cy="40" r="11" />
          <circle cx="60" cy="40" r="5" />
        </g>
        <polygon
          points="60,74 66,78 62,86 69,98 62,112 64,122 60,152 56,122 58,112 51,98 58,86 54,78"
          fill={FILL}
        />
      </svg>
    )
  }

  if (guild === 'silicon') {
    return (
      <svg
        className="bench-guild-mark__svg"
        width={w}
        height={h}
        viewBox="0 0 120 172"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g stroke={STROKE} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
          <ellipse cx="60" cy="86" rx="52" ry="78" />
          <line x1="60" y1="30" x2="60" y2="152" />
          <line x1="60" y1="64" x2="40" y2="46" />
          <line x1="60" y1="80" x2="28" y2="62" />
          <line x1="60" y1="104" x2="32" y2="92" />
          <line x1="60" y1="130" x2="40" y2="116" />
          <line x1="60" y1="64" x2="80" y2="46" />
          <line x1="60" y1="80" x2="92" y2="62" />
          <line x1="60" y1="104" x2="88" y2="92" />
          <line x1="60" y1="130" x2="80" y2="116" />
          <circle cx="60" cy="30" r="7" />
          <circle cx="60" cy="62" r="7" />
          <circle cx="60" cy="158" r="6" />
          <circle cx="40" cy="44" r="5" />
          <circle cx="28" cy="62" r="5" />
          <circle cx="32" cy="92" r="5" />
          <circle cx="40" cy="116" r="5" />
          <circle cx="80" cy="44" r="5" />
          <circle cx="92" cy="62" r="5" />
          <circle cx="88" cy="92" r="5" />
          <circle cx="80" cy="116" r="5" />
        </g>
      </svg>
    )
  }

  if (guild === 'folded') {
    return (
      <svg
        className="bench-guild-mark__svg"
        width={compact ? 38 : 48}
        height={h}
        viewBox="0 0 120 172"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g stroke={STROKE} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
          <ellipse cx="60" cy="86" rx="52" ry="78" />
          {/* Folded Path crane — user-specified geometry, centered/scaled to fit the oval. */}
          <g transform="translate(60 92) scale(0.22)">
            <polygon points="0,-60 -110,20 0,100 110,20" />

            <line x1="0" y1="-60" x2="0" y2="100" />
            <line x1="-110" y1="20" x2="110" y2="20" />

            <polyline points="-110,20 -220,-50 -170,80" />
            <line x1="-110" y1="20" x2="-170" y2="80" />
            <line x1="-220" y1="-50" x2="-170" y2="80" />

            <polyline points="110,20 220,-50 170,80" />
            <line x1="110" y1="20" x2="170" y2="80" />
            <line x1="220" y1="-50" x2="170" y2="80" />

            <polyline points="-110,20 -60,160 0,100" />
            <line x1="-110" y1="20" x2="0" y2="100" />
            <line x1="-60" y1="160" x2="0" y2="100" />

            <polyline points="0,-60 -30,-140 30,-140" />
            <line x1="0" y1="-60" x2="30" y2="-140" />

            <polygon points="-30,-140 30,-140 20,-175 -10,-175" />

            <polyline points="-10,-175 -40,-200 20,-175" />
            <line x1="-10" y1="-175" x2="20" y2="-175" />

            <line x1="-30" y1="-140" x2="30" y2="-140" />
          </g>
        </g>
      </svg>
    )
  }

  if (guild === 'prism') {
    return (
      <svg
        className="bench-guild-mark__svg"
        width={compact ? 38 : 48}
        height={h}
        viewBox="0 0 120 172"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g stroke={STROKE} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
          <ellipse cx="60" cy="86" rx="52" ry="78" />
          <line x1="68" y1="86" x2="106" y2="86" />
          <line x1="66" y1="81" x2="100" y2="51" />
          <line x1="63" y1="79" x2="83" y2="25" />
          <line x1="57" y1="79" x2="37" y2="25" />
          <line x1="54" y1="81" x2="20" y2="51" />
          <line x1="52" y1="86" x2="14" y2="86" />
          <line x1="54" y1="91" x2="20" y2="121" />
          <line x1="57" y1="93" x2="37" y2="147" />
          <line x1="63" y1="93" x2="83" y2="147" />
          <line x1="66" y1="91" x2="100" y2="121" />
          <line x1="58.5" y1="78" x2="58.5" y2="18" />
          <line x1="61.5" y1="78" x2="61.5" y2="18" />
          <line x1="58.5" y1="94" x2="58.5" y2="154" />
          <line x1="61.5" y1="94" x2="61.5" y2="154" />
          <circle cx="60" cy="86" r="8" />
        </g>
      </svg>
    )
  }

  if (guild === 'forge') {
    return (
      <svg
        className="bench-guild-mark__svg"
        width={compact ? 38 : 48}
        height={h}
        viewBox="0 0 120 172"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g stroke={STROKE} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none">
          <ellipse cx="60" cy="86" rx="52" ry="78" />
          <line x1="44" y1="26" x2="76" y2="26" />
          <line x1="44" y1="26" x2="50" y2="56" />
          <line x1="76" y1="26" x2="70" y2="56" />
          <line x1="50" y1="56" x2="70" y2="56" />
          <line x1="50" y1="56" x2="57" y2="76" />
          <line x1="70" y1="56" x2="63" y2="76" />
          <line x1="57" y1="76" x2="60" y2="82" />
          <line x1="63" y1="76" x2="60" y2="82" />
          <line x1="60" y1="82" x2="60" y2="96" />
          <circle cx="60" cy="96" r="2" />
          <ellipse cx="60" cy="96" rx="20" ry="5" />
          <line x1="40" y1="96" x2="40" y2="110" />
          <line x1="80" y1="96" x2="80" y2="110" />
          <path d="M40 110 A20 5 0 0 1 80 110" />
          <ellipse cx="60" cy="114" rx="28" ry="6" />
          <line x1="32" y1="114" x2="32" y2="128" />
          <line x1="88" y1="114" x2="88" y2="128" />
          <path d="M32 128 A28 6 0 0 1 88 128" />
          <ellipse cx="60" cy="132" rx="36" ry="7" />
          <line x1="24" y1="132" x2="24" y2="146" />
          <line x1="96" y1="132" x2="96" y2="146" />
          <path d="M24 146 A36 7 0 0 1 96 146" />
          <ellipse cx="60" cy="150" rx="46" ry="8" />
          <path d="M14 150 A46 14 0 0 1 106 150" />
        </g>
      </svg>
    )
  }

  /* Hammer fallback */
  return (
    <svg
      className="bench-guild-mark__svg bench-guild-mark__svg--hammer"
      width={compact ? 44 : 60}
      height={compact ? 44 : 60}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <polygon points="36,4 56,14 68,34 58,56 36,68 14,58 4,36 14,14" fill="none" stroke={STROKE} strokeWidth="1.4" />
      <polygon points="36,11 51,19 61,34 52,51 36,61 20,53 11,36 20,19" fill="none" stroke={STROKE} strokeWidth="0.7" opacity="0.65" />
      <rect x="32" y="29" width="8" height="17" rx="1" fill={FILL} />
      <rect x="26" y="22" width="20" height="9" rx="1.5" fill={FILL} />
      <line x1="24" y1="41" x2="20" y2="45" stroke={STROKE} strokeWidth="1" strokeLinecap="round" />
      <line x1="24" y1="36" x2="19" y2="36" stroke={STROKE} strokeWidth="1" strokeLinecap="round" />
      <line x1="48" y1="41" x2="52" y2="45" stroke={STROKE} strokeWidth="1" strokeLinecap="round" />
      <line x1="48" y1="36" x2="53" y2="36" stroke={STROKE} strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

export function GuildMark({ guild, label, size = 'cartouche', className = '' }: GuildMarkProps) {
  const compact = size === 'compact'
  const aria = label ? `${label} guild mark` : 'Guild mark'

  return (
    <div
      className={`bench-guild-mark bench-guild-mark--${guild} bench-guild-mark--${size}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={aria}
    >
      <div className="bench-guild-mark__frame">
        <MarkSvg guild={guild} compact={compact} />
      </div>
      {label ? <p className="bench-guild-mark__label">{label}</p> : null}
    </div>
  )
}
