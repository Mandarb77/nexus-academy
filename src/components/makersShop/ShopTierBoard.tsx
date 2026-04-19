import type { ShopCatalogItem, ShopTierEmbed } from '../../types/shopCatalog'
import { GameShopCard } from './GameShopCard'
import { ShopAccordion } from './ShopAccordion'
import { displayShelfTitle, shelfAccentForTier } from './shopDisplay'

type TierGroup = { tier: ShopTierEmbed; items: ShopCatalogItem[] }

type Props = {
  group: TierGroup
  gold: number
  buyingKey: string | null
  dailyBlockedIds: Set<string>
  isSupabaseConfigured: boolean
  catalogLoading: boolean
  onBuy: (item: ShopCatalogItem) => void
}

export function ShopTierBoard({
  group,
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
  const hasDailyLimited = items.some((i) => (i.max_purchases_per_chicago_school_day ?? 0) >= 1)

  return (
    <section
      className={`makers-shop-board makers-shop-board--${accent}`}
      aria-labelledby={`makers-shelf-${tier.id}`}
    >
      <div className="makers-shop-board__header">
        <h2 id={`makers-shelf-${tier.id}`} className="makers-shop-board__title">
          {shelfTitle}
        </h2>
        <p className="makers-shop-board__subtitle">{tier.subtitle}</p>
      </div>

      <ul className="makers-shop-board__grid">
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

      <div className="makers-shop-board__accordions">
        <ShopAccordion title="Shelf intent" defaultOpen={false}>
          <div className="makers-shop-prose">
            <p>
              <strong>{shelfTitle}</strong> is only a reading frame: costs and locks still come from the live catalog.
              Think months, not minutes—use this view to plan commitments across the season.
            </p>
            <p>{tier.subtitle}</p>
          </div>
        </ShopAccordion>
        <ShopAccordion title="Table rules" defaultOpen={false}>
          <div className="makers-shop-prose">
            <ul>
              <li>Gold leaves your profile the moment the server accepts a purchase.</li>
              <li>Inventory is the canonical record of what you own; redemption follows your facilitator’s process.</li>
              <li>
                {hasDailyLimited
                  ? 'Some listings reset once per New York calendar day. If you hit the cap, you already purchased today on that clock.'
                  : 'No automatic daily cap is configured for the listings shown here.'}
              </li>
              <li>Sealed rows are visible on purpose: they are long-arc unlocks, not bugs.</li>
            </ul>
          </div>
        </ShopAccordion>
      </div>
    </section>
  )
}
