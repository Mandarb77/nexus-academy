import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MainNav } from '../components/MainNav'
import { PowerUpsTabsNav } from '../components/PowerUpsTabsNav'

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
      <PowerUpsTabsNav />
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
              Case file: Louise Green — Maine Wesleyan Seminary and Female College, Kents Hill.
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
                fontSize: '0.92rem',
                lineHeight: 1.55,
                color: 'var(--text)',
              }}
              role="region"
              aria-label="Louise Green case file"
            >
              <p style={{ margin: 0 }}>
                <strong>CASE FILE:</strong> LOUISE GREEN
              </p>
              <p style={{ margin: '0.5rem 0 0' }}>
                <strong>Name:</strong> Louise Green
              </p>
              <p style={{ margin: '0.35rem 0 0' }}>
                <strong>Institution:</strong> Maine Wesleyan Seminary and Female College
              </p>
              <p style={{ margin: '0.35rem 0 0' }}>
                <strong>Enrolled:</strong> 1861
              </p>
              <p style={{ margin: '0.35rem 0 0' }}>
                <strong>Disappeared:</strong> 1863
              </p>
              <p style={{ margin: '0.35rem 0 0' }}>
                <strong>Status:</strong> Withdrew — no explanation given
              </p>

              <hr style={{ margin: '0.9rem 0', opacity: 0.4 }} />

              <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.04em' }}>NARRATIVE</p>

              <p style={{ margin: '0.65rem 0 0' }}>
                Louise Green arrived at Kents Hill in the autumn of 1861, the year the Female College curriculum was
                barely a year old. She came from a farm family in Wayne, four miles down the road. She had no particular
                gift for theology or literature. But in the manual training shop — the converted barn where students
                learned carpentry and mechanical arts — Louise Green was something the instructors had no category for.
              </p>
              <p style={{ margin: '0.65rem 0 0' }}>
                She could feel how things were made. She would pick up a bracket, some carpentry, a hinge, or a folded
                piece of metal, and trace the decisions the maker had made. She said once that every made thing carries
                the memory of being made, and that memory doesn&apos;t disappear just because the maker does.
              </p>
              <p style={{ margin: '0.65rem 0 0' }}>
                In the winter of 1862 she began working on something she wouldn&apos;t describe. Her journal from that
                period contains only diagrams — precise, beautiful, and illegible to anyone who has tried to interpret
                them since.
              </p>
              <p style={{ margin: '0.65rem 0 0' }}>
                She disappeared on a Thursday in March of 1863. The snow was still on the ground. Her coat was on its
                hook. Her boots were by the door. Whatever she had been building that winter was not found.
              </p>
              <p style={{ margin: '0.65rem 0 0' }}>
                What was found, pressed into the wood of her workbench: four words.
              </p>
              <p style={{ margin: '0.5rem 0 0', fontStyle: 'italic' }}>Find what I found.</p>
              <p style={{ margin: '0.65rem 0 0' }}>
                Students who work late in the maker spaces at Kents Hill — particularly on Thursday evenings, particularly
                in winter, particularly when they are close to figuring something out — sometimes report a feeling. Not
                a sound, not an apparition. Just the sense that someone is standing just behind them, watching with great
                interest, hoping they are about to get it right.
              </p>
              <p style={{ margin: '0.65rem 0 0' }}>
                Her Maker&apos;s Mark is on the board. Nobody placed it there. Nobody knows how it arrived.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

