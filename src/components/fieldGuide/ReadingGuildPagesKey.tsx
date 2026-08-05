/*
 * Guilds — inline shape key for reading quest tiles on skill-tree pages.
 *
 * Kept quiet visually, but high enough contrast that students notice it on first
 * arrival. Includes a one-line progress reminder: required path first, then stretch/gates.
 */

export function ReadingGuildPagesKey() {
  return (
    <section className="guild-page-read-key" aria-labelledby="guild-page-read-key-heading">
      <h2 id="guild-page-read-key-heading" className="guild-page-read-key__title">
        How to read this page
      </h2>
      <p className="guild-page-read-key__legend" aria-label="Guild page shape key">
        <span className="guild-page-read-key__item">
          <span className="guild-page-read-key__shape guild-page-read-key__shape--required" aria-hidden="true">
            ●
          </span>
          this is required
        </span>
        <span className="guild-page-read-key__sep" aria-hidden="true">
          ·
        </span>
        <span className="guild-page-read-key__item">
          <span className="guild-page-read-key__shape guild-page-read-key__shape--stretch" aria-hidden="true">
            ○
          </span>
          this goes further
        </span>
        <span className="guild-page-read-key__sep" aria-hidden="true">
          ·
        </span>
        <span className="guild-page-read-key__item">
          <span className="guild-page-read-key__shape guild-page-read-key__shape--gate" aria-hidden="true">
            ◆
          </span>
          this is a gate
        </span>
      </p>
      <p className="guild-page-read-key__progress">
        Your progress is the solid dots — work those in order. Hollow ones and gates open after.
      </p>
    </section>
  )
}
