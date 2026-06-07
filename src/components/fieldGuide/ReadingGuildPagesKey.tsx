/*
 * Field Guide — inline shape key for guild skill-tree pages.
 */

export function ReadingGuildPagesKey() {
  return (
    <p className="field-guide-key" aria-label="Guild page shape key">
      <span className="field-guide-key__item">
        <span className="field-guide-key__shape field-guide-key__shape--required" aria-hidden="true">
          ●
        </span>
        this is required
      </span>
      <span className="field-guide-key__sep" aria-hidden="true">
        ·
      </span>
      <span className="field-guide-key__item">
        <span className="field-guide-key__shape field-guide-key__shape--stretch" aria-hidden="true">
          ○
        </span>
        this goes further
      </span>
      <span className="field-guide-key__sep" aria-hidden="true">
        ·
      </span>
      <span className="field-guide-key__item">
        <span className="field-guide-key__shape field-guide-key__shape--gate" aria-hidden="true">
          ◆
        </span>
        this is a gate
      </span>
    </p>
  )
}
