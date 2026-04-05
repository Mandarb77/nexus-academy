import { useRef, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function DashboardPage() {
  const { profile, user, signOut } = useAuth()

  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const inviteLinkRef = useRef<HTMLInputElement>(null)

  const displayName =
    profile?.display_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Teacher'

  const generateInvite = async () => {
    if (!isSupabaseConfigured || !user?.id) return
    setGeneratingInvite(true)
    setInviteError(null)
    setInviteLink(null)
    setInviteCopied(false)
    try {
      const { data, error } = await supabase
        .from('teacher_invites')
        .insert({ created_by: user.id })
        .select('token')
        .single()
      if (error) throw error
      const token = (data as { token: string }).token
      setInviteLink(`${window.location.origin}/join/${token}`)
      setTimeout(() => inviteLinkRef.current?.select(), 50)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not generate invite link.'
      setInviteError(msg)
      console.error('generateInvite:', e)
    } finally {
      setGeneratingInvite(false)
    }
  }

  const copyLink = () => {
    if (!inviteLink) return
    const doSet = () => {
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 3000)
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink).then(doSet).catch(() => {
        inviteLinkRef.current?.select()
        document.execCommand('copy')
        doSet()
      })
    } else {
      inviteLinkRef.current?.select()
      document.execCommand('copy')
      doSet()
    }
  }

  return (
    <div className="app-shell">
      <MainNav variant="teacher" />
      <header className="dash-header teacher-dash-header">
        <div>
          <h1>Nexus Academy at Kents Hill</h1>
          <p className="muted">
            Signed in as <strong>{displayName}</strong>
            <span className="role-pill role-teacher">Teacher</span>
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <section className="card">
        <h2>Your stats</h2>
        <dl className="stat-grid" aria-label="Your progress">
          <div className="stat">
            <dt>WP</dt>
            <dd>{profile?.wp ?? 0}</dd>
          </div>
          <div className="stat stat--gold">
            <dt>Gold</dt>
            <dd>{profile?.gold ?? 0}</dd>
          </div>
          <div className="stat">
            <dt>Rank</dt>
            <dd>{profile?.rank ?? 'Initiate'}</dd>
          </div>
        </dl>
        <p className="muted dash-blurb">
          Use <strong>Teacher panel</strong> to approve or return student skill completions.
        </p>
      </section>

      {/* ── Invite a teacher ── */}
      <section className="card" style={{ marginTop: '1.25rem' }}>
        <h2 style={{ marginTop: 0 }}>Invite a teacher</h2>
        <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.92rem' }}>
          Generate a one-time link and send it to someone you want to give teacher access.
          When they sign in through the link their account is automatically upgraded. Each link works once only.
        </p>

        <button
          type="button"
          className="btn-primary"
          disabled={generatingInvite}
          onClick={() => void generateInvite()}
        >
          {generatingInvite ? 'Generating…' : 'Generate invite link'}
        </button>

        {inviteError ? (
          <p className="error" style={{ marginTop: '0.75rem' }}>
            {inviteError}
            {inviteError.includes('relation') || inviteError.includes('does not exist') ? (
              <span> — run <code>npx supabase db push</code> to apply the latest migrations.</span>
            ) : null}
          </p>
        ) : null}

        {inviteLink ? (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '1rem', background: 'rgba(99,102,241,0.07)', border: '1.5px solid rgba(99,102,241,0.3)', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem' }}>
              ✅ Ready — copy and send this link:
            </p>

            {/* Visible selectable text */}
            <p
              style={{ margin: 0, wordBreak: 'break-all', fontSize: '0.87rem', fontFamily: 'monospace', background: 'var(--card-bg,#fff)', border: '1px solid rgba(0,0,0,0.12)', padding: '0.55rem 0.75rem', borderRadius: '6px', userSelect: 'all', cursor: 'text' }}
              onClick={() => {
                const sel = window.getSelection()
                if (sel && inviteLinkRef.current) {
                  inviteLinkRef.current.select()
                }
              }}
            >
              {inviteLink}
            </p>

            {/* Hidden input for programmatic clipboard copy */}
            <input
              ref={inviteLinkRef}
              type="text"
              readOnly
              value={inviteLink}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
              aria-hidden="true"
            />

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={copyLink}
              >
                {inviteCopied ? '✓ Copied!' : '📋 Copy link'}
              </button>

              <a
                href={`mailto:?subject=You're invited to Nexus Academy at Kents Hill as a teacher&body=You have been invited as a teacher on Nexus Academy at Kents Hill.%0A%0AClick this link to activate your account:%0A${encodeURIComponent(inviteLink)}`}
                className="btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                ✉️ Email invite
              </a>

              <button
                type="button"
                className="btn-secondary"
                style={{ marginLeft: 'auto', opacity: 0.55 }}
                onClick={() => { setInviteLink(null); setInviteCopied(false) }}
              >
                Dismiss
              </button>
            </div>

            <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
              This link can only be used once. Generate a new link for each person you invite.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
