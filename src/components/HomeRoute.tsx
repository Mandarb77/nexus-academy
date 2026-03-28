import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherUser } from '../lib/teacher'
import { LoginPage } from '../pages/LoginPage'
import { StudentHomePage } from '../pages/StudentHomePage'

/** `/` — sign-in when logged out; student home when logged in as a student; teachers go to `/dashboard`. */
export function HomeRoute() {
  const { user, authReady, loading } = useAuth()

  if (!authReady) {
    return (
      <div className="app-shell">
        <p className="muted">Checking session…</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted">Loading your profile…</p>
      </div>
    )
  }

  if (isTeacherUser(user)) {
    return <Navigate to="/dashboard" replace />
  }

  return <StudentHomePage />
}
