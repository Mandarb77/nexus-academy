/*
 * Record page — static “how grades work” reference (hover / focus).
 * No student data; copy is fixed reference text only.
 */

const GRADE_ROWS = [
  {
    letter: 'C',
    body: '10 tiles completed, at least 2 per guild, all 5 guilds touched',
  },
  {
    letter: 'B',
    body: 'more tiles, more depth, or both. Talk to Mr. Cook about your path.',
  },
  {
    letter: 'A',
    body:
      'everything above, plus at least one level-4 quest: an advanced technique, applied for a real recipient outside family and friends, designed around something you discovered about that specific person that shows up in the object.',
  },
  {
    letter: 'A+',
    body: "you'll know it when you've done it. So will Mr. Cook.",
  },
] as const

export function GradesReferenceHover() {
  return (
    <footer className="journey-grades-ref" aria-label="Grade reference">
      <div className="journey-grades-ref__wrap">
        <button
          type="button"
          className="journey-grades-ref__trigger"
          aria-expanded="false"
          aria-controls="journey-grades-ref-card"
        >
          <span className="journey-grades-ref__icon" aria-hidden="true">
            ◎
          </span>
          <span className="journey-grades-ref__label">how grades work</span>
        </button>
        <div
          id="journey-grades-ref-card"
          className="journey-grades-ref__card card"
          role="tooltip"
        >
          <h2 className="journey-grades-ref__title">How grades work in Nexus Academy</h2>
          <dl className="journey-grades-ref__list">
            {GRADE_ROWS.map((row) => (
              <div key={row.letter} className="journey-grades-ref__row">
                <dt className="journey-grades-ref__letter">{row.letter}</dt>
                <dd className="journey-grades-ref__body">{row.body}</dd>
              </div>
            ))}
          </dl>
          <p className="journey-grades-ref__footer muted">
            Have a different path in mind, or questions about where you stand? Talk to Mr. Cook.
          </p>
        </div>
      </div>
    </footer>
  )
}
