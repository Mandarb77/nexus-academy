import forgeBanner from '../assets/forge-banner.png'
import prismBanner from '../assets/prism-banner.png'
import foldedBanner from '../assets/folded-banner.png'
import { MainNav } from '../components/MainNav'
import { SkillTilesList } from '../components/SkillTilesList'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { skillTreeGuildModifier } from '../lib/guildTree'

export function SkillTreePage() {
  const { signOut } = useAuth()
  const {
    guildKeys,
    tilesByGuild,
    guildHeading: heading,
    completionByTileId,
    patentProgressByTileId,
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
              mod === 'forge' ? forgeBanner : mod === 'prism' ? prismBanner : mod === 'folded' ? foldedBanner : null

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
                        <strong>{heading(guildKey)}</strong> guild
                      </h2>
                    </div>
                  </div>
                ) : (
                  <h2 id={`guild-${guildKey}`} className="skill-tree-guild-name">
                    {heading(guildKey)} guild
                  </h2>
                )}
                <SkillTilesList
                  tiles={tilesByGuild.get(guildKey) ?? []}
                  completionByTileId={completionByTileId}
                  patentProgressByTileId={patentProgressByTileId}
                  submittingTileId={submittingTileId}
                  markComplete={markComplete}
                  canUseDb={canUseDb}
                />
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
