/*
 * Learn the tools admin (`/teacher/learn`)
 */

import { useCallback, useEffect, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import {
  groupResourcesByGuild,
  isStudentSubmittedResource,
  LEARN_DESCRIPTION_MAX_CHARS,
  LEARN_TOOL_GUILDS,
  LEARN_TOOL_GUILD_HEADINGS,
  normalizeLearnToolRow,
  validateLearnDescription,
  validateLearnUrl,
} from '../lib/learnToolResources'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { LearnToolGuild, LearnToolResourceRow } from '../types/learnToolResource'

const BLANK = {
  title: '',
  description: '',
  url: '',
  guild: 'Forge' as LearnToolGuild,
}

export function TeacherLearnToolsPage() {
  const { signOut } = useAuth()
  const [pending, setPending] = useState<LearnToolResourceRow[]>([])
  const [approved, setApproved] = useState<LearnToolResourceRow[]>([])
  const [archived, setArchived] = useState<LearnToolResourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState(BLANK.title)
  const [description, setDescription] = useState(BLANK.description)
  const [url, setUrl] = useState(BLANK.url)
  const [guild, setGuild] = useState<LearnToolGuild>(BLANK.guild)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [approveCreditById, setApproveCreditById] = useState<Record<string, string>>({})

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('learn_tool_resources')
      .select('id, guild, title, description, url, credit_line, status, submitted_by, sort_order, created_at, updated_at')
      .order('guild', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true })
    setLoading(false)
    if (error) {
      setLoadError(error.message)
      return
    }
    setLoadError(null)
    const rows = (data ?? []).map((r) => normalizeLearnToolRow(r as Record<string, unknown>))
    setPending(rows.filter((r) => r.status === 'pending'))
    setApproved(rows.filter((r) => r.status === 'approved'))
    setArchived(rows.filter((r) => r.status === 'archived'))
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const approvedByGuild = groupResourcesByGuild(approved)

  const resetBuilder = () => {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setUrl('')
    setGuild('Forge')
    setSaveError(null)
    setSaveSuccess(null)
  }

  const startAddForGuild = (g: LearnToolGuild) => {
    resetBuilder()
    setGuild(g)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const loadIntoBuilder = (row: LearnToolResourceRow) => {
    setEditingId(row.id)
    setTitle(row.title)
    setDescription(row.description)
    setUrl(row.url)
    setGuild(row.guild)
    setSaveError(null)
    setSaveSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveEntry = async () => {
    setSaveError(null)
    setSaveSuccess(null)
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setSaveError('Title is required.')
      return
    }
    const descErr = validateLearnDescription(description)
    if (descErr) {
      setSaveError(descErr)
      return
    }
    const urlErr = validateLearnUrl(url)
    if (urlErr) {
      setSaveError(urlErr)
      return
    }

    setSaving(true)
    const payload = {
      guild,
      title: trimmedTitle,
      description: description.trim(),
      url: url.trim(),
      updated_at: new Date().toISOString(),
    }

    if (editingId) {
      const { error } = await supabase.from('learn_tool_resources').update(payload).eq('id', editingId)
      setSaving(false)
      if (error) {
        setSaveError(error.message)
        return
      }
      setSaveSuccess('Resource updated.')
      resetBuilder()
      await loadAll()
      return
    }

    const guildCount = approvedByGuild.get(guild)?.length ?? 0
    const { error } = await supabase.from('learn_tool_resources').insert({
      ...payload,
      status: 'approved',
      sort_order: guildCount + 1,
      submitted_by: null,
      credit_line: null,
    })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    setSaveSuccess('Resource added.')
    resetBuilder()
    await loadAll()
  }

  const approvePending = async (row: LearnToolResourceRow) => {
    if (isStudentSubmittedResource(row)) {
      const credit = (approveCreditById[row.id] ?? '').trim()
      if (!credit) {
        alert('Write the credit line exactly how it should appear (e.g. CRC — Build Studio Fall \'26).')
        return
      }
      setActionId(row.id)
      const guildCount = approved.filter((r) => r.guild === row.guild).length
      const { error } = await supabase
        .from('learn_tool_resources')
        .update({
          status: 'approved',
          credit_line: credit,
          sort_order: guildCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      setActionId(null)
      if (error) {
        alert(`Approve failed: ${error.message}`)
        return
      }
    } else {
      setActionId(row.id)
      const guildCount = approved.filter((r) => r.guild === row.guild).length
      const { error } = await supabase
        .from('learn_tool_resources')
        .update({ status: 'approved', sort_order: guildCount + 1, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      setActionId(null)
      if (error) {
        alert(`Approve failed: ${error.message}`)
        return
      }
    }
    await loadAll()
  }

  const rejectPending = async (row: LearnToolResourceRow) => {
    setActionId(row.id)
    const { error } = await supabase.from('learn_tool_resources').delete().eq('id', row.id)
    setActionId(null)
    if (error) {
      alert(`Reject failed: ${error.message}`)
      return
    }
    await loadAll()
  }

  const archiveEntry = async (row: LearnToolResourceRow) => {
    setActionId(row.id)
    const { error } = await supabase
      .from('learn_tool_resources')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', row.id)
    setActionId(null)
    if (error) {
      alert(`Archive failed: ${error.message}`)
      return
    }
    if (editingId === row.id) resetBuilder()
    await loadAll()
  }

  const restoreEntry = async (row: LearnToolResourceRow) => {
    setActionId(row.id)
    const { error } = await supabase
      .from('learn_tool_resources')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', row.id)
    setActionId(null)
    if (error) {
      alert(`Restore failed: ${error.message}`)
      return
    }
    await loadAll()
  }

  return (
    <div className="app-shell bench-chrome teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title bench-page-title">Learn the tools</h1>
            <p className="muted teacher-panel-subtitle">
              Guild resource links for the Field Guide. Approve student submissions with a custom credit line.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="teacher-panel-section" style={{ maxWidth: '720px' }}>
        <h2 className="teacher-panel-section-title">
          {editingId ? `Editing: ${title || 'Resource'}` : 'Add resource'}
        </h2>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Guild *</span>
          <select value={guild} onChange={(e) => setGuild(e.target.value as LearnToolGuild)}>
            {LEARN_TOOL_GUILDS.map((g) => (
              <option key={g} value={g}>
                {LEARN_TOOL_GUILD_HEADINGS[g]}
              </option>
            ))}
          </select>
        </label>

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

        <label className="patent-field" style={{ display: 'block', marginBottom: '1rem' }}>
          <span className="patent-label">URL *</span>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>

        {saveError ? <p className="error" role="alert">{saveError}</p> : null}
        {saveSuccess ? <p style={{ color: '#16a34a', fontWeight: 600 }} role="status">{saveSuccess}</p> : null}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveEntry()}>
            {saving ? 'Saving…' : editingId ? 'Update resource' : 'Add resource'}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetBuilder}>Cancel edit</button>
          ) : null}
        </div>
      </section>

      {pending.length > 0 ? (
        <section className="teacher-panel-section">
          <h2 className="teacher-panel-section-title">Awaiting approval</h2>
          <ul className="teacher-panel-list" style={{ gap: '0.65rem' }}>
            {pending.map((row) => (
              <li key={row.id} className="card teacher-panel-item">
                <div className="teacher-panel-item-main">
                  <p style={{ fontWeight: 700, margin: 0 }}>{row.title}</p>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>{row.description}</p>
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.82rem' }}>
                    {LEARN_TOOL_GUILD_HEADINGS[row.guild]} ·{' '}
                    <a href={row.url} target="_blank" rel="noopener noreferrer">{row.url}</a>
                  </p>
                  {isStudentSubmittedResource(row) ? (
                    <label className="patent-field" style={{ display: 'block', marginTop: '0.65rem' }}>
                      <span className="patent-label">Credit line *</span>
                      <input
                        type="text"
                        value={approveCreditById[row.id] ?? ''}
                        onChange={(e) =>
                          setApproveCreditById((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        placeholder="CRC — Build Studio Fall '26"
                      />
                      <span className="muted" style={{ fontSize: '0.82rem' }}>
                        Appears as: Submitted by [this line]
                      </span>
                    </label>
                  ) : null}
                </div>
                <div className="teacher-panel-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '0.88rem' }}
                    disabled={actionId === row.id}
                    onClick={() => void approvePending(row)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.88rem', color: '#b91c1c' }}
                    disabled={actionId === row.id}
                    onClick={() => void rejectPending(row)}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loading ? (
        <section className="teacher-panel-section">
          <p className="muted">Loading…</p>
        </section>
      ) : loadError ? (
        <section className="teacher-panel-section">
          <p className="error" role="alert">{loadError}</p>
        </section>
      ) : (
        LEARN_TOOL_GUILDS.map((g) => {
          const links = approvedByGuild.get(g) ?? []
          return (
            <section key={g} className="teacher-panel-section">
              <div className="teacher-learn-guild-head">
                <h2 className="teacher-panel-section-title" style={{ margin: 0 }}>
                  {LEARN_TOOL_GUILD_HEADINGS[g]}
                </h2>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem' }}
                  onClick={() => startAddForGuild(g)}
                >
                  Add resource
                </button>
              </div>
              {links.length === 0 ? (
                <p className="muted">No resources yet.</p>
              ) : (
                <ul className="teacher-panel-list" style={{ gap: '0.65rem' }}>
                  {links.map((row) => (
                    <li key={row.id} className="card teacher-panel-item">
                      <div className="teacher-panel-item-main">
                        <p style={{ fontWeight: 700, margin: 0 }}>{row.title}</p>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>{row.description}</p>
                        <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.82rem' }}>
                          <a href={row.url} target="_blank" rel="noopener noreferrer">{row.url}</a>
                        </p>
                        {isStudentSubmittedResource(row) && row.credit_line?.trim() ? (
                          <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                            Submitted by {row.credit_line.trim()}
                          </p>
                        ) : null}
                      </div>
                      <div className="teacher-panel-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: '0.88rem' }}
                          onClick={() => loadIntoBuilder(row)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '0.88rem' }}
                          disabled={actionId === row.id}
                          onClick={() => void archiveEntry(row)}
                        >
                          Archive
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })
      )}

      {archived.length > 0 ? (
        <section className="teacher-panel-section">
          <h2 className="teacher-panel-section-title">Archived</h2>
          <ul className="teacher-panel-list" style={{ gap: '0.65rem' }}>
            {archived.map((row) => (
              <li key={row.id} className="card teacher-panel-item" style={{ opacity: 0.85 }}>
                <div className="teacher-panel-item-main">
                  <p style={{ fontWeight: 700, margin: 0 }}>{row.title}</p>
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.82rem' }}>
                    {LEARN_TOOL_GUILD_HEADINGS[row.guild]} · hidden from Field Guide
                  </p>
                </div>
                <div className="teacher-panel-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.88rem' }}
                    disabled={actionId === row.id}
                    onClick={() => void restoreEntry(row)}
                  >
                    Restore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
