/*
 * Realtime: refresh teacher pending snapshot when students submit for approval.
 */

import { useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchTeacherPendingSnapshot } from '../lib/fetchTeacherPendingSnapshot'
import { applyTeacherPendingSnapshot } from '../lib/teacherPendingSnapshot'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function TeacherSubmissionAlertSync() {
  const { user, profile, studentPreviewMode } = useAuth()
  const isTeacher = profile?.role === 'teacher'

  const refresh = useCallback(async () => {
    const items = await fetchTeacherPendingSnapshot()
    applyTeacherPendingSnapshot(items)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    if (!isTeacher || studentPreviewMode) return

    void refresh()

    const channel = supabase
      .channel(`teacher-submission-alert-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patents' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patents' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'skill_completions' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'skill_completions' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'redemption_requests' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'redemption_requests' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shop_purchase_requests' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shop_purchase_requests' }, () => {
        void refresh()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, isTeacher, studentPreviewMode, refresh])

  return null
}
