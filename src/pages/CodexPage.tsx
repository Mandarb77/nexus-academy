/*
 * Codex / quest archive placeholder (`/codex`, legacy `/portfolio` redirect)
 *
 * Points students to Journey for the real approved-work timeline. Kept as a lightweight
 * route so bookmarks and nav copy can migrate without breaking deep links.
 */

import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'

export function CodexPage() {
  const { signOut } = useAuth()

  return (
    <div className="app-shell">
      <MainNav />
      <main className="page">
        <header className="page-header">
          <h1 className="page-title">Quest archive</h1>
          <p className="muted page-subtitle">
            Use Journey for your approved completion timeline and workshop history.
          </p>
          <button type="button" className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => signOut()}>
            Sign out
          </button>
        </header>
      </main>
    </div>
  )
}
