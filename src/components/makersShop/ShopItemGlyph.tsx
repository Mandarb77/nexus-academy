type Props = { variant: string; className?: string }

/** Small game-style glyphs (inline SVG). */
export function ShopItemGlyph({ variant, className = '' }: Props) {
  const cn = `makers-shop-glyph ${className}`.trim()
  switch (variant) {
    case 'phone':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <rect x="9" y="4" width="14" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="16" cy="24" r="1.5" fill="currentColor" />
        </svg>
      )
    case 'playlist':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <path d="M6 8h14v3H6V8zm0 7h20v3H6v-3zm0 7h12v3H6v-3z" fill="currentColor" />
          <path d="M22 6l6 4-6 4V6z" fill="currentColor" opacity="0.85" />
        </svg>
      )
    case 'snack':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <path
            d="M6 14c4-6 16-6 20 0-4 6-16 6-20 0zm10-6l2 4-2 4-2-4 2-4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'tardy':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 9v8l5 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'broom':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <path d="M8 24l16-14 2 2L10 26l-2-2z" fill="currentColor" opacity="0.9" />
          <path d="M6 26h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'gem':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <path d="M16 4l10 10-10 14L6 14 16 4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6 14h20M11 9l5 15 5-15" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
        </svg>
      )
    case 'gear':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <path
            d="M16 6l1.2 2.5 2.8-.6 1.4 2.4-2.4 1.8.3 2.9-2.9.3-1.8 2.4-2.4-1.4-.6-2.8 2.5-1.2-2.5-1.2-.6 2.8-2.4 1.4-1.8-2.4.3-2.9-2.9-.3-2.4-1.8 1.4-2.4 2.8-.6L14.8 6 16 6z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )
    case 'community':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <circle cx="11" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="21" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 26c1-5 5-8 10-8s9 3 10 8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'token':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="16" y="19" textAnchor="middle" fontSize="9" fill="currentColor" fontWeight="700">
            G
          </text>
        </svg>
      )
    case 'frame':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <rect x="6" y="6" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M10 22h12M12 10h8v8H12V10z" fill="currentColor" opacity="0.35" />
        </svg>
      )
    case 'tool':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <path d="M8 22l14-14 2 2L10 24l-2-2z" fill="currentColor" />
          <path d="M6 24l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'book':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <path d="M8 6h8c2 0 4 1 4 3v17H8V6z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 6h8v20h-8" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    case 'archive':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <path d="M6 10h20v4H6v-4zm2 4v14h16V14" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M10 18h12M10 22h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'mystery':
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M10 24c2-3 10-3 12 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="13" cy="13" r="1.5" fill="currentColor" />
          <circle cx="19" cy="13" r="1.5" fill="currentColor" />
        </svg>
      )
    default:
      return (
        <svg className={cn} viewBox="0 0 32 32" aria-hidden>
          <path d="M16 5l3.5 7 7.5.8-5.5 5.4 1.3 7.5L16 22l-6.8 3.7 1.3-7.5-5.5-5.4 7.5-.8L16 5z" fill="currentColor" opacity="0.9" />
        </svg>
      )
  }
}
