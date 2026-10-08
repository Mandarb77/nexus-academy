/*
 * Teacher student progress — patent answers for one completion
 *
 * Loads the same merged patent fields the student Journey page uses, so plan + packet
 * rows show as one set of questions. Mark-complete tiles have no written packet.
 */

import { useEffect, useState } from 'react'
import { ApprovedQuestView } from './ApprovedQuestView'
import { fetchJourneyPatentReadView, type JourneyPatentReadViewModel } from '../lib/journeyPatentReadView'
import { getPatentRoute } from '../lib/patentRoutes'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { TileRow } from '../types/tile'

type Props = {
  studentId: string
  tileId: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'empty'; reason: 'other' | 'patent_empty' }
  | { status: 'ready'; model: JourneyPatentReadViewModel }
  | { status: 'error'; message: string }

function tileFromApi(row: Record<string, unknown>): TileRow {
  let steps = row.steps
  if (typeof steps === 'string') {
    try {
      steps = JSON.parse(steps) as unknown
    } catch {
      steps = null
    }
  }
  let record_prompts = row.record_prompts
  if (typeof record_prompts === 'string') {
    try {
      record_prompts = JSON.parse(record_prompts) as unknown
    } catch {
      record_prompts = null
    }
  }
  return { ...row, steps, record_prompts } as TileRow
}

export function TeacherStudentQuestAnswers({ studentId, tileId }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ status: 'error', message: 'Supabase is not configured.' })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    void (async () => {
      const { data, error } = await supabase
        .from('tiles')
        .select('id, guild, skill_name, slug, steps, record_prompts')
        .eq('id', tileId)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setState({ status: 'error', message: error.message })
        return
      }
      if (!data) {
        setState({ status: 'error', message: 'Quest tile not found.' })
        return
      }
      const tile = tileFromApi(data as Record<string, unknown>)
      if (!getPatentRoute(tile)) {
        setState({ status: 'empty', reason: 'other' })
        return
      }
      const model = await fetchJourneyPatentReadView(tile, studentId)
      if (cancelled) return
      setState(model ? { status: 'ready', model } : { status: 'empty', reason: 'patent_empty' })
    })()
    return () => {
      cancelled = true
    }
  }, [studentId, tileId])

  if (state.status === 'loading') {
    return <p className="muted">Loading answers…</p>
  }
  if (state.status === 'error') {
    return (
      <p className="error" role="alert">
        {state.message}
      </p>
    )
  }
  if (state.status === 'empty' && state.reason === 'other') {
    return (
      <p className="muted">
        This quest was marked complete on the skill tree. Written patent answers are only kept for
        patent packets.
      </p>
    )
  }
  if (state.status === 'empty') {
    return <p className="muted">No saved patent answers for this quest.</p>
  }

  return (
    <ApprovedQuestView
      variant="teacher"
      steps={state.model.steps}
      checks={state.model.checks}
      answers={state.model.answers}
      empathy={state.model.empathy}
      uploadUrl={state.model.uploadUrl}
    />
  )
}
