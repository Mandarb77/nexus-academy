import { useEffect, useMemo, useState } from 'react'
import { FIELD_GUIDE_QUOTE_SEED, shuffleFieldGuideQuotes } from '../../lib/fieldGuideQuotes'

const ROTATE_MS = 8000
const FADE_MS = 500

export function FieldGuideQuoteRotator() {
  const quotes = useMemo(() => shuffleFieldGuideQuotes(FIELD_GUIDE_QUOTE_SEED), [])
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (quotes.length <= 1) return undefined

    const interval = window.setInterval(() => {
      setVisible(false)
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % quotes.length)
        setVisible(true)
      }, FADE_MS)
    }, ROTATE_MS)

    return () => {
      window.clearInterval(interval)
    }
  }, [quotes.length])

  const quote = quotes[index]
  if (!quote) return null

  return (
    <div className="field-guide-quote" aria-live="polite" aria-atomic="true">
      <blockquote
        className={`field-guide-quote__block${visible ? ' field-guide-quote__block--visible' : ''}`}
      >
        <p className="field-guide-quote__text">&ldquo;{quote.text}&rdquo;</p>
        {quote.attribution ? (
          <footer className="field-guide-quote__attrib">— {quote.attribution}</footer>
        ) : null}
      </blockquote>
    </div>
  )
}
