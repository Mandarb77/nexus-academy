import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { MainNav } from '../components/MainNav'
import { PersonalGamePiecePatentContent } from '../components/PersonalGamePiecePatentContent'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'

export function PatentGamePiecePage() {
  const { tileId } = useParams<{ tileId: string }>()
  const { signOut } = useAuth()
  const { tiles, loading, refresh, completionByTileId, canUseDb } = useSkillTree()

  const tile = useMemo(() => {
    if (!tileId) return null
    return tiles.find((t) => String(t.id) === String(tileId)) ?? null
  }, [tiles, tileId])

  const completion = tile ? completionByTileId.get(tile.id) : undefined

  // No tileId in the URL at all — go home.
  if (!tileId) {
    return <Navigate to="/tree/forge" replace />
  }

  return (
    <div className="app-shell patent-game-piece-page">
      <header className="skill-tree-top">
        <MainNav />
        <div className="skill-tree-top-row skill-tree-top-row--guild">
          <div className="skill-tree-guild-page-head">
            <Link to="/tree/forge" className="skill-tree-back-link">
              ← Back to Forge skill tree
            </Link>
            <p className="muted skill-tree-guild-page-crumb">Patent application</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="page patent-game-piece-main" data-patent-page="game-piece-stepped">
        <h1 className="page-title" style={{ marginTop: 0 }}>
          Design Your Personal Game Piece
        </h1>
        <p className="muted page-subtitle">
          Step 1: answer both plan questions and submit for teacher approval. Step 2: after approval, complete and
          submit the checklist. Step 3: final two questions, then submit the quest.
        </p>

        {!canUseDb ? (
          <p className="muted" role="alert">
            Connect Supabase in <code className="inline-code">.env</code> to use this page.
          </p>
        ) : null}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : !tile ? (
          <p className="error" role="alert">
            Quest tile not found. <Link to="/tree/forge">← Back to Forge</Link>
          </p>
        ) : (
          <PersonalGamePiecePatentContent
            tile={tile}
            refresh={refresh}
            completionStatus={completion?.status}
          />
        )}
      </main>
    </div>
  )
}
