/*
 * Purchased shop items — “My stuff” inventory (`/inventory`)
 *
 * Lists `inventory` rows for the signed-in student and merges pending `redemption_requests`
 * / `shop_duty_completions` so the UI can show “awaiting teacher approval” without letting
 * the student mark an item used twice.
 *
 * Kit voice scenes reuse Supply purchase moments, personalized with preferred first name.
 * Duty items (fulfillment_kind = duty_completion) use Mark complete → gold-only teacher queue.
 */

import { useCallback, useEffect, useState } from 'react'
import franBarrySupplyLogo from '../assets/fran-barry-supply-logo.png'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { clearKitNewItem } from '../lib/kitNotification'
import { preferredFirstNameForVoice } from '../lib/preferredFirstName'
import { purchaseMomentForKitItem } from '../lib/shopPurchaseMoments'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { InventoryRow } from '../types/inventory'

function shopItemEmbed(row: InventoryRow) {
  const raw = row.shop_items
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

function isDutyItem(row: InventoryRow): boolean {
  return shopItemEmbed(row)?.fulfillment_kind === 'duty_completion'
}

function renderKitVoiceLine(line: string) {
  return line.split(/(\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <span key={index} className="inventory-item-voice__handwritten">
          {part.slice(1, -1)}
        </span>
      )
    }
    return part
  })
}

function InventoryVoiceScene({ row, firstName }: { row: InventoryRow; firstName: string }) {
  const text = purchaseMomentForKitItem(row, firstName)
  return (
    <div className="inventory-item-voice" aria-label="Fran and Barry note">
      <div className="inventory-item-voice__head">
        <p className="inventory-item-voice__eyebrow">Fran and Barry</p>
        <img
          src={franBarrySupplyLogo}
          alt=""
          className="inventory-item-voice__mark"
          aria-hidden="true"
        />
      </div>
      <div className="inventory-item-voice__body">
        {text
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, index) => (
            <p key={index} className="inventory-item-voice__line">
              {renderKitVoiceLine(line)}
            </p>
          ))}
      </div>
    </div>
  )
}

export function InventoryPage() {
  const { user, profile, signOut } = useAuth()
  const firstName = preferredFirstNameForVoice(profile)
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [pendingInventoryIds, setPendingInventoryIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [useError, setUseError] = useState<string | null>(null)
  const [usingId, setUsingId] = useState<string | null>(null)

  const studentId = user?.id

  const load = useCallback(async () => {
    if (!studentId || !isSupabaseConfigured) {
      setRows([])
      setPendingInventoryIds(new Set())
      setLoadError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)

    const [invRes, redRes, dutyRes] = await Promise.all([
      supabase
        .from('inventory')
        .select(`
          id,
          student_id,
          shop_item_id,
          item_name,
          item_description,
          gold_cost,
          status,
          created_at,
          shop_items (
            item_key,
            name,
            purchase_moment_text,
            fulfillment_kind,
            completion_reward_gold
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),
      /* Pending redemption hides “Mark as used” until staff approves physical perks. */
      supabase
        .from('redemption_requests')
        .select('inventory_id')
        .eq('student_id', studentId)
        .eq('status', 'pending'),
      supabase
        .from('shop_duty_completions')
        .select('inventory_id')
        .eq('student_id', studentId)
        .eq('status', 'pending'),
    ])

    if (invRes.error) {
      console.error('inventory:', invRes.error.message)
      setRows([])
      setPendingInventoryIds(new Set())
      setLoadError(invRes.error.message)
      setLoading(false)
      return
    }
    if (redRes.error) {
      console.error('redemption_requests:', redRes.error.message)
      setRows([])
      setPendingInventoryIds(new Set())
      setLoadError(redRes.error.message)
      setLoading(false)
      return
    }
    if (dutyRes.error) {
      console.error('shop_duty_completions:', dutyRes.error.message)
      setRows([])
      setPendingInventoryIds(new Set())
      setLoadError(dutyRes.error.message)
      setLoading(false)
      return
    }

    const pending = new Set<string>()
    for (const r of redRes.data ?? []) {
      pending.add(r.inventory_id as string)
    }
    for (const r of dutyRes.data ?? []) {
      pending.add(r.inventory_id as string)
    }
    setPendingInventoryIds(pending)
    setRows((invRes.data ?? []) as InventoryRow[])
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    clearKitNewItem()
  }, [])

  const requestUse = async (row: InventoryRow) => {
    if (!studentId || !isSupabaseConfigured) return
    setUseError(null)
    setUsingId(row.id)
    const { error } = await supabase.from('redemption_requests').insert({
      student_id: studentId,
      inventory_id: row.id,
      item_name: row.item_name,
    })
    setUsingId(null)
    if (error) {
      if (error.code === '23505') {
        setUseError('A request for this item is already pending.')
      } else {
        setUseError(error.message)
      }
      return
    }
    void load()
  }

  const markDutyComplete = async (row: InventoryRow) => {
    if (!studentId || !isSupabaseConfigured) return
    setUseError(null)
    setUsingId(row.id)
    const { data, error } = await supabase.rpc('submit_shop_duty_completion', {
      p_inventory_id: row.id,
    })
    setUsingId(null)
    if (error) {
      setUseError(error.message)
      return
    }
    const res = data as { ok?: boolean; error?: string } | null
    if (!res?.ok) {
      if (res?.error === 'already_pending') {
        setUseError('This duty is already waiting for teacher approval.')
      } else if (res?.error === 'already_used') {
        setUseError('This item is already used.')
      } else if (res?.error === 'not_duty_item') {
        setUseError('This item is not a duty completion.')
      } else {
        setUseError(res?.error ?? 'Could not submit duty completion.')
      }
      return
    }
    void load()
  }

  return (
    <div className="app-shell bench-chrome inventory-page">
      <MainNav />
      <header className="inventory-header">
        <div className="inventory-top-row bench-page-title-row">
          <div>
            <h1 className="inventory-title bench-page-title">Kit</h1>
            <p className="muted inventory-subtitle">
              Items you bought in the shop. Use an item to ask your teacher to approve it in class.
              Duty items: mark complete after the work is done.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <p className="muted" role="alert">
          Connect Supabase in <code className="inline-code">.env</code> to use inventory.
        </p>
      ) : null}

      {loadError ? (
        <p className="error" role="alert">
          Could not load inventory: {loadError}
        </p>
      ) : null}

      {useError ? (
        <p className="gold-shop-message muted" role="status">
          {useError}
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Loading inventory…</p>
      ) : loadError ? null : rows.length === 0 ? (
        <p className="muted" role="status">
          You don&apos;t have any items yet. Visit the <strong>Shop</strong> to buy something with gold.
        </p>
      ) : (
        <ul className="inventory-list">
          {rows.map((row) => {
            const isUsed = row.status === 'used'
            const isPending = pendingInventoryIds.has(row.id)
            const busy = usingId === row.id
            const duty = isDutyItem(row)
            const rewardGold = shopItemEmbed(row)?.completion_reward_gold

            return (
              <li key={row.id} className="card inventory-item">
                <div className="inventory-item-main">
                  <h2 className="inventory-item-name">{row.item_name}</h2>
                  <p className="muted inventory-item-desc">{row.item_description}</p>
                  <p className="muted inventory-item-meta">
                    Paid <span className="gold-currency-text">{row.gold_cost}</span>{' '}
                    <span className="gold-currency-text">gold</span>
                    {duty && rewardGold != null ? (
                      <>
                        {' '}
                        · Complete for{' '}
                        <span className="gold-currency-text">+{rewardGold} gold</span> if approved
                      </>
                    ) : null}
                  </p>
                  <InventoryVoiceScene row={row} firstName={firstName} />
                </div>
                <div className="inventory-item-action">
                  {isUsed ? (
                    <span className="inventory-item-badge inventory-item-badge--used">Used</span>
                  ) : isPending ? (
                    <button type="button" className="btn-skill btn-skill--pending" disabled>
                      Pending
                    </button>
                  ) : duty ? (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!isSupabaseConfigured || busy}
                      onClick={() => void markDutyComplete(row)}
                    >
                      {busy ? 'Sending…' : 'Mark complete'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!isSupabaseConfigured || busy}
                      onClick={() => void requestUse(row)}
                    >
                      {busy ? 'Sending…' : 'Use item'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
