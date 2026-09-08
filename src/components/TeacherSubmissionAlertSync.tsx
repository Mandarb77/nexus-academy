/*
 * Realtime: refresh teacher pending snapshot when students submit for approval.
 *
 * Do not run on `/cleanup` kiosk routes. Do not refetch on every patents checkbox
 * UPDATE — those events are coalesced so class-hour Realtime cannot 504 Auth.
 */

import { useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchTeacherPendingSnapshot } from '../lib/fetchTeacherPendingSnapshot'
import { applyTeacherPendingSnapshot } from '../lib/teacherPendingSnapshot'
import { scheduleTeacherPendingRefresh } from '../lib/teacherPendingRefresh'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function TeacherSubmissionAlertSync() {
  const { user, profile, studentPreviewMode } = useAuth()
  const { pathname } = useLocation()
  const isTeacher = profile?.role === 'teacher'
  const onCleanupKiosk = pathname.startsWith('/cleanup')

  const refresh = useCallback(async () => {
    const items = await fetchTeacherPendingSnapshot()
    applyTeacherPendingSnapshot(items)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    if (!isTeacher || studentPreviewMode) return
    if (onCleanupKiosk) return

    scheduleTeacherPendingRefresh(refresh)

    const channel = supabase
      .channel(`teacher-submission-alert-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patents' }, () => {
        scheduleTeacherPendingRefresh(refresh)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patents' }, () => {
        scheduleTeacherPendingRefresh(refresh)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'skill_completions' }, () => {
        scheduleTeacherPendingRefresh(refresh)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'skill_completions' }, () => {
        scheduleTeacherPendingRefresh(refresh)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'redemption_requests' }, () => {
        scheduleTeacherPendingRefresh(refresh)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'redemption_requests' }, () => {
        scheduleTeacherPendingRefresh(refresh)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shop_purchase_requests' }, () => {
        scheduleTeacherPendingRefresh(refresh)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shop_purchase_requests' }, () => {
        scheduleTeacherPendingRefresh(refresh)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, isTeacher, studentPreviewMode, onCleanupKiosk, refresh])

  return null
}
