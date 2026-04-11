import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { DevTestTwoStageQuestContent } from '../components/DevTestTwoStageQuestContent'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { isDevTestTwoStageTile } from '../lib/devTestTwoStageQuest'
import { skillTreeGuildModifier } from '../lib/guildTree'

export function PatentDevTestTwoStagePage() {
  const { tileId } = useParams<{ tileId: string }>()
  const { signOut } = useAuth()
  const { tiles, loading, refresh, completionByTileId, canUseDb } = useSkillTree()

  const tile = useMemo(() => {
    if (!tileId) return null
    return tiles.find((t) => String(t.id) === String(tileId)) ?? null
  }, [tiles, tileId])

  const completion = tile ? completionByTileId.get(tile.id) : undefined
  const mod = tile ? skillTreeGuildModifier(tile.guild) : 'default'
  const backPath = mod === 'forge' ? '/tree/forge' : mod === 'prism' ? '/tree/prism' : mod === 'folded' ? '/tree/folded' : '/tree'
  const backLabel = tile ? `← Back to ${tile.guild} skill tree` : '← Back'

  if (!import.meta.env.DEV) {
    return <Navigate to="/tree" replace />
  }

  if (!tileId) return null

  return (
    <div className="app-shell patent-game-piece-page">
      <header className="skill-tree-top">
        <MainNav />
        <div className="skill-tree-top-row skill-tree-top-row--guild">
          <div className="skill-tree-guild-page-head">
            <Link to={backPath} className="skill-tree-back-link">
              {backLabel}
            </Link>
            <p className="muted skill-tree-guild-page-crumb">Dev test quest (local only)</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="page patent-game-piece-main">
        {tile ? <h1 className="page-title" style={{ marginTop: 0 }}>{tile.skill_name}</h1> : null}
        <p className="muted page-subtitle">Two-step approval flow for local testing only.</p>

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
        ) : !isDevTestTwoStageTile(tile) ? (
          <p className="error" role="alert">
            This URL is only for the dev test quest tile.
          </p>
        ) : (
          <DevTestTwoStageQuestContent tile={tile} refresh={refresh} completionStatus={completion?.status} />
        )}
      </main>
    </div>
  )
}
