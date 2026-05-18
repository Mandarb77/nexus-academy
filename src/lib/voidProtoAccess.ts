/*
 * Void Navigators Tile 1 prototype — who can see past the coming-soon gate
 *
 * Only the email in `VITE_VOID_TILE1_PROTO_EMAIL` gets Void unlocked (Tile 1 only in UI).
 * Everyone else still sees the locked guild. Set in `.env` and restart Vite after changing.
 */

type ProtoUser = { email?: string | null } | null | undefined

export function canAccessVoidTile1Proto(user: ProtoUser): boolean {
  const allowed = import.meta.env.VITE_VOID_TILE1_PROTO_EMAIL?.trim().toLowerCase()
  if (!allowed) return false
  const email = (user?.email ?? '').trim().toLowerCase()
  return email.length > 0 && email === allowed
}

/** True when this guild section should show the locked “coming soon” box for the current user. */
export function isGuildComingSoonForUser(guildKey: string, user: ProtoUser): boolean {
  const k = guildKey.trim().toLowerCase()
  if (k === 'void navigators' && canAccessVoidTile1Proto(user)) return false
  return k === 'silicon covenant' || k === 'void navigators'
}
