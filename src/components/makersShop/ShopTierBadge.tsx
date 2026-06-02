/*
 * Compact tier badge for Supply shelf tiles — echoes guild cartouche shape without guild marks.
 */

import type { GuildShelfAccent } from './shopDisplay'

type Props = {
  accent: GuildShelfAccent
  label: string
}

function abbrevForLabel(label: string): string {
  const n = label.trim().toLowerCase()
  if (n.startsWith('conven')) return 'Co'
  if (n === 'craft') return 'Cr'
  if (n === 'legacy') return 'Le'
  return label.trim().slice(0, 2) || '—'
}

export function ShopTierBadge({ accent, label }: Props) {
  return (
    <div className={`shop-tier-badge shop-tier-badge--${accent}`} aria-hidden>
      <span className="shop-tier-badge__frame">{abbrevForLabel(label)}</span>
    </div>
  )
}
