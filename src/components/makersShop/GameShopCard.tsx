/*
 * Single catalog card in Supply — trading-post (legacy) or bench tile (compact grid).
 */

import type { ShopCatalogItem } from '../../types/shopCatalog'
import { ShopAccordion } from './ShopAccordion'
import { ShopItemGlyph } from './ShopItemGlyph'
import { iconVariantForItemKey } from './shopDisplay'

type GameShopCardProps = {
  layout?: 'legacy' | 'bench'
  item: ShopCatalogItem
  shelfAccent: 'forge' | 'prism' | 'folded'
  catalogLocked: boolean
  dailyBlocked: boolean
  canAfford: boolean
  canBuy: boolean
  busy: boolean
  isSupabaseConfigured: boolean
  catalogLoading: boolean
  onBuy: (item: ShopCatalogItem) => void
}

function PurchaseButton({
  layout,
  item,
  catalogLocked,
  dailyBlocked,
  canAfford,
  canBuy,
  busy,
  isSupabaseConfigured,
  catalogLoading,
  onBuy,
}: Pick<
  GameShopCardProps,
  | 'layout'
  | 'item'
  | 'catalogLocked'
  | 'dailyBlocked'
  | 'canAfford'
  | 'canBuy'
  | 'busy'
  | 'isSupabaseConfigured'
  | 'catalogLoading'
  | 'onBuy'
>) {
  const bench = layout === 'bench'

  return (
    <div className={bench ? 'shop-item__actions' : 'makers-shop-card__actions'}>
      <button
        type="button"
        className={
          bench
            ? `btn-secondary shop-item__buy${canBuy ? ' shop-item__buy--ready' : ''}`
            : `makers-shop-buy${canBuy ? ' makers-shop-buy--hot' : ''}`
        }
        disabled={!isSupabaseConfigured || catalogLocked || !canBuy || busy || catalogLoading}
        onClick={() => onBuy(item)}
      >
        {busy ? (
          'Trading…'
        ) : catalogLocked ? (
          'Sealed'
        ) : dailyBlocked ? (
          'Back tomorrow'
        ) : canAfford ? (
          'Trade'
        ) : (
          <>
            Insufficient <span className="gold-currency-text">gold</span>
          </>
        )}
      </button>
    </div>
  )
}

function BenchShopCard(props: GameShopCardProps) {
  const {
    item,
    shelfAccent,
    catalogLocked,
    dailyBlocked,
    canAfford,
    canBuy,
    busy,
    isSupabaseConfigured,
    catalogLoading,
    onBuy,
  } = props
  const price = item.price_gold
  const variant = catalogLocked ? 'mystery' : iconVariantForItemKey(item.item_key)
  const hasFlavor = Boolean(item.flavor_text?.trim())

  const purchaseProps = {
    layout: 'bench' as const,
    item,
    catalogLocked,
    dailyBlocked,
    canAfford,
    canBuy,
    busy,
    isSupabaseConfigured,
    catalogLoading,
    onBuy,
  }

  return (
    <li
      className={`shop-item card shop-item--${shelfAccent}${
        catalogLocked ? ' shop-item--locked' : ''
      }${canBuy ? ' shop-item--ready' : ''}`}
    >
      <div className="shop-item__head">
        <div className="shop-item__glyph-wrap" aria-hidden>
          <ShopItemGlyph variant={variant} className="shop-item-glyph" />
        </div>
        <div className="shop-item__main">
          <h3 className="shop-item__title">{item.name}</h3>
          <p className="shop-item__desc muted">{item.description}</p>
          {hasFlavor ? (
            <p className="shop-item__flavor muted">
              <em>{item.flavor_text}</em>
            </p>
          ) : null}
        </div>
      </div>
      <div className="shop-item__foot">
        {catalogLocked ? (
          <span className="shop-item__price shop-item__price--locked">Sealed</span>
        ) : (
          <span className="shop-item__price">
            <span className="shop-item__price-value">{price}</span>{' '}
            <span className="gold-currency-text">gold</span>
          </span>
        )}
        <PurchaseButton {...purchaseProps} />
      </div>
      {dailyBlocked && !catalogLocked ? (
        <p className="shop-item__note muted">Already purchased today.</p>
      ) : null}
    </li>
  )
}

function LegacyShopCard(props: GameShopCardProps) {
  const {
    item,
    shelfAccent,
    catalogLocked,
    dailyBlocked,
    canAfford,
    canBuy,
    busy,
    isSupabaseConfigured,
    catalogLoading,
    onBuy,
  } = props
  const price = item.price_gold
  const variant = catalogLocked ? 'mystery' : iconVariantForItemKey(item.item_key)
  const purchaseBlocked = !catalogLocked && price != null && (!canAfford || dailyBlocked)
  const hasFlavor = Boolean(item.flavor_text?.trim())

  const cardMods = [
    'makers-shop-card',
    `makers-shop-card--accent-${shelfAccent}`,
    catalogLocked ? 'makers-shop-card--mystery' : '',
    purchaseBlocked ? 'makers-shop-card--soft-lock' : '',
    canBuy ? 'makers-shop-card--ready' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const titleMods = [
    'makers-shop-card__title',
    catalogLocked ? 'makers-shop-card__title--mystery' : '',
    canBuy ? 'makers-shop-card__title--ready' : '',
    !catalogLocked && !canBuy && !canAfford ? 'makers-shop-card__title--low' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const purchaseProps = {
    layout: 'legacy' as const,
    item,
    catalogLocked,
    dailyBlocked,
    canAfford,
    canBuy,
    busy,
    isSupabaseConfigured,
    catalogLoading,
    onBuy,
  }

  return (
    <li className={cardMods}>
      <div className="makers-shop-card__frame">
        <div className="makers-shop-card__rail" aria-hidden />
        <h3 className={titleMods}>{item.name}</h3>
        <p className="makers-shop-card__desc">{item.description}</p>

        <div className="makers-shop-card__summary">
          <div className="makers-shop-card__icon-row" aria-hidden="true">
            <div className="makers-shop-card__icon-wrap">
              <ShopItemGlyph variant={variant} />
            </div>
          </div>

          <div className="makers-shop-card__price-row" aria-live="polite">
            {catalogLocked ? (
              <span className="makers-shop-card__price makers-shop-card__price--locked">Sealed</span>
            ) : (
              <>
                <span className="makers-shop-card__coin" aria-hidden />
                <span className="makers-shop-card__price">{price}</span>
                <span className="makers-shop-card__price-unit">gold</span>
              </>
            )}
          </div>

          {dailyBlocked && !catalogLocked ? (
            <p className="makers-shop-card__inline-note">Already purchased today.</p>
          ) : null}
        </div>

        {hasFlavor ? (
          <ShopAccordion
            title="Lore & trade"
            icon={<span className="makers-shop-mini-dot" aria-hidden />}
            className="makers-shop-card__accordion"
            defaultOpen={false}
          >
            <div className="makers-shop-card__purchase-panel">
              <p className="makers-shop-card__flavor">
                <em>{item.flavor_text}</em>
              </p>
              <PurchaseButton {...purchaseProps} />
            </div>
          </ShopAccordion>
        ) : (
          <PurchaseButton {...purchaseProps} />
        )}
      </div>
    </li>
  )
}

export function GameShopCard(props: GameShopCardProps) {
  if (props.layout === 'bench') return <BenchShopCard {...props} />
  return <LegacyShopCard {...props} />
}
