import { useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function TeacherResetPage() {
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const fullReset = async () => {
    if (!isSupabaseConfigured || busy) return
    setMessage(null)
    const ok = window.confirm(
      'This will reset all student WP, gold, rank, and completions. This cannot be undone. Are you sure?',
    )
    if (!ok) return

    setBusy(true)
    const ZERO_UUID = '00000000-0000-0000-0000-000000000000'

    // 1) profiles
    {
      const { error } = await supabase
        .from('profiles')
        .update({ wp: 0, gold: 0, rank: 'Initiate' })
        .neq('id', ZERO_UUID)
      if (error) {
        console.error('full reset: profiles update failed:', error)
        setMessage(`Reset failed updating profiles: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: profiles updated')
    }

    // 2) skill_completions
    {
      const { error } = await supabase
        .from('skill_completions')
        .delete()
        .gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: skill_completions delete failed:', error)
        setMessage(`Reset failed deleting skill completions: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: skill_completions deleted')
    }

    // 3) patents
    {
      const { error } = await supabase.from('patents').delete().gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: patents delete failed:', error)
        setMessage(`Reset failed deleting patents: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: patents deleted')
    }

    // 4) inventory
    {
      const { error } = await supabase.from('inventory').delete().gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: inventory delete failed:', error)
        setMessage(`Reset failed deleting inventory: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: inventory deleted')
    }

    // 5) redemption_requests
    {
      const { error } = await supabase
        .from('redemption_requests')
        .delete()
        .gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: redemption_requests delete failed:', error)
        setMessage(`Reset failed deleting redemption requests: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: redemption_requests deleted')
    }

    // 6) gold_purchases
    {
      const { error } = await supabase.from('gold_purchases').delete().gt('created_at', '0001-01-01T00:00:00Z')
      if (error) {
        console.error('full reset: gold_purchases delete failed:', error)
        setMessage(`Reset failed deleting gold purchases: ${error.message}`)
        setBusy(false)
        return
      }
      console.log('full reset: gold_purchases deleted')
    }

    setBusy(false)
    setMessage('Full reset complete.')
  }

  return (
    <div className="app-shell teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title">Teacher reset</h1>
            <p className="muted teacher-panel-subtitle">
              Destructive tools for clearing student progress and shop data.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <p className="muted" role="alert">
          Connect Supabase in <code className="inline-code">.env</code> to use reset tools.
        </p>
      ) : null}

      {message ? (
        <p className="muted" role="status">
          {message}
        </p>
      ) : null}

      <section className="teacher-panel-section" aria-labelledby="teacher-reset-full-heading">
        <h2 id="teacher-reset-full-heading" className="teacher-panel-section-title">
          Full reset
        </h2>
        <button
          type="button"
          className="btn-danger"
          disabled={!isSupabaseConfigured || busy}
          onClick={() => void fullReset()}
        >
          {busy ? 'Working…' : 'Full reset'}
        </button>
      </section>
    </div>
  )
}

