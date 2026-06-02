/*
 * Patent route shell — game piece + pop-up card (`/patent-game-piece/:tileId`)
 *
 * Wraps the unified `PatentLedger` with tile lookup and guild-aware back navigation
 * (`/tree/forge` vs `/tree/prism`). Redirects away if the tile is not part of this flow.
 */

import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { MainNav } from '../components/MainNav'
import { PatentLedger } from '../components/PatentLedger'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { skillTreeGuildModifier } from '../lib/guildTree'

function patentGamePieceBackPath(guild: string): string {
  const mod = skillTreeGuildModifier(guild)
  if (mod === 'prism') return '/tree/prism'
  return '/tree/forge'
}

export function PatentGamePiecePage() {
  const { tileId } = useParams<{ tileId: string }>()
  const { signOut } = useAuth()
  const { tiles, loading, refresh, completionByTileId, canUseDb } = useSkillTree()

  // ---------------------------------------------------------------------------
  // URL → tile row; back link follows guild (Forge vs Prism)
  // ---------------------------------------------------------------------------
  const tile = useMemo(() => {
    if (!tileId) return null
    return tiles.find((t) => String(t.id) === String(tileId)) ?? null
  }, [tiles, tileId])

  const completion = tile ? completionByTileId.get(tile.id) : undefined
  const backPath = tile ? patentGamePieceBackPath(tile.guild) : '/tree/forge'

  /*
   * Malformed deep link (missing `:tileId`) — send students back to the default skill tree
   * rather than a blank shell; keeps support tickets from “white page on patent” reports.
   */
  if (!tileId) {
    return <Navigate to="/tree" replace />
  }

  return (
    <div className="app-shell patent-game-piece-page patent-paper-page">
      {/* ---------- Page chrome ---------- */}
      <header className="skill-tree-top">
        <MainNav />
        <div className="skill-tree-top-row skill-tree-top-row--guild">
          <div className="skill-tree-guild-page-head">
            <Link to={backPath} className="skill-tree-back-link">
              ← Back to {tile?.guild ?? 'Forge'} skill tree
            </Link>
            <p className="muted skill-tree-guild-page-crumb">Patent application</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {/* ---------- Main: Supabase gate → loading / not found → ledger ---------- */}
      <main className="page patent-game-piece-main" data-patent-page="game-piece-stepped">
        {!canUseDb ? (
          <p className="muted" role="alert">
            Connect Supabase in <code className="inline-code">.env</code> to use this page.
          </p>
        ) : null}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : !tile ? (
          <p className="error" role="alert">
            Quest tile not found. <Link to="/tree">← Back to skill tree</Link>
          </p>
        ) : (
          <PatentLedger tile={tile} refresh={refresh} completionStatus={completion?.status} />
        )}
      </main>
    </div>
  )
}
