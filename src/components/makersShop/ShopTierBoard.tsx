import type { ShopCatalogItem, ShopTierEmbed } from '../../types/shopCatalog'
import { GameShopCard } from './GameShopCard'
import { ShopAccordion } from './ShopAccordion'
import { displayShelfTitle, rarityForShelfItem } from './shopDisplay'

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
  const hasDailyLimited = items.some((i) => (i.max_purchases_per_chicago_school_day ?? 0) >= 1)

  return (
    <section className="makers-shop-board" aria-labelledby={`makers-shelf-${tier.id}`}>
      <div className="makers-shop-board__header">
        <div>
          <h2 id={`makers-shelf-${tier.id}`} className="makers-shop-board__title">
            {shelfTitle}
          </h2>
          <p className="makers-shop-board__subtitle">{tier.subtitle}</p>
        </div>
        <div className="makers-shop-board__badge" aria-hidden>
          {tier.name}
        </div>
      </div>

      <ul className="makers-shop-board__grid">
        {items.map((item) => {
          const dailyBlocked = dailyBlockedIds.has(item.id)
          const catalogLocked = item.is_locked
          const price = item.price_gold
          const canAfford = price != null && gold >= price
          const busy = buyingKey === item.item_key
          const canBuy = !catalogLocked && price != null && canAfford && !dailyBlocked
          const rarity = rarityForShelfItem(tier.name, item.display_order ?? 0)

          return (
            <GameShopCard
              key={item.id}
              item={item}
              rarity={rarity}
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
        <ShopAccordion title="Why this shelf exists" defaultOpen={false}>
          <div className="makers-shop-prose">
            <p>
              <strong>{shelfTitle}</strong> groups listings themed as <em>{tier.name}</em> in our economy. Prices and
              locks still come from the live catalog—this label is here to make browsing feel like a real game shop.
            </p>
            <p>{tier.subtitle}</p>
          </div>
        </ShopAccordion>
        <ShopAccordion title="Rules, teacher approval & fine print" defaultOpen={false}>
          <div className="makers-shop-prose">
            <ul>
              <li>Buying spends your gold immediately when the server accepts the purchase.</li>
              <li>Inventory is the source of truth for what you own—redeem with your teacher’s process.</li>
              <li>
                {hasDailyLimited
                  ? 'Some listings on this shelf include a Chicago school-day purchase cap; check each card’s accordion for specifics.'
                  : 'This shelf has no automatic daily caps on the listings shown (teacher discretion still applies).'}
              </li>
              <li>Locked “Legendary” previews are visible on purpose—unlock conditions arrive when your guild masters say so.</li>
            </ul>
          </div>
        </ShopAccordion>
      </div>
    </section>
  )
}
