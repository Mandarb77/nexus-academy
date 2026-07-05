import type { LearnToolGuild, LearnToolResourceRow } from '../types/learnToolResource'

export const LEARN_TOOL_GUILDS: LearnToolGuild[] = [
  'Forge',
  'Void',
  'Prism',
  'Silicon',
  'Folded',
]

export const LEARN_TOOL_GUILD_HEADINGS: Record<LearnToolGuild, string> = {
  Forge: 'FORGE · Tinkercad',
  Void: 'VOID · Carbide Create',
  Prism: 'PRISM ORDER · Thunder Bolt Laser',
  Silicon: 'SILICON · MakeCode + micro:bit',
  Folded: 'FOLDED PATH · Pop-up mechanics',
}

/** Field Guide display blocks (one guild may have multiple subsections). */
export type LearnToolDisplayBlock = {
  guild: LearnToolGuild
  heading: string
  note?: string
  /** When set, only resources whose URL contains one of these hosts. */
  urlHosts?: string[]
}

export const LEARN_TOOL_DISPLAY_BLOCKS: LearnToolDisplayBlock[] = [
  { guild: 'Forge', heading: 'FORGE · Tinkercad' },
  { guild: 'Void', heading: 'VOID · Carbide Create' },
  { guild: 'Prism', heading: 'PRISM ORDER · Thunder Bolt Laser' },
  { guild: 'Silicon', heading: 'SILICON · MakeCode + micro:bit' },
  { guild: 'Folded', heading: 'FOLDED PATH · Pop-up mechanics' },
  {
    guild: 'Folded',
    heading: 'FOLDED PATH · Cricut',
    note: "Don't buy anything inside Cricut Design Space — the built-in library costs money. Design outside it and import your SVG instead.",
    urlHosts: ['cuttle.xyz', 'thenounproject.com'],
  },
]

export type LearnToolBlockResources = {
  block: LearnToolDisplayBlock
  resources: LearnToolResourceRow[]
}

/** Assign approved resources to display blocks; host-specific blocks claim first. */
export function groupResourcesByDisplayBlock(
  rows: LearnToolResourceRow[],
): LearnToolBlockResources[] {
  const used = new Set<string>()
  const byIndex = new Map<number, LearnToolResourceRow[]>()

  LEARN_TOOL_DISPLAY_BLOCKS.forEach((block, index) => {
    if (!block.urlHosts?.length) return
    const resources = rows
      .filter(
        (r) =>
          r.guild === block.guild &&
          !used.has(r.id) &&
          block.urlHosts!.some((host) => r.url.toLowerCase().includes(host.toLowerCase())),
      )
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    for (const r of resources) used.add(r.id)
    byIndex.set(index, resources)
  })

  LEARN_TOOL_DISPLAY_BLOCKS.forEach((block, index) => {
    if (block.urlHosts?.length) return
    const resources = rows
      .filter((r) => r.guild === block.guild && !used.has(r.id))
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
    for (const r of resources) used.add(r.id)
    byIndex.set(index, resources)
  })

  return LEARN_TOOL_DISPLAY_BLOCKS.map((block, index) => ({
    block,
    resources: byIndex.get(index) ?? [],
  })).filter((entry) => entry.resources.length > 0)
}

export const LEARN_DESCRIPTION_MAX_CHARS = 280

export function countSentences(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length
}

export function validateLearnDescription(description: string): string | null {
  const trimmed = description.trim()
  if (!trimmed) return 'Write one sentence describing the resource.'
  if (trimmed.length > LEARN_DESCRIPTION_MAX_CHARS) {
    return `Keep it to one sentence (${LEARN_DESCRIPTION_MAX_CHARS} characters max).`
  }
  const sentences = countSentences(trimmed)
  if (sentences < 1) return 'Write at least one sentence.'
  if (sentences > 1) return 'One sentence only.'
  return null
}

export function validateLearnUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return 'URL is required.'
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL must start with http:// or https://'
    }
  } catch {
    return 'Enter a valid URL.'
  }
  return null
}

export function normalizeLearnToolRow(raw: Record<string, unknown>): LearnToolResourceRow {
  return {
    id: raw.id as string,
    guild: raw.guild as LearnToolGuild,
    title: (raw.title as string) ?? '',
    description: (raw.description as string) ?? '',
    url: (raw.url as string) ?? '',
    credit_line: (raw.credit_line as string | null) ?? null,
    status: (raw.status as LearnToolResourceRow['status']) ?? 'pending',
    submitted_by: (raw.submitted_by as string | null) ?? null,
    sort_order: (raw.sort_order as number) ?? 0,
    created_at: raw.created_at as string | undefined,
    updated_at: raw.updated_at as string | undefined,
  }
}

export function isStudentSubmittedResource(
  row: Pick<LearnToolResourceRow, 'submitted_by'>,
): boolean {
  return Boolean(row.submitted_by?.trim())
}

export function groupResourcesByGuild(
  rows: LearnToolResourceRow[],
): Map<LearnToolGuild, LearnToolResourceRow[]> {
  const map = new Map<LearnToolGuild, LearnToolResourceRow[]>()
  for (const g of LEARN_TOOL_GUILDS) map.set(g, [])
  for (const row of rows) {
    const list = map.get(row.guild)
    if (list) list.push(row)
  }
  for (const g of LEARN_TOOL_GUILDS) {
    map.get(g)?.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
  }
  return map
}
