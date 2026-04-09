import type { TileRow } from '../types/tile'
import type { EmpathyDraft } from './empathy'
import { parseEmpathy } from './empathy'
import { resolvedTileSteps } from './customTile'
import { getPatentRoute } from './patentRoutes'
import { isPersonalGamePieceTile } from './gamePieceTile'
import { isPopUpCardTile, POP_UP_CARD_STEPS } from './popUpCardQuest'
import { isStickerTile } from './stickerTile'
import { STICKER_STEPS } from './stickerSteps'
import { PERSONAL_GAME_PIECE_STEPS } from './personalGamePieceSteps'
import { fillPatentPlanFieldsFromRows, type LoadedPlanPatentRow } from './patentFormMerge'
import { selectStudentPatentPrimary } from './patentPlanRow'
import { normalizePatentPlanStatus } from './patentPlanStatus'
import { patentTileIdCandidates } from './patentTileQuery'
import { supabase } from './supabase'

export type JourneyPatentReadViewModel = {
  steps: string[]
  checks: boolean[]
  empathy: EmpathyDraft
  answers: { label: string; value: string }[]
  uploadUrl: string | null
  repeatNote: string
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function pickField2EmpathySource(primary: LoadedPlanPatentRow, allRows: LoadedPlanPatentRow[]): string | null {
  if (nonEmptyString(primary.field_2)) return primary.field_2
  const sorted = [...allRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  for (const r of sorted) {
    if (nonEmptyString(r.field_2)) return r.field_2
  }
  return null
}

function checklistStepLabels(tile: TileRow): string[] {
  if (isStickerTile(tile)) return [...STICKER_STEPS]
  if (isPopUpCardTile(tile)) return [...POP_UP_CARD_STEPS]
  if (isPersonalGamePieceTile(tile)) return [...PERSONAL_GAME_PIECE_STEPS]
  return resolvedTileSteps(tile).map((s) => s.description)
}

function answerBlocksForTile(tile: TileRow, field1: string, field3: string, field4: string) {
  if (isStickerTile(tile) || isPersonalGamePieceTile(tile) || isPopUpCardTile(tile)) {
    return [
      { label: 'What are you making?', value: field1 },
      { label: '__empathy__', value: '' },
      { label: 'How did you make it an original work?', value: field3 },
      { label: 'What do you have to iterate?', value: field4 },
    ]
  }
  return [
    { label: 'What are you going to make?', value: field1 },
    { label: '__empathy__', value: '' },
    { label: 'What makes this work yours — where did you go beyond the example?', value: field3 },
    { label: 'What failed and what did you change?', value: field4 },
  ]
}

function repeatNoteForTile(tile: TileRow): string {
  if (isPersonalGamePieceTile(tile) || isPopUpCardTile(tile)) {
    return "This quest can be completed again for bonus WP — talk to your teacher to reset the checklist."
  }
  return "Talk to your teacher to reset the checklist if you'd like to complete this quest again."
}

function newestPacketUploadUrl(allRows: LoadedPlanPatentRow[]): string | null {
  const packets = allRows
    .filter((r) => String(r.stage ?? '').trim().toLowerCase() === 'packet')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const u = packets[0]?.upload_url
  return typeof u === 'string' && u.trim() ? u : null
}

export function buildJourneyPatentReadViewFromRows(
  tile: TileRow,
  allRows: LoadedPlanPatentRow[],
): JourneyPatentReadViewModel | null {
  if (!getPatentRoute(tile)) return null

  const { primary, rowsForMerge, source } = selectStudentPatentPrimary(allRows, normalizePatentPlanStatus)
  if (!primary) return null

  const merged = fillPatentPlanFieldsFromRows(primary, rowsForMerge)
  const empathyRaw = pickField2EmpathySource(primary, allRows)
  const empathy = parseEmpathy(empathyRaw)

  const steps = checklistStepLabels(tile)
  const clen = steps.length
  const primaryStage = String(primary.stage ?? '').trim().toLowerCase() === 'packet' ? 'packet' : 'plan'
  const rawCs = primary.checklist_state
  const rawCsArr = Array.isArray(rawCs) ? (rawCs as boolean[]) : []
  const csFromDb: boolean[] = [
    ...rawCsArr.slice(0, clen),
    ...Array(Math.max(0, clen - rawCsArr.length)).fill(false),
  ]
  const checksForUi =
    primaryStage === 'packet' || source === 'packet' ? Array(clen).fill(true) : csFromDb

  const uploadUrl = newestPacketUploadUrl(allRows) ?? primary.upload_url ?? null

  return {
    steps,
    checks: checksForUi,
    empathy,
    answers: answerBlocksForTile(tile, merged.field_1, merged.field_3, merged.field_4),
    uploadUrl: typeof uploadUrl === 'string' ? uploadUrl : null,
    repeatNote: repeatNoteForTile(tile),
  }
}

/** Load saved patent answers + checklist for a completed patent quest (journey / read-only). */
export async function fetchJourneyPatentReadView(
  tile: TileRow,
  studentId: string,
): Promise<JourneyPatentReadViewModel | null> {
  if (!getPatentRoute(tile)) return null

  const tileCandidates = patentTileIdCandidates(tile.id)
  const { data, error } = await supabase
    .from('patents')
    .select(
      'id, status, stage, field_1, field_2, field_3, field_4, checklist_state, checklist_submitted, checklist_approved, upload_url, process_upload_url, created_at',
    )
    .eq('student_id', studentId)
    .in('tile_id', tileCandidates)
    .in('stage', ['plan', 'packet'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[Journey] patent read view fetch:', error.message)
    return null
  }

  const allRows = (data ?? []) as LoadedPlanPatentRow[]
  return buildJourneyPatentReadViewFromRows(tile, allRows)
}
