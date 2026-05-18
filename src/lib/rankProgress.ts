/*
 * Rank ladder math — first promotion after Initiate
 *
 * Workshop Points (WP) from approved quests accumulate on `profiles.wp`. This module
 * powers the progress bar toward “Apprentice Mage” on student home; server-side rank
 * promotion may still be manual or trigger-based — the UI here is motivational clarity,
 * not the sole source of rank changes.
 */

export const APPRENTICE_MAGE_WP = 100
export const NEXT_RANK_NAME = 'Apprentice Mage'

export function progressToApprenticeMage(wpTotal: number) {
  const currentWp = Math.max(0, Math.floor(Number.isFinite(wpTotal) ? wpTotal : 0))
  const targetWp = APPRENTICE_MAGE_WP
  const percent = Math.min(100, (currentWp / targetWp) * 100)
  const reachedNextRank = currentWp >= targetWp
  return {
    currentWp,
    targetWp,
    nextRankName: NEXT_RANK_NAME,
    percent,
    reachedNextRank,
  }
}
