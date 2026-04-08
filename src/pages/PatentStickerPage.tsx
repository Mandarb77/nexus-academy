import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { MainNav } from '../components/MainNav'
import { StickerPatentContent } from '../components/StickerPatentContent'
import { useAuth } from '../contexts/AuthContext'
import { useSkillTree } from '../hooks/useSkillTree'
import { isStickerQuestLocked } from '../lib/stickerTile'

export function PatentStickerPage() {
  const { tileId } = useParams<{ tileId: string }>()
  const { signOut } = useAuth()
  const { tiles, loading, refresh, completionByTileId, canUseDb } = useSkillTree()

  const tile = useMemo(() => {
    if (!tileId) return null
    return tiles.find((t) => String(t.id) === String(tileId)) ?? null
  }, [tiles, tileId])

  const completion = tile ? completionByTileId.get(tile.id) : undefined
  const stickerLocked = Boolean(tile && isStickerQuestLocked(tile))

  if (!tileId) return <Navigate to="/tree/folded" replace />

  return (
    <div className="app-shell patent-game-piece-page">
      <header className="skill-tree-top">
        <MainNav />
        <div className="skill-tree-top-row skill-tree-top-row--guild">
          <div className="skill-tree-guild-page-head">
            <Link to="/tree/folded" className="skill-tree-back-link">
              ← Back to Folded Path skill tree
            </Link>
            <p className="muted skill-tree-guild-page-crumb">Patent application</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="page patent-game-piece-main" data-patent-page="sticker-stepped">
        <h1 className="page-title" style={{ marginTop: 0 }}>Design Your Personal Sticker</h1>
        {stickerLocked ? (
          <p className="muted page-subtitle">This quest is not available yet.</p>
        ) : (
          <p className="muted page-subtitle">
            Step 1: answer both plan questions and submit for teacher approval. Step 2: after approval, complete and
            submit the checklist. Step 3: final two questions, then submit the quest.
          </p>
        )}

        {!canUseDb ? (
          <p className="muted" role="alert">
            Connect Supabase in <code className="inline-code">.env</code> to use this page.
          </p>
        ) : null}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : !tile ? (
          <p className="error" role="alert">
            Quest tile not found. <Link to="/tree/folded">← Back to Folded Path</Link>
          </p>
        ) : stickerLocked ? (
          <div className="guild-coming-soon-box guild-coming-soon-box--inline">
            <p className="guild-coming-soon-box__icon">🔒</p>
            <p className="guild-coming-soon-box__heading">Coming soon</p>
            <p className="guild-coming-soon-box__body">
              Design Your Personal Sticker is not open yet. Check back later — the quest will return when it is ready.
            </p>
            <p className="muted" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <Link to="/tree/folded">← Back to Folded Path skill tree</Link>
            </p>
          </div>
        ) : (
          <StickerPatentContent tile={tile} refresh={refresh} completionStatus={completion?.status} />
        )}
      </main>
    </div>
  )
}
