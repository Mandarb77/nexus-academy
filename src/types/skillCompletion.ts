export type SkillCompletionStatus = 'pending' | 'approved'

export type SkillCompletionRow = {
  id: string
  student_id: string
  tile_id: string
  skill_key: string
  status: SkillCompletionStatus
  created_at: string
}
