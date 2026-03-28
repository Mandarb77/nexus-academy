import { StudentNav } from '../components/StudentNav'
import { useAuth } from '../contexts/AuthContext'
import { progressToApprenticeMage } from '../lib/rankProgress'

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
  const rank = profile?.rank?.trim() || 'Initiate'
  const progress = progressToApprenticeMage(wpTotal)

  return (
    <div className="app-shell student-home">
      <StudentNav />
      <header className="student-home-header">
        <div>
          <p className="student-home-label">Welcome back</p>
          <h1 className="student-home-name">{displayName}</h1>
        </div>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <section className="card student-home-card" aria-labelledby="student-home-stats-heading">
        <h2 id="student-home-stats-heading" className="visually-hidden">
          Your progress
        </h2>

        <div className="student-home-stat student-home-stat--hero">
          <span className="student-home-stat-label">Workshop Points</span>
          <span className="student-home-stat-value">{wpTotal}</span>
        </div>

        <div className="student-home-stat">
          <span className="student-home-stat-label">Rank</span>
          <span className="student-home-stat-value student-home-stat-value--rank">{rank}</span>
        </div>

        <div className="student-home-progress-block">
          <div className="student-home-progress-head">
            <span className="student-home-progress-title">Next rank</span>
            <span className="student-home-progress-target">
              {progress.nextRankName} · {progress.targetWp} WP
            </span>
          </div>
          <div
            className="rank-progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.targetWp}
            aria-valuenow={Math.min(progress.currentWp, progress.targetWp)}
            aria-label={`Progress toward ${progress.nextRankName}`}
          >
            <div
              className="rank-progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="student-home-progress-caption muted">
            {progress.reachedNextRank ? (
              <>
                {progress.currentWp} / {progress.targetWp} WP — you have reached{' '}
                <strong>{progress.nextRankName}</strong>
              </>
            ) : (
              <>
                {progress.currentWp} / {progress.targetWp} Workshop Points to{' '}
                <strong>{progress.nextRankName}</strong>
              </>
            )}
          </p>
        </div>

        <div className="student-home-stat student-home-stat--gold">
          <span className="student-home-stat-label">Gold</span>
          <span className="student-home-stat-value">{gold}</span>
        </div>
      </section>
    </div>
  )
}
