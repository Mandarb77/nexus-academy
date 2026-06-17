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

            <p className="muted beyond-tiles-section__intro">
              Nothing here is required. Nothing here earns WP or gold. These are things you do because you want to,
              not because the tree asks you to.
            </p>

            <ul className="learn-tools-list beyond-tiles-static-list">
              <li className="learn-tools-link beyond-tiles-static-card">
                <h3 className="beyond-tiles-static-card__title">Redo it.</h3>
                <p className="learn-tools-link__desc">
                  Your Maker&apos;s Mark, your game piece, your holder — anything you made early in the year, when you knew less than you know now. If you look at something you made in week one and think I could do that better, you&apos;re right, and you&apos;re allowed to. Redesign it. Recut it. The new version becomes the one that matters. The old one doesn&apos;t disappear — it&apos;s just the early work, the way every maker has early work.
                </p>
              </li>
              <li className="learn-tools-link beyond-tiles-static-card">
                <h3 className="beyond-tiles-static-card__title">The presentation case.</h3>
                <p className="learn-tools-link__desc">
                  Your Maker&apos;s Mark and your game piece were never just for the wall board. Design and CNC-route a small box, foam cut precisely to hold both pieces — your stamp and its holder, sitting in a case you also made. This uses everything you already know: vector design, CNC routing, foam inlay, box construction. Done well, it&apos;s not a school project anymore. It&apos;s the kind of object you could put in a portfolio, hand to an admissions reviewer, or just keep on a shelf because it&apos;s genuinely good.
                </p>
              </li>
              <li className="learn-tools-link beyond-tiles-static-card">
                <h3 className="beyond-tiles-static-card__title">Anything else like this.</h3>
                <p className="learn-tools-link__desc">
                  If you made something early and you&apos;ve outgrown it, that&apos;s not a problem to fix quietly. Tell Mr. Cook. The system doesn&apos;t have a category for everything you might want to remake — that&apos;s the point. You don&apos;t need permission. You&apos;re a maker. Make it again, better.
                </p>
              </li>
            </ul>

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
      </main>
    </div>
  )
}
