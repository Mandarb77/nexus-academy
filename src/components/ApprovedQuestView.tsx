import type { EmpathyDraft } from '../lib/empathy'
import { EMPATHY_CHECKBOXES } from '../lib/empathy'

type Answer = {
  label: string
  value: string
}

type Props = {
  steps: string[]
  checks: boolean[]
  answers: Answer[]
  empathy?: EmpathyDraft | null
  uploadUrl?: string | null
  repeatNote?: string
}

function EmpathyReadOnly({ e }: { e: EmpathyDraft }) {
  const hasContent = e.who || e.why || e.what_changed || e.how_learned.length > 0
  if (!hasContent) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.25rem' }}>
      {e.who ? (
        <div>
          <p className="approved-quest-answer-label">Who are you making this for?</p>
          <p className="approved-quest-answer-value">{e.who}</p>
        </div>
      ) : null}
      {e.why ? (
        <div>
          <p className="approved-quest-answer-label">Why does this matter to them?</p>
          <p className="approved-quest-answer-value">{e.why}</p>
        </div>
      ) : null}
      {e.what_changed ? (
        <div>
          <p className="approved-quest-answer-label">What you knew that changed a design decision?</p>
          <p className="approved-quest-answer-value">{e.what_changed}</p>
        </div>
      ) : null}
      {e.how_learned.length > 0 ? (
        <div>
          <p className="approved-quest-answer-label">How you learned what matters to them</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.1rem', marginTop: '0.25rem' }}>
            {EMPATHY_CHECKBOXES.map((opt) => (
              <label key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.88rem', opacity: e.how_learned.includes(opt) ? 1 : 0.35, pointerEvents: 'none' }}>
                <input type="checkbox" checked={e.how_learned.includes(opt)} readOnly style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ApprovedQuestView({ steps, checks, answers, empathy, uploadUrl, repeatNote }: Props) {
  return (
    <div className="approved-quest-view">
      {/* Approved banner */}
      <div className="approved-quest-banner" role="status">
        <span className="approved-quest-banner__icon">✅</span>
        <div>
          <p className="approved-quest-banner__title">Quest approved!</p>
          <p className="approved-quest-banner__sub">Your work and answers are saved below for reference.</p>
        </div>
      </div>

      {/* Checklist */}
      <section className="approved-quest-section">
        <h3 className="approved-quest-section-heading">Your checklist</h3>
        <ul className="approved-quest-checklist">
          {steps.map((label, idx) => (
            <li key={idx} className="approved-quest-checklist-item">
              <input
                type="checkbox"
                checked={checks[idx] ?? true}
                readOnly
                style={{ flexShrink: 0, marginTop: '0.15rem' }}
              />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Patent answers */}
      <section className="approved-quest-section">
        <h3 className="approved-quest-section-heading">Your answers</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {answers.map(({ label, value }) =>
            label === '__empathy__' ? (
              empathy ? (
                <div key={label}>
                  <p className="approved-quest-answer-label">Who are you making this for, and why does it matter?</p>
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      background: 'rgba(99,102,241,0.06)',
                      borderLeft: '3px solid rgba(99,102,241,0.4)',
                      borderRadius: '4px',
                      marginTop: '0.25rem',
                    }}
                  >
                    <EmpathyReadOnly e={empathy} />
                  </div>
                </div>
              ) : null
            ) : (
              <div key={label}>
                <p className="approved-quest-answer-label">{label}</p>
                <p className="approved-quest-answer-value">{value || <em className="muted">No answer recorded.</em>}</p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Uploaded photo/video */}
      {uploadUrl ? (
        <section className="approved-quest-section">
          <h3 className="approved-quest-section-heading">Uploaded photo / video</h3>
          {/\.(mp4|webm|mov|ogg)$/i.test(uploadUrl) ? (
            <video src={uploadUrl} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />
          ) : (
            <img src={uploadUrl} alt="Finished piece" style={{ maxWidth: '100%', maxHeight: '340px', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)' }} />
          )}
        </section>
      ) : null}

      {/* Repeat-play note */}
      {repeatNote ? (
        <p className="muted" style={{ marginTop: '0.75rem', fontSize: '0.88rem' }}>
          {repeatNote}
        </p>
      ) : null}
    </div>
  )
}
