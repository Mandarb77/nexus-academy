/*
 * Tool glossary admin (`/teacher/tools`)
 * Hints for tile tool-chips; students will look up by tool_name when click-to-hint ships.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { TeacherEconomyTools } from '../components/TeacherEconomyTools'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { ToolGlossaryEntry } from '../types/toolGlossary'

const BLANK = {
  toolName: '',
  software: 'Tinkercad',
  hint: '',
  active: true,
}

export function TeacherToolGlossaryPage() {
  const { signOut } = useAuth()
  const [rows, setRows] = useState<ToolGlossaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [toolName, setToolName] = useState(BLANK.toolName)
  const [software, setSoftware] = useState(BLANK.software)
  const [hint, setHint] = useState(BLANK.hint)
  const [active, setActive] = useState(BLANK.active)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const softwareOptions = useMemo(() => {
    const fromRows = rows.map((r) => r.software.trim()).filter(Boolean)
    const base = ['Tinkercad', 'Fusion 360', 'Carbide Create', 'MakeCode']
    return [...new Set([...base, ...fromRows])].sort((a, b) => a.localeCompare(b))
  }, [rows])

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('tool_glossary')
      .select('id, tool_name, software, hint, active')
      .order('software')
      .order('tool_name')
    setLoading(false)
    if (error) {
      setLoadError(error.message)
      return
    }
    setLoadError(null)
    setRows((data ?? []) as ToolGlossaryEntry[])
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const resetBuilder = () => {
    setEditingId(null)
    setToolName('')
    setSoftware('Tinkercad')
    setHint('')
    setActive(true)
    setSaveError(null)
    setSaveSuccess(null)
  }

  const loadIntoBuilder = (row: ToolGlossaryEntry) => {
    setEditingId(row.id)
    setToolName(row.tool_name)
    setSoftware(row.software)
    setHint(row.hint)
    setActive(row.active)
    setSaveError(null)
    setSaveSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveEntry = async () => {
    setSaveError(null)
    setSaveSuccess(null)
    const name = toolName.trim()
    const app = software.trim()
    if (!name) {
      setSaveError('Tool name is required — must match the chip label exactly.')
      return
    }
    if (!app) {
      setSaveError('Software is required (e.g. Tinkercad).')
      return
    }
    if (!hint.trim()) {
      setSaveError('Hint is required.')
      return
    }

    const payload = {
      tool_name: name,
      software: app,
      hint: hint.trim(),
      active,
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('tool_glossary').update(payload).eq('id', editingId)
        if (error) throw error
        setSaveSuccess('Entry updated.')
      } else {
        const { error } = await supabase.from('tool_glossary').insert(payload)
        if (error) throw error
        setSaveSuccess('Entry created.')
        resetBuilder()
      }
      await loadAll()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const deleteEntry = async (id: string, label: string) => {
    if (!window.confirm(`Delete '${label}' permanently? Tool chips using this label will have no hint.`)) return
    setDeletingId(id)
    const { error } = await supabase.from('tool_glossary').delete().eq('id', id)
    setDeletingId(null)
    if (error) {
      alert(`Delete failed: ${error.message}`)
      return
    }
    if (editingId === id) resetBuilder()
    await loadAll()
  }

  return (
    <div className="app-shell bench-chrome teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title bench-page-title">Teacher tools</h1>
            <p className="muted teacher-panel-subtitle">
              Student corrections and tool-glossary administration.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <TeacherEconomyTools />

      <section className="teacher-panel-section" style={{ maxWidth: '720px' }}>
        <h2 className="teacher-panel-section-title">
          {editingId ? `Editing glossary entry: ${toolName || 'Tool'}` : 'New glossary entry'}
        </h2>
        <p className="muted teacher-panel-award-note">
          Kid-facing hints for tile tool-chips. Tool names must match the chip label exactly.
        </p>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Tool name *</span>
          <input
            type="text"
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
            placeholder="e.g. Scale, Sketch (SVG)"
          />
          <span className="muted" style={{ fontSize: '0.82rem' }}>Must match the chip label on quest tiles.</span>
        </label>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Software *</span>
          <input
            type="text"
            list="tool-glossary-software"
            value={software}
            onChange={(e) => setSoftware(e.target.value)}
            placeholder="Tinkercad"
          />
          <datalist id="tool-glossary-software">
            {softwareOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Hint *</span>
          <textarea rows={4} value={hint} onChange={(e) => setHint(e.target.value)} />
          <span className="muted" style={{ fontSize: '0.82rem' }}>Short, kid-facing — what does this tool do?</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', marginBottom: '1rem' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active (available for chip lookup)
        </label>

        {saveError ? <p className="error" role="alert">{saveError}</p> : null}
        {saveSuccess ? <p style={{ color: '#16a34a', fontWeight: 600 }} role="status">{saveSuccess}</p> : null}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveEntry()}>
            {saving ? 'Saving…' : editingId ? 'Update entry' : 'Create entry'}
          </button>
          {editingId ? (
            <>
              <button type="button" className="btn-secondary" onClick={resetBuilder}>Cancel edit</button>
              <button
                type="button"
                className="btn-secondary"
                style={{ color: '#b91c1c' }}
                disabled={deletingId === editingId}
                onClick={() => void deleteEntry(editingId, toolName.trim() || 'this tool')}
              >
                {deletingId === editingId ? 'Deleting…' : 'Delete entry'}
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section className="teacher-panel-section">
        <h2 className="teacher-panel-section-title">Glossary entries</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : loadError ? (
          <p className="error" role="alert">{loadError}</p>
        ) : rows.length === 0 ? (
          <p className="muted">No entries yet — apply migration 050 or create one above.</p>
        ) : (
          <ul className="teacher-panel-list" style={{ gap: '0.65rem' }}>
            {rows.map((row) => (
              <li key={row.id} className="card teacher-panel-item">
                <div className="teacher-panel-item-main">
                  <p style={{ fontWeight: 700, margin: 0 }}>
                    {row.tool_name}{!row.active ? ' (inactive)' : ''}
                  </p>
                  <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.88rem' }}>
                    {row.software}
                  </p>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>{row.hint}</p>
                </div>
                <div className="teacher-panel-actions">
                  <button type="button" className="btn-primary" style={{ fontSize: '0.88rem' }} onClick={() => loadIntoBuilder(row)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.88rem', color: '#b91c1c' }}
                    disabled={deletingId === row.id}
                    onClick={() => void deleteEntry(row.id, row.tool_name)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
