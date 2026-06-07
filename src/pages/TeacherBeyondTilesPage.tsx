/*
 * Beyond the Tiles admin (`/teacher/beyond`)
 *
 * Teacher seeds, edits, archives entries; approves student proposals with custom credit line.
 */

import { useCallback, useEffect, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import {
  BEYOND_BODY_MAX_CHARS,
  BEYOND_GUILD_TAGS,
  formatBeyondGuildTags,
  isStudentSubmitted,
  normalizeBeyondRow,
  validateBeyondBody,
} from '../lib/beyondTiles'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { BeyondGuildTag, BeyondTileRow } from '../types/beyondTile'

const BLANK = {
  title: '',
  body: '',
  guildTags: [] as BeyondGuildTag[],
}

export function TeacherBeyondTilesPage() {
  const { signOut } = useAuth()
  const [pending, setPending] = useState<BeyondTileRow[]>([])
  const [approved, setApproved] = useState<BeyondTileRow[]>([])
  const [archived, setArchived] = useState<BeyondTileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState(BLANK.title)
  const [body, setBody] = useState(BLANK.body)
  const [guildTags, setGuildTags] = useState<BeyondGuildTag[]>(BLANK.guildTags)

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
      .from('beyond_tiles')
      .select('id, title, body, guild_tags, credit_line, status, submitted_by, sort_order, created_at, updated_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    setLoading(false)
    if (error) {
      setLoadError(error.message)
      return
    }
    setLoadError(null)
    const rows = (data ?? []).map((r) => normalizeBeyondRow(r as Record<string, unknown>))
    setPending(rows.filter((r) => r.status === 'pending'))
    setApproved(rows.filter((r) => r.status === 'approved'))
    setArchived(rows.filter((r) => r.status === 'archived'))
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const resetBuilder = () => {
    setEditingId(null)
    setTitle('')
    setBody('')
    setGuildTags([])
    setSaveError(null)
    setSaveSuccess(null)
  }

  const loadIntoBuilder = (row: BeyondTileRow) => {
    setEditingId(row.id)
    setTitle(row.title)
    setBody(row.body)
    setGuildTags(row.guild_tags.length ? row.guild_tags : [])
    setSaveError(null)
    setSaveSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleTag = (tag: BeyondGuildTag) => {
    if (tag === 'All') {
      setGuildTags((prev) => (prev.includes('All') ? [] : ['All']))
      return
    }
    setGuildTags((prev) => {
      const withoutAll = prev.filter((t) => t !== 'All')
      if (withoutAll.includes(tag)) return withoutAll.filter((t) => t !== tag)
      return [...withoutAll, tag]
    })
  }

  const saveEntry = async () => {
    setSaveError(null)
    setSaveSuccess(null)
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setSaveError('Title is required.')
      return
    }
    const bodyErr = validateBeyondBody(body)
    if (bodyErr) {
      setSaveError(bodyErr)
      return
    }
    if (!guildTags.length) {
      setSaveError('Pick at least one guild tag.')
      return
    }

    setSaving(true)
    const payload = {
      title: trimmedTitle,
      body: body.trim(),
      guild_tags: guildTags,
      updated_at: new Date().toISOString(),
    }

    if (editingId) {
      const { error } = await supabase.from('beyond_tiles').update(payload).eq('id', editingId)
      setSaving(false)
      if (error) {
        setSaveError(error.message)
        return
      }
      setSaveSuccess('Entry updated.')
      resetBuilder()
      await loadAll()
      return
    }

    const { error } = await supabase.from('beyond_tiles').insert({
      ...payload,
      status: 'approved',
      sort_order: approved.length + 1,
      submitted_by: null,
      credit_line: null,
    })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    setSaveSuccess('Entry added.')
    resetBuilder()
    await loadAll()
  }

  const approvePending = async (row: BeyondTileRow) => {
    if (isStudentSubmitted(row)) {
      const credit = (approveCreditById[row.id] ?? '').trim()
      if (!credit) {
        alert('Write the credit line exactly how it should appear (e.g. CRC — Build Studio Fall \'26).')
        return
      }
      setActionId(row.id)
      const { error } = await supabase
        .from('beyond_tiles')
        .update({
          status: 'approved',
          credit_line: credit,
          sort_order: approved.length + 1,
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
      const { error } = await supabase
        .from('beyond_tiles')
        .update({ status: 'approved', sort_order: approved.length + 1, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      setActionId(null)
      if (error) {
        alert(`Approve failed: ${error.message}`)
        return
      }
    }
    await loadAll()
  }

  const rejectPending = async (row: BeyondTileRow) => {
    setActionId(row.id)
    const { error } = await supabase.from('beyond_tiles').delete().eq('id', row.id)
    setActionId(null)
    if (error) {
      alert(`Reject failed: ${error.message}`)
      return
    }
    await loadAll()
  }

  const archiveEntry = async (row: BeyondTileRow) => {
    setActionId(row.id)
    const { error } = await supabase
      .from('beyond_tiles')
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

  const restoreEntry = async (row: BeyondTileRow) => {
    setActionId(row.id)
    const { error } = await supabase
      .from('beyond_tiles')
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
            <h1 className="teacher-panel-title bench-page-title">Beyond the Tiles</h1>
            <p className="muted teacher-panel-subtitle">
              Possibilities for the Field Guide — outside the quest tree. Approve student proposals with a custom credit line.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="teacher-panel-section" style={{ maxWidth: '720px' }}>
        <h2 className="teacher-panel-section-title">{editingId ? `Editing: ${title || 'Entry'}` : 'Add entry'}</h2>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Title *</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Body *</span>
          <textarea rows={3} value={body} maxLength={BEYOND_BODY_MAX_CHARS} onChange={(e) => setBody(e.target.value)} />
          <span className="muted" style={{ fontSize: '0.82rem' }}>One or two sentences max.</span>
        </label>

        <fieldset className="beyond-tiles-propose__tags" style={{ border: 'none', padding: 0, margin: '0 0 0.75rem' }}>
          <legend className="patent-label" style={{ marginBottom: '0.4rem' }}>Guild tags *</legend>
          <div className="beyond-tiles-propose__tag-grid">
            {BEYOND_GUILD_TAGS.map((tag) => (
              <label key={tag} className="beyond-tiles-propose__tag-option">
                <input type="checkbox" checked={guildTags.includes(tag)} onChange={() => toggleTag(tag)} />
                {tag}
              </label>
            ))}
          </div>
        </fieldset>

        {saveError ? <p className="error" role="alert">{saveError}</p> : null}
        {saveSuccess ? <p style={{ color: '#16a34a', fontWeight: 600 }} role="status">{saveSuccess}</p> : null}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveEntry()}>
            {saving ? 'Saving…' : editingId ? 'Update entry' : 'Add entry'}
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
              <li key={row.id} className="card teacher-panel-item beyond-tiles-teacher-pending">
                <div className="teacher-panel-item-main">
                  <p style={{ fontWeight: 700, margin: 0 }}>{row.title}</p>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>{row.body}</p>
                  <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                    {formatBeyondGuildTags(row.guild_tags)}
                  </p>
                  {isStudentSubmitted(row) ? (
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

      <section className="teacher-panel-section">
        <h2 className="teacher-panel-section-title">Approved entries</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : loadError ? (
          <p className="error" role="alert">{loadError}</p>
        ) : approved.length === 0 ? (
          <p className="muted">No approved entries yet.</p>
        ) : (
          <ul className="teacher-panel-list" style={{ gap: '0.65rem' }}>
            {approved.map((row) => (
              <li key={row.id} className="card teacher-panel-item">
                <div className="teacher-panel-item-main">
                  <p style={{ fontWeight: 700, margin: 0 }}>{row.title}</p>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>{row.body}</p>
                  <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                    {formatBeyondGuildTags(row.guild_tags)}
                  </p>
                  {isStudentSubmitted(row) && row.credit_line?.trim() ? (
                    <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                      Submitted by {row.credit_line.trim()}
                    </p>
                  ) : null}
                </div>
                <div className="teacher-panel-actions">
                  <button type="button" className="btn-primary" style={{ fontSize: '0.88rem' }} onClick={() => loadIntoBuilder(row)}>
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

      {archived.length > 0 ? (
        <section className="teacher-panel-section">
          <h2 className="teacher-panel-section-title">Archived</h2>
          <ul className="teacher-panel-list" style={{ gap: '0.65rem' }}>
            {archived.map((row) => (
              <li key={row.id} className="card teacher-panel-item" style={{ opacity: 0.85 }}>
                <div className="teacher-panel-item-main">
                  <p style={{ fontWeight: 700, margin: 0 }}>{row.title}</p>
                  <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.82rem' }}>Hidden from Field Guide</p>
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
