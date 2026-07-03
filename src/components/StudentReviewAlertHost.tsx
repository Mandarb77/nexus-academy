/*
 * Global student toast when a teacher approves plan, checklist, shop, or redemption.
 */

import { useEffect, useState } from 'react'
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

export function StudentReviewAlertHost() {
  const { user, profile, studentPreviewMode } = useAuth()
  const [toast, setToast] = useState<StudentReviewAlert | null>(() => peekStudentReviewAlert())

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
    if (p) setToast(p)
  }, [user?.id])

  if (!user?.id) return null
  if (isTeacherProfile(profile) && !studentPreviewMode) return null
  if (!toast) return null

  return (
    <StudentReviewBanner
      message={toast.message}
      onDismiss={() => {
        clearStudentReviewAlertAfterDismiss(toast.alertId)
        setToast(null)
      }}
    />
  )
}
