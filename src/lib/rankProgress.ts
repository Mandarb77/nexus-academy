/** Next rank milestone for students starting as Initiate. */
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
