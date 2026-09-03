/*
 * Nexus Academy — landing route for `/` (session + role router)
 *
 * Handoff: one public entry URL for the whole program. This component chooses among
 * three experiences: marketing/login when logged out; the student home hub when the
 * profile is a student (or a teacher in student preview); or a redirect to `/dashboard`
 * for teachers in normal mode. It sits between `AuthContext` (session + profile) and
 * either `LoginPage` / `StudentHomePage` / `<Navigate>`. Student vs teacher information
 * architecture stays split without asking students to bookmark different roots.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSchoolEmail } from '../lib/schoolEmail'
import { isTeacherProfile } from '../lib/teacher'
import { LoginPage } from '../pages/LoginPage'
import { StudentHomePage } from '../pages/StudentHomePage'

export function HomeRoute() {
  const { user, profile, authReady, loading, studentPreviewMode } = useAuth()

  /*
   * Wait for `getSession` only — do not require profile yet; unauthenticated users may
   * still need the login shell without a stuck spinner on slow networks.
   */
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

  /*
   * After OAuth, `profiles` can trail the session by a beat; show a distinct message so
   * students do not confuse “still loading” with “Google failed”. Skip that wait when the
   * Google account is already the wrong domain — SchoolAccountGate should appear immediately.
   */
  if (loading && (isSchoolEmail(user.email) || isTeacherProfile(profile))) {
    return (
      <div className="app-shell">
        <p className="muted">Loading your profile…</p>
      </div>
    )
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
