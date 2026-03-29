import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'

/** Auth gate for student-only pages (e.g. `/tree`). Unauthenticated users go home to sign in. */
export function StudentOnlyRoute({ children }: { children: ReactNode }) {
  const { user, profile, authReady, loading } = useAuth()

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

  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted">Loading your profile…</p>
      </div>
    )
  }

  if (isTeacherProfile(profile)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
