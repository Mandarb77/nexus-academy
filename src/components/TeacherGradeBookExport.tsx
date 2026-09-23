/*
 * Teacher progress — checkable roster → pasteable grade-book list for Google Sheets
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildGradeBookRows,
  gradeBookLines,
  gradeBookShortName,
  gradeBookTsv,
  type GradeBookCompletion,
  type GradeBookStudent,
} from '../lib/gradeBookExport'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { supabaseErrorText } from '../lib/supabaseErrorText'

type Props = {
  students: GradeBookStudent[]
}

const IN_CHUNK = 80

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function fetchApprovedForStudents(studentIds: string[]): Promise<GradeBookCompletion[]> {
  type RawCompletion = {
    studentId: string
    tileId: string
    approvedAt: string | null
    submittedAt: string | null
  }
  const raw: RawCompletion[] = []
  for (let i = 0; i < studentIds.length; i += IN_CHUNK) {
    const chunk = studentIds.slice(i, i + IN_CHUNK)
    const { data, error } = await supabase
      .from('skill_completions')
      .select('student_id, tile_id, approved_at, created_at')
      .in('student_id', chunk)
      .eq('status', 'approved')
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      raw.push({
        studentId: row.student_id as string,
        tileId: row.tile_id as string,
        approvedAt: (row.approved_at as string | null) ?? null,
        submittedAt: (row.created_at as string | null) ?? null,
      })
    }
  }

  const tileIds = [...new Set(raw.map((row) => row.tileId))]
  const tilesById = new Map<string, { guild: string; skill_name: string }>()
  for (let i = 0; i < tileIds.length; i += IN_CHUNK) {
    const chunk = tileIds.slice(i, i + IN_CHUNK)
    const { data, error } = await supabase.from('tiles').select('id, guild, skill_name').in('id', chunk)
    if (error) throw new Error(error.message)
    for (const tile of data ?? []) {
      tilesById.set(tile.id as string, {
        guild: (tile.guild as string) ?? '',
        skill_name: (tile.skill_name as string) ?? '',
      })
    }
  }

  return raw.map((row) => {
    const tile = tilesById.get(row.tileId)
    return {
      studentId: row.studentId,
      guild: tile?.guild ?? '',
      skillName: tile?.skill_name ?? 'Unknown quest',
      approvedAt: row.approvedAt,
      submittedAt: row.submittedAt,
    }
  })
}

export function TeacherGradeBookExport({ students }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [includeEmpty, setIncludeEmpty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyNote, setCopyNote] = useState<string | null>(null)
  const [lines, setLines] = useState('')
  const [tsv, setTsv] = useState('')
  const [rowCount, setRowCount] = useState(0)
  const primed = useRef(false)

  useEffect(() => {
    if (students.length === 0) {
      primed.current = false
      setSelectedIds(new Set())
      return
    }
    if (!primed.current) {
      primed.current = true
      setSelectedIds(new Set(students.map((s) => s.id)))
      return
    }
    const live = new Set(students.map((s) => s.id))
    setSelectedIds((prev) => new Set([...prev].filter((id) => live.has(id))))
  }, [students])

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedIds.has(s.id)),
    [students, selectedIds],
  )

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function buildList() {
    setError(null)
    setCopyNote(null)
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      return
    }
    if (selectedStudents.length === 0) {
      setError('Check at least one student, or choose All students.')
      return
    }
    setBusy(true)
    try {
      const completions = await fetchApprovedForStudents(selectedStudents.map((s) => s.id))
      const rows = buildGradeBookRows(selectedStudents, completions, { includeEmpty })
      setRowCount(rows.length)
      setLines(gradeBookLines(rows))
      setTsv(gradeBookTsv(rows))
      if (rows.length === 0) {
        setCopyNote('No approved quests for the selected students.')
      }
    } catch (err) {
      setLines('')
      setTsv('')
      setRowCount(0)
      setError(`Could not build the list: ${supabaseErrorText(err instanceof Error ? err.message : String(err))}`)
    } finally {
      setBusy(false)
    }
  }

  async function copy(kind: 'sheets' | 'list') {
    const text = kind === 'sheets' ? tsv : lines
    if (!text) {
      setCopyNote('Build the list first.')
      return
    }
    const ok = await copyText(text)
    setCopyNote(ok ? (kind === 'sheets' ? 'Copied for Google Sheets.' : 'Copied the list.') : 'Copy failed — select the text below and copy it.')
  }

  return (
    <div className="card teacher-gradebook">
      <h3 className="teacher-panel-subheading">Grade book list</h3>
      <p className="muted teacher-gradebook__lede">
        Pick students, then build a list you can paste into Google Sheets. One line per approved
        quest, like <span className="teacher-gradebook__example">Tony B, Void - The Mark Made Real - 9/25/2026</span>.
        Dates are the day you approved the quest (Eastern).
      </p>

      <div className="teacher-gradebook__toolbar">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setSelectedIds(new Set(students.map((s) => s.id)))}
          disabled={students.length === 0}
        >
          All students
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setSelectedIds(new Set())}
          disabled={selectedIds.size === 0}
        >
          Clear checks
        </button>
        <label className="teacher-gradebook__empty">
          <input
            type="checkbox"
            checked={includeEmpty}
            onChange={(e) => setIncludeEmpty(e.target.checked)}
          />
          Include students with no approved quests
        </label>
      </div>

      {students.length === 0 ? (
        <p className="muted">No students on the roster.</p>
      ) : (
        <fieldset className="teacher-gradebook__picks">
          <legend className="visually-hidden">Students to include</legend>
          {students.map((s) => {
            const label = s.display_name?.trim() || gradeBookShortName(s.display_name, s.email)
            return (
              <label key={s.id} className="teacher-gradebook__pick">
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <span>{label}</span>
              </label>
            )
          })}
        </fieldset>
      )}

      <p className="muted teacher-gradebook__count">
        {selectedIds.size} of {students.length} selected
      </p>

      <div className="teacher-gradebook__actions">
        <button type="button" className="btn-primary" disabled={busy || selectedIds.size === 0} onClick={() => void buildList()}>
          {busy ? 'Building…' : 'Build list'}
        </button>
        <button type="button" className="btn-secondary" disabled={!tsv || busy} onClick={() => void copy('sheets')}>
          Copy for Google Sheets
        </button>
        <button type="button" className="btn-secondary" disabled={!lines || busy} onClick={() => void copy('list')}>
          Copy as list
        </button>
      </div>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {copyNote ? (
        <p className="muted" role="status">
          {copyNote}
          {rowCount > 0 ? ` ${rowCount} row${rowCount === 1 ? '' : 's'}.` : ''}
        </p>
      ) : rowCount > 0 ? (
        <p className="muted" role="status">
          {rowCount} row{rowCount === 1 ? '' : 's'} ready to copy.
        </p>
      ) : null}

      {lines ? (
        <label className="teacher-gradebook__preview-label">
          Preview
          <textarea className="teacher-gradebook__preview" readOnly value={lines} rows={Math.min(14, lines.split('\n').length + 1)} />
        </label>
      ) : null}
    </div>
  )
}
