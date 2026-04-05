import type { EmpathyDraft } from '../lib/empathy'
import { EMPATHY_CHECKBOXES } from '../lib/empathy'

type Props = {
  value: EmpathyDraft
  onChange: (next: EmpathyDraft) => void
  disabled?: boolean
}

export function EmpathyForm({ value, onChange, disabled = false }: Props) {
  const toggle = (label: string) => {
    const already = value.how_learned.includes(label)
    onChange({
      ...value,
      how_learned: already
        ? value.how_learned.filter((l) => l !== label)
        : [...value.how_learned, label],
    })
  }

  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend className="patent-label" style={{ marginBottom: '0.75rem' }}>
        Who are you making this for, and why does it matter?
      </legend>

      {/* Who */}
      <label className="patent-field" style={{ marginBottom: '0.85rem' }}>
        <span className="patent-label" style={{ fontSize: '0.93rem' }}>
          Who are you making this for?{' '}
          <span className="patent-required">*</span>
          <span className="muted" style={{ fontWeight: 400, marginLeft: '0.4rem', fontSize: '0.82rem' }}>
            (a name or short description)
          </span>
        </span>
        <input
          type="text"
          value={value.who}
          disabled={disabled}
          placeholder="e.g. my younger sister, the school library, myself"
          onChange={(e) => onChange({ ...value, who: e.target.value })}
        />
      </label>

      {/* Why */}
      <label className="patent-field" style={{ marginBottom: '0.85rem' }}>
        <span className="patent-label" style={{ fontSize: '0.93rem' }}>
          Why does this matter to them?{' '}
          <span className="muted" style={{ fontWeight: 400, fontSize: '0.82rem' }}>
            (two or three sentences)
          </span>
        </span>
        <textarea
          rows={3}
          value={value.why}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, why: e.target.value })}
        />
      </label>

      {/* What changed */}
      <label className="patent-field" style={{ marginBottom: '1rem' }}>
        <span className="patent-label" style={{ fontSize: '0.93rem' }}>
          What is one thing you know about this person that changed a decision you made while designing?{' '}
          <span className="patent-required">*</span>
        </span>
        <textarea
          rows={3}
          value={value.what_changed}
          disabled={disabled}
          placeholder="Be specific — what did you learn about them, and what did you change because of it?"
          onChange={(e) => onChange({ ...value, what_changed: e.target.value })}
        />
      </label>

      {/* How learned */}
      <div style={{ marginBottom: '0.5rem' }}>
        <p className="patent-label" style={{ fontSize: '0.93rem', marginBottom: '0.4rem' }}>
          How did you learn what matters to them?
          <span className="muted" style={{ fontWeight: 400, marginLeft: '0.4rem', fontSize: '0.82rem' }}>
            Pick any that are true — you do not need to check all of these.
          </span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingLeft: '0.25rem' }}>
          {EMPATHY_CHECKBOXES.map((label) => (
            <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.9rem', lineHeight: 1.45 }}>
              <input
                type="checkbox"
                checked={value.how_learned.includes(label)}
                disabled={disabled}
                onChange={() => toggle(label)}
                style={{ marginTop: '0.2rem', flexShrink: 0 }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  )
}
