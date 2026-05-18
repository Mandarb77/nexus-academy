/*
 * In-page section pills for the Power Ups lore page
 *
 * Intentionally returns null unless `pathname === '/powerups'` — App.tsx comment calls
 * this out: hash pills should not appear on Home or Skills where they would confuse IA.
 * Uses hash routes so each section is deep-linkable for classroom projection.
 */

import { NavLink, useLocation } from 'react-router-dom'

export const POWER_UP_SECTION_HASHES = [
  { id: 'grounded-in-maine', label: 'Grounded in Maine' },
  { id: 'maine-inventors', label: 'Inventors & creators' },
  { id: 'maine-history', label: 'Maine history' },
  { id: 'backstory', label: 'The Backstory' },
] as const

export function PowerUpsTabsNav() {
  const { pathname, hash } = useLocation()
  if (pathname !== '/powerups') return null

  return (
    <nav className="powerups-tabs-nav" aria-label="Power Ups sections">
      <span className="powerups-tabs-nav__label">Power Ups</span>
      <div className="powerups-tabs-nav__scroll">
        {POWER_UP_SECTION_HASHES.map(({ id, label }) => {
          const targetHash = `#${id}`
          const isActive = hash === targetHash
          return (
            <NavLink
              key={id}
              to={`/powerups${targetHash}`}
              className={() => `powerups-tab${isActive ? ' powerups-tab--active' : ''}`}
            >
              {label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
