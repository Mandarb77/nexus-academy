/*
 * Per-guild skill tree (`/tree/:guildSlug`)
 *
 * Deep link from student home guild marks. Quest rows come from the database.
 * Reuses `SkillTilesList` with `useSkillTree` data.
 */

import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { GuildMark, type GuildMarkSlug } from '../components/GuildMark'
import { MainNav } from '../components/MainNav'
import { ReadingGuildPagesKey } from '../components/fieldGuide/ReadingGuildPagesKey'
import { SkillTilesList } from '../components/SkillTilesList'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { guildBannerSrc } from '../lib/guildBannerAssets'
import { guildHeading, skillTreeGuildModifier } from '../lib/guildTree'
import { GUILD_WELCOME_BY_SLUG, type GuildWelcomeSlug } from '../lib/guildWelcomeCopy'
import { isGuildComingSoonForUser } from '../lib/voidProtoAccess'

type GuildSlug = GuildMarkSlug

function parseGuildSlug(raw: string | undefined): GuildSlug | null {
  const s = raw?.trim().toLowerCase()
  if (s === 'forge' || s === 'prism' || s === 'folded' || s === 'silicon' || s === 'void') return s as GuildSlug
  return null
}

export function GuildSkillTreePage() {
  const { guildSlug } = useParams<{ guildSlug: string }>()
  const slug = parseGuildSlug(guildSlug)
  const { signOut } = useAuth()
  const {
    guildKeys,
    tilesByGuild,
    completionByTileId,
    patentProgressByTileId,
    loading,
    submittingTileId,
    markComplete,
    canUseDb,
    tileBySlug,
  } = useSkillTree()

  const guildKey = useMemo(() => {
    if (!slug) return null
    return guildKeys.find((k) => skillTreeGuildModifier(k) === slug) ?? null
  }, [guildKeys, slug])

  const tiles = guildKey ? (tilesByGuild.get(guildKey) ?? []) : []
  const mod = slug ?? 'default'

  if (!slug) {
    return <Navigate to="/" replace />
  }

  const bannerSrc = guildBannerSrc(slug)
  const guildTitle = guildKey ? `${guildHeading(guildKey)} guild` : `${guildHeading(slug)} guild`
  const markLabel = guildKey ? guildHeading(guildKey) : guildHeading(slug)
  const showComingSoon = Boolean(guildKey) && isGuildComingSoonForUser(guildKey ?? '', null)
  const welcomeSlug = slug as GuildWelcomeSlug
  const welcomeCopy =
    welcomeSlug === 'forge' || welcomeSlug === 'prism' || welcomeSlug === 'folded' || welcomeSlug === 'void'
      ? GUILD_WELCOME_BY_SLUG[welcomeSlug]
      : undefined

  const header = (
    <header className="skill-tree-top">
      <MainNav />
      <div className="skill-tree-top-row skill-tree-top-row--guild">
        <div className="skill-tree-guild-page-head">
          <Link to="/tree" className="bench-back-link">
            ← Guilds
          </Link>
        </div>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </header>
  )

  return (
    <div
      className={`app-shell bench-chrome skill-tree-page skill-tree-page--guild skill-tree-page--guild-${slug}`}
    >
      {header}

      {!canUseDb ? (
        <p className="muted" role="alert">
          Connect Supabase in <code className="inline-code">.env</code> to use the skill tree.
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Loading skills…</p>
      ) : !guildKey ? (
        <p className="muted" role="status">
          No <strong>{guildHeading(slug)}</strong> skills found in the database.
        </p>
      ) : (
        <section
          className={`skill-tree-guild skill-tree-guild--single skill-tree-guild--${mod}`}
          aria-labelledby="guild-single-heading"
        >
          <div className="guild-quest-hero">
            <GuildMark guild={slug} label={markLabel} size="cartouche" />
            {bannerSrc ? (
              <div className="guild-quest-banner-thumb">
                <img src={bannerSrc} alt="" decoding="async" />
              </div>
            ) : null}
          </div>

          <h1 id="guild-single-heading" className="skill-tree-guild-page-title bench-page-title">
            {guildTitle}
          </h1>

          {welcomeCopy && !showComingSoon ? (
            <div
              className={`skill-tree-guild-welcome skill-tree-guild-welcome--${mod}`}
              role="region"
              aria-label={`About ${welcomeCopy.orderName}`}
            >
              <p className="skill-tree-guild-welcome__order">{welcomeCopy.orderName}</p>
              <p className="skill-tree-guild-welcome__text">{welcomeCopy.sentences[0]}</p>
              <p className="skill-tree-guild-welcome__text">{welcomeCopy.sentences[1]}</p>
            </div>
          ) : null}

          {slug === 'void' && !showComingSoon && tiles.length === 0 ? (
            <p className="error" role="alert">
              No Void quests in the database yet. Apply migration{' '}
              <code className="inline-code">057_void_navigators_quest_tree.sql</code> in Supabase, then refresh.
            </p>
          ) : null}
          {showComingSoon ? (
            <div className="guild-coming-soon-box">
              <p className="guild-coming-soon-box__icon">🔒</p>
              <p className="guild-coming-soon-box__heading">Coming soon</p>
              <p className="guild-coming-soon-box__body">
                This guild is not yet open. Check back later — new quests are on the way.
              </p>
            </div>
          ) : (
            <>
            <ReadingGuildPagesKey />
            <SkillTilesList
              tiles={tiles}
              tileBySlug={tileBySlug}
              completionByTileId={completionByTileId}
              patentProgressByTileId={patentProgressByTileId}
              submittingTileId={submittingTileId}
              markComplete={markComplete}
              canUseDb={canUseDb}
            />
            </>
          )}
        </section>
      )}
    </div>
  )
}
