/*
 * Quest Builder admin (`/teacher/quests`)
 *
 * CRUD for all `tiles` rows (intro mark-complete + patent quests). Dev notes:
 * docs/quest-tiles-teacher-builder-and-backfill.md
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { SKILL_TREE_SECTION_GUILDS } from '../lib/guildTree'
import {
  defaultPayoutForQuestKind,
  defaultRecipientGuidanceForQuestKind,
  QUEST_KIND_LABELS,
  type QuestKind,
} from '../lib/questKindScale'
import { resolvedTileSteps } from '../lib/customTile'
import type { TileRow, StepConfig } from '../types/tile'

type GuildOption = (typeof SKILL_TREE_SECTION_GUILDS)[number]

type QuestRow = TileRow & { steps: StepConfig[] }

type BuilderStep = StepConfig & { tempId: string }

function makeId() {
  return Math.random().toString(36).slice(2)
}

const BLANK_BUILDER: {
  title: string
  guild: GuildOption
  questKind: QuestKind
  wpValue: number
  goldValue: number
  tileDescription: string
  recipientGuidance: string
  level4Eligible: boolean
  steps: BuilderStep[]
} = {
  title: '',
  guild: 'Forge',
  questKind: 'tier2',
  wpValue: 10,
  goldValue: 22,
  tileDescription: '',
  recipientGuidance: defaultRecipientGuidanceForQuestKind('tier2'),
  level4Eligible: false,
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
  const [questKind, setQuestKind] = useState<QuestKind>(BLANK_BUILDER.questKind)
  const [wpValue, setWpValue] = useState(BLANK_BUILDER.wpValue)
  const [goldValue, setGoldValue] = useState(BLANK_BUILDER.goldValue)
  const [tileDescription, setTileDescription] = useState(BLANK_BUILDER.tileDescription)
  const [recipientGuidance, setRecipientGuidance] = useState(BLANK_BUILDER.recipientGuidance)
  const [level4Eligible, setLevel4Eligible] = useState(BLANK_BUILDER.level4Eligible)
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
      .select(
        'id, guild, skill_name, wp_value, gold_value, wp_display, gold_display, quest_kind, is_core, level4_eligible, tile_description, recipient_guidance, steps',
      )
      .order('guild', { ascending: true })
      .order('skill_name', { ascending: true })
    setLoadingQuests(false)
    if (error) { setLoadError(error.message); return }
    setQuests(
      (data ?? []).map((r) => {
        const row = {
          id: r.id as string,
          guild: r.guild as string,
          skill_name: r.skill_name as string,
          wp_value: (r.wp_value as number) ?? 0,
          gold_value: (r.gold_value as number) ?? 10,
          wp_display: (r.wp_display as string | null) ?? null,
          gold_display: (r.gold_display as string | null) ?? null,
          quest_kind: (r.quest_kind as QuestKind) ?? 'required',
          is_core: Boolean(r.is_core),
          level4_eligible: Boolean(r.level4_eligible),
          tile_description: (r.tile_description as string | null) ?? null,
          recipient_guidance: (r.recipient_guidance as string | null) ?? null,
          steps: r.steps as StepConfig[] | null,
        } as TileRow
        return { ...row, steps: resolvedTileSteps(row) }
      }),
    )
  }, [])

  useEffect(() => { void loadQuests() }, [loadQuests])

  const resetBuilder = () => {
    setEditingId(null)
    setTitle('')
    setGuild('Forge')
    setQuestKind('tier2')
    setWpValue(10)
    setGoldValue(22)
    setTileDescription('')
    setRecipientGuidance(defaultRecipientGuidanceForQuestKind('tier2'))
    setLevel4Eligible(false)
    setSteps([])
    setSaveError(null)
    setSaveSuccess(null)
  }

  const loadIntoBuilder = (q: QuestRow) => {
    const kind = (q.quest_kind as QuestKind) ?? 'required'
    setEditingId(q.id)
    setTitle(q.skill_name)
    setGuild(
      SKILL_TREE_SECTION_GUILDS.find((g) => g.toLowerCase() === q.guild.toLowerCase()) ?? 'Forge',
    )
    setQuestKind(kind)
    setWpValue(q.wp_value)
    setGoldValue(q.gold_value ?? 10)
    setTileDescription(q.tile_description ?? '')
    setRecipientGuidance(q.recipient_guidance ?? '')
    setLevel4Eligible(Boolean(q.level4_eligible))
    setSteps(q.steps.map((s) => ({ ...s, tempId: makeId() })))
    setSaveError(null)
    setSaveSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const applyQuestKindChange = (nextKind: QuestKind) => {
    const nextDefaults = defaultPayoutForQuestKind(nextKind)
    if (!editingId) {
      setQuestKind(nextKind)
      setWpValue(nextDefaults.wp)
      setGoldValue(nextDefaults.gold)
      setRecipientGuidance(defaultRecipientGuidanceForQuestKind(nextKind))
      return
    }
    const oldDefaults = defaultPayoutForQuestKind(questKind)
    const atOldDefaults = wpValue === oldDefaults.wp && goldValue === oldDefaults.gold

    if (!atOldDefaults) {
      const label = QUEST_KIND_LABELS[nextKind]
      const ok = window.confirm(
        `Changing to ${label} will set WP/gold to ${nextDefaults.wp}/${nextDefaults.gold} and overwrite your custom values (${wpValue}/${goldValue}). Continue?`,
      )
      if (!ok) return
    }
    setQuestKind(nextKind)
    setWpValue(nextDefaults.wp)
    setGoldValue(nextDefaults.gold)
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
    if (steps.length > 0) {
      const hasEmpty = steps.some((s) => !s.description.trim())
      if (hasEmpty) { setSaveError('Fill in a description for every step.'); return }
    }

    const defaults = defaultPayoutForQuestKind(questKind)
    const payload = {
      guild: guild,
      skill_name: title.trim(),
      quest_kind: questKind,
      is_core: questKind === 'required' ? defaults.isCore : false,
      level4_eligible: level4Eligible,
      wp_value: wpValue,
      gold_value: goldValue,
      tile_description: tileDescription.trim() || null,
      recipient_guidance: recipientGuidance.trim() || null,
      steps:
        steps.length > 0
          ? steps.map(({ description, requiresApproval, resourceUrl, resourceLabel }) => ({
              description,
              requiresApproval,
              ...(resourceUrl?.trim()
                ? {
                    resourceUrl: resourceUrl.trim(),
                    ...(resourceLabel?.trim() ? { resourceLabel: resourceLabel.trim() } : {}),
                  }
                : {}),
            }))
          : null,
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
    if (!window.confirm(`Delete '${name}' permanently? This cannot be undone.`)) return
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
    <div className="app-shell bench-chrome teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title bench-page-title">Quest builder</h1>
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

        {/* Title + guild + kind + awards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end', marginBottom: '0.75rem' }}>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Quest title *</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design Your Logo" />
          </label>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Guild</span>
            <select value={guild} onChange={(e) => setGuild(e.target.value as GuildOption)} style={{ minWidth: '140px' }}>
              {SKILL_TREE_SECTION_GUILDS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', alignItems: 'end', marginBottom: '1.25rem' }}>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Quest type</span>
            <select
              value={questKind}
              onChange={(e) => applyQuestKindChange(e.target.value as QuestKind)}
              style={{ minWidth: '100%', maxWidth: '280px' }}
            >
              {(Object.keys(QUEST_KIND_LABELS) as QuestKind[]).map((k) => (
                <option key={k} value={k}>
                  {QUEST_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">WP</span>
            <input type="number" min={0} max={999} value={wpValue} onChange={(e) => setWpValue(Number(e.target.value))} style={{ width: '72px' }} />
          </label>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Gold</span>
            <input type="number" min={0} max={999} value={goldValue} onChange={(e) => setGoldValue(Number(e.target.value))} style={{ width: '72px' }} />
          </label>
        </div>
        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Tile description</span>
          <textarea
            rows={3}
            value={tileDescription}
            onChange={(e) => setTileDescription(e.target.value)}
            placeholder="Quest brief students read on the skill tree"
          />
          <span className="muted" style={{ fontSize: '0.82rem', display: 'block', marginTop: '0.25rem' }}>
            Early required tiles may suggest an object (&quot;coaster or equivalent&quot;). Stretch / Tier 2 / boss tiles: technique requirements only, leave object and recipient open.
          </span>
        </label>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Recipient requirement (hint)</span>
          <textarea
            rows={2}
            value={recipientGuidance}
            onChange={(e) => setRecipientGuidance(e.target.value)}
            placeholder="Shown on the patent plan panel — not enforced"
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={level4Eligible}
            onChange={(e) => setLevel4Eligible(e.target.checked)}
          />
          <span>Level-4 eligible (can satisfy the A gate; does not change points)</span>
        </label>

        <p className="muted" style={{ fontSize: '0.85rem', margin: '0 0 1rem' }}>
          WP and gold are stored on the tile; you can override scale defaults. Awards apply on final skill approval.
        </p>

        <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.03)', border: '1.5px dashed rgba(0,0,0,0.15)', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Patent packet (fixed for all quests)</p>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: 'var(--muted-text,#666)' }}>
            <li>What are you making? (one sentence, before making)</li>
            <li>Who is this for? / Why does it matter? / What changed a decision? (plan)</li>
            <li>Checklist steps you define below (if any)</li>
            <li>What did you make, and what makes it yours?</li>
            <li>What failed, and what did you change?</li>
            <li>Maine connection? (optional)</li>
            <li>Who taught you? (optional)</li>
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

        {saveError ? <p className="error" role="alert">{saveError}</p> : null}
        {saveSuccess ? <p style={{ color: '#16a34a', fontWeight: 600 }} role="status">{saveSuccess}</p> : null}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveQuest()}>
            {saving ? 'Saving…' : editingId ? 'Update quest' : 'Save quest'}
          </button>
          {editingId ? (
            <>
              <button type="button" className="btn-secondary" onClick={resetBuilder}>
                Cancel edit
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ color: '#b91c1c' }}
                disabled={deletingId === editingId}
                onClick={() => void deleteQuest(editingId, title.trim() || 'this quest')}
              >
                {deletingId === editingId ? 'Deleting…' : 'Delete quest'}
              </button>
            </>
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
                    {q.guild} · {QUEST_KIND_LABELS[(q.quest_kind as QuestKind) ?? 'required']} · {q.wp_display ?? `${q.wp_value} WP`} · {q.gold_display ?? `${q.gold_value ?? 10} gold`}
                    {q.steps.length > 0 ? ` · ${q.steps.length} step${q.steps.length !== 1 ? 's' : ''}` : ' · Mark complete'}
                    {q.level4_eligible ? ' · L4' : ''}
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
