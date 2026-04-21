type Props = {
  gold: number
  onSignOut: () => void
}

export function MakersShopHeader({ gold, onSignOut }: Props) {
  return (
    <header className="makers-shop-header">
      <div className="makers-shop-header__inner">
        <div className="makers-shop-header__brand">
          <p className="makers-shop-header__eyebrow">Workshop</p>
          <h1 className="makers-shop-header__title">Trading post</h1>
        </div>
        <div className="makers-shop-header__actions">
          <div className="makers-shop-purse" aria-live="polite">
            <span className="makers-shop-purse__label">Gold</span>
            <span className="makers-shop-purse__value">{gold}</span>
          </div>
          <button type="button" className="makers-shop-signout" onClick={() => onSignOut()}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
