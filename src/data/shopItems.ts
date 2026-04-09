/** Keys must match `buy_shop_item` (see `036_shop_phone_time_45_and_daily_limit.sql`). */
export type ShopItemKey = 'workshop_dj' | 'phone_time' | 'free_tardy' | 'snack'

export type ShopItem = {
  key: ShopItemKey
  name: string
  description: string
  cost: number
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    key: 'workshop_dj',
    name: 'Workshop DJ',
    description: 'Control the class playlist for one session.',
    cost: 35,
  },
  {
    key: 'phone_time',
    name: 'Phone time',
    description:
      '10 minutes of phone use. Limit: one purchase per class period (once per school day, Chicago time).',
    cost: 45,
  },
  {
    key: 'free_tardy',
    name: 'Free tardy',
    description: 'Arrive late once, under 15 minutes, no mark.',
    cost: 30,
  },
  {
    key: 'snack',
    name: 'Snack',
    description: 'One snack from the workshop stash.',
    cost: 15,
  },
]
