import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'

export function CodexPage() {
  const { signOut } = useAuth()

  return (
    <div className="app-shell">
      <MainNav />
      <main className="page">
        <header className="page-header">
          <h1 className="page-title">Codex</h1>
          <p className="muted page-subtitle">
            Your quest archive and patent work. Use Journey for your approved completion timeline.
          </p>
          <button type="button" className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => signOut()}>
            Sign out
          </button>
        </header>
      </main>
    </div>
  )
}
