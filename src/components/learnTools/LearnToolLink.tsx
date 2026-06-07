import { isStudentSubmittedResource } from '../../lib/learnToolResources'
import type { LearnToolResourceRow } from '../../types/learnToolResource'

type Props = {
  resource: LearnToolResourceRow
}

export function LearnToolLink({ resource }: Props) {
  return (
    <li className="learn-tools-link">
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="learn-tools-link__title"
        aria-label={`${resource.title} (opens in new tab)`}
      >
        <span className="learn-tools-link__title-text">{resource.title}</span>
        <span className="learn-tools-link__external" aria-hidden="true">
          ↗
        </span>
      </a>
      <p className="muted learn-tools-link__desc">{resource.description}</p>
      {isStudentSubmittedResource(resource) && resource.credit_line?.trim() ? (
        <p className="muted learn-tools-link__credit">
          Submitted by {resource.credit_line.trim()}
        </p>
      ) : null}
    </li>
  )
}
