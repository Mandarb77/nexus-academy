/*
 * One tier shelf in Supply — guild-style tile + expandable item grid (Convenience / Craft / Legacy).
 */

import type { ShopCatalogItem, ShopStockStatus, ShopTierEmbed } from '../../types/shopCatalog'
import conveniencesSign from '../../assets/conveniences-sign.png'
import craftSign from '../../assets/craft-sign.png'
import legacySign from '../../assets/legacy-sign.png'
import { GameShopCard } from './GameShopCard'
import { displayShelfTitle, shelfAccentForTier, tierShortDescription, tierSlugId } from './shopDisplay'

type TierGroup = { tier: ShopTierEmbed; items: ShopCatalogItem[] }

type Props = {
  group: TierGroup
  open: boolean
  onToggle: () => void
  gold: number
  buyingKey: string | null
  dailyBlockedIds: Set<string>
  stockByItemId: Map<string, ShopStockStatus>
  isSupabaseConfigured: boolean
  catalogLoading: boolean
  tradedKey: string | null
  toast: { kind: 'success' | 'error'; itemKey: string; message: string; detail?: string } | null
  onDismissToast: () => void
  onBuy: (item: ShopCatalogItem) => void
}

function signImageForTier(tierName: string): string {
  // These are hand-painted shelf signs; avoid text overlays so the asset is the header.
  const n = tierName.trim().toLowerCase()
  if (n === 'convenience') return conveniencesSign
  if (n === 'craft') return craftSign
  return legacySign
}

export function ShopTierBoard({
  group,
  open,
  onToggle,
  gold,
  buyingKey,
  dailyBlockedIds,
  stockByItemId,
  isSupabaseConfigured,
  catalogLoading,
  tradedKey,
  toast,
  onDismissToast,
  onBuy,
}: Props) {
  const { tier, items } = group
  const shelfTitle = displayShelfTitle(tier.name)
  const accent = shelfAccentForTier(tier.name)
  const slug = tierSlugId(tier.name)
  const signSrc = signImageForTier(tier.name)
  const desc = tierShortDescription(tier.name, tier.subtitle)

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
          <h2 id={`shop-shelf-${slug}`} className="visually-hidden">
            {shelfTitle}
          </h2>
          <img className="shop-shelf-sign" src={signSrc} alt={`${shelfTitle} shelf`} />
          <p className="shop-shelf-desc">{desc}</p>
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
                const stock = stockByItemId.get(item.id)
                const outOfStock = stock?.limited === true && (stock.remaining ?? 0) <= 0
                const price = item.price_gold
                const canAfford = price != null && gold >= price
                const busy = buyingKey === item.item_key
                const canBuy =
                  !catalogLocked && price != null && canAfford && !dailyBlocked && !outOfStock
                // Only the item that triggered the transaction should show the confirmation.
                const itemToast = toast?.itemKey === item.item_key ? toast : null

                return (
                  <GameShopCard
                    key={item.id}
                    layout="bench"
                    item={item}
                    shelfAccent={accent}
                    catalogLocked={catalogLocked}
                    dailyBlocked={dailyBlocked}
                    stockStatus={stock}
                    canAfford={canAfford}
                    canBuy={canBuy}
                    busy={busy}
                    traded={tradedKey === item.item_key}
                    toast={itemToast}
                    onDismissToast={onDismissToast}
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
