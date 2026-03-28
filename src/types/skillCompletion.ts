export type SkillCompletionStatus = 'pending' | 'approved'

export type SkillCompletionRow = {
  skill_key: string
  status: SkillCompletionStatus
}
