type Props = {
  wp: number
  gold: number
  onDismiss: () => void
  /** `pageTop` = in document flow under the nav (home / skill tree). Default = fixed overlay. */
  placement?: 'fixed' | 'pageTop'
}

export function FinalApprovalBanner({ wp, gold, onDismiss, placement = 'fixed' }: Props) {
  return (
    <div
      className={`final-approval-banner${placement === 'pageTop' ? ' final-approval-banner--page-top' : ''}`}
      role="status"
      aria-live="assertive"
    >
      <p className="final-approval-banner__title">🎉 Quest Approved!</p>
      <div className="final-approval-banner__rewards">
        <div className="final-approval-banner__reward final-approval-banner__wp">
          <span className="final-approval-banner__reward-amount">+{wp}</span>
          <span className="final-approval-banner__reward-label">Workshop Points</span>
        </div>
        <div className="final-approval-banner__reward final-approval-banner__gold">
          <span className="final-approval-banner__reward-amount">+{gold}</span>
          <span className="final-approval-banner__reward-label">Gold</span>
        </div>
      </div>
      <button
        type="button"
        className="final-approval-banner__dismiss"
        onClick={onDismiss}
      >
        Awesome! ✕
      </button>
    </div>
  )
}
