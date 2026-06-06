/*
 * Field Guide — static resource hub (`/resources`)
 *
 * Curated links placeholders for tool docs (TinkerCAD, printers, Cricut, etc.). Teachers
 * extend this over time without needing new routes — it is intentionally lightweight compared
 * to Journey/Codex which show live student artifacts.
 */

import { MainNav } from '../components/MainNav'

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

        <div className="stack">
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

