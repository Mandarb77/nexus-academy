import forgeBanner from '../assets/forge-banner.png'
import prismBanner from '../assets/prism-banner.png'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'

function skillTreeGuildModifier(guildKey: string): 'forge' | 'prism' | 'default' {
  const key = guildKey.trim().toLowerCase()
  if (key === 'forge') return 'forge'
  if (key === 'prism') return 'prism'
  return 'default'
}

export function SkillTreePage() {
  const { signOut } = useAuth()
  const {
    guildKeys,
    tilesByGuild,
    guildHeading,
    completionByTileId,
    loading,
    submittingTileId,
    markComplete,
    canUseDb,
  } = useSkillTree()

  return (
    <div className="app-shell skill-tree-page">
      <header className="skill-tree-top">
        <MainNav />
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
          {guildKeys.map((guildKey) => {
            const mod = skillTreeGuildModifier(guildKey)
            const bannerSrc =
              mod === 'forge' ? forgeBanner : mod === 'prism' ? prismBanner : null

            return (
              <section
                key={guildKey}
                className={`skill-tree-guild skill-tree-guild--${mod}`}
                aria-labelledby={`guild-${guildKey}`}
              >
                {bannerSrc ? (
                  <div className="skill-tree-guild-banner">
                    <img
                      className="skill-tree-guild-banner__img"
                      src={bannerSrc}
                      alt=""
                      decoding="async"
                    />
                    <div className="skill-tree-guild-banner__overlay">
                      <h2
                        id={`guild-${guildKey}`}
                        className="skill-tree-guild-name skill-tree-guild-name--banner"
                      >
                        <strong>{guildHeading(guildKey)}</strong> guild
                      </h2>
                    </div>
                  </div>
                ) : (
                  <h2 id={`guild-${guildKey}`} className="skill-tree-guild-name">
                    {guildHeading(guildKey)} guild
                  </h2>
                )}
                <ul className="skill-tile-list">
                  {(tilesByGuild.get(guildKey) ?? []).map((tile) => {
                    const completion = completionByTileId.get(tile.id)
                    const status = completion?.status
                    const isPending = status === 'pending'
                    const isApproved = status === 'approved'
                    const isReturned = status === 'returned'
                    const busy = submittingTileId === tile.id

                    return (
                      <li key={tile.id} className="skill-tile card">
                        <div className="skill-tile-row">
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
                            ) : isReturned ? (
                              <button
                                type="button"
                                className="btn-skill btn-skill--complete"
                                disabled={!canUseDb || busy}
                                onClick={() => void markComplete(tile)}
                              >
                                {busy ? 'Saving…' : 'Submit again'}
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
                        </div>
                        {isReturned ? (
                          <p className="skill-tile-returned-hint muted">
                            Returned by your teacher — submit again when you are ready.
                          </p>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
