import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { TileRow } from '../types/tile'
import type { SkillCompletionStatus } from '../types/skillCompletion'

type Props = {
  tile: TileRow
  refresh: () => Promise<void>
  completionStatus: SkillCompletionStatus | undefined
}

type PatentRow = {
  id: string
  field_1: string
  field_2: string
  stage: string
  status: string
}

export function DevTestTwoStageQuestContent({ tile, refresh, completionStatus }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patent, setPatent] = useState<PatentRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [step1Text, setStep1Text] = useState('')
  const [step2Text, setStep2Text] = useState('')
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadPatent = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) {
      setPatent(null)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('patents')
      .select('id, field_1, field_2, stage, status')
      .eq('student_id', user.id)
      .eq('tile_id', tile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[DevTestQuest] load patent:', error.message)
      setPatent(null)
    } else if (data) {
      setPatent({
        id: data.id as string,
        field_1: (data.field_1 as string) ?? '',
        field_2: (data.field_2 as string) ?? '',
        stage: String(data.stage ?? ''),
        status: String(data.status ?? ''),
      })
      setStep1Text((data.field_1 as string) ?? '')
      setStep2Text((data.field_2 as string) ?? '')
    } else {
      setPatent(null)
    }
    setLoading(false)
  }, [user?.id, tile.id])

  useEffect(() => {
    void loadPatent()
  }, [loadPatent])

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return
    const uid = user.id
    const tid = String(tile.id)
    const channel = supabase
      .channel(`dev-test-quest-${tid}-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'patents', filter: `student_id=eq.${uid}` },
        () => {
          void loadPatent()
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'patents', filter: `student_id=eq.${uid}` },
        () => {
          void loadPatent()
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'skill_completions', filter: `student_id=eq.${uid}` },
        () => {
          void refresh()
          void loadPatent()
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'skill_completions', filter: `student_id=eq.${uid}` },
        () => {
          void refresh()
          void loadPatent()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, tile.id, loadPatent, refresh])

  const phase = useMemo(() => {
    if (completionStatus === 'approved') return 'done' as const
    const p = patent
    if (!p || (p.status === 'returned' && p.stage === 'test_step1')) return 'step1_entry' as const
    if (p.stage === 'test_step1' && p.status === 'pending') return 'step1_wait' as const
    if (p.stage === 'test_step1' && p.status === 'approved') return 'step2_entry' as const
    if (p.stage === 'packet' && p.status === 'pending' && completionStatus === 'pending') return 'step2_wait' as const
    if (p.stage === 'packet' && p.status === 'pending' && !completionStatus) return 'step2_wait' as const
    if (p.stage === 'packet' && completionStatus === 'returned') return 'step2_entry' as const
    return 'step1_entry' as const
  }, [patent, completionStatus])

  const submitStep1 = async () => {
    if (!user?.id || !isSupabaseConfigured) return
    const text = step1Text.trim()
    if (!text) {
      setSubmitErr('Please write a sentence before submitting.')
      return
    }
    setSubmitErr(null)
    setBusy(true)
    try {
      if (!patent || (patent.status === 'returned' && patent.stage === 'test_step1')) {
        if (patent) {
          const { error } = await supabase
            .from('patents')
            .update({
              field_1: text,
              field_2: '',
              field_3: '',
              field_4: '',
              stage: 'test_step1',
              status: 'pending',
            })
            .eq('id', patent.id)
          if (error) throw new Error(error.message)
        } else {
          const { error } = await supabase.from('patents').insert({
            student_id: user.id,
            tile_id: tile.id,
            field_1: text,
            field_2: '',
            field_3: '',
            field_4: '',
            stage: 'test_step1',
            status: 'pending',
          })
          if (error) throw new Error(error.message)
        }
      }
      await loadPatent()
      await refresh()
    } catch (e: unknown) {
      setSubmitErr(e instanceof Error ? e.message : 'Submit failed.')
    } finally {
      setBusy(false)
    }
  }

  const submitStep2 = async () => {
    if (!user?.id || !isSupabaseConfigured || !patent) return
    const text = step2Text.trim()
    if (!text) {
      setSubmitErr('Please write a sentence before submitting.')
      return
    }
    setSubmitErr(null)
    setBusy(true)
    try {
      const { error: pErr } = await supabase
        .from('patents')
        .update({
          field_2: text,
          field_3: '',
          field_4: '',
          stage: 'packet',
          status: 'pending',
        })
        .eq('id', patent.id)
      if (pErr) throw new Error(pErr.message)

      const { data: existing } = await supabase
        .from('skill_completions')
        .select('id')
        .eq('student_id', user.id)
        .eq('tile_id', tile.id)
        .maybeSingle()

      if (existing?.id) {
        const { error: uErr } = await supabase
          .from('skill_completions')
          .update({ status: 'pending', patent_id: patent.id, wp_awarded: null, gold_awarded: null })
          .eq('id', existing.id as string)
        if (uErr) throw new Error(uErr.message)
      } else {
        const { error: iErr } = await supabase.from('skill_completions').insert({
          student_id: user.id,
          tile_id: tile.id,
          skill_key: tile.id,
          status: 'pending',
          patent_id: patent.id,
        })
        if (iErr) throw new Error(iErr.message)
      }

      await loadPatent()
      await refresh()
    } catch (e: unknown) {
      setSubmitErr(e instanceof Error ? e.message : 'Submit failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!user?.id) {
    return <p className="muted">Sign in to use this quest.</p>
  }

  if (loading) {
    return <p className="muted">Loading quest…</p>
  }

  if (phase === 'done') {
    return (
      <div className="card" style={{ padding: '1.25rem' }}>
        <p style={{ margin: 0, fontWeight: 700 }}>Quest complete</p>
        <p className="muted" style={{ margin: '0.5rem 0 0' }}>
          Your teacher approved Step 2. You earned {tile.wp_value} WP and {tile.gold_value ?? 1} gold.
        </p>
        <button type="button" className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    )
  }

  if (phase === 'step1_wait') {
    return (
      <div className="card" style={{ padding: '1.25rem' }} role="status">
        <p style={{ margin: 0, fontWeight: 700 }}>Step 1 submitted — waiting for teacher approval.</p>
        <p className="muted" style={{ margin: '0.5rem 0 0' }}>You will see Step 2 here after your teacher approves.</p>
      </div>
    )
  }

  if (phase === 'step2_wait') {
    return (
      <div className="card" style={{ padding: '1.25rem' }} role="status">
        <p style={{ margin: 0, fontWeight: 700 }}>Step 2 submitted — waiting for teacher approval.</p>
        <p className="muted" style={{ margin: '0.5rem 0 0' }}>
          Your teacher will review your final answer and award WP and gold when they approve.
        </p>
      </div>
    )
  }

  if (phase === 'step2_entry') {
    return (
      <form
        className="patent-game-piece-form"
        onSubmit={(e) => {
          e.preventDefault()
          void submitStep2()
        }}
      >
        <label className="muted" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
          Write one sentence describing one thing that could go wrong and how you would fix it.
        </label>
        <textarea
          className="patent-textarea"
          value={step2Text}
          onChange={(e) => setStep2Text(e.target.value)}
          rows={4}
          disabled={busy}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: '0.75rem' }}
        />
        {submitErr ? <p className="error">{submitErr}</p> : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit Step 2 for Approval'}
        </button>
      </form>
    )
  }

  /* step1_entry */
  return (
    <form
      className="patent-game-piece-form"
      onSubmit={(e) => {
        e.preventDefault()
        void submitStep1()
      }}
    >
      <label className="muted" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
        Write one sentence describing what you are working on today.
      </label>
      <textarea
        className="patent-textarea"
        value={step1Text}
        onChange={(e) => setStep1Text(e.target.value)}
        rows={4}
        disabled={busy}
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: '0.75rem' }}
      />
      {submitErr ? <p className="error">{submitErr}</p> : null}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit Step 1 for Approval'}
      </button>
    </form>
  )
}
