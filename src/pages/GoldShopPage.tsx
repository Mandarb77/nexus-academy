import { useCallback, useEffect, useMemo, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { isSameChicagoSchoolDay } from '../lib/schoolDayChicago'
import type { ShopCatalogItem, ShopTierEmbed } from '../types/shopCatalog'

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
        if (isSameChicagoSchoolDay(new Date(row.created_at), now)) {
          blocked.add(sid)
        }
      }
      setDailyBlockedIds(blocked)
    },
    [user?.id],
  )

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCatalogLoading(false)
      setCatalogError(null)
      setCatalog([])
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
      if (result?.error === 'daily_purchase_limit') {
        setDailyBlockedIds((prev) => new Set(prev).add(item.id))
      }
      setMessage(
        result?.error === 'insufficient_gold'
          ? 'Not enough gold.'
          : result?.error === 'unknown_item'
            ? 'Unknown item.'
            : result?.error === 'daily_purchase_limit'
              ? 'You already bought this item for today’s class period (Chicago school day limit).'
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
    <div className="app-shell gold-shop-page">
      <MainNav />
      <header className="gold-shop-header">
        <div className="gold-shop-top-row">
          <div>
            <h1 className="gold-shop-title">
              <span className="gold-currency-text">Gold</span> shop
            </h1>
            <p className="gold-shop-balance" aria-live="polite">
              Your gold: <strong>{gold}</strong>
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <p className="muted" role="alert">
          Connect Supabase in <code className="inline-code">.env</code> to use the shop.
        </p>
      ) : null}

      {catalogLoading ? (
        <p className="muted">Loading shop…</p>
      ) : catalogError ? (
        <p className="muted" role="alert">
          {catalogError}
        </p>
      ) : null}

      {message ? (
        <p className="gold-shop-message muted" role="status">
          {message === 'Not enough gold.' ? (
            <>
              Not enough <span className="gold-currency-text">gold</span>.
            </>
          ) : (
            message
          )}
        </p>
      ) : null}

      {tierGroups.map(({ tier, items }) => (
        <section key={tier.id} className="gold-shop-tier-section">
          <h2 className="gold-shop-tier-title">{tier.name}</h2>
          <p className="gold-shop-tier-subtitle">{tier.subtitle}</p>
          <ul className="gold-shop-grid">
            {items.map((item) => {
              const dailyBlocked = dailyBlockedIds.has(item.id)
              const catalogLocked = item.is_locked
              const price = item.price_gold
              const canAfford = price != null && gold >= price
              const busy = buyingKey === item.item_key
              const purchaseBlocked =
                !catalogLocked && price != null && (!canAfford || dailyBlocked)
              const canBuy = !catalogLocked && price != null && canAfford && !dailyBlocked

              return (
                <li
                  key={item.id}
                  className={`gold-shop-card${catalogLocked ? ' gold-shop-card--mystery-locked' : ''}${purchaseBlocked ? ' gold-shop-card--dimmed' : ''}`}
                >
                  <div className="gold-shop-card-body">
                    <h3
                      className={`gold-shop-item-name${
                        catalogLocked
                          ? ' gold-shop-item-name--mystery'
                          : canBuy
                            ? ' gold-shop-item-name--affordable'
                            : canAfford
                              ? ''
                              : ' gold-shop-item-name--unaffordable'
                      }`}
                    >
                      {item.name}
                    </h3>
                    <p className="gold-shop-item-desc">{item.description}</p>
                    {item.flavor_text ? (
                      <p className="gold-shop-flavor muted">{item.flavor_text}</p>
                    ) : null}
                    {item.rank_requirement ? (
                      <p className="gold-shop-rank-req muted">
                        Requires rank: <strong>{item.rank_requirement}</strong>
                      </p>
                    ) : null}
                    {dailyBlocked ? (
                      <p className="muted gold-shop-limit-note">
                        Already purchased for today’s class period (Chicago time). Try again on the next school day.
                      </p>
                    ) : null}
                    <div
                      className="gold-shop-cost"
                      aria-label={
                        catalogLocked
                          ? 'Locked catalog item'
                          : price != null
                            ? `Cost: ${price} gold`
                            : 'No price'
                      }
                    >
                      {catalogLocked ? (
                        <span className="gold-shop-mystery-label">Locked</span>
                      ) : (
                        <>
                          <span className="gold-shop-cost-amount">{price}</span>
                          <span className="gold-shop-cost-unit">gold</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="gold-shop-card-footer">
                    <button
                      type="button"
                      className={`gold-shop-buy-btn${canBuy ? ' gold-shop-buy-btn--active' : ''}`}
                      disabled={
                        !isSupabaseConfigured ||
                        catalogLocked ||
                        !canBuy ||
                        busy ||
                        catalogLoading
                      }
                      onClick={() => void buy(item)}
                    >
                      {busy ? (
                        'Buying…'
                      ) : catalogLocked ? (
                        'Locked'
                      ) : dailyBlocked ? (
                        'Already bought today'
                      ) : canAfford ? (
                        'Buy'
                      ) : (
                        <>
                          Not enough <span className="gold-currency-text">gold</span>
                        </>
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
