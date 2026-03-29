export type InventoryStatus = 'unused' | 'used'

export type InventoryRow = {
  id: string
  student_id: string
  item_name: string
  item_description: string
  gold_cost: number
  status: InventoryStatus
  created_at: string
}

export type RedemptionStatus = 'pending' | 'approved' | 'returned'
