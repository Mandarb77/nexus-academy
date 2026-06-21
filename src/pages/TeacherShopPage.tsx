/*
 * Shop catalog admin (`/teacher/shop`)
 * Dev notes: docs/shop-catalog-and-teacher-editor.md
 */

import { useCallback, useEffect, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { slugifyShopItemKey } from '../lib/shopItemKey'
import {
  CONVENIENCE_BAND_LABELS,
  defaultLockedForTier,
  defaultPriceForTier,
  SHOP_TIER_OPTIONS,
  type ConvenienceBand,
  type ShopTierName,
} from '../lib/shopCatalogDefaults'
import type { ConvenienceBand as Band, ShopCatalogItem, ShopTierEmbed } from '../types/shopCatalog'

type TierRow = ShopTierEmbed

type ItemRow = ShopCatalogItem

function tierFromRow(row: ItemRow): TierRow | null {
  const t = row.shop_tiers
  if (!t) return null
  return Array.isArray(t) ? t[0] ?? null : t
}

const BLANK = {
  name: '',
  description: '',
  itemKey: '',
  tierName: 'Convenience' as ShopTierName,
  band: 'in_room' as ConvenienceBand,
  priceGold: 8,
  stockPerSemester: '' as string,
  gateRequirement: '',
  flavorText: '',
  isLocked: false,
  isActive: true,
  displayOrder: 100,
  maxPerDay: '' as string,
}

export function TeacherShopPage() {
  const { signOut } = useAuth()
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState(BLANK.name)
  const [description, setDescription] = useState(BLANK.description)
  const [itemKey, setItemKey] = useState(BLANK.itemKey)
  const [tierName, setTierName] = useState<ShopTierName>(BLANK.tierName)
  const [band, setBand] = useState<ConvenienceBand>(BLANK.band)
  const [priceGold, setPriceGold] = useState(BLANK.priceGold)
  const [stockPerSemester, setStockPerSemester] = useState(BLANK.stockPerSemester)
  const [gateRequirement, setGateRequirement] = useState(BLANK.gateRequirement)
  const [flavorText, setFlavorText] = useState(BLANK.flavorText)
  const [isLocked, setIsLocked] = useState(BLANK.isLocked)
  const [isActive, setIsActive] = useState(BLANK.isActive)
  const [displayOrder, setDisplayOrder] = useState(BLANK.displayOrder)
  const [maxPerDay, setMaxPerDay] = useState(BLANK.maxPerDay)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [tierRes, itemRes] = await Promise.all([
      supabase.from('shop_tiers').select('id, name, subtitle, sort_order').order('sort_order'),
      supabase.from('shop_items').select(`
          id, item_key, name, description, tier_id, price_gold, is_active, flavor_text,
          is_locked, display_order, max_purchases_per_chicago_school_day,
          convenience_band, stock_per_semester, gate_requirement,
          shop_tiers ( id, name, subtitle, sort_order )
        `).order('display_order'),
    ])
    setLoading(false)
    if (tierRes.error) {
      setLoadError(tierRes.error.message)
      return
    }
    if (itemRes.error) {
      setLoadError(itemRes.error.message)
      return
    }
    setLoadError(null)
    setTiers((tierRes.data ?? []) as TierRow[])
    setItems((itemRes.data ?? []) as ItemRow[])
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const resetBuilder = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setItemKey('')
    setTierName('Convenience')
    setBand('in_room')
    setPriceGold(8)
    setStockPerSemester('')
    setGateRequirement('')
    setFlavorText('')
    setIsLocked(false)
    setIsActive(true)
    setDisplayOrder(100)
    setMaxPerDay('')
    setSaveError(null)
    setSaveSuccess(null)
  }

  const applyTierDefaults = (t: ShopTierName) => {
    setTierName(t)
    setBand(t === 'Convenience' ? 'in_room' : 'in_room')
    setPriceGold(defaultPriceForTier(t, t === 'Convenience' ? band : null))
    setIsLocked(defaultLockedForTier(t))
    if (t !== 'Craft') setGateRequirement('')
    if (t !== 'Convenience') setBand('in_room')
  }

  const loadIntoBuilder = (row: ItemRow) => {
    const t = tierFromRow(row)
    setEditingId(row.id)
    setName(row.name)
    setDescription(row.description)
    setItemKey(row.item_key)
    setTierName((t?.name as ShopTierName) ?? 'Convenience')
    setBand((row.convenience_band as Band) ?? 'in_room')
    setPriceGold(row.price_gold ?? 0)
    setStockPerSemester(row.stock_per_semester != null ? String(row.stock_per_semester) : '')
    setGateRequirement(row.gate_requirement ?? '')
    setFlavorText(row.flavor_text ?? '')
    setIsLocked(row.is_locked)
    setIsActive(row.is_active)
    setDisplayOrder(row.display_order)
    setMaxPerDay(
      row.max_purchases_per_chicago_school_day != null
        ? String(row.max_purchases_per_chicago_school_day)
        : '',
    )
    setSaveError(null)
    setSaveSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveItem = async () => {
    setSaveError(null)
    setSaveSuccess(null)
    if (!name.trim()) {
      setSaveError('Name is required.')
      return
    }
    if (!description.trim()) {
      setSaveError('Description is required.')
      return
    }
    const key = (editingId ? itemKey : slugifyShopItemKey(name)).trim()
    if (!key) {
      setSaveError('Item key is required (use a name with letters or numbers).')
      return
    }
    const tier = tiers.find((t) => t.name === tierName)
    if (!tier) {
      setSaveError('Unknown tier — reload the page.')
      return
    }

    const payload = {
      item_key: key,
      name: name.trim(),
      description: description.trim(),
      tier_id: tier.id,
      price_gold: isLocked && priceGold <= 0 ? null : priceGold,
      is_active: isActive,
      flavor_text: flavorText.trim() || null,
      is_locked: isLocked,
      display_order: displayOrder,
      max_purchases_per_chicago_school_day: maxPerDay.trim() ? Number(maxPerDay) : null,
      convenience_band: tierName === 'Convenience' ? band : null,
      stock_per_semester: stockPerSemester.trim() ? Number(stockPerSemester) : null,
      gate_requirement: gateRequirement.trim() || null,
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('shop_items').update(payload).eq('id', editingId)
        if (error) throw error
        setSaveSuccess('Item updated.')
      } else {
        const { error } = await supabase.from('shop_items').insert(payload)
        if (error) throw error
        setSaveSuccess('Item created.')
        resetBuilder()
      }
      await loadAll()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (id: string, itemName: string) => {
    if (!window.confirm(`Delete '${itemName}' permanently? This cannot be undone.`)) return
    setDeletingId(id)
    const { error } = await supabase.from('shop_items').delete().eq('id', id)
    setDeletingId(null)
    if (error) {
      alert(`Delete failed: ${error.message}`)
      return
    }
    if (editingId === id) resetBuilder()
    await loadAll()
  }

  return (
    <div className="app-shell bench-chrome teacher-panel-page">
      <header className="teacher-panel-header">
        <MainNav variant="teacher" />
        <div className="teacher-panel-top-row">
          <div>
            <h1 className="teacher-panel-title bench-page-title">Shop catalog</h1>
            <p className="muted teacher-panel-subtitle">
              Edit Supply shelves: Convenience (gold), Craft (unlock when not locked), Legacy (price + unlock).
              Gate text is shown to students when locked; enforcement still uses the locked flag until guild gates ship.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="teacher-panel-section" style={{ maxWidth: '720px' }}>
        <h2 className="teacher-panel-section-title">{editingId ? `Editing: ${name || 'Item'}` : 'New item'}</h2>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Name *</span>
          <input type="text" value={name} onChange={(e) => {
            setName(e.target.value)
            if (!editingId) setItemKey(slugifyShopItemKey(e.target.value))
          }} />
        </label>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Item key *</span>
          <input type="text" value={itemKey} onChange={(e) => setItemKey(e.target.value)} disabled={!editingId && !name} />
          <span className="muted" style={{ fontSize: '0.82rem' }}>Stable id for purchases (snake_case).</span>
        </label>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Description *</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Tier</span>
            <select value={tierName} onChange={(e) => applyTierDefaults(e.target.value as ShopTierName)}>
              {SHOP_TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          {tierName === 'Convenience' ? (
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Band</span>
              <select value={band} onChange={(e) => setBand(e.target.value as ConvenienceBand)}>
                {(Object.keys(CONVENIENCE_BAND_LABELS) as ConvenienceBand[]).map((b) => (
                  <option key={b} value={b}>{CONVENIENCE_BAND_LABELS[b]}</option>
                ))}
              </select>
            </label>
          ) : (
            <div />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Price (gold)</span>
            <input type="number" min={0} value={priceGold} onChange={(e) => setPriceGold(Number(e.target.value))} />
          </label>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Stock / semester</span>
            <input type="number" min={0} placeholder="∞" value={stockPerSemester} onChange={(e) => setStockPerSemester(e.target.value)} />
          </label>
          <label className="patent-field" style={{ margin: 0 }}>
            <span className="patent-label">Max / day (Eastern)</span>
            <input type="number" min={1} placeholder="∞" value={maxPerDay} onChange={(e) => setMaxPerDay(e.target.value)} />
          </label>
        </div>

        {tierName === 'Craft' ? (
          <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
            <span className="patent-label">Gate requirement (display when locked)</span>
            <input
              type="text"
              value={gateRequirement}
              placeholder="Mr. Cook's call on this one. Talk to him."
              onChange={(e) => setGateRequirement(e.target.value)}
            />
          </label>
        ) : null}

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Flavor text (optional)</span>
          <input type="text" value={flavorText} onChange={(e) => setFlavorText(e.target.value)} />
        </label>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Display order</span>
          <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={isLocked} onChange={(e) => setIsLocked(e.target.checked)} />
            Locked (students cannot buy)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible in Supply)
          </label>
        </div>

        {saveError ? <p className="error" role="alert">{saveError}</p> : null}
        {saveSuccess ? <p style={{ color: '#16a34a', fontWeight: 600 }} role="status">{saveSuccess}</p> : null}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveItem()}>
            {saving ? 'Saving…' : editingId ? 'Update item' : 'Create item'}
          </button>
          {editingId ? (
            <>
              <button type="button" className="btn-secondary" onClick={resetBuilder}>Cancel edit</button>
              <button
                type="button"
                className="btn-secondary"
                style={{ color: '#b91c1c' }}
                disabled={deletingId === editingId}
                onClick={() => void deleteItem(editingId, name.trim() || 'this item')}
              >
                {deletingId === editingId ? 'Deleting…' : 'Delete item'}
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section className="teacher-panel-section">
        <h2 className="teacher-panel-section-title">Catalog items</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : loadError ? (
          <p className="error" role="alert">{loadError}</p>
        ) : items.length === 0 ? (
          <p className="muted">No items yet.</p>
        ) : (
          <ul className="teacher-panel-list" style={{ gap: '0.65rem' }}>
            {items.map((row) => {
              const t = tierFromRow(row)
              return (
                <li key={row.id} className="card teacher-panel-item">
                  <div className="teacher-panel-item-main">
                    <p style={{ fontWeight: 700, margin: 0 }}>{row.name}{!row.is_active ? ' (hidden)' : ''}</p>
                    <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.88rem' }}>
                      {t?.name ?? '?'} · {row.item_key} · {row.price_gold ?? '—'} gold
                      {row.is_locked ? ' · Locked' : ''}
                      {row.stock_per_semester != null ? ` · Stock ${row.stock_per_semester}/sem` : ''}
                    </p>
                  </div>
                  <div className="teacher-panel-actions">
                    <button type="button" className="btn-primary" style={{ fontSize: '0.88rem' }} onClick={() => loadIntoBuilder(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.88rem', color: '#b91c1c' }}
                      disabled={deletingId === row.id}
                      onClick={() => void deleteItem(row.id, row.name)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
