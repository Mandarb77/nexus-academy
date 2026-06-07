/*
 * Guilds — inline shape key for reading quest tiles on skill-tree pages.
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
    </section>
  )
}
