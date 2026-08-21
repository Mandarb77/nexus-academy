import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { isGuestBrowse } from '../../lib/schoolEmail'
import {
  BEYOND_BODY_MAX_CHARS,
  BEYOND_GUILD_TAGS,
  validateBeyondBody,
} from '../../lib/beyondTiles'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { BeyondGuildTag } from '../../types/beyondTile'

type Props = {
  onSubmitted?: () => void
}

export function BeyondTileProposalForm({ onSubmitted }: Props) {
  const { user, profile } = useAuth()
  const guestBrowse = isGuestBrowse(user?.email ?? profile?.email, profile)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [guildTags, setGuildTags] = useState<BeyondGuildTag[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const toggleTag = (tag: BeyondGuildTag) => {
    if (tag === 'All') {
      setGuildTags((prev) => (prev.includes('All') ? [] : ['All']))
      return
    }
    setGuildTags((prev) => {
      const withoutAll = prev.filter((t) => t !== 'All')
      if (withoutAll.includes(tag)) {
        return withoutAll.filter((t) => t !== tag)
      }
      return [...withoutAll, tag]
    })
  }

  const reset = () => {
    setTitle('')
    setBody('')
    setGuildTags([])
    setError(null)
    setSuccess(false)
    setOpen(false)
  }

  const submit = async () => {
    setError(null)
    setSuccess(false)
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }
    const bodyErr = validateBeyondBody(body)
    if (bodyErr) {
      setError(bodyErr)
      return
    }
    if (!guildTags.length) {
      setError('Pick at least one guild tag.')
      return
    }
    if (!isSupabaseConfigured || !user?.id) {
      setError('Sign in to propose a possibility.')
      return
    }
    if (guestBrowse) {
      setError('Use your kentshill.org Google account to propose a possibility.')
      return
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('beyond_tiles').insert({
      title: trimmedTitle,
      body: body.trim(),
      guild_tags: guildTags,
      status: 'pending',
      submitted_by: user.id,
      sort_order: 9999,
    })
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setTitle('')
    setBody('')
    setGuildTags([])
    setOpen(false)
    setSuccess(true)
    onSubmitted?.()
  }

  if (guestBrowse) {
    return (
      <p className="muted beyond-tiles-propose__guest">
        Use your @kentshill.org Google account to propose a possibility.
      </p>
    )
  }

  if (!open) {
    return (
      <div className="beyond-tiles-propose">
        {success ? (
          <p className="beyond-tiles-propose__success" role="status">
            Submitted — your teacher will review it.
          </p>
        ) : null}
        <button
          type="button"
          className="btn-secondary beyond-tiles-propose__trigger"
          onClick={() => {
            setSuccess(false)
            setOpen(true)
          }}
        >
          Propose a possibility
        </button>
      </div>
    )
  }

  return (
    <section className="beyond-tiles-propose card" aria-label="Propose a possibility">
      <h3 className="beyond-tiles-propose__heading">Propose a possibility</h3>

      <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
        <span className="patent-label">Title *</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short title"
        />
      </label>

      <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
        <span className="patent-label">Body *</span>
        <textarea
          rows={3}
          value={body}
          maxLength={BEYOND_BODY_MAX_CHARS}
          onChange={(e) => setBody(e.target.value)}
          placeholder="One or two sentences — what is the idea?"
        />
        <span className="muted" style={{ fontSize: '0.82rem' }}>
          {body.trim().length}/{BEYOND_BODY_MAX_CHARS} · one or two sentences only
        </span>
      </label>

      <fieldset className="beyond-tiles-propose__tags" style={{ border: 'none', padding: 0, margin: '0 0 0.75rem' }}>
        <legend className="patent-label" style={{ marginBottom: '0.4rem' }}>Guild tags *</legend>
        <div className="beyond-tiles-propose__tag-grid">
          {BEYOND_GUILD_TAGS.map((tag) => (
            <label key={tag} className="beyond-tiles-propose__tag-option">
              <input
                type="checkbox"
                checked={guildTags.includes(tag)}
                onChange={() => toggleTag(tag)}
              />
              {tag}
            </label>
          ))}
        </div>
      </fieldset>

      {error ? <p className="error" role="alert">{error}</p> : null}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void submit()}>
          {saving ? 'Submitting…' : 'Submit'}
        </button>
        <button type="button" className="btn-secondary" disabled={saving} onClick={reset}>
          Cancel
        </button>
      </div>
    </section>
  )
}
