import type { ShopCatalogItem } from '../../types/shopCatalog'

type Props = {
  gold: number
  onSignOut: () => void
  featuredItem: ShopCatalogItem | null
}

export function MakersShopHeader({ gold, onSignOut, featuredItem }: Props) {
  return (
    <header className="makers-shop-header">
      <div className="makers-shop-header__glow" aria-hidden />
      <div className="makers-shop-header__top">
        <div className="makers-shop-header__brand">
          <p className="makers-shop-header__eyebrow">
            <span className="makers-shop-header__chev" aria-hidden>
              ‹‹
            </span>
            Makers Class Economy
            <span className="makers-shop-header__chev" aria-hidden>
              ››
            </span>
          </p>
          <h1 className="makers-shop-header__title">Your In-Game Shoppe</h1>
          <p className="makers-shop-header__tagline">Your money&apos;s no good if you don&apos;t spend it.</p>
        </div>
        <div className="makers-shop-header__actions">
          <div className="makers-shop-purse" aria-live="polite">
            <span className="makers-shop-purse__label">Gold balance</span>
            <span className="makers-shop-purse__value">{gold}</span>
          </div>
          <button type="button" className="makers-shop-signout" onClick={() => onSignOut()}>
            Sign out
          </button>
        </div>
      </div>

      {featuredItem && featuredItem.price_gold != null && !featuredItem.is_locked ? (
        <div className="makers-shop-featured" role="region" aria-label="Featured listing">
          <div className="makers-shop-featured__ribbon">Featured</div>
          <div className="makers-shop-featured__body">
            <p className="makers-shop-featured__label">Today&apos;s spotlight</p>
            <p className="makers-shop-featured__name">{featuredItem.name}</p>
            <p className="makers-shop-featured__meta">
              From <strong>{featuredItem.price_gold}</strong> gold · scroll down to buy
            </p>
          </div>
        </div>
      ) : null}
    </header>
  )
}
