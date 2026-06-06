/*
 * Patent route shell for Quest Builder tiles (`/patent-custom/:tileId`)
 *
 * Resolves `tileId` from the URL, finds the matching row from `useSkillTree`, and mounts
 * the unified `PatentLedger`. Void Tile 1 prototype lands here via `isCustomTile` in customTile.ts.
 */

import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MainNav } from '../components/MainNav'
import { PatentLedger } from '../components/PatentLedger'
import { QuestLockedGate } from '../components/QuestLockedGate'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { skillTreeGuildModifier } from '../lib/guildTree'

export function PatentCustomPage() {
  const { tileId } = useParams<{ tileId: string }>()
  const { signOut } = useAuth()
  const { tiles, loading, refresh, completionByTileId, canUseDb, tileBySlug } = useSkillTree()

  // ---------------------------------------------------------------------------
  // Resolve URL tile id → `tiles` row from skill tree hook
  // ---------------------------------------------------------------------------
  const tile = useMemo(() => {
    if (!tileId) return null
    return tiles.find((t) => String(t.id) === String(tileId)) ?? null
  }, [tiles, tileId])

  const completion = tile ? completionByTileId.get(tile.id) : undefined
  const mod = tile ? skillTreeGuildModifier(tile.guild) : 'default'
  /* Include `/tree/void` so patent back link matches GuildSkillTreePage deep link. */
  const backPath =
    mod === 'forge'
      ? '/tree/forge'
      : mod === 'prism'
        ? '/tree/prism'
        : mod === 'folded'
          ? '/tree/folded'
          : mod === 'void'
            ? '/tree/void'
            : mod === 'silicon'
              ? '/tree/silicon'
              : '/tree'
  const backLabel = tile ? `← Back to ${tile.guild} skill tree` : '← Back'

  if (!tileId) return null

  return (
    <div className="app-shell patent-game-piece-page patent-paper-page">
      {/* ---------- Page chrome: nav, back link, sign out ---------- */}
      <header className="skill-tree-top">
        <MainNav />
        <div className="skill-tree-top-row skill-tree-top-row--guild">
          <div className="skill-tree-guild-page-head">
            <Link to={backPath} className="skill-tree-back-link">{backLabel}</Link>
            <p className="muted skill-tree-guild-page-crumb">Your quest</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {/* ---------- Main: loading / error / `PatentLedger` (self-contained header) ---------- */}
      <main className="page patent-game-piece-main">
        {!canUseDb ? (
          <p className="muted" role="alert">Connect Supabase in <code className="inline-code">.env</code> to use this page.</p>
        ) : null}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : !tile ? (
          <p className="error" role="alert">Quest tile not found. <Link to="/tree">← Back to skill tree</Link></p>
        ) : (
          <QuestLockedGate
            tile={tile}
            tileBySlug={tileBySlug}
            completionByTileId={completionByTileId}
            backPath={backPath}
          >
            <PatentLedger tile={tile} refresh={refresh} completionStatus={completion?.status} />
          </QuestLockedGate>
        )}
      </main>
    </div>
  )
}
