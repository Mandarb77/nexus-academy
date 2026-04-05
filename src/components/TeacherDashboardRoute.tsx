import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'

/** Like ProtectedRoute, but only teachers see the dashboard; students use `/`. */
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

  // Teachers in student preview mode cannot access teacher routes — send them to student home.
  if (studentPreviewMode) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
