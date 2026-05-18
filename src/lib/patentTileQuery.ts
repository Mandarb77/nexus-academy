/*
 * Tile id matching for `patents` queries
 *
 * Historical migrations stored `tile_id` as text or bigint; React Router params are
 * strings. Building a small candidate set (original, stringified, numeric) makes
 * `.in('tile_id', …)` reliable so students always see their saved patent for the tile
 * they clicked, regardless of how that id was serialized in Postgres.
 */

// =============================================================================
// Tile id candidates + row match (string vs numeric `tile_id` in Postgres)
// =============================================================================

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
