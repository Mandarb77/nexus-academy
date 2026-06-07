import { formatBeyondGuildTags, isStudentSubmitted } from '../../lib/beyondTiles'
import type { BeyondTileRow } from '../../types/beyondTile'

type Props = {
  entry: BeyondTileRow
}

export function BeyondTileCard({ entry }: Props) {
  const tagLine = formatBeyondGuildTags(entry.guild_tags)

  return (
    <article className="beyond-tile-card card">
      <h3 className="beyond-tile-card__title">{entry.title}</h3>
      <p className="beyond-tile-card__body">{entry.body}</p>
      {tagLine ? (
        <p className="beyond-tile-card__tags muted">{tagLine}</p>
      ) : null}
      {isStudentSubmitted(entry) && entry.credit_line?.trim() ? (
        <p className="beyond-tile-card__credit muted">
          Submitted by {entry.credit_line.trim()}
        </p>
      ) : null}
    </article>
  )
}
