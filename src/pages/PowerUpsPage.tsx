/*
 * Dispatch — “Where You Are” (`/powerups`)
 *
 * Tappable flip cards about Maine places, makers, and materials. No WP, no assessment.
 */

import { MainNav } from '../components/MainNav'
import { WhereYouAreCard } from '../components/WhereYouAreCard'
import { WHERE_YOU_ARE_CARDS } from '../lib/whereYouAreCards'

export function PowerUpsPage() {
  return (
    <div className="app-shell bench-chrome where-you-are-page">
      <MainNav />
      <main className="page where-you-are">
        <header className="where-you-are__header">
          <h1 className="where-you-are__title">Where You Are</h1>
          <p className="where-you-are__subtitle">
            Not homework · Not assessed · Just stuff about this place
          </p>
        </header>

        <div className="where-you-are__grid">
          {WHERE_YOU_ARE_CARDS.map((card) => (
            <WhereYouAreCard key={`${card.category}-${card.name}`} card={card} />
          ))}
        </div>

        <footer className="where-you-are__footer">
          Know something interesting about this place? Tell me. I&apos;ll add it.
        </footer>
      </main>
    </div>
  )
}
