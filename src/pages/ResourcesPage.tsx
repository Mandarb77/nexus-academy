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
    <div className="app-shell">
      <MainNav />
      <main className="page">
        <header className="page-header">
          <h1 className="page-title">Resources</h1>
          <p className="muted page-subtitle">
            Quick references, links, and videos (we’ll add the real content over time).
          </p>
        </header>

        <div className="stack">
          {SECTIONS.map((s) => (
            <section key={s.title} className="card" aria-label={`${s.title} resources`}>
              <h2 style={{ marginTop: 0 }}>{s.title}</h2>
              <p className="muted" style={{ marginTop: '0.35rem' }}>
                {s.description}
              </p>
              <div
                className="card"
                style={{
                  marginTop: '0.9rem',
                  padding: '0.85rem',
                  background: 'rgba(148, 163, 184, 0.10)',
                }}
                role="note"
                aria-label={`${s.title} placeholder area`}
              >
                <strong style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Links & videos (coming soon)
                </strong>
                <p style={{ margin: 0 }}>
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

