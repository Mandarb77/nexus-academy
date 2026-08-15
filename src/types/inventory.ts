/*
 * Gold shop purchase rows — what the student bought and whether they “spent” it in class
 *
 * Written by buy_shop_item (and approved shop_purchase_requests). Teachers flip status when
 * a privilege is redeemed, or when a duty completion is approved.
 *
 * shop_items embed carries fulfillment_kind so Kit can show “Mark complete” vs “Use item”
 * without hardcoding SKU names (Keeper's Duty uses duty_completion).
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
  /** Joined catalog fields used for Fran/Barry voice + duty vs redemption branching. */
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
