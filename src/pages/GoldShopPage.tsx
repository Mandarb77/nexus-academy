import { useCallback, useEffect, useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { SHOP_ITEMS, type ShopItemKey } from '../data/shopItems'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { isSameChicagoSchoolDay } from '../lib/schoolDayChicago'

type RpcResult = {
  ok?: boolean
  error?: string
  new_gold?: number
}

export function GoldShopPage() {
  const { profile, user, signOut, refreshProfile } = useAuth()
  const [buyingKey, setBuyingKey] = useState<ShopItemKey | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [phoneTimeBlocked, setPhoneTimeBlocked] = useState(false)

  const gold = profile?.gold ?? 0

  const refreshPhoneTimeLimit = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) {
      setPhoneTimeBlocked(false)
      return
    }
    const { data, error } = await supabase
      .from('gold_purchases')
      .select('created_at')
      .eq('student_id', user.id)
      .eq('item_name', 'Phone time')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data?.created_at) {
      setPhoneTimeBlocked(false)
      return
    }
    setPhoneTimeBlocked(isSameChicagoSchoolDay(new Date(data.created_at), new Date()))
  }, [user?.id])

  useEffect(() => {
    void refreshPhoneTimeLimit()
  }, [refreshPhoneTimeLimit])

  async function buy(key: ShopItemKey) {
    if (!isSupabaseConfigured) return
    setMessage(null)
    setBuyingKey(key)
    const { data, error } = await supabase.rpc('buy_shop_item', {
      p_item_key: key,
    })
    setBuyingKey(null)
    if (error) {
      setMessage(error.message)
      return
    }
    const result = data as RpcResult
    if (!result?.ok) {
      if (result?.error === 'phone_time_limit') {
        setPhoneTimeBlocked(true)
      }
      setMessage(
        result?.error === 'insufficient_gold'
          ? 'Not enough gold.'
          : result?.error === 'unknown_item'
            ? 'Unknown item.'
            : result?.error === 'phone_time_limit'
              ? 'You already bought phone time for this class period (one purchase per school day).'
              : 'Purchase could not be completed.',
      )
      return
    }
    await refreshProfile()
    if (key === 'phone_time') {
      setPhoneTimeBlocked(true)
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

      <ul className="gold-shop-grid">
        {SHOP_ITEMS.map((item) => {
          const phoneTimeLocked = item.key === 'phone_time' && phoneTimeBlocked
          const canAfford = gold >= item.cost
          const busy = buyingKey === item.key
          const locked = !canAfford || phoneTimeLocked
          const canBuy = canAfford && !phoneTimeLocked

          return (
            <li
              key={item.key}
              className={`gold-shop-card${locked ? ' gold-shop-card--locked' : ''}`}
            >
              <div className="gold-shop-card-body">
                <h2
                  className={`gold-shop-item-name${canBuy ? ' gold-shop-item-name--affordable' : ' gold-shop-item-name--unaffordable'}`}
                >
                  {item.name}
                </h2>
                <p className="gold-shop-item-desc">{item.description}</p>
                {phoneTimeLocked ? (
                  <p className="muted gold-shop-limit-note" style={{ fontSize: '0.88rem', margin: '0.35rem 0 0' }}>
                    Already purchased for today&apos;s class period. Try again on the next school day.
                  </p>
                ) : null}
                <div className="gold-shop-cost" aria-label={`Cost: ${item.cost} gold`}>
                  <span className="gold-shop-cost-amount">{item.cost}</span>
                  <span className="gold-shop-cost-unit">gold</span>
                </div>
              </div>
              <div className="gold-shop-card-footer">
                <button
                  type="button"
                  className={`gold-shop-buy-btn${canBuy ? ' gold-shop-buy-btn--active' : ''}`}
                  disabled={!isSupabaseConfigured || !canBuy || busy}
                  onClick={() => void buy(item.key)}
                >
                  {busy ? (
                    'Buying…'
                  ) : phoneTimeLocked ? (
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
    </div>
  )
}
