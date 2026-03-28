import { useAuth } from '../contexts/AuthContext'

export function DashboardPage() {
  const { profile, user, signOut } = useAuth()

  const displayName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Student'

  const roleLabel = profile?.role === 'teacher' ? 'Teacher' : 'Student'

  return (
    <div className="app-shell">
      <header className="dash-header">
        <div>
          <h1>Nexus Academy</h1>
          <p className="muted">
            Signed in as <strong>{displayName}</strong>
            <span className={`role-pill role-${profile?.role ?? 'student'}`}>
              {roleLabel}
            </span>
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <section className="card">
        <h2>Dashboard</h2>
        <dl className="stat-grid" aria-label="Your progress">
          <div className="stat">
            <dt>WP total</dt>
            <dd>{profile?.wp_total ?? 0}</dd>
          </div>
          <div className="stat">
            <dt>Gold</dt>
            <dd>{profile?.gold_balance ?? 0}</dd>
          </div>
          <div className="stat">
            <dt>Rank</dt>
            <dd>{profile?.rank ?? 'Initiate'}</dd>
          </div>
        </dl>
        <p className="muted dash-blurb">
          {profile?.role === 'teacher'
            ? 'Teacher tools for your maker class will go here.'
            : 'Your assignments and projects will show up here.'}
        </p>
      </section>
    </div>
  )
}
