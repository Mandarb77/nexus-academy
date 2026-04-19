import type { ShopCatalogItem } from '../../types/shopCatalog'
import { ShopAccordion } from './ShopAccordion'
import { ShopItemGlyph } from './ShopItemGlyph'
import { iconVariantForItemKey } from './shopDisplay'

type GameShopCardProps = {
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

export function GameShopCard({
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
}: GameShopCardProps) {
  const price = item.price_gold
  const variant = catalogLocked ? 'mystery' : iconVariantForItemKey(item.item_key)
  const purchaseBlocked = !catalogLocked && price != null && (!canAfford || dailyBlocked)

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

  return (
    <li className={cardMods}>
      <div className="makers-shop-card__frame">
        <div className="makers-shop-card__rail" aria-hidden />
        <h3 className={titleMods}>{item.name}</h3>
        <p className="makers-shop-card__desc">{item.description}</p>

        <ShopAccordion
          title="Price, eligibility & purchase"
          icon={<span className="makers-shop-mini-dot" aria-hidden />}
          className="makers-shop-card__accordion"
          defaultOpen={false}
        >
          <div className="makers-shop-card__purchase-panel">
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

            <div className="makers-shop-prose makers-shop-prose--in-accordion">
              {item.flavor_text?.trim() ? (
                <p className="makers-shop-prose__lead">
                  <em>{item.flavor_text}</em>
                </p>
              ) : null}
              {item.rank_requirement ? (
                <p>
                  <strong>Rank gate:</strong> {item.rank_requirement}
                </p>
              ) : (
                <p>
                  <strong>Eligibility:</strong> Enrolled students unless your facilitator posts a narrower rule.
                </p>
              )}
              {(item.max_purchases_per_chicago_school_day ?? 0) >= 1 ? (
                <p>
                  <strong>Daily limit:</strong> At most {item.max_purchases_per_chicago_school_day} purchase per New
                  York calendar day for this listing. “Today” follows that clock.
                </p>
              ) : (
                <p>
                  <strong>Daily limit:</strong> None enforced by the system for this listing; facilitator discretion
                  still applies in session.
                </p>
              )}
              <p>
                <strong>Ledger:</strong> Successful purchases debit gold immediately and add a row to Inventory.
                Redemption is a separate step with your facilitator.
              </p>
            </div>

            <div className="makers-shop-card__actions">
              <button
                type="button"
                className={`makers-shop-buy${canBuy ? ' makers-shop-buy--hot' : ''}`}
                disabled={!isSupabaseConfigured || catalogLocked || !canBuy || busy || catalogLoading}
                onClick={() => onBuy(item)}
              >
                {busy ? (
                  'Resolving…'
                ) : catalogLocked ? (
                  'Sealed'
                ) : dailyBlocked ? (
                  'Return tomorrow'
                ) : canAfford ? (
                  'Commit purchase'
                ) : (
                  <>
                    Insufficient <span className="gold-currency-text">gold</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </ShopAccordion>
      </div>
    </li>
  )
}
