/*
 * Field Guide — resource hub (`/resources`)
 *
 * Beyond the Tiles (DB-driven possibilities) above static tool quick-reference sections.
 */

import { useCallback, useEffect, useState } from 'react'
import { BeyondTileCard } from '../components/beyondTiles/BeyondTileCard'
import { BeyondTileProposalForm } from '../components/beyondTiles/BeyondTileProposalForm'
import { MainNav } from '../components/MainNav'
import { normalizeBeyondRow } from '../lib/beyondTiles'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { BeyondTileRow } from '../types/beyondTile'

type ResourceSection = {
  title: string
  description: string
}

const SECTIONS: ResourceSection[] = [
  {
    title: 'TinkerCAD',
    description:
      'Helpful links, videos, and quick references for learning TinkerCAD will live here. (Placeholder content.)',
  },
  {
    title: '3D Printing',
    description:
      'Printer basics, file prep tips, troubleshooting, and safety reminders will be collected here. (Placeholder content.)',
  },
  {
    title: 'Laser Cutting',
    description:
      'Materials, settings, safety, and best practices for laser cutting will be organized here. (Placeholder content.)',
  },
  {
    title: 'Sticker Making',
    description:
      'Design, cutting, weeding, transfer, and finishing steps for stickers will be documented here. (Placeholder content.)',
  },
  {
    title: 'Paper Folding',
    description:
      'Paper engineering and folding references (creases, tabs, templates) will be added here. (Placeholder content.)',
  },
  {
    title: 'micro:bit',
    description:
      'micro:bit coding, wiring, sensors, and project ideas will be posted here. (Placeholder content.)',
  },
]

export function ResourcesPage() {
  const [entries, setEntries] = useState<BeyondTileRow[]>([])
  const [loadingBeyond, setLoadingBeyond] = useState(true)
  const [beyondError, setBeyondError] = useState<string | null>(null)

  const loadBeyond = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoadingBeyond(false)
      return
    }
    setLoadingBeyond(true)
    const { data, error } = await supabase
      .from('beyond_tiles')
      .select('id, title, body, guild_tags, recipient_waiting, credit_line, status, submitted_by, sort_order')
      .eq('status', 'approved')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    setLoadingBeyond(false)
    if (error) {
      setBeyondError(error.message)
      return
    }
    setBeyondError(null)
    setEntries((data ?? []).map((r) => normalizeBeyondRow(r as Record<string, unknown>)))
  }, [])

  useEffect(() => {
    void loadBeyond()
  }, [loadBeyond])

  return (
    <div className="app-shell bench-chrome">
      <MainNav />
      <main className="page">
        <header className="page-header bench-page-title-row">
          <h1 className="page-title bench-page-title">Field Guide</h1>
          <p className="muted page-subtitle">
            Quick references, links, and videos (we’ll add the real content over time).
          </p>
        </header>

        <section className="beyond-tiles-section" aria-labelledby="beyond-tiles-heading">
          <header className="beyond-tiles-section__header">
            <h2 id="beyond-tiles-heading" className="beyond-tiles-section__title">
              Beyond the Tiles
            </h2>
            <p className="muted beyond-tiles-section__subhead">
              These are possibilities. Things that could exist. Some have a recipient already waiting. Some are just a
              good idea looking for the right maker. None of them fit inside a quest tile — and that&apos;s exactly why
              they&apos;re here.
            </p>
          </header>

          {loadingBeyond ? (
            <p className="muted">Loading possibilities…</p>
          ) : beyondError ? (
            <p className="error" role="alert">{beyondError}</p>
          ) : entries.length === 0 ? (
            <p className="muted">No entries yet — your teacher will add possibilities soon.</p>
          ) : (
            <ul className="beyond-tiles-grid">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <BeyondTileCard entry={entry} />
                </li>
              ))}
            </ul>
          )}

          <BeyondTileProposalForm onSubmitted={() => void loadBeyond()} />
        </section>

        <div className="stack beyond-tiles-tool-sections">
          {SECTIONS.map((s) => (
            <section key={s.title} className="card" aria-label={`${s.title} resources`}>
              <h2 className="bench-card-heading">{s.title}</h2>
              <p className="muted bench-card-lead">{s.description}</p>
              <div
                className="card bench-inset-card"
                role="note"
                aria-label={`${s.title} placeholder area`}
              >
                <strong className="bench-inset-card__title">Links & videos (coming soon)</strong>
                <p className="bench-inset-card__body">
                  We’ll add curated links, short videos, and examples here.
                </p>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
