import type { ShopCatalogItem, ShopTierEmbed } from '../../types/shopCatalog'
import { GameShopCard } from './GameShopCard'
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
    </section>
  )
}
