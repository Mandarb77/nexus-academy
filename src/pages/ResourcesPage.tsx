/*
 * Field Guide — resource hub (`/resources`)
 *
 * Hero: quote rotator + anchor nav reveals Learn or Beyond on demand → guild pages key.
 */

import { useCallback, useEffect, useState } from 'react'
import { BeyondTileCard } from '../components/beyondTiles/BeyondTileCard'
import { BeyondTileProposalForm } from '../components/beyondTiles/BeyondTileProposalForm'
import {
  FieldGuideAnchorNav,
  type FieldGuidePanel,
} from '../components/fieldGuide/FieldGuideAnchorNav'
import { FieldGuideQuoteRotator } from '../components/fieldGuide/FieldGuideQuoteRotator'
import { ReadingGuildPagesKey } from '../components/fieldGuide/ReadingGuildPagesKey'
import { LearnToolsSection } from '../components/learnTools/LearnToolsSection'
import { MainNav } from '../components/MainNav'
import { normalizeBeyondRow } from '../lib/beyondTiles'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { BeyondTileRow } from '../types/beyondTile'

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function ResourcesPage() {
  const [activePanel, setActivePanel] = useState<FieldGuidePanel | null>(null)
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
      .select('id, title, body, guild_tags, credit_line, status, submitted_by, sort_order')
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

  useEffect(() => {
    if (!activePanel) return
    const id = activePanel === 'learn' ? 'field-guide-learn' : 'field-guide-beyond'
    const t = window.setTimeout(() => scrollToSection(id), 50)
    return () => window.clearTimeout(t)
  }, [activePanel])

  const togglePanel = (panel: FieldGuidePanel) => {
    setActivePanel((cur) => (cur === panel ? null : panel))
  }

  return (
    <div className="app-shell bench-chrome field-guide-page">
      <MainNav />
      <main className="page">
        <header className="field-guide-page__header">
          <h1 className="page-title bench-page-title">Field Guide</h1>
        </header>

        <div className="field-guide-hero">
          <FieldGuideQuoteRotator />
          <FieldGuideAnchorNav
            activePanel={activePanel}
            onLearn={() => togglePanel('learn')}
            onBeyond={() => togglePanel('beyond')}
          />
        </div>

        {activePanel === 'learn' ? (
          <LearnToolsSection sectionId="field-guide-learn" />
        ) : null}

        {activePanel === 'beyond' ? (
          <section
            id="field-guide-beyond"
            className="beyond-tiles-section field-guide-scroll-target field-guide-panel"
            aria-labelledby="beyond-tiles-heading"
          >
            <header className="beyond-tiles-section__header">
              <h2 id="beyond-tiles-heading" className="beyond-tiles-section__title">
                Beyond the Tiles
              </h2>
              <p className="muted beyond-tiles-section__subhead">
                These are possibilities. Things that could exist. Some are just a good idea looking for the right maker.
                None of them fit inside a quest tile — and that&apos;s exactly why they&apos;re here.
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
        ) : null}

        <ReadingGuildPagesKey />
      </main>
    </div>
  )
}
