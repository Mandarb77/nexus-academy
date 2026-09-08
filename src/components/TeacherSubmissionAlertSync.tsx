/*
 * Teacher pending chime snapshot — only when the approvals panel is not mounted.
 *
 * `/teacher` `loadPending` already writes the same snapshot. A second Realtime
 * channel + six REST queries on the same path was a class-hour stampede.
 */

import { useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchTeacherPendingSnapshot } from '../lib/fetchTeacherPendingSnapshot'
import { applyTeacherPendingSnapshot } from '../lib/teacherPendingSnapshot'
import {
  isPendingQueueTransition,
  registerTeacherPendingRefresh,
  scheduleTeacherPendingRefresh,
} from '../lib/teacherPendingRefresh'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const POLL_MS = 30_000

export function TeacherSubmissionAlertSync() {
  const { user, profile, studentPreviewMode } = useAuth()
  const { pathname } = useLocation()
  const isTeacher = profile?.role === 'teacher'
  const onTeacherTree = pathname.startsWith('/teacher')
  const onApprovalsPanel = pathname === '/teacher'

  const refresh = useCallback(async () => {
    const items = await fetchTeacherPendingSnapshot()
    applyTeacherPendingSnapshot(items)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    if (!isTeacher || studentPreviewMode) return
    if (!onTeacherTree || onApprovalsPanel) return

    const unreg = registerTeacherPendingRefresh(refresh)
    scheduleTeacherPendingRefresh()

    const poll = window.setInterval(() => {
      scheduleTeacherPendingRefresh()
    }, POLL_MS)

    const channel = supabase
      .channel(`teacher-submission-alert-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patents' }, () => {
        scheduleTeacherPendingRefresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'skill_completions' }, () => {
        scheduleTeacherPendingRefresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'skill_completions' }, (payload) => {
        if (!isPendingQueueTransition((payload.old ?? {}) as Record<string, unknown>, (payload.new ?? {}) as Record<string, unknown>)) {
          return
        }
        scheduleTeacherPendingRefresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'redemption_requests' }, () => {
        scheduleTeacherPendingRefresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'redemption_requests' }, (payload) => {
        if (!isPendingQueueTransition((payload.old ?? {}) as Record<string, unknown>, (payload.new ?? {}) as Record<string, unknown>)) {
          return
        }
        scheduleTeacherPendingRefresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shop_purchase_requests' }, () => {
        scheduleTeacherPendingRefresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shop_purchase_requests' }, (payload) => {
        if (!isPendingQueueTransition((payload.old ?? {}) as Record<string, unknown>, (payload.new ?? {}) as Record<string, unknown>)) {
          return
        }
        scheduleTeacherPendingRefresh()
      })
      .subscribe()

    return () => {
      unreg()
      window.clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [user?.id, isTeacher, studentPreviewMode, onTeacherTree, onApprovalsPanel, refresh])

  return null
}
