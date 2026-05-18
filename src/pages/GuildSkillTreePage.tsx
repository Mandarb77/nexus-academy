/*
 * Per-guild skill tree (`/tree/:guildSlug`)
 *
 * Deep link from student home banners. Validates slug against known guilds, shows coming-soon
 * treatment for Silicon/Void, and reuses `SkillTilesList` with the same `useSkillTree` data as
 * the global tree — ensures consistent completion badges within guild context.
 */

import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import forgeBanner from '../assets/forge-banner.png'
import prismBanner from '../assets/prism-banner.png'
import foldedBanner from '../assets/folded-banner.png'
import siliconBanner from '../assets/silicon-banner.png'
import voidBanner from '../assets/void-banner.png'
import { MainNav } from '../components/MainNav'
import { SkillTilesList } from '../components/SkillTilesList'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { guildHeading, skillTreeGuildModifier } from '../lib/guildTree'
import { GUILD_WELCOME_BY_SLUG, type GuildWelcomeSlug } from '../lib/guildWelcomeCopy'
import { canAccessVoidTile1Proto, isGuildComingSoonForUser } from '../lib/voidProtoAccess'
import { filterVoidTilesForProto } from '../lib/voidTile1Proto'

type GuildSlug = 'forge' | 'prism' | 'folded' | 'silicon' | 'void'

function parseGuildSlug(raw: string | undefined): GuildSlug | null {
  const s = raw?.trim().toLowerCase()
  if (s === 'forge' || s === 'prism' || s === 'folded' || s === 'silicon' || s === 'void') return s as GuildSlug
  return null
}

export function GuildSkillTreePage() {
  const { guildSlug } = useParams<{ guildSlug: string }>()
  const slug = parseGuildSlug(guildSlug)
  const { user, signOut } = useAuth()
  const {
    guildKeys,
    tilesByGuild,
    completionByTileId,
    patentProgressByTileId,
    loading,
    submittingTileId,
    markComplete,
    canUseDb,
  } = useSkillTree()

  const guildKey = useMemo(() => {
    if (!slug) return null
    return guildKeys.find((k) => skillTreeGuildModifier(k) === slug) ?? null
  }, [guildKeys, slug])

  const rawTiles = guildKey ? (tilesByGuild.get(guildKey) ?? []) : []
  const voidProto = slug === 'void' && canAccessVoidTile1Proto(user)
  const tiles = voidProto ? filterVoidTilesForProto(rawTiles) : rawTiles
  const mod = slug ?? 'default'

  if (!slug) {
    return <Navigate to="/" replace />
  }

  const BANNER_MAP: Record<GuildSlug, string | null> = {
    forge: forgeBanner,
    prism: prismBanner,
    folded: foldedBanner,
    silicon: siliconBanner,
    void: voidBanner,
  }
  const bannerSrc = BANNER_MAP[slug]
  const guildTitle = guildKey ? `${guildHeading(guildKey)} guild` : `${guildHeading(slug)} guild`
  const showComingSoon = Boolean(guildKey) && isGuildComingSoonForUser(guildKey ?? '', user)
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
          <Link to="/" className="skill-tree-back-link">
            ← Back to home
          </Link>
          <p className="muted skill-tree-guild-page-crumb">Skill tree</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </header>
  )

  return (
    <div className={`app-shell skill-tree-page skill-tree-page--guild skill-tree-page--guild-${slug}`}>
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
          {bannerSrc ? (
            <div className="skill-tree-guild-banner skill-tree-guild-banner--below-title">
              <img className="skill-tree-guild-banner__img" src={bannerSrc} alt="" decoding="async" />
            </div>
          ) : null}
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
          <h1 id="guild-single-heading" className="skill-tree-guild-page-title">
            {guildTitle}
          </h1>
          {voidProto && tiles.length === 0 ? (
            <p className="error" role="alert">
              Void Tile 1 is not in the database yet. Apply migration{' '}
              <code className="inline-code">039_void_tile1_coaster_proto.sql</code> in Supabase, then refresh.
            </p>
          ) : null}
          {voidProto && tiles.length > 0 ? (
            <p className="muted void-tile1-proto-banner" role="note">
              Prototype — Tile 1 only. Visible to you while we test the Void UX.
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
            <SkillTilesList
              tiles={tiles}
              completionByTileId={completionByTileId}
              patentProgressByTileId={patentProgressByTileId}
              submittingTileId={submittingTileId}
              markComplete={markComplete}
              canUseDb={canUseDb}
            />
          )}
        </section>
      )}
    </div>
  )
}
