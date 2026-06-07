import type { DispatchFragment } from '../lib/dispatchFragments'

type DispatchFragmentCardProps = {
  fragment: DispatchFragment
}

export function DispatchFragmentCard({ fragment }: DispatchFragmentCardProps) {
  return (
    <article className="dispatch-fragment">
      <h2 className="dispatch-fragment__title">{fragment.title}</h2>
      <p className="dispatch-fragment__label">{fragment.label}</p>
      <div className="dispatch-fragment__body">{fragment.body}</div>
    </article>
  )
}
