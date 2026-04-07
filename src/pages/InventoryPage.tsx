import { useCallback, useEffect, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { InventoryRow } from '../types/inventory'

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
        .select('id, student_id, item_name, item_description, gold_cost, status, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),
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
    <div className="app-shell inventory-page">
      <MainNav />
      <header className="inventory-header">
        <div className="inventory-top-row">
          <div>
            <h1 className="inventory-title">Inventory</h1>
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
