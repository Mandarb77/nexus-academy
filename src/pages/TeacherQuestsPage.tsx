import { useCallback, useEffect, useRef, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { TileRow, StepConfig } from '../types/tile'

const GUILDS = ['Forge', 'Prism', 'Folded Path'] as const
type GuildOption = (typeof GUILDS)[number]

type QuestRow = TileRow & { steps: StepConfig[] }

type BuilderStep = StepConfig & { tempId: string }

function makeId() {
  return Math.random().toString(36).slice(2)
}

const BLANK_BUILDER: {
  title: string
  guild: GuildOption
  wpValue: number
  goldValue: number
  steps: BuilderStep[]
} = {
  title: '',
  guild: 'Forge',
  wpValue: 20,
  goldValue: 10,
  steps: [],
}

export function TeacherQuestsPage() {
  const { signOut } = useAuth()
  const [quests, setQuests] = useState<QuestRow[]>([])
  const [loadingQuests, setLoadingQuests] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Builder
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState(BLANK_BUILDER.title)
  const [guild, setGuild] = useState<GuildOption>(BLANK_BUILDER.guild)
  const [wpValue, setWpValue] = useState(BLANK_BUILDER.wpValue)
  const [goldValue, setGoldValue] = useState(BLANK_BUILDER.goldValue)
  const [steps, setSteps] = useState<BuilderStep[]>(BLANK_BUILDER.steps)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const loadQuests = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoadingQuests(false); return }
    setLoadingQuests(true)
    const { data, error } = await supabase
      .from('tiles')
      .select('id, guild, skill_name, wp_value, gold_value, steps')
      .not('steps', 'is', null)
      .order('guild', { ascending: true })
      .order('skill_name', { ascending: true })
    setLoadingQuests(false)
    if (error) { setLoadError(error.message); return }
    setQuests(
      (data ?? [])
        .filter((r) => Array.isArray(r.steps) && (r.steps as StepConfig[]).length > 0)
        .map((r) => ({
          id: r.id as string,
          guild: r.guild as string,
          skill_name: r.skill_name as string,
          wp_value: (r.wp_value as number) ?? 0,
          gold_value: (r.gold_value as number) ?? 10,
          steps: r.steps as StepConfig[],
        })),
    )
  }, [])

  useEffect(() => { void loadQuests() }, [loadQuests])

  const resetBuilder = () => {
    setEditingId(null)
    setTitle('')
    setGuild('Forge')
    setWpValue(20)
    setGoldValue(10)
    setSteps([])
    setSaveError(null)
    setSaveSuccess(null)
  }

  const loadIntoBuilder = (q: QuestRow) => {
    setEditingId(q.id)
    setTitle(q.skill_name)
    setGuild(GUILDS.find((g) => g.toLowerCase() === q.guild.toLowerCase()) ?? 'Forge')
    setWpValue(q.wp_value)
    setGoldValue(q.gold_value ?? 10)
    setSteps(q.steps.map((s) => ({ ...s, tempId: makeId() })))
    setSaveError(null)
    setSaveSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addStep = () => {
    setSteps((prev) => [...prev, { description: '', requiresApproval: false, resourceUrl: '', tempId: makeId() }])
  }

  const updateStep = (idx: number, patch: Partial<BuilderStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return
    setSteps((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const saveQuest = async () => {
    setSaveError(null)
    setSaveSuccess(null)
    if (!title.trim()) { setSaveError('Quest title is required.'); return }
    if (steps.length === 0) { setSaveError('Add at least one step.'); return }
    const hasEmpty = steps.some((s) => !s.description.trim())
    if (hasEmpty) { setSaveError('Fill in a description for every step.'); return }

    const payload = {
      guild: guild,
      skill_name: title.trim(),
      wp_value: wpValue,
      gold_value: goldValue,
      steps: steps.map(({ description, requiresApproval, resourceUrl }) => ({
        description,
        requiresApproval,
        ...(resourceUrl?.trim() ? { resourceUrl: resourceUrl.trim() } : {}),
      })),
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('tiles').update(payload).eq('id', editingId)
        if (error) throw error
        setSaveSuccess('Quest updated successfully.')
      } else {
        const { error } = await supabase.from('tiles').insert(payload)
        if (error) throw error
        setSaveSuccess('Quest created! It now appears in the skill tree.')
        resetBuilder()
      }
      await loadQuests()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const deleteQuest = async (id: string, name: string) => {
    if (!window.confirm(`Delete quest "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    const { error } = await supabase.from('tiles').delete().eq('id', id)
    setDeletingId(null)
    if (error) { alert(`Delete failed: ${error.message}`); return }
    if (editingId === id) resetBuilder()
    await loadQuests()
  }

  // Drag-and-drop helpers
  const onDragStart = (idx: number) => setDragIdx(idx)
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    dragOverIdx.current = idx
  }
  const onDrop = () => {
    if (dragIdx !== null && dragOverIdx.current !== null && dragIdx !== dragOverIdx.current) {
      moveStep(dragIdx, dragOverIdx.current)
    }
    setDragIdx(null)
    dragOverIdx.current = null
  }

  return (
    <div className="app-shell teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title">Quest builder</h1>
            <p className="muted teacher-panel-subtitle">
              Create new quest tiles that appear in the skill tree. Each quest uses the full patent packet flow — opening questions, checklist, and closing questions — with teacher approval gates.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>Sign out</button>
        </div>
      </header>

      {/* ─── Builder form ─── */}
      <section className="teacher-panel-section" aria-labelledby="quest-builder-heading" style={{ maxWidth: '720px' }}>
        <h2 id="quest-builder-heading" className="teacher-panel-section-title">
          {editingId ? `Editing: ${title || 'Quest'}` : 'New quest'}
        </h2>

        {/* Title + guild + awards row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.75rem', alignItems: 'end', marginBottom: '1.25rem' }}>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Quest title *</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design Your Logo" />
          </label>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Guild</span>
            <select value={guild} onChange={(e) => setGuild(e.target.value as GuildOption)} style={{ minWidth: '120px' }}>
              {GUILDS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">WP award</span>
            <input type="number" min={1} max={999} value={wpValue} onChange={(e) => setWpValue(Number(e.target.value))} style={{ width: '72px' }} />
          </label>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Gold award</span>
            <input type="number" min={0} max={999} value={goldValue} onChange={(e) => setGoldValue(Number(e.target.value))} style={{ width: '72px' }} />
          </label>
        </div>

        {/* Fixed opening questions */}
        <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.03)', border: '1.5px dashed rgba(0,0,0,0.15)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>📋 Opening questions (fixed — cannot be removed)</p>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: 'var(--muted-text,#666)' }}>
            <li>Describe what you are going to make.</li>
            <li>Who are you making this for, why does it matter to them, what you know about them that changed a design decision, and how you learned it <span style={{ fontSize: '0.8rem', opacity: 0.65 }}>(structured empathy form)</span></li>
          </ol>
        </div>

        {/* Steps builder */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Checklist steps</h3>
            <button type="button" className="btn-primary" style={{ fontSize: '0.88rem', padding: '0.3rem 0.75rem' }} onClick={addStep}>
              + Add step
            </button>
          </div>

          {steps.length === 0 ? (
            <p className="muted" style={{ fontSize: '0.9rem' }}>No steps yet. Click "+ Add step" to begin.</p>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {steps.map((step, idx) => (
                <li
                  key={step.tempId}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(e, idx)}
                  onDrop={onDrop}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr auto auto auto auto',
                    gap: '0.5rem',
                    alignItems: 'start',
                    padding: '0.6rem 0.75rem',
                    background: dragIdx === idx ? 'rgba(99,102,241,0.08)' : 'var(--card-bg,#fff)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '6px',
                    cursor: 'grab',
                  }}
                >
                  {/* Drag handle */}
                  <span style={{ paddingTop: '0.35rem', color: '#aaa', fontSize: '1.1rem', cursor: 'grab' }} title="Drag to reorder">⠿</span>

                  {/* Description + link */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <input
                      type="text"
                      value={step.description}
                      placeholder={`Step ${idx + 1} description`}
                      onChange={(e) => updateStep(idx, { description: e.target.value })}
                      style={{ width: '100%' }}
                    />
                    <input
                      type="url"
                      value={step.resourceUrl ?? ''}
                      placeholder="Resource link (optional) — e.g. https://tinkercad.com/…"
                      onChange={(e) => updateStep(idx, { resourceUrl: e.target.value })}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={step.requiresApproval}
                        onChange={(e) => updateStep(idx, { requiresApproval: e.target.checked })}
                      />
                      <span>Requires teacher approval before continuing</span>
                    </label>
                  </div>

                  {/* Up */}
                  <button type="button" title="Move up" disabled={idx === 0}
                    className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                    onClick={() => moveStep(idx, idx - 1)}>▲</button>

                  {/* Down */}
                  <button type="button" title="Move down" disabled={idx === steps.length - 1}
                    className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                    onClick={() => moveStep(idx, idx + 1)}>▼</button>

                  {/* Delete */}
                  <button type="button" title="Remove step"
                    className="btn-secondary" style={{ padding: '0.2rem 0.55rem', fontSize: '0.85rem', color: '#b91c1c' }}
                    onClick={() => removeStep(idx)}>✕</button>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Fixed closing questions */}
        <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.03)', border: '1.5px dashed rgba(0,0,0,0.15)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>📋 Closing questions (fixed — cannot be removed)</p>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: 'var(--muted-text,#666)' }}>
            <li>What makes this work yours — where did you go beyond the example?</li>
            <li>What failed and what did you change?</li>
          </ol>
        </div>

        {saveError ? <p className="error" role="alert">{saveError}</p> : null}
        {saveSuccess ? <p style={{ color: '#16a34a', fontWeight: 600 }} role="status">{saveSuccess}</p> : null}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveQuest()}>
            {saving ? 'Saving…' : editingId ? 'Update quest' : 'Save quest'}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetBuilder}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      {/* ─── Quest list ─── */}
      <section className="teacher-panel-section" aria-labelledby="quest-list-heading">
        <h2 id="quest-list-heading" className="teacher-panel-section-title">Existing quests</h2>
        {loadingQuests ? (
          <p className="muted">Loading quests…</p>
        ) : loadError ? (
          <p className="error" role="alert">{loadError}</p>
        ) : quests.length === 0 ? (
          <p className="muted teacher-panel-section-empty">No quests created yet. Use the builder above to add the first one.</p>
        ) : (
          <ul className="teacher-panel-list" style={{ gap: '0.65rem' }}>
            {quests.map((q) => (
              <li key={q.id} className="card teacher-panel-item" style={{ gap: '0.85rem' }}>
                <div className="teacher-panel-item-main">
                  <p className="teacher-panel-student" style={{ fontWeight: 700 }}>{q.skill_name}</p>
                  <p className="muted teacher-panel-guild" style={{ margin: 0 }}>
                    {q.guild} · {q.wp_value} WP · {q.gold_value ?? 10} gold · {q.steps.length} step{q.steps.length !== 1 ? 's' : ''}
                  </p>
                  <details style={{ marginTop: '0.35rem' }}>
                    <summary style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--muted-text,#666)' }}>View steps</summary>
                    <ol style={{ marginTop: '0.35rem', paddingLeft: '1.25rem', fontSize: '0.84rem' }}>
                      {q.steps.map((s, i) => (
                        <li key={i} style={{ marginBottom: '0.3rem' }}>
                          {s.description}
                          {s.requiresApproval ? <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: '#ca8a04' }}>🔒 approval gate</span> : null}
                          {s.resourceUrl ? (
                            <a href={s.resourceUrl} target="_blank" rel="noopener noreferrer"
                              style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--accent,#6366f1)' }}>
                              🔗 resource link
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
                <div className="teacher-panel-actions" style={{ flexShrink: 0 }}>
                  <button type="button" className="btn-primary" style={{ fontSize: '0.88rem' }}
                    onClick={() => loadIntoBuilder(q)}>
                    Edit
                  </button>
                  <button type="button" className="btn-secondary" style={{ fontSize: '0.88rem', color: '#b91c1c' }}
                    disabled={deletingId === q.id}
                    onClick={() => void deleteQuest(q.id, q.skill_name)}>
                    {deletingId === q.id ? 'Deleting…' : 'Delete'}
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
