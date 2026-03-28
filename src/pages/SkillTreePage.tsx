import { StudentNav } from '../components/StudentNav'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'

export function SkillTreePage() {
  const { signOut } = useAuth()
  const {
    guildKeys,
    tilesByGuild,
    guildHeading,
    statusByTileId,
    loading,
    submittingTileId,
    markComplete,
    canUseDb,
  } = useSkillTree()

  return (
    <div className="app-shell skill-tree-page">
      <header className="skill-tree-top">
        <StudentNav />
        <div className="skill-tree-top-row">
          <div>
            <h1 className="skill-tree-title">Skill tree</h1>
            <p className="muted skill-tree-subtitle">
              Mark a skill to request credit. Your teacher approves it to add Workshop Points to your
              profile.
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
      ) : guildKeys.length === 0 ? (
        <p className="muted" role="status">
          No tiles found. Add rows to the <code className="inline-code">tiles</code> table in
          Supabase.
        </p>
      ) : (
        <div className="skill-tree-guilds">
          {guildKeys.map((guildKey) => (
            <section
              key={guildKey}
              className="skill-tree-guild"
              aria-labelledby={`guild-${guildKey}`}
            >
              <h2 id={`guild-${guildKey}`} className="skill-tree-guild-name">
                {guildHeading(guildKey)} guild
              </h2>
              <ul className="skill-tile-list">
                {(tilesByGuild.get(guildKey) ?? []).map((tile) => {
                  const status = statusByTileId.get(tile.id)
                  const isPending = status === 'pending'
                  const isApproved = status === 'approved'
                  const busy = submittingTileId === tile.id

                  return (
                    <li key={tile.id} className="skill-tile card">
                      <div className="skill-tile-main">
                        <h3 className="skill-tile-name">{tile.skill_name}</h3>
                        <p className="skill-tile-wp">{tile.wp_value} WP</p>
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
                            onClick={() => void markComplete(tile)}
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
