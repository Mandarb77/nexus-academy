/*
 * One row in `skill_completions` — student submitted a tile for teacher review
 *
 * Status drives badges on the skill tree and which Realtime payloads count as approvals.
 * `completionId` is used by the celebration queue to dedupe WP toasts.
 */

export type SkillCompletionStatus = 'pending' | 'approved' | 'returned'

export type SkillCompletionRow = {
  id: string
  student_id: string
  tile_id: string
  skill_key: string
  status: SkillCompletionStatus
  created_at: string
}
