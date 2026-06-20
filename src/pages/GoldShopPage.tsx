/*
 * Gold economy storefront (`/shop`)
 *
 * Fetches active `shop_items` with tier embeds, groups by tier, and calls purchase RPCs that
 * enforce gold balance, lock state, semester stock, and `max_purchases_per_chicago_school_day` using
 * `isSameEasternCalendarDay` so “one per day” matches Kents Hill’s instructional timezone, not
 * the laptop’s local midnight.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { ShopTierBoard } from '../components/makersShop'
import { useAuth } from '../contexts/AuthContext'
import { markKitHasNewItem } from '../lib/kitNotification'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { isSameEasternCalendarDay } from '../lib/schoolDayEastern'
import type { ShopCatalogItem, ShopStockStatus, ShopTierEmbed } from '../types/shopCatalog'

type RpcResult = {
  ok?: boolean
  error?: string
  new_gold?: number
}

type ShopToast = {
  id: number
  kind: 'success' | 'error'
  message: string
  detail?: string
}

function tierFromRow(row: ShopCatalogItem): ShopTierEmbed | null {
  const t = row.shop_tiers
  if (!t) return null
  return Array.isArray(t) ? t[0] ?? null : t
}

function sortCatalogRows(rows: ShopCatalogItem[]): ShopCatalogItem[] {
  return [...rows].sort((a, b) => {
    const ta = tierFromRow(a)?.sort_order ?? 0
    const tb = tierFromRow(b)?.sort_order ?? 0
    if (ta !== tb) return ta - tb
    return (a.display_order ?? 0) - (b.display_order ?? 0)
  })
}

function groupByTier(sorted: ShopCatalogItem[]): { tier: ShopTierEmbed; items: ShopCatalogItem[] }[] {
  const out: { tier: ShopTierEmbed; items: ShopCatalogItem[] }[] = []
  for (const row of sorted) {
    const tier = tierFromRow(row)
    if (!tier) continue
    const last = out[out.length - 1]
    if (last && last.tier.id === tier.id) {
      last.items.push(row)
    } else {
      out.push({ tier, items: [row] })
    }
  }
  return out
}

export function GoldShopPage() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const [catalog, setCatalog] = useState<ShopCatalogItem[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [buyingKey, setBuyingKey] = useState<string | null>(null)
  const [tradedKey, setTradedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<ShopToast | null>(null)
  const [displayGold, setDisplayGold] = useState(profile?.gold ?? 0)
  const [goldChanged, setGoldChanged] = useState(false)
  const [dailyBlockedIds, setDailyBlockedIds] = useState<Set<string>>(new Set())
  const [stockByItemId, setStockByItemId] = useState<Map<string, ShopStockStatus>>(new Map())
  const [openTiers, setOpenTiers] = useState<Set<string>>(() => new Set())
  const toastTimer = useRef<number | null>(null)
  const tradedTimer = useRef<number | null>(null)
  const goldTimer = useRef<number | null>(null)

  const gold = displayGold

  const sortedCatalog = useMemo(() => sortCatalogRows(catalog), [catalog])
  const tierGroups = useMemo(() => groupByTier(sortedCatalog), [sortedCatalog])

  const toggleTier = useCallback((tierId: string) => {
    setOpenTiers((prev) => {
      const next = new Set(prev)
      if (next.has(tierId)) next.delete(tierId)
      else next.add(tierId)
      return next
    })
  }, [])

  useEffect(() => {
    setDisplayGold(profile?.gold ?? 0)
  }, [profile?.gold])

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
      if (tradedTimer.current != null) window.clearTimeout(tradedTimer.current)
      if (goldTimer.current != null) window.clearTimeout(goldTimer.current)
    }
  }, [])

  const showToast = useCallback((next: Omit<ShopToast, 'id'>, duration = 3600) => {
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    setToast({ ...next, id: Date.now() })
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
      toastTimer.current = null
    }, duration)
  }, [])

  const pulseGold = useCallback(() => {
    if (goldTimer.current != null) window.clearTimeout(goldTimer.current)
    setGoldChanged(true)
    goldTimer.current = window.setTimeout(() => {
      setGoldChanged(false)
      goldTimer.current = null
    }, 900)
  }, [])

  function purchaseErrorMessage(errorCode?: string, item?: ShopCatalogItem): string {
    if (errorCode === 'insufficient_gold') return 'Not enough gold.'
    if (errorCode === 'unknown_item') return 'Unknown item.'
    if (errorCode === 'daily_purchase_limit' || errorCode === 'phone_time_limit') {
      return 'You already purchased this today.'
    }
    if (errorCode === 'item_locked') {
      return item?.gate_requirement?.trim() || 'Mr. Cook needs to approve this first.'
    }
    if (errorCode === 'not_for_sale') return 'This item is not for sale.'
    if (errorCode === 'semester_stock_exhausted') return 'No stock left this semester.'
    return 'Purchase could not be completed.'
  }

  const refreshStockStatus = useCallback(async (rows: ShopCatalogItem[]) => {
    if (!isSupabaseConfigured) {
      setStockByItemId(new Map())
      return
    }
    const limited = rows.filter((r) => r.stock_per_semester != null && r.stock_per_semester > 0)
    const next = new Map<string, ShopStockStatus>()
    await Promise.all(
      limited.map(async (r) => {
        const { data, error } = await supabase.rpc('shop_stock_status', { p_shop_item_id: r.id })
        if (!error && data && typeof data === 'object') {
          next.set(r.id, data as ShopStockStatus)
        }
      }),
    )
    setStockByItemId(next)
  }, [])

  const refreshDailyLimits = useCallback(
    async (rows: ShopCatalogItem[]) => {
      if (!user?.id || !isSupabaseConfigured) {
        setDailyBlockedIds(new Set())
        return
      }
      const limited = rows.filter(
        (r) =>
          (r.max_purchases_per_chicago_school_day ?? 0) >= 1 &&
          r.price_gold != null &&
          !r.is_locked,
      )
      if (limited.length === 0) {
        setDailyBlockedIds(new Set())
        return
      }
      const ids = limited.map((r) => r.id)
      const { data, error } = await supabase
        .from('gold_purchases')
        .select('shop_item_id, created_at')
        .eq('student_id', user.id)
        .in('shop_item_id', ids)
      if (error || !data?.length) {
        setDailyBlockedIds(new Set())
        return
      }
      const now = new Date()
      const blocked = new Set<string>()
      for (const row of data) {
        const sid = row.shop_item_id as string | null
        if (!sid || !row.created_at) continue
        if (isSameEasternCalendarDay(new Date(row.created_at), now)) {
          blocked.add(sid)
        }
      }
      setDailyBlockedIds(blocked)
    },
    [user],
  )

  useEffect(() => {
    if (!isSupabaseConfigured) {
      /* eslint-disable react-hooks/set-state-in-effect -- Supabase-off bootstrap */
      setCatalogLoading(false)
      setCatalogError(null)
      setCatalog([])
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }
    let cancelled = false
    ;(async () => {
      setCatalogLoading(true)
      setCatalogError(null)
      const { data, error } = await supabase
        .from('shop_items')
        .select(`
          id,
          item_key,
          name,
          description,
          tier_id,
          price_gold,
          is_active,
          flavor_text,
          is_locked,
          display_order,
          max_purchases_per_chicago_school_day,
          convenience_band,
          stock_per_semester,
          gate_requirement,
          shop_tiers (
            id,
            name,
            subtitle,
            sort_order
          )
        `)
        .eq('is_active', true)
      if (cancelled) return
      if (error) {
        setCatalogError(error.message)
        setCatalog([])
        setCatalogLoading(false)
        return
      }
      const rows = (data ?? []) as ShopCatalogItem[]
      setCatalog(rows)
      setCatalogLoading(false)
      void refreshDailyLimits(rows)
      void refreshStockStatus(rows)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshDailyLimits, refreshStockStatus])

  async function buy(item: ShopCatalogItem) {
    if (!isSupabaseConfigured) {
      showToast({ kind: 'error', message: 'Shop is not connected right now.' })
      return
    }
    if (item.is_locked) {
      showToast({ kind: 'error', message: 'Mr. Cook needs to approve this first.' })
      return
    }
    if (item.price_gold == null) {
      showToast({ kind: 'error', message: 'This item is not for sale.' })
      return
    }
    setToast(null)
    setBuyingKey(item.item_key)
    const { data, error } = await supabase.rpc('buy_shop_item', {
      p_item_key: item.item_key,
    })
    setBuyingKey(null)
    if (error) {
      showToast({ kind: 'error', message: error.message })
      return
    }
    const result = data as RpcResult
    if (!result?.ok) {
      if (result?.error === 'daily_purchase_limit' || result?.error === 'phone_time_limit') {
        setDailyBlockedIds((prev) => new Set(prev).add(item.id))
      }
      showToast({ kind: 'error', message: purchaseErrorMessage(result?.error, item) })
      return
    }
    if (tradedTimer.current != null) window.clearTimeout(tradedTimer.current)
    setTradedKey(item.item_key)
    tradedTimer.current = window.setTimeout(() => {
      setTradedKey(null)
      tradedTimer.current = null
    }, 1500)
    if (typeof result.new_gold === 'number') {
      setDisplayGold(result.new_gold)
      pulseGold()
    }
    markKitHasNewItem()
    showToast({
      kind: 'success',
      message: `${item.name} added to your Kit`,
      detail: `- ${item.price_gold} gold`,
    })
    await refreshProfile()
    if ((item.max_purchases_per_chicago_school_day ?? 0) >= 1) {
      setDailyBlockedIds((prev) => new Set(prev).add(item.id))
    }
    void refreshStockStatus(catalog)
  }

  return (
    <div className="app-shell bench-chrome bench-chrome--shop shop-page">
      <header className="shop-top">
        <MainNav />
        <div className="shop-top-row bench-page-title-row">
          <div>
            <h1 className="bench-page-title">Fran and Barry&apos;s Supply Co.</h1>
            <p className="muted shop-subtitle">
              Fran&apos;s at the counter. Barry&apos;s in the back. Open a shelf and see what they&apos;ve got.
            </p>
          </div>
          <div className="shop-header-actions">
            <div className={`shop-gold-stat${goldChanged ? ' shop-gold-stat--changed' : ''}`} aria-live="polite">
              <span className="shop-gold-stat__label">Gold</span>
              <span className="shop-gold-stat__value">{gold}</span>
            </div>
            <button type="button" className="btn-secondary" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <p className="muted shop-alert" role="alert">
          Connect Supabase in <code className="inline-code">.env</code> to use the shop.
        </p>
      ) : null}

      {catalogLoading ? (
        <p className="muted shop-alert">Loading catalog…</p>
      ) : catalogError ? (
        <p className="shop-alert error" role="alert">
          {catalogError}
        </p>
      ) : null}

      {toast ? (
        <div className={`shop-toast shop-toast--${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
          <p className="shop-toast__message">{toast.message}</p>
          {toast.detail ? <p className="shop-toast__detail">{toast.detail}</p> : null}
        </div>
      ) : null}

      {!catalogLoading && tierGroups.length > 0 ? (
        <div className="shop-shelves shop-shelves--tiles">
          {tierGroups.map((group) => (
            <ShopTierBoard
              key={group.tier.id}
              group={group}
              open={openTiers.has(group.tier.id)}
              onToggle={() => toggleTier(group.tier.id)}
              gold={gold}
              buyingKey={buyingKey}
              dailyBlockedIds={dailyBlockedIds}
              stockByItemId={stockByItemId}
              isSupabaseConfigured={isSupabaseConfigured}
              catalogLoading={catalogLoading}
              tradedKey={tradedKey}
              onBuy={buy}
            />
          ))}
        </div>
      ) : !catalogLoading && !catalogError ? (
        <p className="muted" role="status">
          No items in the catalog yet.
        </p>
      ) : null}
    </div>
  )
}
