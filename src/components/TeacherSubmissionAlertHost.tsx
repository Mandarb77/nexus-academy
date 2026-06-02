/*
 * Global teacher toast when a new student submission needs approval.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { TeacherSubmissionBanner } from './TeacherSubmissionBanner'
import {
  clearTeacherSubmissionAlertAfterDismiss,
  peekTeacherSubmissionAlert,
  setTeacherSubmissionAlertNotifier,
  type TeacherSubmissionToast,
} from '../lib/teacherSubmissionAlert'
import { isTeacherProfile } from '../lib/teacher'

export function TeacherSubmissionAlertHost() {
  const { user, profile, studentPreviewMode } = useAuth()
  const [toast, setToast] = useState<TeacherSubmissionToast | null>(() => peekTeacherSubmissionAlert())

  useEffect(() => {
    setTeacherSubmissionAlertNotifier(setToast)
    return () => {
      setTeacherSubmissionAlertNotifier(null)
    }
  }, [])

  useEffect(() => {
    const p = peekTeacherSubmissionAlert()
    if (p) setToast(p)
  }, [user?.id])

  if (!user?.id) return null
  if (!isTeacherProfile(profile) || studentPreviewMode) return null
  if (!toast) return null

  return (
    <TeacherSubmissionBanner
      message={toast.message}
      onDismiss={() => {
        clearTeacherSubmissionAlertAfterDismiss(toast.alertIds)
        setToast(null)
      }}
    />
  )
}
