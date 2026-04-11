import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { FinalApprovalBanner } from './FinalApprovalBanner'
import {
  clearPendingCelebrationAfterDismiss,
  peekPendingCelebration,
  setApprovalCelebrationNotifier,
  type PendingApprovalCelebration,
} from '../lib/approvalCelebration'
import { isTeacherProfile } from '../lib/teacher'

/**
 * Renders the global “Quest Approved!” toast and registers a notifier so Realtime can
 * update React state immediately (same tick as the websocket message — no navigation/refresh).
 */
export function ApprovalCelebrationHost() {
  const { user, profile, studentPreviewMode } = useAuth()
  const [toast, setToast] = useState<PendingApprovalCelebration | null>(() => peekPendingCelebration())

  useEffect(() => {
    setApprovalCelebrationNotifier(setToast)
    return () => {
      setApprovalCelebrationNotifier(null)
    }
  }, [])

  useEffect(() => {
    const p = peekPendingCelebration()
    if (p) setToast(p)
  }, [user?.id])

  if (!user?.id) return null
  if (isTeacherProfile(profile) && !studentPreviewMode) return null
  if (!toast) return null

  return (
    <FinalApprovalBanner
      placement="fixed"
      wp={toast.wp}
      gold={toast.gold}
      onDismiss={() => {
        clearPendingCelebrationAfterDismiss(toast.completionId)
        setToast(null)
      }}
    />
  )
}
