/*
 * Gold economy storefront (`/shop`)
 *
 * Fetches active `shop_items` with tier embeds, groups by tier, and calls purchase RPCs that
 * enforce gold balance, lock state, semester stock, and `max_purchases_per_chicago_school_day` using
 * `isSameEasternCalendarDay` so “one per day” matches Kents Hill’s instructional timezone, not
 * the laptop’s local midnight.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import franBarrySupplyLogo from '../assets/fran-barry-supply-logo.png'
import { MainNav } from '../components/MainNav'
import { ShopTierBoard } from '../components/makersShop'
import { useAuth } from '../contexts/AuthContext'
import { markKitHasNewItem } from '../lib/kitNotification'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { LOCKED_SHOP_REQUEST_MOMENT, purchaseMomentForItem } from '../lib/shopPurchaseMoments'
import type { ShopCatalogItem, ShopLimitStatus, ShopTierEmbed } from '../types/shopCatalog'

type RpcResult = {
  ok?: boolean
  error?: string
  message?: string
  new_gold?: number
  item_name?: string
  calculated_gold_cost?: number
}

type ShopToast = {
  id: number
  kind: 'success' | 'error'
  itemKey: string
  message: string
  detail?: string
}

type PurchaseMoment = {
  title: string
  text: string
  dismissing: boolean
}

type PurchaseConfirmation = {
  item: ShopCatalogItem
  kind: 'buy' | 'request'
  grams?: number
  calculatedGoldCost: number
}

const SHOP_WELCOME_SEEN_KEY = 'nexus:shop-welcome-seen'

function renderMomentLine(line: string) {
  return line.split(/(\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <span key={index} className="shop-purchase-moment__handwritten">
          {part.slice(1, -1)}
        </span>
      )
    }
    return part
  })
}

function ShopPurchaseMomentOverlay({
  moment,
  onDismiss,
}: {
  moment: PurchaseMoment | null
  onDismiss: () => void
}) {
  if (!moment) return null
  return (
    <button
      type="button"
      className={`shop-purchase-moment-layer${moment.dismissing ? ' shop-purchase-moment-layer--dismissing' : ''}`}
      onClick={onDismiss}
      aria-label="Dismiss shopkeeper note and continue purchase"
    >
      <span className="shop-purchase-moment" role="status" aria-live="polite">
        <img
          src={franBarrySupplyLogo}
          alt=""
          className="shop-mark shop-mark--overlay"
          aria-hidden="true"
        />
        <span className="shop-purchase-moment__eyebrow">Fran and Barry</span>
        <span className="shop-purchase-moment__title">{moment.title}</span>
        <span className="shop-purchase-moment__body">
          {moment.text
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, index) => (
              <span key={index} className="shop-purchase-moment__line">
                {renderMomentLine(line)}
              </span>
            ))}
        </span>
        <span className="shop-purchase-moment__dismiss">Click anywhere to continue</span>
      </span>
    </button>
  )
}

function ShopPurchaseConfirmDialog({
  confirmation,
  onCancel,
  onConfirm,
}: {
  confirmation: PurchaseConfirmation | null
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!confirmation) return null
  return (
    <div className="shop-purchase-confirm-layer" role="presentation">
      <section
        className="shop-purchase-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-purchase-confirm-title"
      >
        <img
          src={franBarrySupplyLogo}
          alt=""
          className="shop-mark shop-mark--confirm"
          aria-hidden="true"
        />
        <p id="shop-purchase-confirm-title" className="shop-purchase-confirm__title">
          Buy {confirmation.item.name} for {confirmation.calculatedGoldCost} gold?
        </p>
        <div className="shop-purchase-confirm__actions">
          <button type="button" className="btn-secondary shop-purchase-confirm__cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary shop-purchase-confirm__confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </section>
    </div>
  )
}

function ShopWelcomeOverlay({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  if (!open) return null
  return (
    <div className="shop-welcome-layer" role="presentation">
      <section
        className="shop-welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-welcome-title"
      >
        <img
          src={franBarrySupplyLogo}
          alt=""
          className="shop-mark shop-mark--welcome"
          aria-hidden="true"
        />
        <p className="shop-welcome__eyebrow">Fran and Barry&apos;s Supply Co.</p>
        <h2 id="shop-welcome-title" className="shop-welcome__title">Welcome in, maker.</h2>
        <p className="shop-welcome__body">
          Gold trades happen here. Fran keeps the ledger. Barry keeps the shelves honest.
        </p>
        <button type="button" className="btn-primary shop-welcome__button" onClick={onDismiss}>
          Enter Supply
        </button>
      </section>
    </div>
  )
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

function normalizeLimitStatus(raw: Record<string, unknown>): ShopLimitStatus | null {
  const itemId = raw.item_id
  if (typeof itemId !== 'string') return null
  const messages = Array.isArray(raw.messages)
    ? raw.messages.filter((message): message is string => typeof message === 'string' && message.trim() !== '')
    : []
  return {
    item_id: itemId,
    allowed: raw.allowed !== false,
    error_code: (raw.error_code as string | null | undefined) ?? null,
    disabled_message: (raw.disabled_message as string | null | undefined) ?? null,
    messages,
    semester_count: (raw.semester_count as number | null | undefined) ?? null,
    semester_cap: (raw.semester_cap as number | null | undefined) ?? null,
    today_count: (raw.today_count as number | null | undefined) ?? null,
    daily_limit: (raw.daily_limit as number | null | undefined) ?? null,
    lifetime_count: (raw.lifetime_count as number | null | undefined) ?? null,
    lifetime_cap: (raw.lifetime_cap as number | null | undefined) ?? null,
    workshop_stock_limit: (raw.workshop_stock_limit as number | null | undefined) ?? null,
    workshop_stock_remaining: (raw.workshop_stock_remaining as number | null | undefined) ?? null,
    time_window_start: (raw.time_window_start as string | null | undefined) ?? null,
    time_window_end: (raw.time_window_end as string | null | undefined) ?? null,
  }
}

export function GoldShopPage() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const [catalog, setCatalog] = useState<ShopCatalogItem[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [buyingKey, setBuyingKey] = useState<string | null>(null)
  // Purchase feedback stays item-scoped so confirmation appears where the student clicked.
  const [tradedKey, setTradedKey] = useState<string | null>(null)
  const [toast, setToast] = useState<ShopToast | null>(null)
  const [purchaseMoment, setPurchaseMoment] = useState<PurchaseMoment | null>(null)
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<PurchaseConfirmation | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  // Mirror profile gold locally so the balance can update before refreshProfile finishes.
  const [displayGold, setDisplayGold] = useState(profile?.gold ?? 0)
  const [goldChanged, setGoldChanged] = useState(false)
  const [limitStatusByItemId, setLimitStatusByItemId] = useState<Map<string, ShopLimitStatus>>(new Map())
  const [activeTierId, setActiveTierId] = useState<string | null>(null)
  const [specialtyFilamentTypes, setSpecialtyFilamentTypes] = useState<string[]>([])
  const shelvesRef = useRef<HTMLDivElement | null>(null)
  const toastTimer = useRef<number | null>(null)
  const tradedTimer = useRef<number | null>(null)
  const goldTimer = useRef<number | null>(null)
  const momentTimer = useRef<number | null>(null)
  const momentFadeTimer = useRef<number | null>(null)
  const pendingMomentAction = useRef<(() => void) | null>(null)

  const gold = displayGold

  const sortedCatalog = useMemo(() => sortCatalogRows(catalog), [catalog])
  const tierGroups = useMemo(() => groupByTier(sortedCatalog), [sortedCatalog])

  const toggleTier = useCallback((tierId: string) => {
    setActiveTierId((current) => (current === tierId ? null : tierId))
  }, [])

  useEffect(() => {
    setDisplayGold(profile?.gold ?? 0)
  }, [profile?.gold])

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SHOP_WELCOME_SEEN_KEY) !== '1') setShowWelcome(true)
    } catch {
      setShowWelcome(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
      if (tradedTimer.current != null) window.clearTimeout(tradedTimer.current)
      if (goldTimer.current != null) window.clearTimeout(goldTimer.current)
      if (momentTimer.current != null) window.clearTimeout(momentTimer.current)
      if (momentFadeTimer.current != null) window.clearTimeout(momentFadeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!activeTierId) return
    function closeWhenOutside(event: PointerEvent) {
      const root = shelvesRef.current
      if (!root || root.contains(event.target as Node)) return
      setActiveTierId(null)
    }
    document.addEventListener('pointerdown', closeWhenOutside)
    return () => document.removeEventListener('pointerdown', closeWhenOutside)
  }, [activeTierId])

  const showToast = useCallback((next: Omit<ShopToast, 'id'>, duration = 5000) => {
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    setToast({ ...next, id: Date.now() })
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
      toastTimer.current = null
    }, duration)
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimer.current != null) {
      window.clearTimeout(toastTimer.current)
      toastTimer.current = null
    }
    setToast(null)
  }, [])

  const dismissWelcome = useCallback(() => {
    try {
      window.localStorage.setItem(SHOP_WELCOME_SEEN_KEY, '1')
    } catch {
      /* private browsing can reject storage; closing the overlay still matters. */
    }
    setShowWelcome(false)
  }, [])

  const pulseGold = useCallback(() => {
    if (goldTimer.current != null) window.clearTimeout(goldTimer.current)
    setGoldChanged(true)
    goldTimer.current = window.setTimeout(() => {
      setGoldChanged(false)
      goldTimer.current = null
    }, 900)
  }, [])

  const completePurchaseMoment = useCallback(() => {
    if (momentTimer.current != null) {
      window.clearTimeout(momentTimer.current)
      momentTimer.current = null
    }
    if (momentFadeTimer.current != null) window.clearTimeout(momentFadeTimer.current)
    setPurchaseMoment((current) => (current ? { ...current, dismissing: true } : current))
    momentFadeTimer.current = window.setTimeout(() => {
      const action = pendingMomentAction.current
      pendingMomentAction.current = null
      setPurchaseMoment(null)
      momentFadeTimer.current = null
      action?.()
    }, 200)
  }, [])

  const showPurchaseMomentThen = useCallback(
    (title: string, text: string, action: () => void) => {
      if (momentTimer.current != null) window.clearTimeout(momentTimer.current)
      if (momentFadeTimer.current != null) window.clearTimeout(momentFadeTimer.current)
      pendingMomentAction.current = action
      setPurchaseMoment({ title, text, dismissing: false })
      momentTimer.current = window.setTimeout(() => {
        completePurchaseMoment()
      }, 4000)
    },
    [completePurchaseMoment],
  )

  function purchaseErrorMessage(errorCode?: string, item?: ShopCatalogItem): string {
    if (errorCode === 'insufficient_gold') return 'Not enough gold.'
    if (errorCode === 'unknown_item') return 'Unknown item.'
    if (errorCode === 'daily_purchase_limit' || errorCode === 'phone_time_limit') {
      return 'You already purchased this today.'
    }
    if (errorCode === 'semester_cap_reached') return "You've hit your limit. Back next semester."
    if (errorCode === 'rate_limit_active') return 'That trade is cooling down.'
    if (errorCode === 'lifetime_cap_reached') return "You've already got yours."
    if (errorCode === 'workshop_stock_exhausted') return 'Sold Out — Fran will let you know when more come in'
    if (errorCode === 'time_window_closed') return 'Window closed. Try again next semester.'
    if (errorCode === 'time_window_not_open') return 'This trade is not available yet.'
    if (errorCode === 'item_locked') {
      return item?.gate_requirement?.trim() || 'Mr. Cook needs to approve this first.'
    }
    if (errorCode === 'not_for_sale') return 'This item is not for sale.'
    if (errorCode === 'semester_stock_exhausted') return 'No stock left this semester.'
    return 'Purchase could not be completed.'
  }

  const refreshLimitStatuses = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) {
      setLimitStatusByItemId(new Map())
      return
    }
    const { data, error } = await supabase.rpc('shop_limit_statuses')
    if (error || !Array.isArray(data)) {
      setLimitStatusByItemId(new Map())
      return
    }
    const next = new Map<string, ShopLimitStatus>()
    for (const raw of data) {
      if (!raw || typeof raw !== 'object') continue
      const status = normalizeLimitStatus(raw as Record<string, unknown>)
      if (status) next.set(status.item_id, status)
    }
    setLimitStatusByItemId(next)
  }, [user?.id])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      /* eslint-disable react-hooks/set-state-in-effect -- Supabase-off bootstrap */
      setCatalogLoading(false)
      setCatalogError(null)
      setCatalog([])
      setSpecialtyFilamentTypes([])
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
          purchase_moment_text,
          is_locked,
          display_order,
          max_purchases_per_chicago_school_day,
          convenience_band,
          stock_per_semester,
          per_kid_semester_cap,
          per_kid_daily_rate_limit,
          per_kid_rate_limit_days,
          per_kid_lifetime_cap,
          workshop_total_stock,
          time_window_start,
          time_window_end,
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
      void refreshLimitStatuses()
      const { data: filamentConfig, error: filamentConfigError } = await supabase
        .from('shop_config')
        .select('config_value')
        .eq('config_key', 'specialty_filament_types')
        .maybeSingle()
      if (!cancelled && !filamentConfigError && Array.isArray(filamentConfig?.config_value)) {
        setSpecialtyFilamentTypes(
          filamentConfig.config_value.filter((value): value is string => typeof value === 'string' && value.trim() !== ''),
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshLimitStatuses])

  async function requestItemApproval(
    item: ShopCatalogItem,
    requestedGrams: number | null,
    calculatedGoldCost: number,
    notes: string,
  ) {
    if (!isSupabaseConfigured) {
      showToast({ kind: 'error', itemKey: item.item_key, message: 'Shop is not connected right now.' })
      return
    }
    if (gold < calculatedGoldCost) {
      showToast({ kind: 'error', itemKey: item.item_key, message: 'Not enough gold.' })
      return
    }
    setToast(null)
    setBuyingKey(item.item_key)
    const { data, error } = await supabase.rpc('request_shop_item', {
      p_item_key: item.item_key,
      p_requested_grams: requestedGrams,
      p_calculated_gold_cost: calculatedGoldCost,
      p_notes: notes,
    })
    setBuyingKey(null)
    if (error) {
      showToast({ kind: 'error', itemKey: item.item_key, message: error.message })
      return
    }
    const result = data as RpcResult
    if (!result?.ok) {
      showToast({ kind: 'error', itemKey: item.item_key, message: result?.message || purchaseErrorMessage(result?.error, item) })
      void refreshLimitStatuses()
      return
    }
    showToast({
      kind: 'success',
      itemKey: item.item_key,
      message: `${result.item_name ?? item.name} request sent to Fran`,
      detail: `${result.calculated_gold_cost ?? calculatedGoldCost} gold if approved`,
    })
  }

  async function completeBuy(item: ShopCatalogItem) {
    if (!isSupabaseConfigured) {
      showToast({ kind: 'error', itemKey: item.item_key, message: 'Shop is not connected right now.' })
      return
    }
    if (item.is_locked) {
      if (item.price_gold == null) {
        showToast({
          kind: 'error',
          itemKey: item.item_key,
          message: item.gate_requirement?.trim() || 'Mr. Cook needs to approve this first.',
        })
        return
      }
      await requestItemApproval(
        item,
        null,
        item.price_gold,
        item.gate_requirement?.trim() || 'Teacher-gated shop request.',
      )
      return
    }
    if (item.price_gold == null) {
      showToast({ kind: 'error', itemKey: item.item_key, message: 'This item is not for sale.' })
      return
    }
    setToast(null)
    setBuyingKey(item.item_key)
    const { data, error } = await supabase.rpc('buy_shop_item', {
      p_item_key: item.item_key,
    })
    setBuyingKey(null)
    if (error) {
      showToast({ kind: 'error', itemKey: item.item_key, message: error.message })
      return
    }
    const result = data as RpcResult
    if (!result?.ok) {
      showToast({ kind: 'error', itemKey: item.item_key, message: result?.message || purchaseErrorMessage(result?.error, item) })
      void refreshLimitStatuses()
      return
    }
    if (tradedTimer.current != null) window.clearTimeout(tradedTimer.current)
    setTradedKey(item.item_key)
    tradedTimer.current = window.setTimeout(() => {
      setTradedKey(null)
      tradedTimer.current = null
    }, 1500)
    const newGold = typeof result.new_gold === 'number' ? result.new_gold : Math.max(0, gold - item.price_gold)
    setDisplayGold(newGold)
    pulseGold()
    markKitHasNewItem()
    // This inline toast carries the three trust-building facts: what changed, cost, and new balance.
    showToast({
      kind: 'success',
      itemKey: item.item_key,
      message: `${item.name} added to your Kit`,
      detail: `${item.price_gold} gold spent · ${newGold} gold left`,
    })
    await refreshProfile()
    void refreshLimitStatuses()
  }

  function buy(item: ShopCatalogItem) {
    const status = limitStatusByItemId.get(item.id)
    if (status && !status.allowed) {
      showToast({
        kind: 'error',
        itemKey: item.item_key,
        message: status.disabled_message || purchaseErrorMessage(status.error_code ?? undefined, item),
      })
      return
    }
    const calculatedGoldCost = item.price_gold ?? 0
    setPurchaseConfirmation({
      item,
      kind: item.is_locked ? 'request' : 'buy',
      calculatedGoldCost,
    })
  }

  function confirmPurchase(confirmation: PurchaseConfirmation) {
    const { item } = confirmation
    const momentText = confirmation.kind === 'request' ? LOCKED_SHOP_REQUEST_MOMENT : purchaseMomentForItem(item)
    showPurchaseMomentThen(item.name, momentText, () => {
      void completeBuy(item)
    })
  }

  function requestFilament(item: ShopCatalogItem, grams: number, calculatedGoldCost: number) {
    if (!user?.id || !isSupabaseConfigured) {
      showToast({ kind: 'error', itemKey: item.item_key, message: 'Shop is not connected right now.' })
      return
    }
    setPurchaseConfirmation({
      item,
      kind: 'request',
      grams,
      calculatedGoldCost,
    })
  }

  function confirmFilamentRequest(confirmation: PurchaseConfirmation) {
    const { item, grams = 0, calculatedGoldCost } = confirmation
    showPurchaseMomentThen(item.name, purchaseMomentForItem(item), () => {
      void requestItemApproval(
        item,
        grams,
        calculatedGoldCost,
        `Specialty filament request from Bambu Studio: ${grams}g. Formula: 10 gold base + 1 gold per 25g rounded up.`,
      )
    })
  }

  return (
    <div className="app-shell bench-chrome bench-chrome--shop shop-page">
      <ShopWelcomeOverlay open={showWelcome} onDismiss={dismissWelcome} />
      <ShopPurchaseConfirmDialog
        confirmation={purchaseConfirmation}
        onCancel={() => setPurchaseConfirmation(null)}
        onConfirm={() => {
          const confirmation = purchaseConfirmation
          if (!confirmation) return
          setPurchaseConfirmation(null)
          if (confirmation.kind === 'request' && confirmation.grams != null) {
            confirmFilamentRequest(confirmation)
          } else {
            confirmPurchase(confirmation)
          }
        }}
      />
      <ShopPurchaseMomentOverlay moment={purchaseMoment} onDismiss={completePurchaseMoment} />
      <header className="shop-top">
        <MainNav />
        <div className="shop-top-row bench-page-title-row">
          <div className="shop-brand-lockup">
            <img
              src={franBarrySupplyLogo}
              alt=""
              className="shop-mark shop-mark--header"
              aria-hidden="true"
            />
            <div>
              <h1 className="bench-page-title">Fran and Barry&apos;s Supply Co.</h1>
              <p className="muted shop-subtitle">
                Fran&apos;s at the counter. Barry&apos;s in the back. Open a shelf and see what they&apos;ve got.
              </p>
            </div>
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

      {!catalogLoading && tierGroups.length > 0 ? (
        <div
          ref={shelvesRef}
          className={`shop-shelves shop-shelves--tiles${activeTierId ? ' shop-shelves--has-expanded' : ''}`}
        >
          {tierGroups
            .filter((group) => activeTierId == null || group.tier.id === activeTierId)
            .map((group) => (
              <ShopTierBoard
                key={group.tier.id}
                group={group}
                open={activeTierId === group.tier.id}
                onToggle={() => toggleTier(group.tier.id)}
                gold={gold}
                buyingKey={buyingKey}
                limitStatusByItemId={limitStatusByItemId}
                isSupabaseConfigured={isSupabaseConfigured}
                catalogLoading={catalogLoading}
                tradedKey={tradedKey}
                toast={toast}
                specialtyFilamentTypes={specialtyFilamentTypes}
                onDismissToast={dismissToast}
                onBuy={buy}
                onRequestFilament={requestFilament}
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
