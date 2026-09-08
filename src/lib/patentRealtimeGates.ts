/*
 * Patent Realtime: detect plan/work/record *gate* changes, not checkbox ticks.
 *
 * `patents` uses replica identity DEFAULT, so `payload.old` is usually just `{ id }`.
 * Comparing `prev.status !== next.status` then treats every UPDATE as a gate change
 * (`undefined !== 'approved'`). Remember the last full gate snapshot per row instead.
 */

const GATE_KEYS = [
  'status',
  'stage',
  'checklist_submitted',
  'checklist_approved',
  'upload_url',
] as const

type GateSnap = Partial<Record<(typeof GATE_KEYS)[number], unknown>>

const lastById = new Map<string, GateSnap>()

function rowId(row: Record<string, unknown>): string {
  return row.id != null ? String(row.id) : ''
}

function hasGateFields(row: Record<string, unknown>): boolean {
  return GATE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(row, key))
}

function snapFrom(row: Record<string, unknown>): GateSnap {
  const snap: GateSnap = {}
  for (const key of GATE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(row, key)) snap[key] = row[key]
  }
  return snap
}

/** Call after a REST hydrate so the next Realtime UPDATE has a baseline. */
export function notePatentGateRow(row: Record<string, unknown>): void {
  const id = rowId(row)
  if (!id || !hasGateFields(row)) return
  lastById.set(id, snapFrom(row))
}

export function isPatentGateUpdate(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  const id = rowId(next)
  const nextSnap = hasGateFields(next) ? snapFrom(next) : null
  const prevSnap = hasGateFields(prev)
    ? snapFrom(prev)
    : id
      ? (lastById.get(id) ?? null)
      : null
  if (id && nextSnap) lastById.set(id, nextSnap)
  if (!nextSnap || !prevSnap) return false
  return GATE_KEYS.some((key) => prevSnap[key] !== nextSnap[key])
}
