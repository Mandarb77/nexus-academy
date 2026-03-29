import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'

export function DashboardPage() {
  const { profile, user, signOut } = useAuth()

  const displayName =
    profile?.display_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Teacher'

  return (
    <div className="app-shell">
      <MainNav variant="teacher" />
      <header className="dash-header teacher-dash-header">
        <div>
          <h1>Nexus Academy</h1>
          <p className="muted">
            Signed in as <strong>{displayName}</strong>
            <span className="role-pill role-teacher">Teacher</span>
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <section className="card">
        <h2>Your stats</h2>
        <dl className="stat-grid" aria-label="Your progress">
          <div className="stat">
            <dt>WP</dt>
            <dd>{profile?.wp ?? 0}</dd>
          </div>
          <div className="stat">
            <dt>Gold</dt>
            <dd>{profile?.gold ?? 0}</dd>
          </div>
          <div className="stat">
            <dt>Rank</dt>
            <dd>{profile?.rank ?? 'Initiate'}</dd>
          </div>
        </dl>
        <p className="muted dash-blurb">
          Use <strong>Teacher panel</strong> to approve or return student skill completions.
        </p>
      </section>
    </div>
  )
}
