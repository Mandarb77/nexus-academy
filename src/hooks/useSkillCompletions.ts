import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { SkillCompletionStatus } from '../types/skillCompletion'

export function useSkillCompletions() {
  const { user } = useAuth()
  const [statusBySkill, setStatusBySkill] = useState<
    Map<string, SkillCompletionStatus>
  >(() => new Map())
  const [loading, setLoading] = useState(true)
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)

  const userId = user?.id

  const refresh = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setStatusBySkill(new Map())
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('skill_completions')
      .select('skill_key, status')
      .eq('user_id', userId)

    if (error) {
      console.error('skill_completions:', error.message)
      setStatusBySkill(new Map())
    } else {
      const next = new Map<string, SkillCompletionStatus>()
      for (const row of data ?? []) {
        const key = row.skill_key as string
        const st = row.status as SkillCompletionStatus
        if (st === 'pending' || st === 'approved') {
          next.set(key, st)
        }
      }
      setStatusBySkill(next)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const markComplete = useCallback(
    async (skillKey: string) => {
      if (!userId || !isSupabaseConfigured) return false
      setSubmittingKey(skillKey)
      const { error } = await supabase.from('skill_completions').insert({
        user_id: userId,
        skill_key: skillKey,
        status: 'pending',
      })
      setSubmittingKey(null)
      if (error) {
        if (error.code === '23505') {
          await refresh()
          return true
        }
        console.error('skill completion insert:', error.message)
        return false
      }
      setStatusBySkill((prev) => new Map(prev).set(skillKey, 'pending'))
      return true
    },
    [userId, refresh],
  )

  return {
    statusBySkill,
    loading,
    submittingKey,
    markComplete,
    refresh,
    canUseDb: isSupabaseConfigured && Boolean(userId),
  }
}
