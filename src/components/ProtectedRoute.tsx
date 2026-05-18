/*
 * Nexus Academy — minimal auth gate (session only, no profile wait)
 *
 * Handoff: rare alternative to `StudentOnlyRoute` when a child screen can tolerate
 * `profile` still loading (e.g. some redirects). Only checks `authReady` + `user`.
 * Preserves `location` in `Navigate` state for a possible future “return here after login”
 * deep link. Most gamified student surfaces should use `StudentOnlyRoute` so economy/role
 * data is present before paint.
 */

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth()
  const location = useLocation()

  /** Only wait for session restore — not profile. Profile can load on the dashboard. */
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

  return <>{children}</>
}
