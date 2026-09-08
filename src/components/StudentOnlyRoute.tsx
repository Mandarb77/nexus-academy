/*
 * Nexus Academy — student-only route guard (quest UI, shop, journey, patents)
 *
 * Handoff: wrap every learner-facing route in `App.tsx`. Requires a browser session.
 * Teachers who are not in student preview are sent to `/dashboard` once `profiles.role`
 * is known. Do not block on profile fetch — that spinner was indistinguishable from a
 * hung Google login during class.
 */

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'

export function StudentOnlyRoute({ children }: { children: ReactNode }) {
  const { user, profile, authReady, studentPreviewMode } = useAuth()

  if (!authReady) {
    return (
      <div className="app-shell">
        <p className="muted">Checking session…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  /*
   * Preview-on: same Google identity as the teacher, but `studentPreviewMode` flips guards so
   * `/tree`, `/shop`, etc. render for classroom demos and support tickets.
   */
  if (isTeacherProfile(profile) && !studentPreviewMode) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
