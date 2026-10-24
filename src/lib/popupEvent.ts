import type { PopupEventBlock, PopupEventQuestion } from '../types/popupEvent'

export function parsePopupEventBlocks(raw: unknown): PopupEventBlock[] {
  if (!Array.isArray(raw)) return []
  const out: PopupEventBlock[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const kind = rec.kind === 'note' ? 'note' : 'question'
    const id = typeof rec.id === 'string' ? rec.id.trim() : ''
    if (!id) continue
    if (kind === 'note') {
      const items = Array.isArray(rec.items) ? rec.items.map(String).filter((s) => s.trim()) : []
      out.push({
        kind: 'note',
        id,
        title: typeof rec.title === 'string' ? rec.title : undefined,
        items,
      })
      continue
    }
    const prompt = typeof rec.prompt === 'string' ? rec.prompt : ''
    if (!prompt.trim()) continue
    out.push({
      kind: 'question',
      id,
      prompt,
      hint: typeof rec.hint === 'string' ? rec.hint : undefined,
      min_length: typeof rec.min_length === 'number' ? rec.min_length : 25,
    })
  }
  return out
}

export function popupEventQuestions(blocks: PopupEventBlock[]): PopupEventQuestion[] {
  return blocks.filter((b): b is PopupEventQuestion => b.kind === 'question')
}

export function minLengthForQuestion(q: PopupEventQuestion): number {
  return Math.max(1, q.min_length ?? 25)
}

export function answerMeetsMinimum(value: string, minLength: number): boolean {
  return value.trim().length >= minLength
}
