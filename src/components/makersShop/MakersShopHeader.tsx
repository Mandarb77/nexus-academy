type Props = {
  gold: number
  onSignOut: () => void
}

export function MakersShopHeader({ gold, onSignOut }: Props) {
  return (
    <header className="makers-shop-header">
      <div className="makers-shop-header__inner">
        <div className="makers-shop-header__brand">
          <p className="makers-shop-header__eyebrow">Season ledger</p>
          <h1 className="makers-shop-header__title">Workshop procurement</h1>
          <p className="makers-shop-header__tagline">
            Commitments that stretch across months: prices are the signal, inventory is the record, and your facilitator
            still runs redemption at the table.
          </p>
        </div>
        <div className="makers-shop-header__actions">
          <div className="makers-shop-purse" aria-live="polite">
            <span className="makers-shop-purse__label">Gold reserve</span>
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
