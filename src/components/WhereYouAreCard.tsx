import { useId, useState, type CSSProperties } from 'react'
import { categoryAccent, type WhereYouAreCard } from '../lib/whereYouAreCards'

type WhereYouAreCardProps = {
  card: WhereYouAreCard
}

export function WhereYouAreCard({ card }: WhereYouAreCardProps) {
  const [flipped, setFlipped] = useState(false)
  const uid = useId()
  const frontId = `${uid}-front`
  const backId = `${uid}-back`
  const { band, border } = categoryAccent(card.category)

  return (
    <button
      type="button"
      className={`where-card${flipped ? ' where-card--flipped' : ''}`}
      style={
        {
          '--where-card-accent': band,
          '--where-card-border': border,
        } as CSSProperties
      }
      aria-pressed={flipped}
      aria-label={`${card.name}. ${flipped ? 'Showing story' : 'Tap to read story'}`}
      onClick={() => setFlipped((f) => !f)}
    >
      <div className="where-card__inner">
        <div className="where-card__face where-card__face--front" id={frontId}>
          <div className="where-card__band">
            <span className="where-card__category">{card.category}</span>
            <span className="where-card__tap" aria-hidden="true">
              TAP →
            </span>
          </div>
          <div className="where-card__body">
            <h2 className="where-card__name">{card.name}</h2>
            <div className="where-card__meta">
              <span>{card.place}</span>
              <span>{card.year}</span>
            </div>
            <p className="where-card__hook">{card.hook}</p>
          </div>
        </div>

        <div className="where-card__face where-card__face--back" id={backId} aria-hidden={!flipped}>
          <div className="where-card__band">
            <span className="where-card__category">{card.name}</span>
          </div>
          <div className="where-card__body where-card__body--back">
            <p className="where-card__story">{card.story}</p>
            <hr className="where-card__divider" />
            <p className="where-card__kicker">{card.kicker}</p>
          </div>
        </div>
      </div>
    </button>
  )
}
