/*
 * Forge guild — “personal game piece” patent quest detection
 *
 * This quest predates Quest Builder–driven steps; we key off stable DB id `5` where
 * deployed, and fall back to guild + normalized skill title so restored databases still
 * route to `/patent-game-piece` and the stepped wizard.
 */

import type { TileRow } from '../types/tile'
  if (tile.id === '5') return true
  /* Numeric id match covers bigint-as-number JSON from Supabase. */
  const asNum = Number(tile.id)
  if (Number.isFinite(asNum) && asNum === 5) return true
  const skill = tile.skill_name?.trim().toLowerCase()
  const guild = tile.guild?.trim().toLowerCase()
  return guild === 'forge' && skill === 'design your personal game piece'
}
