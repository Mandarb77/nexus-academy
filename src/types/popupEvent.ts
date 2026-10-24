export type PopupEventQuestion = {
  kind: 'question'
  id: string
  prompt: string
  hint?: string
  min_length?: number
}

export type PopupEventNote = {
  kind: 'note'
  id: string
  title?: string
  items: string[]
}

export type PopupEventBlock = PopupEventQuestion | PopupEventNote

export type PopupEventRow = {
  id: string
  title: string
  intro_text: string
  questions: PopupEventBlock[]
  reward_wp: number
  reward_gold: number
  is_active: boolean
  required: boolean
  created_at: string
}

export type PopupEventPending = {
  id: string
  title: string
  intro_text: string
  questions: PopupEventBlock[]
  reward_wp: number
  reward_gold: number
}

export type PopupEventResponseRow = {
  id: string
  event_id: string
  student_id: string
  answers: Record<string, string>
  submitted_at: string
  skipped_by_teacher: boolean
  skipped_reason: string | null
}
