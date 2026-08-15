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

function limitSummary(row: ItemRow): string {
  const parts: string[] = []
  if (row.per_kid_semester_cap != null) {
    const period = row.cap_period === 'week' ? 'week' : 'sem'
    parts.push(`${row.per_kid_semester_cap}/kid/${period}`)
  }
  if (row.fulfillment_kind === 'duty_completion') {
    parts.push(
      row.completion_reward_gold != null
        ? `duty +${row.completion_reward_gold}g`
        : 'duty completion',
    )
  }
  if (row.per_kid_daily_rate_limit != null) parts.push(`${row.per_kid_daily_rate_limit}/kid/day`)
  if (row.per_kid_rate_limit_days != null) parts.push(`every ${row.per_kid_rate_limit_days} days`)
  if (row.per_kid_lifetime_cap != null) parts.push(`${row.per_kid_lifetime_cap}/kid/life`)
  if (row.workshop_total_stock != null) parts.push(`workshop stock ${row.workshop_total_stock}`)
  if (row.time_window_start || row.time_window_end) {
    parts.push(`${row.time_window_start || '...'} through ${row.time_window_end || '...'}`)
  }
  return parts.join(' · ')
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
  purchaseMomentText: '',
  isLocked: false,
  isActive: true,
  displayOrder: 100,
  maxPerDay: '' as string,
  perKidSemesterCap: '' as string,
  capPeriod: 'semester' as 'semester' | 'week',
  fulfillmentKind: 'redemption' as 'redemption' | 'duty_completion',
  completionRewardGold: '' as string,
  perKidDailyRateLimit: '' as string,
  perKidRateLimitDays: '' as string,
  perKidLifetimeCap: '' as string,
  workshopTotalStock: '' as string,
  timeWindowStart: '',
  timeWindowEnd: '',
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
  const [purchaseMomentText, setPurchaseMomentText] = useState(BLANK.purchaseMomentText)
  const [isLocked, setIsLocked] = useState(BLANK.isLocked)
  const [isActive, setIsActive] = useState(BLANK.isActive)
  const [displayOrder, setDisplayOrder] = useState(BLANK.displayOrder)
  const [maxPerDay, setMaxPerDay] = useState(BLANK.maxPerDay)
  const [perKidSemesterCap, setPerKidSemesterCap] = useState(BLANK.perKidSemesterCap)
  const [capPeriod, setCapPeriod] = useState(BLANK.capPeriod)
  const [fulfillmentKind, setFulfillmentKind] = useState(BLANK.fulfillmentKind)
  const [completionRewardGold, setCompletionRewardGold] = useState(BLANK.completionRewardGold)
  const [perKidDailyRateLimit, setPerKidDailyRateLimit] = useState(BLANK.perKidDailyRateLimit)
  const [perKidRateLimitDays, setPerKidRateLimitDays] = useState(BLANK.perKidRateLimitDays)
  const [perKidLifetimeCap, setPerKidLifetimeCap] = useState(BLANK.perKidLifetimeCap)
  const [workshopTotalStock, setWorkshopTotalStock] = useState(BLANK.workshopTotalStock)
  const [timeWindowStart, setTimeWindowStart] = useState(BLANK.timeWindowStart)
  const [timeWindowEnd, setTimeWindowEnd] = useState(BLANK.timeWindowEnd)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filamentTypesText, setFilamentTypesText] = useState('')
  const [savingFilamentTypes, setSavingFilamentTypes] = useState(false)
  const [filamentTypesMessage, setFilamentTypesMessage] = useState<string | null>(null)
  const [filamentTypesError, setFilamentTypesError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [tierRes, itemRes, filamentConfigRes] = await Promise.all([
      supabase.from('shop_tiers').select('id, name, subtitle, sort_order').order('sort_order'),
      supabase.from('shop_items').select(`
          id, item_key, name, description, tier_id, price_gold, is_active, flavor_text,
          purchase_moment_text,
          is_locked, display_order, max_purchases_per_chicago_school_day,
          convenience_band, stock_per_semester,
          per_kid_semester_cap, cap_period, fulfillment_kind, completion_reward_gold,
          per_kid_daily_rate_limit, per_kid_rate_limit_days,
          per_kid_lifetime_cap, workshop_total_stock, time_window_start, time_window_end,
          gate_requirement,
          shop_tiers ( id, name, subtitle, sort_order )
        `).order('display_order'),
      supabase
        .from('shop_config')
        .select('config_value')
        .eq('config_key', 'specialty_filament_types')
        .maybeSingle(),
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
    if (!filamentConfigRes.error && Array.isArray(filamentConfigRes.data?.config_value)) {
      setFilamentTypesText(
        filamentConfigRes.data.config_value
          .filter((value): value is string => typeof value === 'string')
          .join('\n'),
      )
    }
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
    setPurchaseMomentText('')
    setIsLocked(false)
    setIsActive(true)
    setDisplayOrder(100)
    setMaxPerDay('')
    setPerKidSemesterCap('')
    setCapPeriod('semester')
    setFulfillmentKind('redemption')
    setCompletionRewardGold('')
    setPerKidDailyRateLimit('')
    setPerKidRateLimitDays('')
    setPerKidLifetimeCap('')
    setWorkshopTotalStock('')
    setTimeWindowStart('')
    setTimeWindowEnd('')
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
    setPurchaseMomentText(row.purchase_moment_text ?? '')
    setIsLocked(row.is_locked)
    setIsActive(row.is_active)
    setDisplayOrder(row.display_order)
    setMaxPerDay(
      row.max_purchases_per_chicago_school_day != null
        ? String(row.max_purchases_per_chicago_school_day)
        : '',
    )
    setPerKidSemesterCap(row.per_kid_semester_cap != null ? String(row.per_kid_semester_cap) : '')
    setCapPeriod(row.cap_period === 'week' ? 'week' : 'semester')
    setFulfillmentKind(row.fulfillment_kind === 'duty_completion' ? 'duty_completion' : 'redemption')
    setCompletionRewardGold(
      row.completion_reward_gold != null ? String(row.completion_reward_gold) : '',
    )
    setPerKidDailyRateLimit(row.per_kid_daily_rate_limit != null ? String(row.per_kid_daily_rate_limit) : '')
    setPerKidRateLimitDays(row.per_kid_rate_limit_days != null ? String(row.per_kid_rate_limit_days) : '')
    setPerKidLifetimeCap(row.per_kid_lifetime_cap != null ? String(row.per_kid_lifetime_cap) : '')
    setWorkshopTotalStock(row.workshop_total_stock != null ? String(row.workshop_total_stock) : '')
    setTimeWindowStart(row.time_window_start ?? '')
    setTimeWindowEnd(row.time_window_end ?? '')
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
      purchase_moment_text: purchaseMomentText.trim() || null,
      is_locked: isLocked,
      display_order: displayOrder,
      max_purchases_per_chicago_school_day: maxPerDay.trim() ? Number(maxPerDay) : null,
      convenience_band: tierName === 'Convenience' ? band : null,
      stock_per_semester: stockPerSemester.trim() ? Number(stockPerSemester) : null,
      per_kid_semester_cap: perKidSemesterCap.trim() ? Number(perKidSemesterCap) : null,
      cap_period: capPeriod,
      fulfillment_kind: fulfillmentKind,
      completion_reward_gold:
        fulfillmentKind === 'duty_completion' && completionRewardGold.trim()
          ? Number(completionRewardGold)
          : null,
      per_kid_daily_rate_limit: perKidDailyRateLimit.trim() ? Number(perKidDailyRateLimit) : null,
      per_kid_rate_limit_days: perKidRateLimitDays.trim() ? Number(perKidRateLimitDays) : null,
      per_kid_lifetime_cap: perKidLifetimeCap.trim() ? Number(perKidLifetimeCap) : null,
      workshop_total_stock: workshopTotalStock.trim() ? Number(workshopTotalStock) : null,
      time_window_start: timeWindowStart.trim() || null,
      time_window_end: timeWindowEnd.trim() || null,
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

  const saveFilamentTypes = async () => {
    setFilamentTypesMessage(null)
    setFilamentTypesError(null)
    const types = filamentTypesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (types.length === 0) {
      setFilamentTypesError('Add at least one specialty filament type.')
      return
    }
    setSavingFilamentTypes(true)
    const { error } = await supabase.from('shop_config').upsert(
      {
        config_key: 'specialty_filament_types',
        config_value: types,
      },
      { onConflict: 'config_key' },
    )
    setSavingFilamentTypes(false)
    if (error) {
      setFilamentTypesError(error.message)
      return
    }
    setFilamentTypesMessage('Specialty filament list updated.')
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
        <h2 className="teacher-panel-section-title">Specialty filament types</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          One type per line. Students see this list in the Supply calculator.
        </p>
        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Qualifying specialty filaments</span>
          <textarea
            rows={7}
            value={filamentTypesText}
            onChange={(e) => setFilamentTypesText(e.target.value)}
          />
        </label>
        {filamentTypesError ? <p className="error" role="alert">{filamentTypesError}</p> : null}
        {filamentTypesMessage ? <p style={{ color: '#16a34a', fontWeight: 600 }} role="status">{filamentTypesMessage}</p> : null}
        <button
          type="button"
          className="btn-primary"
          disabled={savingFilamentTypes || loading}
          onClick={() => void saveFilamentTypes()}
        >
          {savingFilamentTypes ? 'Saving…' : 'Save filament list'}
        </button>
      </section>

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

        <section className="teacher-panel-section" style={{ margin: '0 0 1rem', padding: '1rem' }}>
          <h3 className="teacher-panel-section-title" style={{ fontSize: '1rem' }}>Limits and availability</h3>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
            Blank means no limit. Workshop stock is shared by all students; per-kid fields count each student separately.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Per-kid period cap</span>
              <input type="number" min={0} placeholder="∞" value={perKidSemesterCap} onChange={(e) => setPerKidSemesterCap(e.target.value)} />
            </label>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Cap period</span>
              <select value={capPeriod} onChange={(e) => setCapPeriod(e.target.value as 'semester' | 'week')}>
                <option value="semester">Semester</option>
                <option value="week">Week (Eastern)</option>
              </select>
            </label>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Per-kid daily limit</span>
              <input type="number" min={1} placeholder="∞" value={perKidDailyRateLimit} onChange={(e) => setPerKidDailyRateLimit(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Fulfillment</span>
              <select
                value={fulfillmentKind}
                onChange={(e) => setFulfillmentKind(e.target.value as 'redemption' | 'duty_completion')}
              >
                <option value="redemption">Redemption (Use item)</option>
                <option value="duty_completion">Duty completion</option>
              </select>
            </label>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Duty reward gold</span>
              <input
                type="number"
                min={0}
                placeholder={fulfillmentKind === 'duty_completion' ? 'e.g. 6' : 'n/a'}
                disabled={fulfillmentKind !== 'duty_completion'}
                value={completionRewardGold}
                onChange={(e) => setCompletionRewardGold(e.target.value)}
              />
            </label>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Cooldown days</span>
              <input type="number" min={1} placeholder="None" value={perKidRateLimitDays} onChange={(e) => setPerKidRateLimitDays(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Per-kid lifetime cap</span>
              <input type="number" min={1} placeholder="∞" value={perKidLifetimeCap} onChange={(e) => setPerKidLifetimeCap(e.target.value)} />
            </label>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Workshop total stock</span>
              <input type="number" min={0} placeholder="∞" value={workshopTotalStock} onChange={(e) => setWorkshopTotalStock(e.target.value)} />
            </label>
            <div />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Available starting</span>
              <input type="date" value={timeWindowStart} onChange={(e) => setTimeWindowStart(e.target.value)} />
            </label>
            <label className="patent-field" style={{ margin: 0 }}>
              <span className="patent-label">Available through</span>
              <input type="date" value={timeWindowEnd} onChange={(e) => setTimeWindowEnd(e.target.value)} />
            </label>
          </div>
        </section>

        {tierName === 'Craft' ? (
          <>
            <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
              For individual Story Wood or Live-edge pieces, create one Craft item per piece. Use the
              description for origin/size notes, set the exact gold price, and keep it locked if Mr. Cook
              needs to approve it.
            </p>
            <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
              <span className="patent-label">Gate requirement (display when locked)</span>
              <input
                type="text"
                value={gateRequirement}
                placeholder="Mr. Cook's call on this one. Talk to him."
                onChange={(e) => setGateRequirement(e.target.value)}
              />
            </label>
          </>
        ) : null}

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Fran and Barry purchase overlay (optional)</span>
          <textarea
            rows={5}
            value={purchaseMomentText}
            placeholder={'Fran writes it in the ledger.\n(Barry, from the back: "Good.")\n\nUse *asterisks* for Caveat handwriting.'}
            onChange={(e) => setPurchaseMomentText(e.target.value)}
          />
          <span className="muted" style={{ fontSize: '0.82rem' }}>
            Shows in the floating Supply overlay before the purchase or request completes.
          </span>
        </label>

        <label className="patent-field" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <span className="patent-label">Legacy flavor text (optional)</span>
          <textarea
            rows={4}
            value={flavorText}
            placeholder="Older catalog note field. Specialty filament types now live in the editor above."
            onChange={(e) => setFlavorText(e.target.value)}
          />
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
                      {limitSummary(row) ? ` · ${limitSummary(row)}` : ''}
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
