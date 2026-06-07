import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  LEARN_DESCRIPTION_MAX_CHARS,
  LEARN_TOOL_GUILDS,
  LEARN_TOOL_GUILD_HEADINGS,
  validateLearnDescription,
  validateLearnUrl,
} from '../../lib/learnToolResources'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { LearnToolGuild } from '../../types/learnToolResource'

type Props = {
  onSubmitted?: () => void
}

export function ToolResourceProposalForm({ onSubmitted }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [guild, setGuild] = useState<LearnToolGuild>('Forge')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resetFields = () => {
    setTitle('')
    setDescription('')
    setUrl('')
    setGuild('Forge')
    setError(null)
  }

  const submit = async () => {
    setError(null)
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }
    const descErr = validateLearnDescription(description)
    if (descErr) {
      setError(descErr)
      return
    }
    const urlErr = validateLearnUrl(url)
    if (urlErr) {
      setError(urlErr)
      return
    }
    if (!isSupabaseConfigured || !user?.id) {
      setError('Sign in to submit a resource.')
      return
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('learn_tool_resources').insert({
      guild,
      title: trimmedTitle,
      description: description.trim(),
      url: url.trim(),
      status: 'pending',
      submitted_by: user.id,
      sort_order: 9999,
    })
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    resetFields()
    setOpen(false)
    setSuccess(true)
    onSubmitted?.()
  }

  if (!open) {
    return (
      <div className="learn-tools-propose">
        {success ? (
          <p className="learn-tools-propose__success" role="status">
            Submitted — your teacher will review it.
          </p>
        ) : null}
        <button
          type="button"
          className="btn-secondary learn-tools-propose__trigger"
          onClick={() => {
            setSuccess(false)
            setOpen(true)
          }}
        >
          Share a resource
        </button>
      </div>
    )
  }

  return (
    <section className="learn-tools-propose card" aria-label="Share a resource">
      <h4 className="learn-tools-propose__heading">Share a resource</h4>

      <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
        <span className="patent-label">Title *</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
        <span className="patent-label">One-sentence description *</span>
        <textarea
          rows={2}
          value={description}
          maxLength={LEARN_DESCRIPTION_MAX_CHARS}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
        <span className="patent-label">URL *</span>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </label>

      <label className="patent-field" style={{ display: 'block', marginBottom: '1rem' }}>
        <span className="patent-label">Guild *</span>
        <select value={guild} onChange={(e) => setGuild(e.target.value as LearnToolGuild)}>
          {LEARN_TOOL_GUILDS.map((g) => (
            <option key={g} value={g}>
              {LEARN_TOOL_GUILD_HEADINGS[g]}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="error" role="alert">{error}</p> : null}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void submit()}>
          {saving ? 'Submitting…' : 'Submit'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={() => {
            resetFields()
            setOpen(false)
          }}
        >
          Cancel
        </button>
      </div>
    </section>
  )
}
