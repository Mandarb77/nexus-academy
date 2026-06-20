/*
 * Student landing hub after sign-in (`/` via `HomeRoute`)
 *
 * Surfaces the student status summary used after sign-in.
 */

import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'

export function StudentHomePage() {
  const { profile, user, signOut } = useAuth()

  const displayName =
    profile?.display_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Student'

  const wpTotal = profile?.wp ?? 0
  const gold = profile?.gold ?? 0

  return (
    <div className="app-shell bench-chrome student-home">
      <MainNav />
      <div className="student-home-page-title-row">
        <h1 className="student-home-page-title">Workshop</h1>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </div>

      <header className="student-home-header">
        <div>
          <p className="student-home-label">Welcome back</p>
          <p className="student-home-name">{displayName}</p>
        </div>
      </header>

      <section className="student-home-guilds" aria-labelledby="student-home-guilds-heading">
        <h2 id="student-home-guilds-heading" className="student-home-guilds-heading">
          Your status
        </h2>

        <div className="student-home-main-layout" role="group" aria-label="Your status">
          <section className="card student-home-card" aria-labelledby="student-home-stats-heading">
            <h2 id="student-home-stats-heading" className="visually-hidden">Your status</h2>

            <div className="student-home-stat student-home-stat--hero">
              <span className="student-home-stat-label">Workshop Points</span>
              <span className="student-home-stat-value">{wpTotal}</span>
            </div>

            <div className="student-home-stat student-home-stat--gold">
              <span className="student-home-stat-label">Gold</span>
              <span className="student-home-stat-value">{gold}</span>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
