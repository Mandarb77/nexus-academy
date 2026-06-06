/*
 * Class-wide skill tree (`/tree`)
 *
 * Layout (June 2026): five guild tiles always visible in a top nav strip; one guild open at
 * a time (`openGuildKey`). Quest rows render in a single tall panel below (`skill-tree-guilds-expand`).
 * Quest content is DB-driven (`useSkillTree`); unlock uses `tileUnlock.ts`.
 *
 * Guild order: `SKILL_TREE_SECTION_GUILDS` in guildTree.ts. “Coming soon” gates:
 * `isGuildComingSoonForUser` (voidProtoAccess.ts).
 *
 * Docs: docs/developer-handoff-recent-work.md (accordion UX), docs/quest-tiles-teacher-builder-and-backfill.md (guild trees).
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
    tileBySlug,
  } = useSkillTree()

  const [openGuildKey, setOpenGuildKey] = useState<string | null>(null)

  const toggleGuild = useCallback((guildKey: string) => {
    setOpenGuildKey((prev) => (prev === guildKey ? null : guildKey))
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
              This is where the magic happens.
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
        <div className="skill-tree-guilds-layout">
          <div
            className="skill-tree-guilds skill-tree-guilds--accordion skill-tree-guilds--tiles skill-tree-guilds-nav"
            role="tablist"
            aria-label="Guilds"
          >
            {guildKeys.map((guildKey) => {
              const mod = skillTreeGuildModifier(guildKey)
              const slug = markSlug(mod)
              const treeSlug = guildSlugId(guildKey)
              const open = openGuildKey === guildKey
              const shortLabel = heading(guildKey)
              const desc = descByMod[slug] ?? descByMod.default

              return (
                <section
                  key={guildKey}
                  className={`skill-tree-guild skill-tree-guild--accordion skill-tree-guild--nav skill-tree-guild--${mod}${
                    open ? ' skill-tree-guild--open' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="skill-tree-guild-toggle"
                    role="tab"
                    aria-selected={open}
                    aria-expanded={open}
                    aria-controls={`guild-panel-${treeSlug}`}
                    id={`guild-trigger-${treeSlug}`}
                    onClick={() => toggleGuild(guildKey)}
                  >
                    <div className="skill-tree-guild-toggle-inner">
                      <GuildMark guild={slug} label={shortLabel} size="compact" />
                      <div className="skill-tree-guild-toggle-copy">
                        <h2 className="skill-tree-guild-name skill-tree-guild-name--accordion-toggle">
                          {shortLabel}
                        </h2>
                        <p className="skill-tree-guild-desc">{desc}</p>
                      </div>
                      <span className="skill-tree-guild-chevron" aria-hidden="true">
                        {open ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>
                </section>
              )
            })}
          </div>

          {openGuildKey ? (
            <div
              className={`skill-tree-guilds-expand skill-tree-guilds-expand--${skillTreeGuildModifier(openGuildKey)}`}
            >
              <section
                id={`guild-panel-${guildSlugId(openGuildKey)}`}
                role="tabpanel"
                aria-labelledby={`guild-trigger-${guildSlugId(openGuildKey)}`}
                className={`skill-tree-guild-panel skill-tree-guild-panel--detached skill-tree-guild--${skillTreeGuildModifier(openGuildKey)}`}
              >
                <h3 className="skill-tree-guild-panel-title">{heading(openGuildKey)} guild</h3>
                {isGuildComingSoonForUser(openGuildKey, user) ? (
                  <div className="guild-coming-soon-box guild-coming-soon-box--inline">
                    <p className="guild-coming-soon-box__icon">🔒</p>
                    <p className="guild-coming-soon-box__heading">Coming soon</p>
                    <p className="guild-coming-soon-box__body">
                      This guild is not yet open. Check back later — new quests are on the way.
                    </p>
                  </div>
                ) : (
                  <SkillTilesList
                    tiles={tilesByGuild.get(openGuildKey) ?? []}
                    tileBySlug={tileBySlug}
                    completionByTileId={completionByTileId}
                    patentProgressByTileId={patentProgressByTileId}
                    submittingTileId={submittingTileId}
                    markComplete={markComplete}
                    canUseDb={canUseDb}
                  />
                )}
              </section>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
