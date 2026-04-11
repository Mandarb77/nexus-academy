import { Link } from 'react-router-dom'
import forgeBanner from '../assets/forge-banner.png'
import prismBanner from '../assets/prism-banner.png'
import foldedBanner from '../assets/folded-banner.png'
import siliconBanner from '../assets/silicon-banner.png'
import voidBanner from '../assets/void-banner.png'
import { MainNav } from '../components/MainNav'
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
      <MainNav />
      <header className="student-home-header">
        <div>
          <p className="student-home-label">Welcome back</p>
          <h1 className="student-home-name">{displayName}</h1>
        </div>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <section className="student-home-guilds" aria-labelledby="student-home-guilds-heading">
        <h2 id="student-home-guilds-heading" className="student-home-guilds-heading">
          Guilds
        </h2>
        <p className="muted student-home-guilds-intro">
          Open a guild to view skills and request credit from your teacher.
        </p>

        <div className="student-home-main-layout" role="group" aria-label="Your progress and guild shortcuts">
          <section className="card student-home-card" aria-labelledby="student-home-stats-heading">
            <h2 id="student-home-stats-heading" className="visually-hidden">Your progress</h2>

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
                <div className="rank-progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="student-home-progress-caption muted">
                {progress.reachedNextRank ? (
                  <>{progress.currentWp} / {progress.targetWp} WP — you have reached <strong>{progress.nextRankName}</strong></>
                ) : (
                  <>{progress.currentWp} / {progress.targetWp} Workshop Points to <strong>{progress.nextRankName}</strong></>
                )}
              </p>
            </div>

            <div className="student-home-stat student-home-stat--gold">
              <span className="student-home-stat-label">Gold</span>
              <span className="student-home-stat-value">{gold}</span>
            </div>
          </section>

          <div className="student-home-guild-grid">
            <Link to="/tree/forge" className="student-home-guild-banner-link student-home-guild-banner-link--forge">
              <img src={forgeBanner} alt="Forge guild — view skills and mark complete"
                className="student-home-guild-banner-img" decoding="async" />
            </Link>
            <Link to="/tree/prism" className="student-home-guild-banner-link student-home-guild-banner-link--prism">
              <img src={prismBanner} alt="Prism guild — view skills and mark complete"
                className="student-home-guild-banner-img" decoding="async" />
            </Link>
            <Link to="/tree/folded" className="student-home-guild-banner-link student-home-guild-banner-link--folded">
              <img src={foldedBanner} alt="Folded Path guild — view skills and mark complete"
                className="student-home-guild-banner-img" decoding="async" />
            </Link>
            <Link to="/tree/silicon" className="student-home-guild-banner-link student-home-guild-banner-link--silicon student-home-guild-banner-link--coming-soon">
              <img src={siliconBanner} alt="Silicon Covenant guild — coming soon"
                className="student-home-guild-banner-img" decoding="async" />
              <span className="student-home-guild-coming-soon-badge">Coming soon</span>
            </Link>
            <Link to="/tree/void" className="student-home-guild-banner-link student-home-guild-banner-link--void student-home-guild-banner-link--coming-soon">
              <img src={voidBanner} alt="Void Navigators guild — coming soon"
                className="student-home-guild-banner-img" decoding="async" />
              <span className="student-home-guild-coming-soon-badge">Coming soon</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
