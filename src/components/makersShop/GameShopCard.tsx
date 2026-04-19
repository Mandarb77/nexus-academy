import type { ShopCatalogItem } from '../../types/shopCatalog'
import { ShopAccordion } from './ShopAccordion'
import { ShopItemGlyph } from './ShopItemGlyph'
import { iconVariantForItemKey, type ShopRarity } from './shopDisplay'

type GameShopCardProps = {
  item: ShopCatalogItem
  rarity: ShopRarity
  catalogLocked: boolean
  dailyBlocked: boolean
  canAfford: boolean
  canBuy: boolean
  busy: boolean
  isSupabaseConfigured: boolean
  catalogLoading: boolean
  onBuy: (item: ShopCatalogItem) => void
}

const rarityClass: Record<ShopRarity, string> = {
  Common: 'makers-shop-rarity--common',
  Rare: 'makers-shop-rarity--rare',
  Epic: 'makers-shop-rarity--epic',
  Legendary: 'makers-shop-rarity--legendary',
}

export function GameShopCard({
  item,
  rarity,
  catalogLocked,
  dailyBlocked,
  canAfford,
  canBuy,
  busy,
  isSupabaseConfigured,
  catalogLoading,
  onBuy,
}: GameShopCardProps) {
  const price = item.price_gold
  const variant = catalogLocked ? 'mystery' : iconVariantForItemKey(item.item_key)
  const purchaseBlocked = !catalogLocked && price != null && (!canAfford || dailyBlocked)

  const cardMods = [
    'makers-shop-card',
    catalogLocked ? 'makers-shop-card--mystery' : '',
    purchaseBlocked ? 'makers-shop-card--soft-lock' : '',
    canBuy ? 'makers-shop-card--ready' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const titleMods = [
    'makers-shop-card__title',
    catalogLocked ? 'makers-shop-card__title--mystery' : '',
    canBuy ? 'makers-shop-card__title--spark' : '',
    !catalogLocked && !canBuy && !canAfford ? 'makers-shop-card__title--low' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={cardMods}>
      <div className="makers-shop-card__frame">
        <div className="makers-shop-card__shine" aria-hidden />
        <div className="makers-shop-card__top">
          <span className={`makers-shop-rarity ${rarityClass[rarity]}`}>{rarity}</span>
          <div className="makers-shop-card__icon-wrap">
            <ShopItemGlyph variant={variant} />
          </div>
        </div>
        <h3 className={titleMods}>{item.name}</h3>
        <p className="makers-shop-card__tagline">
          {item.flavor_text?.trim() || item.description.slice(0, 96)}
          {item.flavor_text?.trim() ? '' : item.description.length > 96 ? '…' : ''}
        </p>

        <div className="makers-shop-card__price-row" aria-live="polite">
          {catalogLocked ? (
            <span className="makers-shop-card__price makers-shop-card__price--locked">Mystery lock</span>
          ) : (
            <>
              <span className="makers-shop-card__coin" aria-hidden />
              <span className="makers-shop-card__price">{price}</span>
              <span className="makers-shop-card__price-unit">gold</span>
            </>
          )}
        </div>

        {dailyBlocked && !catalogLocked ? (
          <p className="makers-shop-card__inline-note">Already claimed for today’s class day (Chicago).</p>
        ) : null}

        <ShopAccordion
          title="Details, rules & eligibility"
          icon={<span className="makers-shop-mini-dot" aria-hidden />}
          className="makers-shop-card__accordion"
        >
          <div className="makers-shop-prose">
            <p className="makers-shop-prose__lead">{item.description}</p>
            {item.flavor_text?.trim() ? (
              <p>
                <em>{item.flavor_text}</em>
              </p>
            ) : null}
            {item.rank_requirement ? (
              <p>
                <strong>Rank required:</strong> {item.rank_requirement}
              </p>
            ) : (
              <p>
                <strong>Eligibility:</strong> Open to enrolled workshop students unless your teacher posts an exception.
              </p>
            )}
            {(item.max_purchases_per_chicago_school_day ?? 0) >= 1 ? (
              <p>
                <strong>Cooldown / limit:</strong> At most {item.max_purchases_per_chicago_school_day} purchase per
                Chicago school day for this listing (matches class-day pacing).
              </p>
            ) : (
              <p>
                <strong>Cooldown / limit:</strong> No automatic daily cap on this listing (teacher rules still apply in
                class).
              </p>
            )}
            <p>
              <strong>Redemption:</strong> Successful buys land in your Inventory. Your teacher approves when you
              redeem—bring good documentation and workshop citizenship.
            </p>
          </div>
        </ShopAccordion>

        <div className="makers-shop-card__actions">
          <button
            type="button"
            className={`makers-shop-buy${canBuy ? ' makers-shop-buy--hot' : ''}`}
            disabled={!isSupabaseConfigured || catalogLocked || !canBuy || busy || catalogLoading}
            onClick={() => onBuy(item)}
          >
            {busy ? (
              'Processing…'
            ) : catalogLocked ? (
              'Locked'
            ) : dailyBlocked ? (
              'Come back next class day'
            ) : canAfford ? (
              'Purchase'
            ) : (
              <>
                Need more <span className="gold-currency-text">gold</span>
              </>
            )}
          </button>
        </div>
      </div>
    </li>
  )
}
