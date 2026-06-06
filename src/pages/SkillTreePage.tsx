/*
 * Class-wide skill tree (`/tree`)
 *
 * Renders every guild section in `SKILL_TREE_SECTION_GUILDS` order with anchors for deep links.
 * Guild “coming soon” gates use `isGuildComingSoonForUser` (voidProtoAccess.ts).
 */

import { useCallback, useMemo, useState } from 'react'
import { GuildMark, type GuildMarkSlug } from '../components/GuildMark'
import { MainNav } from '../components/MainNav'
import { SkillTilesList } from '../components/SkillTilesList'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { skillTreeGuildModifier } from '../lib/guildTree'
import { isGuildComingSoonForUser } from '../lib/voidProtoAccess'

function guildSlugId(guildKey: string): string {
  return guildKey.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
}

function markSlug(mod: ReturnType<typeof skillTreeGuildModifier>): GuildMarkSlug {
  return mod === 'default' ? 'default' : mod
}

export function SkillTreePage() {
  const { user, signOut } = useAuth()
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

  const descByMod = useMemo(() => {
    const d: Record<GuildMarkSlug, string> = {
      forge: '3D printing',
      prism: 'Laser cutter • design',
      folded: 'Paper craft • vinyl',
      silicon: 'Electronics • micro:bit',
      void: 'CNC',
      default: 'Maker skills',
    }
    return d
  }, [])

  return (
    <div className="app-shell bench-chrome skill-tree-page">
      <header className="skill-tree-top">
        <MainNav />
        <div className="skill-tree-top-row bench-page-title-row">
          <div>
            <h1 className="skill-tree-title bench-page-title">Guilds</h1>
            <p className="muted skill-tree-subtitle">
              Mark a skill to request credit. Your teacher approves it to add Workshop Points to your profile.
              Click a guild to expand or collapse its quests, or open a guild page for the full list.
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
        <div className="skill-tree-guilds skill-tree-guilds--accordion skill-tree-guilds--tiles">
          {guildKeys.map((guildKey) => {
            const mod = skillTreeGuildModifier(guildKey)
            const slug = markSlug(mod)
            const treeSlug = guildSlugId(guildKey)
            const open = openGuilds.has(guildKey)
            const shortLabel = heading(guildKey)
            const desc = descByMod[slug] ?? descByMod.default

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
                  aria-controls={`guild-panel-${treeSlug}`}
                  id={`guild-trigger-${treeSlug}`}
                  onClick={() => toggleGuild(guildKey)}
                >
                  <div className="skill-tree-guild-toggle-inner">
                    <GuildMark guild={slug} label={shortLabel} size="compact" />
                    <div className="skill-tree-guild-toggle-copy">
                      <h2 className="skill-tree-guild-name skill-tree-guild-name--accordion-toggle">
                        {shortLabel} guild
                      </h2>
                      <p className="skill-tree-guild-desc">{desc}</p>
                      <span className="skill-tree-guild-toggle-hint" aria-hidden="true">
                        {open ? 'Hide quests' : 'Show quests'}
                      </span>
                    </div>
                    <span className="skill-tree-guild-chevron" aria-hidden="true">
                      {open ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {open ? (
                  <div
                    id={`guild-panel-${treeSlug}`}
                    role="region"
                    aria-labelledby={`guild-trigger-${treeSlug}`}
                    className="skill-tree-guild-panel"
                  >
                    {isGuildComingSoonForUser(guildKey, user) ? (
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
