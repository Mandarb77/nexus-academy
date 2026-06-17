/*
 * Unified patent-ledger content resolver
 *
 * Per-tile checklist, resources, recipient guidance, and footer come from the `tiles` row
 * (see migration 047 backfill from src/lib/*.ts canonical copy). Step COUNT and ORDER must
 * stay stable so `patents.checklist_state` boolean arrays remain aligned.
 */

import type { LedgerResource, StepConfig, TileRow } from '../types/tile'
import { resolvedTileSteps } from './customTile'

export type { LedgerResource }

export type LedgerContent = {
  steps: StepConfig[]
  resources: LedgerResource[]
  recipientGuidance: string | null
  footerNote: string | null
}

/** Card 09 — closing ❧ line on every patent ledger variant. */
export const PATENT_CLOSING_QUOTE = 'What you gave away is the only part that stays.'

function parseLedgerResources(raw: unknown): LedgerResource[] {
  if (!Array.isArray(raw)) return []
  const out: LedgerResource[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const pending = Boolean((item as { pending?: boolean }).pending)
    const url = (item as { url?: string }).url?.trim()
    if (!url && !pending) continue
    const label = (item as { label?: string }).label?.trim() || 'Open resource'
    out.push({ label, ...(url ? { url } : {}), ...(pending ? { pending: true } : {}) })
  }
  return out
}

/** Collect resource links on step rows (resourceUrl / resourceLabel). */
function resourcesFromSteps(steps: StepConfig[]): LedgerResource[] {
  const seen = new Set<string>()
  const out: LedgerResource[] = []
  for (const s of steps) {
    if (s.resourceUrl && !seen.has(s.resourceUrl)) {
      seen.add(s.resourceUrl)
      out.push({ url: s.resourceUrl, label: s.resourceLabel?.trim() || 'Open resource' })
    }
  }
  return out
}

export function ledgerContentForTile(tile: TileRow): LedgerContent {
  const steps = resolvedTileSteps(tile)
  const fromTile = parseLedgerResources(tile.ledger_resources)
  const fromSteps = resourcesFromSteps(steps)
  const seen = new Set<string>()
  const resources: LedgerResource[] = []
  for (const r of [...fromTile, ...fromSteps]) {
    const key = r.pending ? `pending:${r.label}` : r.url
    if (!key || seen.has(key)) continue
    seen.add(key)
    resources.push(r)
  }

  return {
    steps,
    resources,
    recipientGuidance: tile.recipient_guidance?.trim() || null,
    footerNote: tile.checklist_footer_note?.trim() || null,
  }
}
