/*
 * Nexus Academy — landing route for `/` (session + role router)
 *
 * Handoff: one public entry URL for the whole program. This component chooses among
 * three experiences: marketing/login when logged out; the student home hub when the
 * profile is a student (or a teacher in student preview); or a redirect to `/dashboard`
 * for teachers in normal mode. Session is enough to enter the student app — `profiles`
 * hydrates in the background so a slow row fetch cannot look like a failed Google login.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'
import { LoginPage } from '../pages/LoginPage'
import { StudentHomePage } from '../pages/StudentHomePage'

export function HomeRoute() {
  const { user, profile, studentPreviewMode } = useAuth()

  const oauthCode = new URLSearchParams(window.location.search).get('code')
  if (!user && oauthCode) {
    return (
      <div className="app-shell">
        <p className="muted">Finishing sign-in…</p>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  /*
   * Teachers in student preview intentionally stay on the learner hub (`StudentHomePage`);
   * only non-preview teachers are redirected to staff dashboard so day-one bookmarks stay `/`.
   */
  if (isTeacherProfile(profile) && !studentPreviewMode) {
    return <Navigate to="/dashboard" replace />
  }

  return <StudentHomePage />
}
