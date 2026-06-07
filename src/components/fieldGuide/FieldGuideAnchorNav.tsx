export type FieldGuidePanel = 'learn' | 'beyond'

type Props = {
  activePanel: FieldGuidePanel | null
  onLearn: () => void
  onBeyond: () => void
}

export function FieldGuideAnchorNav({ activePanel, onLearn, onBeyond }: Props) {
  return (
    <nav className="field-guide-anchors" aria-label="Field Guide sections">
      <button
        type="button"
        className={`field-guide-anchor card${activePanel === 'learn' ? ' field-guide-anchor--active' : ''}`}
        aria-expanded={activePanel === 'learn'}
        onClick={onLearn}
      >
        <span className="field-guide-anchor__title">Learn the Tools</span>
        <span className="field-guide-anchor__sub muted">
          Tutorials, quick references, and how-to videos for every guild — start here when you&apos;re stuck.
        </span>
      </button>
      <button
        type="button"
        className={`field-guide-anchor card${activePanel === 'beyond' ? ' field-guide-anchor--active' : ''}`}
        aria-expanded={activePanel === 'beyond'}
        onClick={onBeyond}
      >
        <span className="field-guide-anchor__title">Beyond the Tiles</span>
        <span className="field-guide-anchor__sub muted">
          Possibilities. Things that could exist. Some are just a good idea looking for the right maker.
        </span>
      </button>
    </nav>
  )
}
