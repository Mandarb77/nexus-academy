import { useCallback, useState } from 'react'
import forgeBanner from '../assets/forge-banner.png'
import prismBanner from '../assets/prism-banner.png'
import foldedBanner from '../assets/folded-banner.png'
import siliconBanner from '../assets/silicon-banner.png'
import voidBanner from '../assets/void-banner.png'
import { MainNav } from '../components/MainNav'
import { StudentTopApprovalBanner } from '../components/StudentTopApprovalBanner'
import { SkillTilesList } from '../components/SkillTilesList'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { isComingSoonGuildSection, skillTreeGuildModifier } from '../lib/guildTree'

function guildSlugId(guildKey: string): string {
  return guildKey.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
}

function bannerForModifier(
  mod: ReturnType<typeof skillTreeGuildModifier>,
): string | null {
  if (mod === 'forge') return forgeBanner
  if (mod === 'prism') return prismBanner
  if (mod === 'folded') return foldedBanner
  if (mod === 'silicon') return siliconBanner
  if (mod === 'void') return voidBanner
  return null
}

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

  const [openGuilds, setOpenGuilds] = useState<Set<string>>(() => new Set())

  const toggleGuild = useCallback((guildKey: string) => {
    setOpenGuilds((prev) => {
      const next = new Set(prev)
      if (next.has(guildKey)) next.delete(guildKey)
      else next.add(guildKey)
      return next
    })
  }, [])

  return (
    <div className="app-shell skill-tree-page">
      <header className="skill-tree-top">
        <MainNav />
        <StudentTopApprovalBanner />
        <div className="skill-tree-top-row">
          <div>
            <h1 className="skill-tree-title">Skill tree</h1>
            <p className="muted skill-tree-subtitle">
              Mark a skill to request credit. Your teacher approves it to add Workshop Points to your profile.
              Click a guild banner to expand or collapse its quests.
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
          No guild sections configured.
        </p>
      ) : (
        <div className="skill-tree-guilds skill-tree-guilds--accordion">
          {guildKeys.map((guildKey) => {
            const mod = skillTreeGuildModifier(guildKey)
            const bannerSrc = bannerForModifier(mod)
            const slug = guildSlugId(guildKey)
            const open = openGuilds.has(guildKey)

            return (
              <section
                key={guildKey}
                className={`skill-tree-guild skill-tree-guild--accordion skill-tree-guild--${mod}${
                  open ? ' skill-tree-guild--open' : ''
                }`}
              >
                <button
                  type="button"
                  className="skill-tree-guild-toggle"
                  aria-expanded={open}
                  aria-controls={`guild-panel-${slug}`}
                  id={`guild-trigger-${slug}`}
                  onClick={() => toggleGuild(guildKey)}
                >
                  {bannerSrc ? (
                    <div className="skill-tree-guild-banner skill-tree-guild-banner--accordion">
                      <img
                        className="skill-tree-guild-banner__img"
                        src={bannerSrc}
                        alt=""
                        decoding="async"
                      />
                      <div className="skill-tree-guild-banner__overlay skill-tree-guild-banner__overlay--accordion">
                        <h2
                          className="skill-tree-guild-name skill-tree-guild-name--banner skill-tree-guild-name--accordion-toggle"
                        >
                          <strong>{heading(guildKey)}</strong> guild
                        </h2>
                        <span className="skill-tree-guild-toggle-hint" aria-hidden="true">
                          {open ? 'Click to collapse' : 'Click to expand'}
                        </span>
                        <span className="skill-tree-guild-chevron" aria-hidden="true">
                          {open ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="skill-tree-guild-toggle-fallback">
                      <h2 className="skill-tree-guild-name">{heading(guildKey)} guild</h2>
                      <span className="skill-tree-guild-chevron" aria-hidden="true">
                        {open ? '▼' : '▶'}
                      </span>
                    </span>
                  )}
                </button>

                {open ? (
                  <div
                    id={`guild-panel-${slug}`}
                    role="region"
                    aria-labelledby={`guild-trigger-${slug}`}
                    className="skill-tree-guild-panel"
                  >
                    {isComingSoonGuildSection(guildKey) ? (
                      <div className="guild-coming-soon-box guild-coming-soon-box--inline">
                        <p className="guild-coming-soon-box__icon">🔒</p>
                        <p className="guild-coming-soon-box__heading">Coming soon</p>
                        <p className="guild-coming-soon-box__body">
                          This guild is not yet open. Check back later — new quests are on the way.
                        </p>
                      </div>
                    ) : (
                      <SkillTilesList
                        tiles={tilesByGuild.get(guildKey) ?? []}
                        completionByTileId={completionByTileId}
                        patentProgressByTileId={patentProgressByTileId}
                        submittingTileId={submittingTileId}
                        markComplete={markComplete}
                        canUseDb={canUseDb}
                      />
                    )}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
