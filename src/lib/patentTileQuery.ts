/**
 * `tiles.id` / URL params may be string while `patents.tile_id` in Postgres can be stored as
 * text or integer depending on migrations — use `.in('tile_id', …)` so both match.
 */
export function patentTileIdCandidates(tileId: unknown): (string | number)[] {
  const out: (string | number)[] = []
  if (tileId === null || tileId === undefined) return out
  out.push(tileId as string | number)
  const s = String(tileId)
  out.push(s)
  const n = Number(tileId)
  if (!Number.isNaN(n) && Number.isFinite(n)) out.push(n)
  return Array.from(new Set(out))
}

/** True if a `patents.tile_id` from Postgres matches the app tile id (string vs number). */
export function patentRowMatchesTile(appTileId: unknown, rowTileId: unknown): boolean {
  return patentTileIdCandidates(appTileId).some((c) => String(c) === String(rowTileId))
}
