import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MainNav } from '../components/MainNav'

type PowerUpSection = {
  title: string
  body: string[]
}

const SECTIONS: PowerUpSection[] = [
  {
    title: 'Grounded in Maine',
    body: [
      'Earn bonus WP by connecting your work to Maine — materials, problems, places, people, industries, or stories.',
      '(Placeholder: we’ll add examples and rubrics later.)',
    ],
  },
  {
    title: 'Maine Inventors and Creators',
    body: [
      'Maine has a long history of makers and inventors. This section will highlight historical creators including Chester Greenwood, Percy Spencer, Margaret Knight, Orlando Lombard, Helen Blanchard, and others.',
      '(Placeholder: bios, artifacts, and discussion prompts will be added later.)',
    ],
  },
  {
    title: 'Maine History',
    body: [
      'This section will include notes and resources about the history and heritage of Maine — including the Wabanaki Confederacy as the original knowledge keepers of this land.',
      '(Placeholder: we’ll add readings, maps, timelines, and reflection prompts later.)',
    ],
  },
]

export function PowerUpsPage() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (pathname !== '/powerups') return
    const id = hash.replace(/^#/, '').trim()
    if (!id) return
    const el = document.getElementById(id)
    if (el) {
      const t = window.setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return () => window.clearTimeout(t)
    }
  }, [pathname, hash])

  return (
    <div className="app-shell">
      <MainNav />
      <main className="page">
        <header className="page-header">
          <h1 className="page-title">Power Ups</h1>
          <p className="muted page-subtitle">Bonus challenges, lore, and local connections.</p>
        </header>

        <div className="stack">
          {SECTIONS.map((s) => {
            const sectionId =
              s.title === 'Grounded in Maine'
                ? 'grounded-in-maine'
                : s.title === 'Maine Inventors and Creators'
                  ? 'maine-inventors'
                  : s.title === 'Maine History'
                    ? 'maine-history'
                    : undefined
            return (
            <section key={s.title} id={sectionId} className="card powerups-section" aria-label={s.title}>
              <h2 style={{ marginTop: 0 }}>{s.title}</h2>
              {s.body.map((p) => (
                <p key={p} className="muted" style={{ marginTop: '0.5rem' }}>
                  {p}
                </p>
              ))}
              {s.title === 'Maine History' ? (
                <div
                  className="card"
                  role="note"
                  aria-label="Important note about consultation"
                  style={{
                    marginTop: '0.9rem',
                    padding: '0.9rem',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    background: 'rgba(239, 68, 68, 0.06)',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '0.35rem' }}>
                    Important
                  </strong>
                  <p style={{ margin: 0 }}>
                    <strong>Important —</strong> Before the Wabanaki Confederacy is formally included
                    in the game curriculum or used in any student-facing quests or rewards,
                    I must first make contact with Wabanaki community representatives to
                    ensure that any use of their history, knowledge, and cultural identity is done
                    with their full awareness and approval.
                  </p>
                </div>
              ) : null}
            </section>
            )
          })}

          <section id="backstory" className="card powerups-section" aria-label="The Backstory dossier">
            <h2 style={{ marginTop: 0 }}>The Backstory</h2>
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              A dossier on Lyra Voss — the lost Remembrancer.
            </p>

            <div
              className="card"
              style={{
                marginTop: '0.9rem',
                padding: '1rem',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                background:
                  'linear-gradient(180deg, rgba(2, 6, 23, 0.03), rgba(2, 6, 23, 0.00))',
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              }}
              role="region"
              aria-label="Lyra Voss case file"
            >
              <p style={{ margin: 0 }}>
                <strong>CASE FILE:</strong> LYRA VOSS
              </p>
              <p style={{ margin: '0.6rem 0 0' }}>
                <strong>Status:</strong> Missing
              </p>
              <p style={{ margin: '0.35rem 0 0' }}>
                <strong>Title:</strong> Remembrancer
              </p>

              <hr style={{ margin: '0.9rem 0', opacity: 0.4 }} />

              <p style={{ margin: 0 }}>
                <strong>Maker&apos;s Mark:</strong> A translucent PLA paper crane.
              </p>
              <p style={{ margin: '0.35rem 0 0' }}>
                <strong>Engraving:</strong> “find what I found”
              </p>

              <hr style={{ margin: '0.9rem 0', opacity: 0.4 }} />

              <p style={{ margin: 0 }}>
                <strong>Artifacts / Threads:</strong>
              </p>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                <li>The Voss Mechanism</li>
                <li>The Lombard Correspondence</li>
                <li>The Keeper Mapping Project</li>
              </ul>

              <hr style={{ margin: '0.9rem 0', opacity: 0.4 }} />

              <p style={{ margin: 0 }}>
                <strong>Final journal entry:</strong>
              </p>
              <p style={{ margin: '0.5rem 0 0' }}>
                “I think I know what Fractura is afraid of.”
              </p>

              <hr style={{ margin: '0.9rem 0', opacity: 0.4 }} />

              <p style={{ margin: 0 }}>
                <strong>Notes:</strong> Lyra Voss made significant discoveries and disappeared.
                The case remains open.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

