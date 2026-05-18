/*
 * Nexus Academy — teacher-only route guard (dashboard, approvals, quest admin)
 *
 * Handoff: wrap staff URLs in `App.tsx`. Requires restored session plus a loaded `profiles`
 * row with `role=teacher`. `studentPreviewMode` intentionally **denies** access here so a
 * teacher who is previewing the learner shell cannot accidentally open grading tools in the
 * same tab state — they must exit preview first. Pairs with `StudentOnlyRoute`, which does
 * the inverse for `/tree`, `/shop`, `/journey`, patent wizards, etc.
 */

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'

export function TeacherDashboardRoute({ children }: { children: ReactNode }) {
  const { user, profile, authReady, loading, studentPreviewMode } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <div className="app-shell">
        <p className="muted">Checking session…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted">Loading your profile…</p>
      </div>
    )
  }

  if (!isTeacherProfile(profile)) {
    return <Navigate to="/" replace />
  }

  /*
   * Redirect to `/` (which re-resolves to student home in preview) instead of `/dashboard` to
   * avoid a redirect loop and to make “exit preview” the one mental model: home is always safe.
   */
  if (studentPreviewMode) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
