/*
 * Static chickadee mark for teacher-decision student notices.
 * v2 may animate; do not add motion here.
 */

type Props = {
  className?: string
}

export function ChickadeeMark({ className = 'chickadee-mark' }: Props) {
  return (
    <img
      src="/chickadee_icon.svg"
      alt=""
      className={className}
      width={36}
      height={36}
      decoding="async"
    />
  )
}
