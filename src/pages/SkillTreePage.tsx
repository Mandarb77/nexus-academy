import { StudentNav } from '../components/StudentNav'
import { useAuth } from '../contexts/AuthContext'
import { GUILDS } from '../data/skillTree'
import { useSkillCompletions } from '../hooks/useSkillCompletions'

export function SkillTreePage() {
  const { signOut } = useAuth()
  const { statusBySkill, loading, submittingKey, markComplete, canUseDb } =
    useSkillCompletions()

  return (
    <div className="app-shell skill-tree-page">
      <header className="skill-tree-top">
        <StudentNav />
        <div className="skill-tree-top-row">
          <div>
            <h1 className="skill-tree-title">Skill tree</h1>
            <p className="muted skill-tree-subtitle">
              Mark skills complete to request credit. Each skill is worth 10 Workshop Points once
              approved.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {!canUseDb ? (
        <p className="muted" role="alert">
          Connect Supabase in <code className="inline-code">.env</code> to use the skill tree.
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Loading skills…</p>
      ) : (
        <div className="skill-tree-guilds">
          {GUILDS.map((guild) => (
            <section key={guild.id} className="skill-tree-guild" aria-labelledby={`guild-${guild.id}`}>
              <h2 id={`guild-${guild.id}`} className="skill-tree-guild-name">
                {guild.name} guild
              </h2>
              <ul className="skill-tile-list">
                {guild.tiles.map((tile) => {
                  const status = statusBySkill.get(tile.key)
                  const isPending = status === 'pending'
                  const isApproved = status === 'approved'
                  const busy = submittingKey === tile.key

                  return (
                    <li key={tile.key} className="skill-tile card">
                      <div className="skill-tile-main">
                        <h3 className="skill-tile-name">{tile.name}</h3>
                        <p className="skill-tile-wp">{tile.wp} WP</p>
                      </div>
                      <div className="skill-tile-action">
                        {isApproved ? (
                          <span className="skill-tile-badge skill-tile-badge--approved">
                            Approved
                          </span>
                        ) : isPending ? (
                          <button
                            type="button"
                            className="btn-skill btn-skill--pending"
                            disabled
                            aria-disabled="true"
                          >
                            Pending
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-skill btn-skill--complete"
                            disabled={!canUseDb || busy}
                            onClick={() => void markComplete(tile.key)}
                          >
                            {busy ? 'Saving…' : 'Mark complete'}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
