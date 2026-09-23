/*
 * Grade-book lines for paste into Google Sheets
 *
 * One approved quest per row. Short names match classroom roll call (“Tony B”).
 * Dates are Eastern (Kents Hill).
 */

import { skillTreeGuildModifier } from './guildTree'

export type GradeBookStudent = {
  id: string
  display_name: string | null
  email: string | null
}

export type GradeBookCompletion = {
  studentId: string
  guild: string
  skillName: string
  approvedAt: string | null
  submittedAt: string | null
}

export type GradeBookRow = {
  studentId: string
  name: string
  guild: string
  skillName: string
  approvedAt: string | null
  submittedAt: string | null
}

const EASTERN = 'America/New_York'

export function gradeBookShortName(displayName: string | null, email: string | null): string {
  const raw = displayName?.trim()
  if (raw) {
    const parts = raw.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0]
    const first = parts[0]
    const last = parts[parts.length - 1]
    if (last.length === 1) return `${first} ${last.toUpperCase()}`
    return `${first} ${last.charAt(0).toUpperCase()}`
  }
  const local = email?.split('@')[0]?.trim()
  return local || 'Student'
}

export function shortGuildLabel(guild: string): string {
  const mod = skillTreeGuildModifier(guild)
  if (mod === 'forge') return 'Forge'
  if (mod === 'prism') return 'Prism'
  if (mod === 'folded') return 'Folded Path'
  if (mod === 'silicon') return 'Silicon'
  if (mod === 'void') return 'Void'
  const trimmed = guild.trim()
  return trimmed || 'Guild'
}

export function formatGradeBookDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN,
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function gradeBookLine(row: GradeBookRow): string {
  const date = formatGradeBookDate(row.approvedAt ?? row.submittedAt)
  if (!row.skillName) return date ? `${row.name}, (none) - ${date}` : `${row.name}, (none)`
  return `${row.name}, ${row.guild} - ${row.skillName} - ${date}`
}

export function buildGradeBookRows(
  students: GradeBookStudent[],
  completions: GradeBookCompletion[],
  options?: { includeEmpty?: boolean },
): GradeBookRow[] {
  const byStudent = new Map<string, GradeBookCompletion[]>()
  for (const row of completions) {
    const list = byStudent.get(row.studentId) ?? []
    list.push(row)
    byStudent.set(row.studentId, list)
  }

  const out: GradeBookRow[] = []
  for (const student of students) {
    const name = gradeBookShortName(student.display_name, student.email)
    const rows = [...(byStudent.get(student.id) ?? [])].sort((a, b) => {
      const da = a.approvedAt ?? a.submittedAt ?? ''
      const db = b.approvedAt ?? b.submittedAt ?? ''
      if (da !== db) return da.localeCompare(db)
      const guild = a.guild.localeCompare(b.guild)
      if (guild !== 0) return guild
      return a.skillName.localeCompare(b.skillName)
    })
    if (rows.length === 0) {
      if (options?.includeEmpty) {
        out.push({
          studentId: student.id,
          name,
          guild: '',
          skillName: '',
          approvedAt: null,
          submittedAt: null,
        })
      }
      continue
    }
    for (const row of rows) {
      out.push({
        studentId: student.id,
        name,
        guild: shortGuildLabel(row.guild),
        skillName: row.skillName.trim() || 'Unknown quest',
        approvedAt: row.approvedAt,
        submittedAt: row.submittedAt,
      })
    }
  }
  return out
}

export function gradeBookLines(rows: GradeBookRow[]): string {
  return rows.map(gradeBookLine).join('\n')
}

export function gradeBookTsv(rows: GradeBookRow[]): string {
  const header = ['Name', 'Guild', 'Quest', 'Approved', 'Submitted'].join('\t')
  const body = rows.map((row) =>
    [
      row.name,
      row.guild,
      row.skillName || '(none)',
      formatGradeBookDate(row.approvedAt ?? row.submittedAt),
      formatGradeBookDate(row.submittedAt),
    ].join('\t'),
  )
  return [header, ...body].join('\n')
}
