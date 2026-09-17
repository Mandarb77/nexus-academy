/*
 * Teacher pending chime snapshot — only when the approvals panel is not mounted.
 *
 * `/teacher` `loadPending` already writes the same snapshot on an 8s poll.
 */

import { useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchTeacherPendingSnapshot } from '../lib/fetchTeacherPendingSnapshot'
import { applyTeacherPendingSnapshot } from '../lib/teacherPendingSnapshot'
import {
  registerTeacherPendingRefresh,
  scheduleTeacherPendingRefresh,
} from '../lib/teacherPendingRefresh'
import { pollWhileVisible, TEACHER_OTHER_POLL_MS } from '../lib/pollWhileVisible'
import { isSupabaseConfigured } from '../lib/supabase'

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

    const stopPoll = pollWhileVisible(() => {
      scheduleTeacherPendingRefresh()
    }, TEACHER_OTHER_POLL_MS)

    return () => {
      unreg()
      stopPoll()
    }
  }, [user?.id, isTeacher, studentPreviewMode, onTeacherTree, onApprovalsPanel, refresh])

  return null
}
