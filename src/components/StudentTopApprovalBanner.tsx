import { useEffect, useState } from 'react'
import { FinalApprovalBanner } from './FinalApprovalBanner'
import {
  APPROVAL_CELEBRATION_EVENT,
  clearPendingCelebrationAfterDismiss,
  peekPendingCelebration,
  type PendingApprovalCelebration,
} from '../lib/approvalCelebration'

type Props = {
  /** `fixed` = overlay on any route (global). `pageTop` = in-flow under nav (legacy pages). */
  placement?: 'pageTop' | 'fixed'
}

/**
 * Celebration after final quest approval (WP/gold awarded). Pending state is set by
 * {@link ApprovalCelebrationSync} when `skill_completions` reaches `approved` with awards.
 */
export function StudentTopApprovalBanner({ placement = 'pageTop' }: Props) {
  const [toast, setToast] = useState<PendingApprovalCelebration | null>(null)

  useEffect(() => {
    const applyPending = () => {
      const p = peekPendingCelebration()
      if (p) setToast(p)
    }

    applyPending()

    const onEvent = () => applyPending()
    window.addEventListener(APPROVAL_CELEBRATION_EVENT, onEvent)
    return () => window.removeEventListener(APPROVAL_CELEBRATION_EVENT, onEvent)
  }, [])

  if (!toast) return null

  return (
    <FinalApprovalBanner
      placement={placement}
      wp={toast.wp}
      gold={toast.gold}
      onDismiss={() => {
        clearPendingCelebrationAfterDismiss(toast.completionId)
        setToast(null)
      }}
    />
  )
}
