/*
 * Skill tree data hook — tiles, completions, and patent checklist badges
 *
 * Fetches all public `tiles`, the current student’s `skill_completions`, and latest
 * plan-stage `patents` rows grouped per tile. Uses `pickStudentPlanPatentContext` so a
 * stray duplicate `pending` row cannot hide teacher-approved plan state on the tree.
 * Exposes `markComplete` for “Submit for approval” on non-patent tiles. The tiles select
 * loads patent footer + flow connector fields when present (migrations 034+, 056+).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { canonicalSkillTreeGuild, guildHeading, SKILL_TREE_SECTION_GUILDS } from '../lib/guildTree'
import { isReadOnlyBrowse } from '../lib/schoolEmail'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { normalizePatentPlanStatus } from '../lib/patentPlanStatus'
import { pickStudentPlanPatentContext } from '../lib/patentPlanRow'
import { buildTileBySlug } from '../lib/tileUnlock'
import type { TileChip, TileRow } from '../types/tile'
import type { SkillCompletionStatus } from '../types/skillCompletion'

// -----------------------------------------------------------------------------
// Small helpers — normalize API rows, guild sort order (used by hook + consumers)
// -----------------------------------------------------------------------------

function normalizeTilesFromApi(rows: unknown[] | null): TileRow[] {
  if (!rows?.length) return []
  return rows.map((row) => {
    const r = row as Record<string, unknown>
    let steps = r.steps
    if (typeof steps === 'string') {
      try {
        /* Supabase sometimes returns JSON columns as serialized strings depending on cast/version. */
        steps = JSON.parse(steps) as unknown
      } catch {
        steps = null
      }
    }
    let chips = r.chips
    if (typeof chips === 'string') {
      try {
        chips = JSON.parse(chips) as unknown
      } catch {
        chips = null
      }
    }
    let record_prompts = r.record_prompts
    if (typeof record_prompts === 'string') {
      try {
        record_prompts = JSON.parse(record_prompts) as unknown
      } catch {
        record_prompts = null
      }
    }
    return { ...r, steps, chips: Array.isArray(chips) ? (chips as TileChip[]) : null, record_prompts } as TileRow
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

// -----------------------------------------------------------------------------
// `useSkillTree` — tiles + completions + patent checklist snapshot for current student
// -----------------------------------------------------------------------------

export function useSkillTree() {
  const { user, profile, studentPreviewMode } = useAuth()
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

  // --- Load skill_completions into a Map (pending / approved / returned per tile) ---
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
        /* One completion row per tile in practice; map overwrites if duplicates exist (newest wins by query order). */
        next.set(tid, { status: st, completionId: id })
      }
    }
    setCompletionByTileId(next)
  }, [studentId])

  // --- Latest plan-stage patent per tile (checklist progress on skill tree) ---
  const refreshPatentProgress = useCallback(async () => {
    if (!studentId || !isSupabaseConfigured) {
      setPatentProgressByTileId(new Map())
      return
    }
    const { data, error } = await supabase
      .from('patents')
      .select('id, tile_id, status, checklist_state, created_at')
      .eq('student_id', studentId)
      .eq('stage', 'plan')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('patents progress:', error.message)
      return
    }
    const byTile = new Map<
      string,
      { id: string; tile_id: string; status: string; checklist_state: unknown; created_at: string }[]
    >()
    for (const row of data ?? []) {
      const tid = row.tile_id as string
      if (!byTile.has(tid)) byTile.set(tid, [])
      byTile.get(tid)!.push({
        id: row.id as string,
        tile_id: tid,
        status: row.status as string,
        checklist_state: row.checklist_state,
        created_at: row.created_at as string,
      })
    }
    const next = new Map<string, PatentProgress>()
    for (const [tid, list] of byTile) {
      const { primary: row } = pickStudentPlanPatentContext(list, normalizePatentPlanStatus)
      if (!row) continue
      const rawCs = row.checklist_state as unknown
      const cs = Array.isArray(rawCs) ? (rawCs as boolean[]) : []
      next.set(tid, {
        id: row.id,
        planStatus: row.status,
        checklistState: cs,
      })
    }
    setPatentProgressByTileId(next)
  }, [studentId])

  // --- One-shot refresh: all tiles + completions + patent rows (used on mount + after actions) ---
  const refreshAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setTiles([])
      setCompletionByTileId(new Map())
      setPatentProgressByTileId(new Map())
      setLoading(false)
      return
    }
    setLoading(true)

    /*
     * Includes `checklist_footer_note` + `flow_in_style` (migrations 034+, 056+).
     * columns — PostgREST used to return an error for the whole `tiles` select, which made
     * the skill tree empty for everyone until the migration landed.
     */
    const { data: tileRows, error: tileErr } = await supabase
      .from('tiles')
      .select(
        'id, guild, skill_name, slug, sort_order, unlock_after_slugs, unlock_after_any_slugs, chips, wp_value, gold_value, wp_display, gold_display, subtitle, tile_description, recipient_guidance, quest_kind, steps, checklist_footer_note, flow_in_style, record_prompts, ledger_resources',
      )
      .order('guild', { ascending: true })
      .order('sort_order', { ascending: true })
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

  // --- Initial + dependency-driven load ---
  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  // Teacher approval (and plan/checklist gates) should flip tree state without a full reload.
  useEffect(() => {
    if (!studentId || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`skill-tree-live-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'skill_completions',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          void refreshCompletions()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patents',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          void refreshPatentProgress()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [studentId, refreshCompletions, refreshPatentProgress])

  // --- Derived: tiles grouped under canonical guild labels (for `/tree` sections) ---
  const tilesByGuild = useMemo(() => {
    const map = new Map<string, TileRow[]>()
    for (const t of tiles) {
      const g = canonicalSkillTreeGuild(t.guild || 'Other')
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(t)
    }
    return map
  }, [tiles])

  // --- Derived: guild keys for section headers (merge known guilds + any from DB) ---
  const guildKeys = useMemo(() => {
    const fromTiles = [...tilesByGuild.keys()]
    const merged = [...new Set<string>([...SKILL_TREE_SECTION_GUILDS, ...fromTiles])]
    return sortGuildKeys(merged)
  }, [tilesByGuild])

  const tileBySlug = useMemo(() => buildTileBySlug(tiles), [tiles])

  // --- Student action: insert or resubmit `skill_completions` (non-patent tiles) ---
  const markComplete = useCallback(
    async (tile: TileRow) => {
      if (!studentId || !isSupabaseConfigured) return false
      if (isReadOnlyBrowse(studentPreviewMode, profile, user?.email ?? profile?.email)) return false
      setSubmittingTileId(tile.id)
      const existing = completionByTileId.get(tile.id)

      if (existing?.status === 'returned') {
        const { data: updated, error } = await supabase
          .from('skill_completions')
          .update({ status: 'pending' })
          .eq('id', existing.completionId)
          .eq('status', 'returned')
          .select('id, status')
          .maybeSingle()
        setSubmittingTileId(null)
        if (error || updated?.status !== 'pending') {
          console.error('skill completion resubmit:', error?.message ?? 'row was not returned to pending')
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
        /* Unique violation: completion already exists (double tap / race) — refresh map instead of showing a hard error. */
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
    [studentId, completionByTileId, refreshCompletions, studentPreviewMode, profile, user?.email],
  )

  // --- Public API returned to `SkillTreePage` / guild pages ---
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
    tileBySlug,
  }
}
