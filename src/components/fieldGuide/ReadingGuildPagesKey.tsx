/*
 * Field Guide — static key for reading guild skill-tree pages.
 */

export function ReadingGuildPagesKey() {
  return (
    <section className="field-guide-key card" aria-labelledby="guild-pages-key-heading">
      <h2 id="guild-pages-key-heading" className="field-guide-key__title">
        Reading the guild pages
      </h2>
      <ul className="field-guide-key__list muted">
        <li>
          <strong>Required tiles</strong> unlock in order — finish one before the next opens.
        </li>
        <li>
          <strong>Stretch</strong> tiles are optional depth; some unlock after the competence gate.
        </li>
        <li>
          <strong>Gates</strong> are Tier 2 paths; the <strong>boss fight</strong> needs both gates approved.
        </li>
        <li>
          Locked tiles tell you what to finish first. Open a quest to start the patent application.
        </li>
      </ul>
    </section>
  )
}
