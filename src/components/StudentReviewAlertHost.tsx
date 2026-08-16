/*
 * Global student chickadee toast when a teacher approves or returns plan, checklist,
 * shop, redemption, or duty. Final packet approve uses ApprovalCelebrationHost.
 */

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { StudentReviewBanner } from './StudentReviewBanner'
import {
  clearStudentReviewAlertAfterDismiss,
  peekStudentReviewAlert,
  setStudentReviewAlertNotifier,
  STUDENT_REVIEW_ALERT_EVENT,
  type StudentReviewAlert,
} from '../lib/studentReviewAlert'
import { isTeacherProfile } from '../lib/teacher'

function isQuestSendBackHref(href: string): boolean {
  return href.startsWith('/patent-') || href.startsWith('/tree/')
}

export function StudentReviewAlertHost() {
  const { user, profile, studentPreviewMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const navigatedAlertIdRef = useRef<string | null>(null)
  const [toast, setToast] = useState<StudentReviewAlert | null>(() => {
    const p = peekStudentReviewAlert()
    if (p) clearStudentReviewAlertAfterDismiss(p.alertId)
    return p
  })

  useEffect(() => {
    setStudentReviewAlertNotifier(setToast)
    return () => {
      setStudentReviewAlertNotifier(null)
    }
  }, [])

  useEffect(() => {
    const sync = () => {
      const p = peekStudentReviewAlert()
      if (p) setToast(p)
    }
    window.addEventListener(STUDENT_REVIEW_ALERT_EVENT, sync)
    return () => {
      window.removeEventListener(STUDENT_REVIEW_ALERT_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    const p = peekStudentReviewAlert()
    if (p) {
      clearStudentReviewAlertAfterDismiss(p.alertId)
      setToast(p)
    }
  }, [user?.id])

  useEffect(() => {
    if (!toast || toast.tone !== 'denied' || !toast.continueHref) {
      if (!toast) navigatedAlertIdRef.current = null
      return
    }
    if (!isQuestSendBackHref(toast.continueHref)) return
    if (navigatedAlertIdRef.current === toast.alertId) return
    const here = `${location.pathname}${location.search}`
    if (here === toast.continueHref) {
      navigatedAlertIdRef.current = toast.alertId
      return
    }
    navigatedAlertIdRef.current = toast.alertId
    navigate(toast.continueHref)
  }, [toast, location.pathname, location.search, navigate])

  if (!user?.id) return null
  if (isTeacherProfile(profile) && !studentPreviewMode) return null
  if (!toast) return null

  return (
    <StudentReviewBanner
      message={toast.message}
      tone={toast.tone}
      continueHref={toast.continueHref}
      continueLabel={toast.continueLabel}
      onDismiss={() => {
        clearStudentReviewAlertAfterDismiss(toast.alertId)
        setToast(null)
      }}
    />
  )
}
