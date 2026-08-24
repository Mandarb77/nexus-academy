/*
 * Cleanup job catalog + random assignment
 *
 * Used by the laptop control page to build a draw before inserting `cleanup_triggers`.
 * The Pi display only animates the stored pairings — it does not roll again.
 *
 * Slot count is 8. If a class has fewer students, unused jobs stay empty (which
 * slots get filled is random). Extra students are assigned a random job type so
 * everyone present still gets work.
 */

export type CleanupAssignment = {
  student: string
  job: string
}

export const CLEANUP_JOB_SLOTS: string[] = [
  'Sweep the floor',
  'Sweep the floor',
  'Put away tools',
  'Straighten the supply shelves',
  'Empty trash cans',
  'Pick up loose paper/cardboard',
  'Wipe down workbenches',
  'Organize the scrap bin',
]

export const CLEANUP_JOB_TYPES: string[] = [...new Set(CLEANUP_JOB_SLOTS)]

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = items[i]
    const swap = items[j]
    if (current === undefined || swap === undefined) continue
    items[i] = swap
    items[j] = current
  }
  return items
}

export function shuffleCopy<T>(items: readonly T[]): T[] {
  return shuffleInPlace([...items])
}

/** Trim, drop blanks, keep first occurrence of a name (case-insensitive). */
export function normalizeStudentNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const names: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const name = item.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }
  return names
}

export function parseAssignments(raw: unknown): CleanupAssignment[] {
  if (!Array.isArray(raw)) return []
  const pairings: CleanupAssignment[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as { student?: unknown; job?: unknown }
    const student = typeof row.student === 'string' ? row.student.trim() : ''
    const job = typeof row.job === 'string' ? row.job.trim() : ''
    if (!student || !job) continue
    pairings.push({ student, job })
  }
  return pairings
}

export function assignCleanupJobs(students: unknown): CleanupAssignment[] {
  const names = shuffleCopy(normalizeStudentNames(students))
  if (names.length === 0) return []

  const slots = shuffleCopy(CLEANUP_JOB_SLOTS)
  const types = CLEANUP_JOB_TYPES
  const pairings: CleanupAssignment[] = []

  for (let i = 0; i < names.length; i++) {
    const student = names[i]
    if (!student) continue
    const slotted = i < slots.length ? slots[i] : undefined
    const overflow = types[Math.floor(Math.random() * types.length)]
    const job = slotted ?? overflow
    if (!job) continue
    pairings.push({ student, job })
  }
  return pairings
}
