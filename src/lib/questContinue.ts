/*
 * Continue-where-you-left-off — Record page cards, deny deep-links, skill-tree CTAs
 *
 * Kids start and stop quests across class periods. This module turns patent + completion
 * snapshots into a progress label, the correct patent tab (`?step=1|2|3`), and a CTA.
 * Packet send-backs live on `skill_completions.status` (the packet patent row often stays
 * `approved`), so callers must pass completion status for final-question rows.
 */

import { guildHeading, skillTreeGuildModifier } from './guildTree'
import { getPatentRoute } from './patentRoutes'
import { serverSuggestedPatentPhase } from './patentPhaseBootstrap'
import type { UiPatentPlanStatus } from './patentPlanStatus'
import type { SkillCompletionStatus } from '../types/skillCompletion'
import type { StepConfig, TileRow } from '../types/tile'

export type PatentContinueStep = 1 | 2 | 3

export type ContinueQuestKind = 'needs_fix' | 'waiting' | 'in_progress'

export type ContinueQuestCard = {
  tileId: string
  title: string
  guildLabel: string
  href: string
  pointLabel: string
  ctaLabel: string
  kind: ContinueQuestKind
  preview: string
  previewClipped: boolean
  checklistDone: number
  checklistTotal: number
}

export function parsePatentStepParam(raw: string | null | undefined): PatentContinueStep | null {
  if (raw === '1' || raw === '2' || raw === '3') return Number(raw) as PatentContinueStep
  return null
}

export function patentHrefWithStep(baseHref: string, step: PatentContinueStep): string {
  const path = baseHref.split('?')[0] ?? baseHref
  return `${path}?step=${step}`
}

export function guildTreeContinueHref(guild: string): string {
  const slug = skillTreeGuildModifier(guild)
  if (slug === 'default') return '/tree'
  return `/tree/${slug}`
}

/** Internal path only — reject protocol-relative and external URLs before storing on the chickadee toast. */
export function safeInternalHref(href: unknown): string | undefined {
  if (typeof href !== 'string') return undefined
  const t = href.trim()
  if (!t.startsWith('/') || t.startsWith('//')) return undefined
  return t
}

export function parseTileStepsJson(raw: unknown): StepConfig[] | null {
  let steps = raw
  if (typeof steps === 'string') {
    try {
      steps = JSON.parse(steps) as unknown
    } catch {
      return null
    }
  }
  return Array.isArray(steps) && steps.length > 0 ? (steps as StepConfig[]) : null
}

/** Enough of a tile for `getPatentRoute` after a Realtime payload lookup. */
export function tileForPatentRoute(row: {
  id: unknown
  guild?: unknown
  skill_name?: unknown
  steps?: unknown
}): TileRow {
  return {
    id: String(row.id ?? ''),
    guild: String(row.guild ?? ''),
    skill_name: String(row.skill_name ?? ''),
    wp_value: 0,
    steps: parseTileStepsJson(row.steps),
  }
}

export function patentProgressCopy(params: {
  source: 'plan' | 'packet'
  planStatus: UiPatentPlanStatus
  checklistSubmitted: boolean
  checklistApproved: boolean
  completionStatus?: SkillCompletionStatus | null
}): {
  step: PatentContinueStep
  pointLabel: string
  kind: ContinueQuestKind
  ctaLabel: string
} {
  const step = serverSuggestedPatentPhase({
    primaryStage: params.source,
    planStatus: params.planStatus,
    checklistApproved: params.checklistApproved,
  })

  /* Packet send-back is `skill_completions.returned`; the packet patent row often stays approved. */
  if (params.source === 'packet') {
    if (params.completionStatus === 'returned' || params.planStatus === 'returned') {
      return {
        step: 3,
        pointLabel: 'Final questions — sent back for a fix',
        kind: 'needs_fix',
        ctaLabel: 'Fix and continue',
      }
    }
    if (params.completionStatus === 'pending' || params.planStatus === 'pending') {
      return {
        step: 3,
        pointLabel: 'Final questions — waiting on teacher',
        kind: 'waiting',
        ctaLabel: 'Open quest',
      }
    }
    return {
      step: 3,
      pointLabel: 'Final questions',
      kind: 'in_progress',
      ctaLabel: 'Continue',
    }
  }

  if (params.planStatus === 'returned') {
    return {
      step: 1,
      pointLabel: 'Plan — sent back for a fix',
      kind: 'needs_fix',
      ctaLabel: 'Fix and continue',
    }
  }
  if (params.planStatus === 'pending') {
    return {
      step: 1,
      pointLabel: 'Plan — waiting on teacher',
      kind: 'waiting',
      ctaLabel: 'Open quest',
    }
  }
  if (params.planStatus === 'approved') {
    if (params.checklistSubmitted && !params.checklistApproved) {
      return {
        step: 2,
        pointLabel: 'Checklist — waiting on teacher',
        kind: 'waiting',
        ctaLabel: 'Open quest',
      }
    }
    if (params.checklistApproved) {
      return {
        step: 3,
        pointLabel: 'Final questions',
        kind: 'in_progress',
        ctaLabel: 'Continue',
      }
    }
    return {
      step: 2,
      pointLabel: 'Checklist — pick up where you left off',
      kind: 'in_progress',
      ctaLabel: 'Continue',
    }
  }

  return {
    step,
    pointLabel: 'Plan in progress',
    kind: 'in_progress',
    ctaLabel: 'Continue',
  }
}

export function buildPatentContinueCard(input: {
  tile: TileRow
  source: 'plan' | 'packet'
  planStatus: UiPatentPlanStatus
  checklistSubmitted: boolean
  checklistApproved: boolean
  completionStatus?: SkillCompletionStatus | null
  preview: string
  previewClipped: boolean
  checklistDone: number
  checklistTotal: number
}): ContinueQuestCard | null {
  const base = getPatentRoute(input.tile)
  if (!base) return null
  const progress = patentProgressCopy(input)
  return {
    tileId: String(input.tile.id),
    title: input.tile.skill_name.trim() || 'Quest',
    guildLabel: guildHeading(input.tile.guild),
    href: patentHrefWithStep(base, progress.step),
    pointLabel: progress.pointLabel,
    ctaLabel: progress.ctaLabel,
    kind: progress.kind,
    preview: input.preview,
    previewClipped: input.previewClipped,
    checklistDone: input.checklistDone,
    checklistTotal: input.checklistTotal,
  }
}

export function buildSimpleContinueCard(
  tile: TileRow,
  status: Extract<SkillCompletionStatus, 'pending' | 'returned'>,
): ContinueQuestCard {
  const needsFix = status === 'returned'
  return {
    tileId: String(tile.id),
    title: tile.skill_name.trim() || 'Quest',
    guildLabel: guildHeading(tile.guild),
    href: guildTreeContinueHref(tile.guild),
    pointLabel: needsFix ? 'Sent back — submit again when you are ready' : 'Waiting on teacher',
    ctaLabel: needsFix ? 'Fix and continue' : 'Open quest',
    kind: needsFix ? 'needs_fix' : 'waiting',
    preview: '',
    previewClipped: false,
    checklistDone: 0,
    checklistTotal: 0,
  }
}

export function sortContinueQuests(a: ContinueQuestCard, b: ContinueQuestCard): number {
  const rank: Record<ContinueQuestKind, number> = { needs_fix: 0, in_progress: 1, waiting: 2 }
  const d = rank[a.kind] - rank[b.kind]
  if (d !== 0) return d
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}

export function continueHrefForPatentTile(tile: TileRow, step: PatentContinueStep): string | undefined {
  const base = getPatentRoute(tile)
  if (base) return patentHrefWithStep(base, step)
  const guild = tile.guild?.trim()
  if (!guild) return '/journey'
  return guildTreeContinueHref(guild)
}
