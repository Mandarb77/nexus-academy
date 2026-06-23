/*
 * Purchased shop items — “My stuff” inventory (`/inventory`)
 *
 * Lists `inventory` rows for the signed-in student and merges pending `redemption_requests`
 * so the UI can show “awaiting teacher approval” without letting the student mark an item
 * used twice. `use` actions hit Supabase RPC or updates depending on how your migrations
 * define fulfillment — see body of `load` for paired queries rationale.
 */

import { useCallback, useEffect, useState } from 'react'
import franBarrySupplyLogo from '../assets/fran-barry-supply-logo.png'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { clearKitNewItem } from '../lib/kitNotification'
import { purchaseMomentForKitItem } from '../lib/shopPurchaseMoments'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { InventoryRow } from '../types/inventory'

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

function InventoryVoiceScene({ row }: { row: InventoryRow }) {
  const text = purchaseMomentForKitItem(row)
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
  const { user, signOut } = useAuth()
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

    const [invRes, redRes] = await Promise.all([
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
            purchase_moment_text
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),
      /* Pending redemption hides “Mark as used” until staff approves physical perks that need verification. */
      supabase
        .from('redemption_requests')
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

    const pending = new Set<string>()
    for (const r of redRes.data ?? []) {
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

  return (
    <div className="app-shell bench-chrome inventory-page">
      <MainNav />
      <header className="inventory-header">
        <div className="inventory-top-row bench-page-title-row">
          <div>
            <h1 className="inventory-title bench-page-title">Kit</h1>
            <p className="muted inventory-subtitle">
              Items you bought in the shop. Use an item to ask your teacher to approve it in class.
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

            return (
              <li key={row.id} className="card inventory-item">
                <div className="inventory-item-main">
                  <h2 className="inventory-item-name">{row.item_name}</h2>
                  <p className="muted inventory-item-desc">{row.item_description}</p>
                  <p className="muted inventory-item-meta">
                    Paid <span className="gold-currency-text">{row.gold_cost}</span>{' '}
                    <span className="gold-currency-text">gold</span>
                  </p>
                  <InventoryVoiceScene row={row} />
                </div>
                <div className="inventory-item-action">
                  {isUsed ? (
                    <span className="inventory-item-badge inventory-item-badge--used">Used</span>
                  ) : isPending ? (
                    <button type="button" className="btn-skill btn-skill--pending" disabled>
                      Pending
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
