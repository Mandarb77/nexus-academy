/*
 * One tier shelf in Supply — guild-style tile + expandable item grid (Convenience / Craft / Legacy).
 */

import type { ShopCatalogItem, ShopTierEmbed } from '../../types/shopCatalog'
import { GameShopCard } from './GameShopCard'
import { ShopTierBadge } from './ShopTierBadge'
import { displayShelfTitle, shelfAccentForTier, tierShortDescription, tierSlugId } from './shopDisplay'

type TierGroup = { tier: ShopTierEmbed; items: ShopCatalogItem[] }

type Props = {
  group: TierGroup
  open: boolean
  onToggle: () => void
  gold: number
  buyingKey: string | null
  dailyBlockedIds: Set<string>
  isSupabaseConfigured: boolean
  catalogLoading: boolean
  onBuy: (item: ShopCatalogItem) => void
}

export function ShopTierBoard({
  group,
  open,
  onToggle,
  gold,
  buyingKey,
  dailyBlockedIds,
  isSupabaseConfigured,
  catalogLoading,
  onBuy,
}: Props) {
  const { tier, items } = group
  const shelfTitle = displayShelfTitle(tier.name)
  const accent = shelfAccentForTier(tier.name)
  const desc = tierShortDescription(tier.name, tier.subtitle)
  const slug = tierSlugId(tier.name)

  return (
    <section
      className={`shop-shelf shop-shelf--${accent}${open ? ' shop-shelf--open' : ''}`}
      aria-labelledby={`shop-shelf-${slug}`}
    >
      <button
        type="button"
        className="shop-shelf-toggle"
        aria-expanded={open}
        aria-controls={`shop-shelf-panel-${slug}`}
        id={`shop-shelf-trigger-${slug}`}
        onClick={onToggle}
      >
        <div className="shop-shelf-toggle-inner">
          <ShopTierBadge accent={accent} label={shelfTitle} />
          <div className="shop-shelf-toggle-copy">
            <h2 id={`shop-shelf-${slug}`} className="shop-shelf-title">
              {shelfTitle}
            </h2>
            <p className="shop-shelf-desc">{desc}</p>
            <span className="shop-shelf-hint" aria-hidden="true">
              {open ? 'Hide items' : `${items.length} item${items.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <span className="shop-shelf-chevron" aria-hidden="true">
            {open ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {open ? (
        <div
          id={`shop-shelf-panel-${slug}`}
          role="region"
          aria-labelledby={`shop-shelf-trigger-${slug}`}
          className="shop-shelf-panel"
        >
          {items.length === 0 ? (
            <p className="muted shop-shelf-empty">No items in this shelf yet.</p>
          ) : (
            <ul className="shop-items-grid">
              {items.map((item) => {
                const dailyBlocked = dailyBlockedIds.has(item.id)
                const catalogLocked = item.is_locked
                const price = item.price_gold
                const canAfford = price != null && gold >= price
                const busy = buyingKey === item.item_key
                const canBuy = !catalogLocked && price != null && canAfford && !dailyBlocked

                return (
                  <GameShopCard
                    key={item.id}
                    layout="bench"
                    item={item}
                    shelfAccent={accent}
                    catalogLocked={catalogLocked}
                    dailyBlocked={dailyBlocked}
                    canAfford={canAfford}
                    canBuy={canBuy}
                    busy={busy}
                    isSupabaseConfigured={isSupabaseConfigured}
                    catalogLoading={catalogLoading}
                    onBuy={onBuy}
                  />
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}
