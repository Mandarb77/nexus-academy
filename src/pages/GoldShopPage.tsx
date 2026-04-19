import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { MakersShopHeader, ShopTierBoard } from '../components/makersShop'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { isSameEasternCalendarDay } from '../lib/schoolDayEastern'
import type { ShopCatalogItem, ShopTierEmbed } from '../types/shopCatalog'
import '../makersShop.css'

type RpcResult = {
  ok?: boolean
  error?: string
  new_gold?: number
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
  const [message, setMessage] = useState<string | null>(null)
  const [dailyBlockedIds, setDailyBlockedIds] = useState<Set<string>>(new Set())

  const gold = profile?.gold ?? 0

  const sortedCatalog = useMemo(() => sortCatalogRows(catalog), [catalog])
  const tierGroups = useMemo(() => groupByTier(sortedCatalog), [sortedCatalog])
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
      const { data, error } = await supabase.from('shop_items').select(`
          id,
          item_key,
          name,
          description,
          tier_id,
          price_gold,
          is_active,
          rank_requirement,
          flavor_text,
          is_locked,
          display_order,
          max_purchases_per_chicago_school_day,
          shop_tiers (
            id,
            name,
            subtitle,
            sort_order
          )
        `)
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
    })()
    return () => {
      cancelled = true
    }
  }, [refreshDailyLimits])

  async function buy(item: ShopCatalogItem) {
    if (!isSupabaseConfigured || item.is_locked || item.price_gold == null) return
    setMessage(null)
    setBuyingKey(item.item_key)
    const { data, error } = await supabase.rpc('buy_shop_item', {
      p_item_key: item.item_key,
    })
    setBuyingKey(null)
    if (error) {
      setMessage(error.message)
      return
    }
    const result = data as RpcResult
      if (!result?.ok) {
      if (result?.error === 'daily_purchase_limit' || result?.error === 'phone_time_limit') {
        setDailyBlockedIds((prev) => new Set(prev).add(item.id))
      }
      setMessage(
        result?.error === 'insufficient_gold'
          ? 'Not enough gold.'
          : result?.error === 'unknown_item'
            ? 'Unknown item.'
            : result?.error === 'daily_purchase_limit' || result?.error === 'phone_time_limit'
              ? 'You already purchased this today (New York time).'
              : result?.error === 'item_locked'
                ? 'This reward is locked.'
                : result?.error === 'not_for_sale'
                  ? 'This item is not for sale.'
                  : result?.error === 'rank_required'
                    ? 'Your rank does not meet the requirement for this item.'
                    : 'Purchase could not be completed.',
      )
      return
    }
    await refreshProfile()
    if ((item.max_purchases_per_chicago_school_day ?? 0) >= 1) {
      setDailyBlockedIds((prev) => new Set(prev).add(item.id))
    }
    setMessage(null)
  }

  return (
    <div className="app-shell makers-shop">
      <MainNav />
      <MakersShopHeader gold={gold} onSignOut={signOut} />

      {!isSupabaseConfigured ? (
        <p className="makers-shop-muted makers-shop-alert" role="alert">
          Connect Supabase in <code className="inline-code">.env</code> to use the shop.
        </p>
      ) : null}

      {catalogLoading ? (
        <p className="makers-shop-muted makers-shop-alert">Loading catalog…</p>
      ) : catalogError ? (
        <p className="makers-shop-alert" role="alert">
          {catalogError}
        </p>
      ) : null}

      {message ? (
        <p className="makers-shop-alert" role="status">
          {message === 'Not enough gold.' ? (
            <>
              Not enough <span className="gold-currency-text">gold</span>.
            </>
          ) : (
            message
          )}
        </p>
      ) : null}

      <div className="makers-shop-tier-deck">
        {tierGroups.map((group) => (
          <ShopTierBoard
            key={group.tier.id}
            group={group}
            gold={gold}
            buyingKey={buyingKey}
            dailyBlockedIds={dailyBlockedIds}
            isSupabaseConfigured={isSupabaseConfigured}
            catalogLoading={catalogLoading}
            onBuy={buy}
          />
        ))}
      </div>
    </div>
  )
}
