import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { canonicalSkillTreeGuild, guildHeading, SKILL_TREE_SECTION_GUILDS } from '../lib/guildTree'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { TileRow } from '../types/tile'
import type { SkillCompletionStatus } from '../types/skillCompletion'

function normalizeTilesFromApi(rows: unknown[] | null): TileRow[] {
  if (!rows?.length) return []
  return rows.map((row) => {
    const r = row as Record<string, unknown>
    let steps = r.steps
    if (typeof steps === 'string') {
      try {
        steps = JSON.parse(steps) as unknown
      } catch {
        steps = null
      }
    }
    return { ...r, steps } as TileRow
  })
}

const GUILD_ORDER = ['forge', 'prism', 'folded path', 'silicon covenant', 'void navigators']

export type TileCompletionState = {
  status: SkillCompletionStatus
  completionId: string
}

/** Latest plan-stage patent for a given tile — used for the checklist badge on the skill tree. */
export type PatentProgress = {
  id: string
  planStatus: string
  checklistState: boolean[]
}

function sortGuildKeys(guilds: string[]): string[] {
  const seen = [...new Set(guilds)]
  return seen.sort((a, b) => {
    const ai = GUILD_ORDER.indexOf(a.toLowerCase())
    const bi = GUILD_ORDER.indexOf(b.toLowerCase())
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export function useSkillTree() {
  const { user } = useAuth()
  const [tiles, setTiles] = useState<TileRow[]>([])
  const [completionByTileId, setCompletionByTileId] = useState<
    Map<string, TileCompletionState>
  >(() => new Map())
  const [patentProgressByTileId, setPatentProgressByTileId] = useState<
    Map<string, PatentProgress>
  >(() => new Map())
  const [loading, setLoading] = useState(true)
  const [submittingTileId, setSubmittingTileId] = useState<string | null>(null)

  const studentId = user?.id

  const refreshCompletions = useCallback(async () => {
    if (!studentId || !isSupabaseConfigured) {
      setCompletionByTileId(new Map())
      return
    }
    const { data, error } = await supabase
      .from('skill_completions')
      .select('id, tile_id, status')
      .eq('student_id', studentId)

    if (error) {
      console.error('skill_completions:', error.message)
      setCompletionByTileId(new Map())
      return
    }
    const next = new Map<string, TileCompletionState>()
    for (const row of data ?? []) {
      const tid = row.tile_id as string
      const st = row.status as SkillCompletionStatus
      const id = row.id as string
      if (st === 'pending' || st === 'approved' || st === 'returned') {
        next.set(tid, { status: st, completionId: id })
      }
    }
    setCompletionByTileId(next)
  }, [studentId])

  const refreshPatentProgress = useCallback(async () => {
    if (!studentId || !isSupabaseConfigured) {
      setPatentProgressByTileId(new Map())
      return
    }
    const { data, error } = await supabase
      .from('patents')
      .select('id, tile_id, status, checklist_state')
      .eq('student_id', studentId)
      .eq('stage', 'plan')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('patents progress:', error.message)
      return
    }
    const next = new Map<string, PatentProgress>()
    for (const row of data ?? []) {
      const tid = row.tile_id as string
      if (!next.has(tid)) {
        const rawCs = row.checklist_state as unknown
        const cs = Array.isArray(rawCs) ? (rawCs as boolean[]) : []
        next.set(tid, {
          id: row.id as string,
          planStatus: row.status as string,
          checklistState: cs,
        })
      }
    }
    setPatentProgressByTileId(next)
  }, [studentId])

  const refreshAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setTiles([])
      setCompletionByTileId(new Map())
      setPatentProgressByTileId(new Map())
      setLoading(false)
      return
    }
    setLoading(true)

    // Omit checklist_footer_note: requesting it fails on DBs before migration 034 and clears all tiles.
    const { data: tileRows, error: tileErr } = await supabase
      .from('tiles')
      .select('id, guild, skill_name, wp_value, gold_value, steps')
      .order('guild', { ascending: true })
      .order('skill_name', { ascending: true })

    if (tileErr) {
      console.error('tiles:', tileErr.message)
      setTiles([])
    } else {
      setTiles(normalizeTilesFromApi(tileRows ?? []))
    }

    await Promise.all([refreshCompletions(), refreshPatentProgress()])
    setLoading(false)
  }, [refreshCompletions, refreshPatentProgress])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const tilesByGuild = useMemo(() => {
    const map = new Map<string, TileRow[]>()
    for (const t of tiles) {
      const g = canonicalSkillTreeGuild(t.guild || 'Other')
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(t)
    }
    return map
  }, [tiles])

  const guildKeys = useMemo(() => {
    const fromTiles = [...tilesByGuild.keys()]
    const merged = [...new Set<string>([...SKILL_TREE_SECTION_GUILDS, ...fromTiles])]
    return sortGuildKeys(merged)
  }, [tilesByGuild])

  const markComplete = useCallback(
    async (tile: TileRow) => {
      if (!studentId || !isSupabaseConfigured) return false
      setSubmittingTileId(tile.id)
      const existing = completionByTileId.get(tile.id)

      if (existing?.status === 'returned') {
        const { error } = await supabase
          .from('skill_completions')
          .update({ status: 'pending' })
          .eq('id', existing.completionId)
        setSubmittingTileId(null)
        if (error) {
          console.error('skill completion resubmit:', error.message)
          return false
        }
        setCompletionByTileId((prev) =>
          new Map(prev).set(tile.id, {
            status: 'pending',
            completionId: existing.completionId,
          }),
        )
        return true
      }

      const skill_key = tile.id
      const { error } = await supabase.from('skill_completions').insert({
        student_id: studentId,
        tile_id: tile.id,
        skill_key,
        status: 'pending',
      })
      setSubmittingTileId(null)
      if (error) {
        if (error.code === '23505') {
          await refreshCompletions()
          return true
        }
        console.error('skill completion insert:', error.message)
        return false
      }
      await refreshCompletions()
      return true
    },
    [studentId, completionByTileId, refreshCompletions],
  )

  return {
    tiles,
    guildKeys,
    tilesByGuild,
    guildHeading,
    completionByTileId,
    patentProgressByTileId,
    loading,
    submittingTileId,
    markComplete,
    refresh: refreshAll,
    canUseDb: isSupabaseConfigured && Boolean(studentId),
  }
}
