import { useState } from 'react'
import { MainNav } from '../components/MainNav'
import { useAuth } from '../contexts/AuthContext'
import { SHOP_ITEMS, type ShopItemKey } from '../data/shopItems'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type RpcResult = {
  ok?: boolean
  error?: string
  new_gold?: number
}

export function GoldShopPage() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [buyingKey, setBuyingKey] = useState<ShopItemKey | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const gold = profile?.gold ?? 0

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
      setMessage(
        result?.error === 'insufficient_gold'
          ? 'Not enough gold.'
          : result?.error === 'unknown_item'
            ? 'Unknown item.'
            : 'Purchase could not be completed.',
      )
      return
    }
    await refreshProfile()
    setMessage(null)
  }

  return (
    <div className="app-shell gold-shop-page">
      <header className="gold-shop-header">
        <MainNav />
        <div className="gold-shop-top-row">
          <div>
            <h1 className="gold-shop-title">Gold shop</h1>
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
          {message}
        </p>
      ) : null}

      <ul className="gold-shop-grid">
        {SHOP_ITEMS.map((item) => {
          const canAfford = gold >= item.cost
          const busy = buyingKey === item.key
          const locked = !canAfford

          return (
            <li
              key={item.key}
              className={`gold-shop-card${locked ? ' gold-shop-card--locked' : ''}`}
            >
              <div className="gold-shop-card-body">
                <h2 className="gold-shop-item-name">{item.name}</h2>
                <p className="gold-shop-item-desc">{item.description}</p>
                <div className="gold-shop-cost" aria-label={`Cost: ${item.cost} gold`}>
                  <span className="gold-shop-cost-amount">{item.cost}</span>
                  <span className="gold-shop-cost-unit">gold</span>
                </div>
              </div>
              <div className="gold-shop-card-footer">
                <button
                  type="button"
                  className={`gold-shop-buy-btn${canAfford ? ' gold-shop-buy-btn--active' : ''}`}
                  disabled={!isSupabaseConfigured || !canAfford || busy}
                  onClick={() => void buy(item.key)}
                >
                  {busy ? 'Buying…' : canAfford ? 'Buy' : 'Not enough gold'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
