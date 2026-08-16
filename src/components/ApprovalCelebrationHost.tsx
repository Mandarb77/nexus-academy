/*
 * Global mount for the patent-approved chickadee banner (plus WP/gold amounts)
 *
 * Sits once under `AuthProvider` in `App.tsx` so any student route can show the toast
 * without each page subscribing to Realtime. Registers `setApprovalCelebrationNotifier`
 * so `queueApprovalCelebration` can update React immediately when the websocket fires.
 * Re-reads `localStorage` on `user?.id` change so account switches do not leak another
 * student’s pending celebration. Refresh does not replay a banner already shown in this
 * browser. Teachers (unless in student preview) never see this
 * UI — avoids confusing staff with student reward language.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { FinalApprovalBanner } from './FinalApprovalBanner'
import {
  clearPendingCelebrationAfterDismiss,
  hasShownApprovalCelebration,
  markApprovalCelebrationShown,
  peekPendingCelebration,
  setApprovalCelebrationNotifier,
  type PendingApprovalCelebration,
} from '../lib/approvalCelebration'
import { preferredFirstNameForVoice } from '../lib/preferredFirstName'
import { isTeacherProfile } from '../lib/teacher'

export function ApprovalCelebrationHost() {
  const { user, profile, studentPreviewMode } = useAuth()
  const [toast, setToast] = useState<PendingApprovalCelebration | null>(() => {
    const p = peekPendingCelebration()
    if (!p) return null
    /* Refresh must not resurrect a notice the student already saw. */
    if (hasShownApprovalCelebration(p.completionId)) {
      clearPendingCelebrationAfterDismiss(p.completionId)
      return null
    }
    markApprovalCelebrationShown(p.completionId)
    return p
  })

  useEffect(() => {
    setApprovalCelebrationNotifier(setToast)
    return () => {
      setApprovalCelebrationNotifier(null)
    }
  }, [])

  useEffect(() => {
    const p = peekPendingCelebration()
    if (!p) return
    if (hasShownApprovalCelebration(p.completionId)) {
      clearPendingCelebrationAfterDismiss(p.completionId)
      return
    }
    markApprovalCelebrationShown(p.completionId)
    setToast(p)
  }, [user?.id])

  if (!user?.id) return null
  if (isTeacherProfile(profile) && !studentPreviewMode) return null
  if (!toast) return null

  return (
    <FinalApprovalBanner
      studentName={preferredFirstNameForVoice(profile)}
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
