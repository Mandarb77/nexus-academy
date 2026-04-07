import { useEffect, useState } from 'react'
import { FinalApprovalBanner } from './FinalApprovalBanner'
import {
  APPROVAL_CELEBRATION_EVENT,
  clearPendingCelebrationAfterDismiss,
  peekPendingCelebration,
  type PendingApprovalCelebration,
} from '../lib/approvalCelebration'

/**
 * Top-of-page celebration after a quest is approved. Shows on student home and main skill tree.
 * Pending state is set by ApprovalCelebrationSync (Realtime) or patent pages when the student is online.
 */
export function StudentTopApprovalBanner() {
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
      placement="pageTop"
      wp={toast.wp}
      gold={toast.gold}
      onDismiss={() => {
        clearPendingCelebrationAfterDismiss(toast.completionId)
        setToast(null)
      }}
    />
  )
}
