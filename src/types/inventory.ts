/*
 * Gold shop purchase rows — what the student bought and whether they “spent” it in class
 *
 * Written when students redeem items from `shop_items`; teachers may flip status when
 * the physical perk is delivered. Consumed by `InventoryPage` and related dashboard views.
 */

export type InventoryStatus = 'unused' | 'used'

export type InventoryRow = {
  id: string
  student_id: string
  shop_item_id: string | null
  item_name: string
  item_description: string
  gold_cost: number
  status: InventoryStatus
  created_at: string
  shop_items?: {
    item_key: string
    name: string
    purchase_moment_text: string | null
    fulfillment_kind?: string | null
    completion_reward_gold?: number | null
  } | {
    item_key: string
    name: string
    purchase_moment_text: string | null
    fulfillment_kind?: string | null
    completion_reward_gold?: number | null
  }[] | null
}

export type RedemptionStatus = 'pending' | 'approved' | 'returned'
