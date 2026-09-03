/*
 * Nexus Academy — student-only route guard (quest UI, shop, journey, patents)
 *
 * Handoff: wrap every learner-facing route in `App.tsx`. Ensures the browser session
 * exists, the `profiles` row has finished loading, and a teacher account is not browsing
 * staff-as-self (those users belong on `/dashboard`). When `studentPreviewMode` is true,
 * teachers deliberately pass through so they can QA student flows without a second login.
 * Uses `AuthContext` + `lib/teacher`; complements `TeacherDashboardRoute` on the staff side.
 */

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'
import { isSchoolEmail } from '../lib/schoolEmail'

export function StudentOnlyRoute({ children }: { children: ReactNode }) {
  const { user, profile, authReady, loading, studentPreviewMode } = useAuth()

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

  if (loading && (isSchoolEmail(user.email) || isTeacherProfile(profile))) {
    return (
      <div className="app-shell">
        <p className="muted">Loading your profile…</p>
      </div>
    )
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
